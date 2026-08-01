import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Advance nextDate by one cadence period
function advanceDate(dateStr: string, cadence: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  switch (cadence) {
    case 'weekly':    d.setDate(d.getDate() + 7); break
    case 'biweekly':  d.setDate(d.getDate() + 14); break
    case 'quarterly': d.setMonth(d.getMonth() + 3); break
    case 'annual':    d.setFullYear(d.getFullYear() + 1); break
    default:          d.setMonth(d.getMonth() + 1); break // monthly
  }
  return d.toISOString().slice(0, 10)
}

// Auto-detect recurring patterns from transaction history
async function detectPatterns(userId: string) {
  // Get all debit transactions in last 90 days
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)
  const txns = await prisma.transaction.findMany({
    where: { userId, type: 'debit', occurredAt: { gte: cutoff } },
    include: { category: true },
    orderBy: { occurredAt: 'asc' },
  })

  // Get dismissed patterns and already-confirmed ones
  const [dismissed, confirmed] = await Promise.all([
    prisma.dismissedPattern.findMany({ where: { userId } }),
    prisma.recurringPayment.findMany({ where: { userId } }),
  ])
  const dismissedKeys = new Set(dismissed.map(d => d.patternKey))
  const confirmedKeys = new Set(confirmed.map(r => `${r.name}|${r.amount.toFixed(0)}`))

  // Group by merchant+amount bucket
  type Group = { dates: Date[]; category: string }
  const groups: Record<string, Group> = {}
  for (const t of txns) {
    const merchant = (t.merchant ?? t.narration ?? '').trim()
    const amtKey   = Math.round(t.amount / 10) * 10 // bucket to nearest 10
    const key      = `${merchant.toLowerCase()}|${amtKey}`
    if (!groups[key]) groups[key] = { dates: [], category: t.category?.name ?? 'Other' }
    groups[key].dates.push(t.occurredAt)
  }

  const suggestions: {
    patternKey: string; name: string; amount: number; cadence: string; category: string; confidence: number; occurrences: number; nextDate: string
  }[] = []

  for (const [key, g] of Object.entries(groups)) {
    if (g.dates.length < 2) continue
    if (dismissedKeys.has(key)) continue

    const parts = key.split('|')
    const merchantName = parts.slice(0, -1).join('|')
    const amount = parseInt(parts[parts.length - 1] ?? '0', 10)
    const confirmedKey = `${merchantName}|${amount}`
    if (confirmedKeys.has(confirmedKey)) continue

    // Estimate cadence from average gap
    const gaps: number[] = []
    for (let i = 1; i < g.dates.length; i++) {
      gaps.push((g.dates[i].getTime() - g.dates[i-1].getTime()) / 86400000)
    }
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length

    let cadence = 'monthly'
    let confidence = 0.7
    if (avgGap <= 9) { cadence = 'weekly'; confidence = 0.85 }
    else if (avgGap <= 18) { cadence = 'biweekly'; confidence = 0.8 }
    else if (avgGap <= 45) { cadence = 'monthly'; confidence = 0.85 }
    else if (avgGap <= 100) { cadence = 'quarterly'; confidence = 0.7 }
    else { cadence = 'annual'; confidence = 0.6 }

    const displayName = merchantName
      .split(/[\s_-]+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')

    const lastDate = g.dates[g.dates.length - 1]!
    const nextDate = advanceDate(lastDate.toISOString().slice(0, 10), cadence)
    suggestions.push({ patternKey: key, name: displayName, amount, cadence, category: g.category, confidence, occurrences: g.dates.length, nextDate })
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 20)
}

