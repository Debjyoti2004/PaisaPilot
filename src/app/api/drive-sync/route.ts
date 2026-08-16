import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'
import { createHash } from 'crypto'

export const dynamic = 'force-dynamic'

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type:    'refresh_token',
      }),
    })
    const data = await res.json()
    return data.access_token ?? null
  } catch { return null }
}

async function listDriveFiles(accessToken: string, folderName: string): Promise<{ id: string; name: string }[]> {
  // First find the folder by name
  const folderSearch = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name%3D%27${encodeURIComponent(folderName)}%27+and+mimeType%3D%27application%2Fvnd.google-apps.folder%27+and+trashed%3Dfalse&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const folderData = await folderSearch.json()
  const folder = folderData.files?.[0]
  if (!folder) return []

  // List CSV files in that folder
  const fileSearch = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=%27${folder.id}%27+in+parents+and+name+contains+%27.csv%27+and+trashed%3Dfalse&fields=files(id,name,modifiedTime)&orderBy=modifiedTime+desc`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const fileData = await fileSearch.json()
  return fileData.files ?? []
}

async function downloadDriveFile(accessToken: string, fileId: string): Promise<string> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return res.text()
}

function parseCSV(text: string, userId: string): Array<{
  merchant: string; date: string; amount: number; type: 'income' | 'expense'; account: string; fingerprint: string
}> {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''))
  const get = (cols: string[], keys: string[]) => {
    for (const k of keys) {
      const idx = header.findIndex(h => h.includes(k))
      if (idx !== -1 && cols[idx]) return cols[idx].trim().replace(/^"|"$/g, '')
    }
    return ''
  }

  const results = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    const dateStr  = get(cols, ['date', 'txndate', 'valuedate', 'postingdate'])
    const merchant = get(cols, ['merchant', 'description', 'narration', 'particulars', 'payee']) || 'Unknown'
    const amtStr   = get(cols, ['amount', 'credit', 'debit', 'amt', 'withdrawlamount', 'depositamount'])
    const typeHint = get(cols, ['type', 'txtype', 'crdr', 'indicator'])
    if (!dateStr || !amtStr) continue
    const amount = Math.abs(parseFloat(amtStr.replace(/,/g, '')) || 0)
    if (amount === 0) continue
    const isCredit = typeHint.toLowerCase().includes('credit') || typeHint.toLowerCase().includes('cr')
    const type: 'income' | 'expense' = isCredit ? 'income' : 'expense'
    const fingerprint = createHash('md5')
      .update(`${userId}|${dateStr}|${merchant.trim().toLowerCase()}|${amount.toFixed(2)}|main checking`)
      .digest('hex')
    results.push({ merchant, date: dateStr, amount, type, account: 'Savings Account', fingerprint })
  }
  return results
}

async function syncForUser(userId: string): Promise<{ filesProcessed: number; imported: number; skipped: number; error?: string }> {
  const [settings, account, defaultFa] = await Promise.all([
    prisma.appSettings.findUnique({ where: { userId } }),
    prisma.account.findFirst({ where: { userId, provider: 'google' } }),
    prisma.financialAccount.findFirst({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }],
    }),
  ])

  if (!settings?.driveEnabled || !settings.driveFolder) return { filesProcessed: 0, imported: 0, skipped: 0 }
  if (!account?.refresh_token) return { filesProcessed: 0, imported: 0, skipped: 0, error: 'No Drive access. Re-sign in to grant Drive permission.' }

  const accessToken = await refreshAccessToken(account.refresh_token)
  if (!accessToken) return { filesProcessed: 0, imported: 0, skipped: 0, error: 'Failed to get Drive access token' }

  const files = await listDriveFiles(accessToken, settings.driveFolder)
  let imported = 0; let skipped = 0

  for (const file of files.slice(0, 10)) { // max 10 files per sync
    try {
      const csvText = await downloadDriveFile(accessToken, file.id)
      const rows = parseCSV(csvText, userId)

      for (const row of rows) {
        // Check duplicate
        const existing = await prisma.transaction.findFirst({ where: { dedupeHash: row.fingerprint } })
        if (existing) { skipped++; continue }

        // Assign category based on transaction type
        const isIncome = row.type === 'income'
        const catName  = isIncome ? 'Salary' : 'Other'
        const catKind  = isIncome ? 'income' : 'expense'
        let cat = await prisma.category.findFirst({ where: { name: catName } })
        if (!cat) {
          cat = await prisma.category.create({ data: { name: catName, kind: catKind, icon: isIncome ? '💼' : '💳', color: isIncome ? '#22c55e' : '#9ca3af' } })
        }

        await prisma.transaction.create({
          data: {
            userId, merchant: row.merchant, narration: row.merchant,
            amount: row.amount, type: isIncome ? 'credit' : 'debit',
            categoryId: cat.id,
            account: defaultFa?.name ?? row.account,
            accountId: defaultFa?.id ?? null,
            tags: '[]', wealthGroup: null, source: 'drive',
            dedupeHash: row.fingerprint,
            occurredAt: new Date(row.date + 'T12:00:00'),
          },
        })
        imported++
      }
    } catch {} // skip corrupt files
  }

  // Update last sync time
  await prisma.appSettings.update({
    where: { userId },
    data: { driveLastSync: new Date() },
  })

  return { filesProcessed: files.length, imported, skipped }
}

// POST: manual sync trigger (from settings page)
export async function POST() {
  try {
    const userId = await requireUserId()
    const result = await syncForUser(userId)
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}

// GET: cron trigger — syncs all users with driveEnabled=true
// Protected by CRON_SECRET header
export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET && process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const enabledUsers = await prisma.appSettings.findMany({
      where: { driveEnabled: true },
      select: { userId: true },
    })

    const results = await Promise.allSettled(enabledUsers.map(u => syncForUser(u.userId)))
    const summary = results.map((r, i) => ({
      userId: enabledUsers[i].userId,
      ...(r.status === 'fulfilled' ? r.value : { error: 'Failed' }),
    }))

    return NextResponse.json({ synced: summary.length, summary })
  } catch (error) {
    console.error('Cron Drive sync error:', error)
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 })
  }
}
