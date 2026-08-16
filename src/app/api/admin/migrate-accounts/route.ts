// One-time idempotent migration: converts account name strings → FinancialAccount FK IDs.
// Safe to call multiple times. Call this once after deploying the FinancialAccount schema.
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const userId = await requireUserId()

    // 1. Collect all unique account names this user has ever used in transactions
    const txnAccounts = await prisma.transaction.findMany({
      where: { userId },
      select: { account: true },
      distinct: ['account'],
    })
    const txnNames = txnAccounts
      .map(t => t.account?.trim())
      .filter((n): n is string => !!n)

    // 2. Collect names from customAccounts JSON (type info preserved)
    const settings = await prisma.appSettings.findUnique({ where: { userId } })
    const customAccounts: { name: string; type: string }[] = (() => {
      try { return JSON.parse(settings?.customAccounts ?? '[]') } catch { return [] }
    })()
    const dashboardWidgets: string[] = (() => {
      try { return JSON.parse(settings?.dashboardWidgets ?? '[]') } catch { return [] }
    })()
    const customMap = new Map(customAccounts.map(a => [a.name.trim(), a.type]))
    const widgetSet = new Set(dashboardWidgets.map(n => n.trim()))

    // 3. Merge: all names from transactions + all from customAccounts
    const allNamesArr = [...txnNames, ...customAccounts.map(a => a.name.trim())]
    const allNames = new Set<string>(allNamesArr)

    // 4. Upsert a FinancialAccount for every unique name
    let created = 0
    let order = await prisma.financialAccount.aggregate({ where: { userId }, _max: { sortOrder: true } })
    let nextOrder = (order._max.sortOrder ?? -1) + 1

    for (const name of Array.from(allNames)) {
      const type = customMap.get(name) ?? inferType(name)
      const showOnDash = widgetSet.has(name)
      const existing = await prisma.financialAccount.findUnique({
        where: { userId_name: { userId, name } },
      })
      if (!existing) {
        await prisma.financialAccount.create({
          data: { userId, name, type, showOnDash, sortOrder: nextOrder++ },
        })
        created++
      } else {
        // Update showOnDash from dashboardWidgets if not yet set
        if (showOnDash && !existing.showOnDash) {
          await prisma.financialAccount.update({ where: { id: existing.id }, data: { showOnDash: true } })
        }
      }
    }

    // 5. Build name → id map
    const faRows = await prisma.financialAccount.findMany({ where: { userId } })
    const nameToId = new Map(faRows.map(fa => [fa.name, fa.id]))

    // 6. Update all transactions that have account string but no accountId
    const unmigrated = await prisma.transaction.findMany({
      where: { userId, accountId: null, account: { not: null } },
      select: { id: true, account: true },
    })

    let migrated = 0
    for (const t of unmigrated) {
      const faId = t.account ? nameToId.get(t.account.trim()) : undefined
      if (faId) {
        await prisma.transaction.update({ where: { id: t.id }, data: { accountId: faId } })
        migrated++
      }
    }

    return NextResponse.json({ ok: true, created, migrated, total: unmigrated.length })
  } catch (err) {
    console.error('Migration error:', err)
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 })
  }
}

function inferType(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('credit') || n.includes('card') && !n.includes('debit')) return 'credit_card'
  if (n.includes('debit')) return 'debit_card'
  if (n.includes('salary') || n.includes('income')) return 'salary'
  if (n.includes('cash')) return 'cash'
  if (n.includes('invest') || n.includes('mutual') || n.includes('fund')) return 'investment'
  return 'savings'
}
