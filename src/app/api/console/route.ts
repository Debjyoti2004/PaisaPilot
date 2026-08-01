import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'

export const dynamic = 'force-dynamic'

function getPeriodFilter(period: string) {
  const now = new Date()
  switch (period) {
    case 'this-month':    return { gte: new Date(now.getFullYear(), now.getMonth(), 1) }
    case 'last-month':    return { gte: new Date(now.getFullYear(), now.getMonth() - 1, 1), lte: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59) }
    case 'last-3-months': return { gte: new Date(now.getFullYear(), now.getMonth() - 3, 1) }
    case 'last-6-months': return { gte: new Date(now.getFullYear(), now.getMonth() - 6, 1) }
    case 'this-year':     return { gte: new Date(now.getFullYear(), 0, 1) }
    default:              return undefined
  }
}

// Warikoo wealth group categories
const NEEDS_CATS  = ['Housing', 'Groceries', 'Utilities', 'Transportation', 'Insurance', 'Health', 'Subscriptions']
const WANTS_CATS  = ['Dining', 'Shopping', 'Entertainment', 'Travel', 'Other']
const INVEST_CATS = ['Investments', 'Savings', 'EPF', 'NPS', 'Mutual Funds', 'Stocks', 'Gold']

function getGroup(catName: string) {
  if (NEEDS_CATS.includes(catName)) return 'needs'
  if (WANTS_CATS.includes(catName)) return 'wants'
  if (INVEST_CATS.includes(catName)) return 'investments'
  return 'other'
}

