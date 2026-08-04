import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'
import { getEffectiveUserId } from '@/lib/family'

export const dynamic = 'force-dynamic'

function getPeriodRange(period: string, salaryCarryover = false): { start: Date | null; end: Date } {
  const now = new Date()
  // With salary carryover: "this month" also includes income from day 25 of the previous month
  // so that salary paid on July 28-31 counts as August income
  const carryoverDay = salaryCarryover ? 25 : 1
  switch (period) {
    case 'this-month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      if (salaryCarryover) {
        // Include last week of previous month (day 25 onwards)
        start.setDate(-5) // day 25 of previous month (30-5=25 for months with 30 days; adjusts automatically)
        start.setFullYear(now.getFullYear())
        start.setMonth(now.getMonth() - 1)
        start.setDate(carryoverDay)
      }
      return { start, end: now }
    }
    case 'last-month': {
      const s = salaryCarryover
        ? new Date(now.getFullYear(), now.getMonth() - 2, carryoverDay)
        : new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const e = new Date(now.getFullYear(), now.getMonth(), salaryCarryover ? carryoverDay - 1 : 0, 23, 59, 59)
      return { start: s, end: e }
    }
    case 'last-3-months':
      return { start: new Date(now.getFullYear(), now.getMonth() - 3, 1), end: now }
    case 'last-6-months':
      return { start: new Date(now.getFullYear(), now.getMonth() - 6, 1), end: now }
    case 'this-year':
      return { start: new Date(now.getFullYear(), 0, 1), end: now }
    default:
      return { start: null, end: now }
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getEffectiveUserId(request, { allowViewAs: true })
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') ?? 'all-time'

    const settings = await prisma.appSettings.findUnique({ where: { userId } })
    const { start, end } = getPeriodRange(period, settings?.salaryCarryover ?? false)
    const dateFilter = start ? { occurredAt: { gte: start, lte: end } } : {}

    // Fetch period transactions
    const txns = await prisma.transaction.findMany({
      where: { userId, ...dateFilter },
      include: { category: true },
      orderBy: { occurredAt: 'desc' },
    })

    const income   = txns.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0)
    const expenses = txns.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0)
    const savingsRate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0

    // Cash flow — last 7 calendar months (always from all data)
    const allTxns = await prisma.transaction.findMany({
      where: { userId },
      include: { category: true },
      orderBy: { occurredAt: 'desc' },
    })
    const cashFlow: { month: string; income: number; spending: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(1); d.setMonth(d.getMonth() - i)
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1)
      const mEnd   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
      const mt = allTxns.filter(t => t.occurredAt >= mStart && t.occurredAt <= mEnd)
      cashFlow.push({
        month: d.toLocaleDateString('en-US', { month: 'short' }),
        income:   mt.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0),
        spending: mt.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0),
      })
    }

    // Spending by category (debit txns in period)
    const catMap: Record<string, { name: string; amount: number; color: string }> = {}
    txns.filter(t => t.type === 'debit').forEach(t => {
      const name = t.category?.name ?? 'Other'
      if (!catMap[name]) catMap[name] = { name, amount: 0, color: t.category?.color ?? '#6558D3' }
      catMap[name].amount += t.amount
    })
    const spendingByCategory = Object.values(catMap)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8)
      .map(c => ({ ...c, pct: expenses > 0 ? Math.round((c.amount / expenses) * 100) : 0 }))

    const highestSpending = spendingByCategory[0] ?? null

    // Recent 5 transactions
    const recentTransactions = txns.slice(0, 5).map(t => ({
      id: t.id,
      merchant: t.merchant ?? t.narration,
      date: t.occurredAt.toISOString().slice(0, 10),
      category: t.category?.name ?? 'Other',
      account: t.account ?? 'Main Checking',
      amount: t.amount,
      type: t.type === 'credit' ? 'income' : 'expense',
      tags: (() => { try { return JSON.parse(t.tags) } catch { return [] } })(),
    }))

    // Net worth (settings already loaded above)
    const netWorth = settings?.netWorthConfigured
      ? { assets: settings.assetsTotal, liabilities: settings.liabilitiesTotal, value: settings.assetsTotal - settings.liabilitiesTotal }
      : null

    // Coming up — recurring payments due in next 14 days
    const today = new Date().toISOString().slice(0, 10)
    const in14 = new Date(); in14.setDate(in14.getDate() + 14)
    const in14Str = in14.toISOString().slice(0, 10)
    const comingUp = await prisma.recurringPayment.findMany({
      where: { userId, active: true, nextDate: { gte: today, lte: in14Str } },
      orderBy: { nextDate: 'asc' },
      take: 5,
    })

    const needsReview = txns.filter(t => t.category?.name === 'Needs review').length

    // Persist selected period
    await prisma.appSettings.upsert({
      where: { userId },
      update: { selectedPeriod: period },
      create: {
        userId, selectedPeriod: period,
        expectedSalary: 37000, savingsFloor: 3000, currency: 'INR',
        salaryKeywords: 'salary,credit,sal', emailReports: false, reportEmail: '',
        assetsTotal: 0, liabilitiesTotal: 0, netWorthConfigured: false, driveEnabled: false,
      },
    })

    return NextResponse.json({
      period, income, expenses, savingsRate,
      cashFlow, spendingByCategory, highestSpending,
      recentTransactions, netWorth,
      comingUp: comingUp.map(r => ({
        id: r.id, name: r.name, category: r.category,
        amount: r.amount, nextDate: r.nextDate, cadence: r.cadence,
      })),
      needsReview,
      savedPeriod: settings?.selectedPeriod ?? 'all-time',
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN')
      return NextResponse.json({ error: 'Access revoked' }, { status: 403 })
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Dashboard GET error:', error)
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 })
  }
}