export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') ?? 'all' // all | subs

    const where = type === 'subs'
      ? { userId, isSubType: true }
      : { userId }

    const [payments, suggestions] = await Promise.all([
      prisma.recurringPayment.findMany({ where, orderBy: { nextDate: 'asc' } }),
      detectPatterns(userId),
    ])

    return NextResponse.json({ payments, suggestions })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Recurring GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId()
    const body = await request.json()
    const { name, amount, cadence, category, account, isSubType, nextDate, patternKey } = body

    if (!name || !amount || !cadence) {
      return NextResponse.json({ error: 'name, amount, cadence required' }, { status: 400 })
    }

    const dateStr = nextDate ?? new Date().toISOString().slice(0, 10)

    const payment = await prisma.recurringPayment.create({
      data: {
        userId, name, amount: parseFloat(amount), cadence,
        category: category ?? 'Other',
        account: account ?? null,
        isSubType: isSubType ?? false,
        nextDate: dateStr,
        active: true,
      },
    })

    // If we confirmed a suggested pattern, dismiss it
    if (patternKey) {
      await prisma.dismissedPattern.upsert({
        where: { userId_patternKey: { userId, patternKey } },
        update: {},
        create: { userId, patternKey },
      })
    }

    return NextResponse.json({ payment }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await requireUserId()
    const body = await request.json()
    const { id, action, ...updates } = body

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const existing = await prisma.recurringPayment.findFirst({ where: { id, userId } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (action === 'mark-paid') {
      // Advance from today, not from stored nextDate.
      const now = new Date()
      const todayStr = now.toISOString().slice(0, 10)
      const next = advanceDate(todayStr, existing.cadence)
      const NEEDS_CATS = ['Housing','Groceries','Utilities','Transportation','Insurance','Health','Subscriptions']
      const WANTS_CATS = ['Dining','Shopping','Entertainment','Travel','Other']
      const wealthGroup = NEEDS_CATS.includes(existing.category) ? 'needs'
        : WANTS_CATS.includes(existing.category) ? 'wants'
        : existing.category === 'Investments' ? 'investments' : null

      const category = await prisma.category.findFirst({
        where: { name: { equals: existing.category, mode: 'insensitive' } },
      }) ?? await prisma.category.findFirst({
        where: { name: { equals: 'Other', mode: 'insensitive' } },
      })

      const payment = await prisma.recurringPayment.update({ where: { id }, data: { nextDate: next } })

      if (category) {
        // useNextMonthDate: app tracks as 1st of next month, but stores actual paid date
        const useNextMonthDate = body.useNextMonthDate === true
        const occurredAt = useNextMonthDate
          ? new Date(now.getFullYear(), now.getMonth() + 1, 1)
          : now
        const actualPaidDate = useNextMonthDate ? now : null

        await prisma.transaction.create({
          data: {
            userId,
            categoryId: category.id,
            amount: existing.amount,
            type: 'debit',
            narration: `${existing.name} (recurring)`,
            merchant: existing.name,
            occurredAt,
            account: existing.account ?? 'Savings Account',
            ...(wealthGroup ? { wealthGroup } : {}),
            ...(actualPaidDate ? { actualPaidDate } : {}),
          },
        })
      }

      return NextResponse.json({ payment })
    }

    const payment = await prisma.recurringPayment.update({
      where: { id },
      data: {
        name:      updates.name      ?? undefined,
        amount:    updates.amount    !== undefined ? parseFloat(updates.amount) : undefined,
        cadence:   updates.cadence   ?? undefined,
        category:  updates.category  ?? undefined,
        nextDate:  updates.nextDate  ?? undefined,
        active:    updates.active    !== undefined ? updates.active : undefined,
        isSubType: updates.isSubType !== undefined ? updates.isSubType : undefined,
      },
    })
    return NextResponse.json({ payment })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await requireUserId()
    const { searchParams } = new URL(request.url)
    const id          = searchParams.get('id')
    const patternKey  = searchParams.get('patternKey')

    if (patternKey) {
      await prisma.dismissedPattern.upsert({
        where: { userId_patternKey: { userId, patternKey } },
        update: {},
        create: { userId, patternKey },
      })
      return NextResponse.json({ success: true })
    }

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const existing = await prisma.recurringPayment.findFirst({ where: { id, userId } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.recurringPayment.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