export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId()
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') ?? 'this-month'
    const dateFilter = getPeriodFilter(period)

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    // Fetch all transactions in period
    const txns = await prisma.transaction.findMany({
      where: { userId, occurredAt: dateFilter ? dateFilter : undefined, type: 'debit' },
      include: { category: true },
      orderBy: { occurredAt: 'desc' },
    })

    // Fetch incomes
    const incomeTxns = await prisma.transaction.findMany({
      where: { userId, occurredAt: dateFilter ? dateFilter : undefined, type: 'credit' },
      include: { category: true },
    })

    // Group spending by wealth group
    const byGroup: Record<string, number> = { needs: 0, wants: 0, investments: 0, other: 0 }
    const byCategory: Record<string, { name: string; amount: number; count: number; group: string }> = {}

    for (const t of txns) {
      const cat = t.category?.name ?? 'Other'
      const group = t.wealthGroup ?? getGroup(cat)
      byGroup[group] = (byGroup[group] ?? 0) + t.amount
      if (!byCategory[cat]) byCategory[cat] = { name: cat, amount: 0, count: 0, group }
      byCategory[cat].amount += t.amount
      byCategory[cat].count++
    }

    const totalIncome   = incomeTxns.reduce((s, t) => s + t.amount, 0)
    const totalExpenses = txns.reduce((s, t) => s + t.amount, 0)
    const savings       = totalIncome - totalExpenses

    // Upcoming recurring payments (next 30 days, using nextDate string YYYY-MM-DD)
    const todayStr = now.toISOString().slice(0, 10)
    const in30Str  = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const upcomingPayments = await prisma.recurringPayment.findMany({
      where: {
        userId,
        active: true,
        nextDate: { gte: todayStr, lte: in30Str },
      },
      orderBy: { nextDate: 'asc' },
      take: 8,
    })

    // Recent 5 transactions for review
    const needsReview = await prisma.transaction.findMany({
      where: { userId, wealthGroup: null, type: 'debit', occurredAt: { gte: monthStart } },
      include: { category: true },
      orderBy: { occurredAt: 'desc' },
      take: 5,
    })

    // Investment breakdown from this month's tx
    const investTxns = txns.filter(t => getGroup(t.category?.name ?? '') === 'investments')
    const investByCategory = investTxns.reduce<Record<string, number>>((acc, t) => {
      const cat = t.category?.name ?? 'Investments'
      acc[cat] = (acc[cat] ?? 0) + t.amount
      return acc
    }, {})

    // Wealth plan from DB for comparison
    const plan = await prisma.wealthPlan.findUnique({ where: { userId } })

    // Build 6-month trend for spending
    const months: { month: string; income: number; expenses: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const mEnd   = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
      const [inc, exp] = await Promise.all([
        prisma.transaction.aggregate({ where: { userId, type: 'credit', occurredAt: { gte: mStart, lte: mEnd } }, _sum: { amount: true } }),
        prisma.transaction.aggregate({ where: { userId, type: 'debit',  occurredAt: { gte: mStart, lte: mEnd } }, _sum: { amount: true } }),
      ])
      months.push({
        month: `${mStart.toLocaleString('en-IN', { month: 'short' })} ${mStart.getFullYear()}`,
        income: inc._sum.amount ?? 0,
        expenses: exp._sum.amount ?? 0,
      })
    }

    // Insights (compute after plan is fetched so pcts is available)
    const BRACKET_PCTS_INS: Record<number, { needs: number; wants: number; invest: number }> = {
      1: { needs: 0.53, wants: 0.27, invest: 0.20 },
      2: { needs: 0.50, wants: 0.20, invest: 0.20 },
      3: { needs: 0.45, wants: 0.20, invest: 0.20 },
    }
    const pct2 = BRACKET_PCTS_INS[plan?.bracket ?? 2]
    const insights: string[] = []
    if (plan) {
      const plannedNeeds = plan.startingSalary * pct2.needs
      if (byGroup.needs > plannedNeeds * 1.1) {
        insights.push(`Needs spending (₹${Math.round(byGroup.needs).toLocaleString('en-IN')}) is ${Math.round((byGroup.needs / plannedNeeds - 1) * 100)}% over plan.`)
      }
      if (byGroup.wants > plan.startingSalary * pct2.wants * 1.1) {
        insights.push('Wants spending exceeds plan by more than 10%. Review discretionary spending.')
      }
      if (byGroup.investments < plan.startingSalary * pct2.invest * 0.8) {
        insights.push('Investment contributions are below target. Consider SIP top-up.')
      }
    }
    if (savings < 0) {
      insights.push(`Spending exceeded income by ₹${Math.abs(savings).toLocaleString('en-IN')} this period.`)
    }
    if (needsReview.length > 0) {
      insights.push(`${needsReview.length} transactions are uncategorized and need your review.`)
    }
    if (insights.length === 0) {
      insights.push('All categories on track. Great job sticking to the plan!')
    }

    // Bracket-specific percentages
    const BRACKET_PCTS: Record<number, { needs: number; wants: number; invest: number }> = {
      1: { needs: 0.53, wants: 0.27, invest: 0.20 },
      2: { needs: 0.50, wants: 0.20, invest: 0.20 },
      3: { needs: 0.45, wants: 0.20, invest: 0.20 },
    }
    const pcts = BRACKET_PCTS[plan?.bracket ?? 2] ?? BRACKET_PCTS[2]

    return NextResponse.json({
      period,
      summary: { income: totalIncome, expenses: totalExpenses, savings, savingsRate: totalIncome > 0 ? (savings / totalIncome * 100) : 0 },
      byGroup,
      byCategory: Object.values(byCategory).sort((a, b) => b.amount - a.amount).slice(0, 10),
      investBreakdown: Object.entries(investByCategory).map(([k, v]) => ({ name: k, amount: v })),
      trend: months,
      upcomingPayments: upcomingPayments.map(p => ({
        id: p.id, name: p.name, amount: p.amount,
        nextDue: p.nextDate ?? null, category: p.category,
      })),
      needsReview: needsReview.map(t => ({
        id: t.id,
        merchant: t.merchant ?? t.narration,
        amount: t.amount,
        date: t.occurredAt.toISOString().slice(0, 10),
        category: t.category?.name ?? 'Other',
      })),
      insights,
      wealthPlan: plan ? {
        salary: plan.startingSalary,
        plannedNeeds: plan.startingSalary * pcts.needs,
        plannedWants: plan.startingSalary * pcts.wants,
        plannedInvest: plan.startingSalary * pcts.invest,
      } : null,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Console API error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
