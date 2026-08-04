import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'
import { getEffectiveUserId } from '@/lib/family'
import { createHash } from 'crypto'

export const dynamic = 'force-dynamic'

// Ledgerly Warikoo wealth groups
const NEEDS_CATS = ['Housing', 'Groceries', 'Utilities', 'Transportation', 'Insurance', 'Health', 'Subscriptions']
const WANTS_CATS = ['Dining', 'Shopping', 'Entertainment', 'Travel', 'Other']
// Everything else is Investments or unclassified

function getWealthGroup(category: string): string | null {
  if (NEEDS_CATS.includes(category)) return 'needs'
  if (WANTS_CATS.includes(category)) return 'wants'
  if (['Investments', 'Savings', 'EPF', 'NPS', 'Mutual Funds', 'Stocks', 'Gold'].includes(category)) return 'investments'
  return null
}

// Ensure category exists (by name), create if needed
async function ensureCategory(name: string): Promise<string> {
  let cat = await prisma.category.findFirst({ where: { name } })
  if (!cat) {
    const colorMap: Record<string, string> = {
      Housing: '#6558D3', Groceries: '#10b981', Utilities: '#f59e0b',
      Transportation: '#06b6d4', Insurance: '#3b82f6', Health: '#ef4444',
      Subscriptions: '#8b5cf6', Dining: '#f97316', Shopping: '#ec4899',
      Entertainment: '#a855f7', Income: '#16a34a', 'Needs review': '#d97706',
      Other: '#9ca3af',
    }
    cat = await prisma.category.create({
      data: {
        name,
        kind: name === 'Income' ? 'income' : 'expense',
        icon: '💳',
        color: colorMap[name] ?? '#9ca3af',
      },
    })
  }
  return cat.id
}

