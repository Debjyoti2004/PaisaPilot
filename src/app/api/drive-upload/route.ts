import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'

export const dynamic = 'force-dynamic'

async function getAccessToken(userId: string): Promise<string | null> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: 'google' },
    select: { refresh_token: true, access_token: true, expires_at: true },
  })
  if (!account?.refresh_token) return null

  // Use existing access token if still valid (5 min buffer)
  const now = Math.floor(Date.now() / 1000)
  if (account.access_token && account.expires_at && account.expires_at > now + 300) {
    return account.access_token
  }

  // Refresh
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: account.refresh_token,
      grant_type:    'refresh_token',
    }),
  })
  const d = await res.json()
  if (!d.access_token) return null

  // Persist refreshed token
  await prisma.account.updateMany({
    where: { userId, provider: 'google' },
    data: {
      access_token: d.access_token,
      expires_at: Math.floor(Date.now() / 1000) + (d.expires_in ?? 3600),
    },
  })
  return d.access_token
}

async function ensureFolder(accessToken: string, folderName: string): Promise<string> {
  // Search for existing folder
  const search = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name%3D%27${encodeURIComponent(folderName)}%27+and+mimeType%3D%27application%2Fvnd.google-apps.folder%27+and+trashed%3Dfalse&fields=files(id)`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  const { files } = await search.json()
  if (files?.[0]?.id) return files[0].id

  // Create folder
  const create = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: folderName, mimeType: 'application/vnd.google-apps.folder' }),
  })
  const folder = await create.json()
  return folder.id
}

// POST /api/drive-upload
// Body: { filename, content (base64 or text), mimeType }
export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId()
    const { filename, content, mimeType = 'text/csv' } = await request.json()
    if (!filename || !content) return NextResponse.json({ error: 'filename and content required' }, { status: 400 })

    const accessToken = await getAccessToken(userId)
    if (!accessToken) {
      return NextResponse.json({ error: 'Drive not connected. Please re-link Google Drive in Settings.' }, { status: 401 })
    }

    // Get or create PaisaPilot folder
    const settings = await prisma.appSettings.findUnique({ where: { userId }, select: { driveFolder: true } })
    const folderName = settings?.driveFolder || 'PaisaPilot'
    const folderId = await ensureFolder(accessToken, folderName)

    // Upload file using multipart upload
    const boundary = '-------314159265358979323846'
    const delimiter = `\r\n--${boundary}\r\n`
    const closeDelimiter = `\r\n--${boundary}--`

    const metadata = JSON.stringify({ name: filename, parents: [folderId] })
    const body = [
      delimiter,
      'Content-Type: application/json; charset=UTF-8\r\n\r\n',
      metadata,
      delimiter,
      `Content-Type: ${mimeType}\r\n\r\n`,
      content,
      closeDelimiter,
    ].join('')

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary="${boundary}"`,
        },
        body,
      },
    )

    if (!uploadRes.ok) {
      const err = await uploadRes.json()
      throw new Error(err.error?.message || 'Drive upload failed')
    }

    const file = await uploadRes.json()
    return NextResponse.json({ success: true, fileId: file.id, fileName: file.name, link: file.webViewLink })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Drive upload error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Upload failed' }, { status: 500 })
  }
}

// GET /api/drive-upload — check if Drive is connected
export async function GET() {
  try {
    const userId = await requireUserId()
    const account = await prisma.account.findFirst({
      where: { userId, provider: 'google' },
      select: { refresh_token: true },
    })
    return NextResponse.json({ connected: !!account?.refresh_token })
  } catch {
    return NextResponse.json({ connected: false })
  }
}