// Build dedup fingerprint
function buildFingerprint(userId: string, date: string, merchant: string, amount: number, account: string) {
  return createHash('md5')
    .update(`${userId}|${date}|${merchant.trim().toLowerCase()}|${amount.toFixed(2)}|${account.trim().toLowerCase()}`)
    .digest('hex')
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getEffectiveUserId(request, { allowViewAs: true })
    const { searchParams } = new URL(request.url)

    const period    = searchParams.get('period') ?? 'all-time'
    const account   = searchParams.get('account') ?? ''
    const category  = searchParams.get('category') ?? ''
    const search    = searchParams.get('search') ?? ''
    const typeParam = searchParams.get('type') ?? ''
    const page      = parseInt(searchParams.get('page') ?? '1', 10)
    const pageSize  = 50

    // Build date filter from period
    const getPeriodRange = (p: string) => {
      const now = new Date()
      switch (p) {
        case 'this-month':   return { gte: new Date(now.getFullYear(), now.getMonth(), 1) }
        case 'last-month':   return { gte: new Date(now.getFullYear(), now.getMonth() - 1, 1), lte: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59) }
        case 'last-3-months':return { gte: new Date(now.getFullYear(), now.getMonth() - 3, 1) }
        case 'last-6-months':return { gte: new Date(now.getFullYear(), now.getMonth() - 6, 1) }
        case 'this-year':    return { gte: new Date(now.getFullYear(), 0, 1) }
        default:             return undefined
      }
    }

    const dateFilter = getPeriodRange(period)
    const where: Record<string, unknown> = { userId }
    if (dateFilter) where.occurredAt = dateFilter

    // Legacy support: also accept ?month=YYYY-MM
    const monthParam = searchParams.get('month')
    if (monthParam) {
      const [year, month] = monthParam.split('-').map(Number)
      where.occurredAt = { gte: new Date(year, month - 1, 1), lte: new Date(year, month, 0, 23, 59, 59) }
    }

    const wealthGroupParam = searchParams.get('wealthGroup') ?? ''

    if (category)  where.category = { name: category }
    if (search)    where.narration = { contains: search, mode: 'insensitive' }
    if (typeParam === 'income')  where.type = 'credit'
    if (typeParam === 'expense') where.type = 'debit'
    if (wealthGroupParam && wealthGroupParam !== 'income') where.wealthGroup = wealthGroupParam
    if (wealthGroupParam === 'income') where.type = 'credit'

    const [total, rawTxns] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        include: { category: true },
        orderBy: { occurredAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    // Filter by account client-side (account is a text field, not FK)
    const filtered = account ? rawTxns.filter(t => (t.account ?? 'Main Checking') === account) : rawTxns

    const transactions = filtered.map(t => ({
      id: t.id,
      merchant: t.merchant ?? t.narration,
      date: t.occurredAt.toISOString().slice(0, 10),
      category: t.category?.name ?? 'Other',
      account: t.account ?? 'Main Checking',
      amount: t.amount,
      type: t.type === 'credit' ? 'income' : 'expense',
      tags: (() => { try { return JSON.parse(t.tags) } catch { return [] } })(),
      wealthGroup: t.wealthGroup ?? null,
      source: t.source,
      occurredAt: t.occurredAt.toISOString(),
      actualPaidDate: t.actualPaidDate?.toISOString().slice(0, 10) ?? null,
    }))

    return NextResponse.json({ transactions, total, page, pageSize })
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN')
      return NextResponse.json({ error: 'Access revoked' }, { status: 403 })
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Transactions GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId()
    const body = await request.json()

    // Support both new Ledgerly format and legacy format
    const isNewFormat = !!(body.merchant ?? body.date)

    if (isNewFormat) {
      // New format: { merchant, date, amount, type (expense/income), category, account, tags, source }
      const merchant = (body.merchant ?? body.narration ?? '').trim()
      const dateStr   = body.date ?? new Date().toISOString().slice(0, 10)
      const amount    = parseFloat(body.amount)
      const txType    = body.type === 'income' ? 'credit' : 'debit'
      const catName   = body.category ?? 'Other'
      const account   = (body.account ?? 'Main Checking').trim()
      const tags      = Array.isArray(body.tags) ? body.tags.map((t: string) => t.trim()).filter(Boolean) : []
      const source    = body.source ?? 'manual'

      if (!merchant) return NextResponse.json({ error: 'Merchant is required' }, { status: 400 })
      if (!isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })

      const categoryId = await ensureCategory(catName)
      // Prefer client-supplied wealthGroup (from two-step picker); fall back to category lookup
      const wealthGroup = txType === 'credit'
        ? null
        : (body.wealthGroup ?? getWealthGroup(catName))
      const fingerprint = buildFingerprint(userId, dateStr, merchant, amount, account)

      // Check for duplicate
      const existing = await prisma.transaction.findFirst({ where: { dedupeHash: fingerprint } })
      if (existing) return NextResponse.json({ error: 'Duplicate transaction', duplicate: true }, { status: 409 })

      let occurredAt = new Date(dateStr + 'T12:00:00')
      let actualPaidDate: Date | null = null

      // Salary carryover: if income on day 25-31, shift to next month's 1st
      if (txType === 'credit' && occurredAt.getDate() >= 25) {
        const userSettings = await prisma.appSettings.findUnique({ where: { userId }, select: { salaryCarryover: true } })
        if (userSettings?.salaryCarryover) {
          actualPaidDate = occurredAt
          occurredAt = new Date(occurredAt.getFullYear(), occurredAt.getMonth() + 1, 1, 12, 0, 0)
        }
      }

      // Save new tags to UserTag table
      for (const tag of tags) {
        await prisma.userTag.upsert({
          where: { userId_name: { userId, name: tag } },
          update: {},
          create: { userId, name: tag },
        })
      }

      const transaction = await prisma.transaction.create({
        data: {
          userId,
          merchant,
          narration: merchant,
          amount,
          type: txType,
          categoryId,
          account,
          tags: JSON.stringify(tags),
          wealthGroup,
          source,
          dedupeHash: fingerprint,
          occurredAt,
          actualPaidDate,
        },
        include: { category: true },
      })

      // Check budget alerts
      if (txType === 'debit') {
        const monthStart = new Date(occurredAt.getFullYear(), occurredAt.getMonth(), 1)
        const monthEnd   = new Date(occurredAt.getFullYear(), occurredAt.getMonth() + 1, 0, 23, 59, 59)
        const budget = await prisma.userBudget.findUnique({ where: { userId_category: { userId, category: catName } } })
        if (budget && budget.active) {
          const monthSpend = await prisma.transaction.aggregate({
            where: { userId, type: 'debit', occurredAt: { gte: monthStart, lte: monthEnd }, category: { name: catName } },
            _sum: { amount: true },
          })
          const spent = (monthSpend._sum.amount ?? 0)
          if (spent > budget.monthlyLimit) {
            await prisma.notification.create({
              data: {
                userId,
                title: `${catName} budget exceeded`,
                message: `You've spent ₹${spent.toFixed(0)} in ${catName} — ₹${(spent - budget.monthlyLimit).toFixed(0)} over your ₹${budget.monthlyLimit.toFixed(0)} budget this month.`,
                type: 'warning',
              },
            })
          }
        }
      }

      return NextResponse.json({
        transaction: {
          id: transaction.id,
          merchant: transaction.merchant ?? transaction.narration,
          date: transaction.occurredAt.toISOString().slice(0, 10),
          category: transaction.category?.name ?? 'Other',
          account: transaction.account ?? 'Main Checking',
          amount: transaction.amount,
          type: transaction.type === 'credit' ? 'income' : 'expense',
          tags: (() => { try { return JSON.parse(transaction.tags) } catch { return [] } })(),
          wealthGroup: transaction.wealthGroup ?? null,
        },
      }, { status: 201 })
    } else {
      // Legacy format: { amount, categoryId, narration, occurredAt, type (debit/credit) }
      const { amount, categoryId, narration, merchantKey, occurredAt, type = 'debit' } = body
      if (!amount || !categoryId || !narration) {
        return NextResponse.json({ error: 'amount, categoryId, and narration are required' }, { status: 400 })
      }
      const parsedAmount = parseFloat(amount)
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
      }
      const txDate = occurredAt ? new Date(occurredAt) : new Date()
      const hashInput = `${userId}-${parsedAmount}-${categoryId}-${narration}-${txDate.toISOString().split('T')[0]}`
      const dedupeHash = createHash('md5').update(hashInput).digest('hex')

      const transaction = await prisma.transaction.create({
        data: {
          userId, amount: parsedAmount, categoryId, narration,
          merchantKey: merchantKey || null, occurredAt: txDate,
          type, source: 'manual', dedupeHash,
        },
        include: { category: true },
      })
      return NextResponse.json({ transaction }, { status: 201 })
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'FORBIDDEN')
      return NextResponse.json({ error: 'Access revoked' }, { status: 403 })
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Duplicate transaction', duplicate: true }, { status: 409 })
    }
    console.error('Transaction POST error:', error)
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await requireUserId()
    const body = await request.json()
    const { id, category, tags, account, merchant, amount, date, wealthGroup: wgPatch } = body

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const existing = await prisma.transaction.findFirst({ where: { id, userId } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updates: Record<string, unknown> = {}
    if (category !== undefined) {
      const categoryId = await ensureCategory(category)
      updates.categoryId = categoryId
      updates.wealthGroup = getWealthGroup(category)
    }
    if (merchant !== undefined && merchant.trim()) updates.merchant = merchant.trim()
    if (amount !== undefined) {
      const amt = parseFloat(amount)
      if (!isNaN(amt) && amt > 0) updates.amount = amt
    }
    if (date !== undefined) {
      const d = new Date(date + 'T12:00:00')
      if (!isNaN(d.getTime())) updates.occurredAt = d
    }
    if (wgPatch !== undefined) updates.wealthGroup = wgPatch  // null clears it
    if (tags !== undefined) {
      const normalizedTags = (Array.isArray(tags) ? tags : []).map((t: string) => t.trim()).filter(Boolean)
      updates.tags = JSON.stringify(normalizedTags)
      // Save new tags
      for (const tag of normalizedTags) {
        await prisma.userTag.upsert({
          where: { userId_name: { userId, name: tag } },
          update: {},
          create: { userId, name: tag },
        })
      }
    }
    if (account !== undefined) updates.account = account

    const updated = await prisma.transaction.update({
      where: { id },
      data: updates,
      include: { category: true },
    })

    return NextResponse.json({
      transaction: {
        id: updated.id,
        merchant: updated.merchant ?? updated.narration,
        date: updated.occurredAt.toISOString().slice(0, 10),
        category: updated.category?.name ?? 'Other',
        account: updated.account ?? 'Main Checking',
        amount: updated.amount,
        type: updated.type === 'credit' ? 'income' : 'expense',
        tags: (() => { try { return JSON.parse(updated.tags) } catch { return [] } })(),
        wealthGroup: updated.wealthGroup ?? null,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN')
      return NextResponse.json({ error: 'Access revoked' }, { status: 403 })
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Transaction PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await requireUserId()
    const { searchParams } = new URL(request.url)
    const id  = searchParams.get('id')
    const ids = searchParams.get('ids')  // comma-separated batch delete

    // Batch delete
    if (ids) {
      const idList = ids.split(',').map(s => s.trim()).filter(Boolean)
      await prisma.transaction.deleteMany({ where: { id: { in: idList }, userId } })
      return NextResponse.json({ success: true, deleted: idList.length })
    }

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const existing = await prisma.transaction.findFirst({ where: { id, userId } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.transaction.delete({ where: { id } })

    // If this was a recurring transaction, rewind the recurring payment's nextDate
    // so it shows as "coming up" again (un-pay it)
    if (existing.narration?.includes('(recurring)') && existing.merchant) {
      const recurringPayment = await prisma.recurringPayment.findFirst({
        where: { userId, name: { equals: existing.merchant, mode: 'insensitive' }, active: true },
      })
      if (recurringPayment) {
        const d = new Date(recurringPayment.nextDate + 'T12:00:00')
        switch (recurringPayment.cadence) {
          case 'weekly':    d.setDate(d.getDate() - 7); break
          case 'biweekly':  d.setDate(d.getDate() - 14); break
          case 'quarterly': d.setMonth(d.getMonth() - 3); break
          case 'annual':    d.setFullYear(d.getFullYear() - 1); break
          default:          d.setMonth(d.getMonth() - 1); break
        }
        await prisma.recurringPayment.update({
          where: { id: recurringPayment.id },
          data: { nextDate: d.toISOString().slice(0, 10) },
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN')
      return NextResponse.json({ error: 'Access revoked' }, { status: 403 })
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Transaction DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 })
  }
}
