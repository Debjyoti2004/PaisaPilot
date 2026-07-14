import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { daysLeftInMonth, daysInMonth } from '@/lib/finance'

export async function GET() {
  try {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    // Find current budget period
    const period = await prisma.budgetPeriod.findFirst({
      where: {
        month: monthStart,
        status: 'active',
      },
      include: {
        envelopes: {
          include: {
            category: true,
          },
        },
      },
    })

    if (!period) {
      return NextResponse.json({
        period: null,
        envelopes: [],
        safeToSpend: 0,
        safePerDay: 0,
        daysLeft: daysLeftInMonth(),
        daysElapsed: now.getDate(),
        totalDays: daysInMonth(),
        totalBudgetUsed: 0,
        savings: { liquid: 0, reserved: 0, locked: 0, total: 0 },
        recentTransactions: [],
        hasSalary: false,
      })
    }

    // Calculate envelope stats
    const envelopes = period.envelopes.map(env => ({
      id: env.id,
      category: {
        id: env.category.id,
        name: env.category.name,
        icon: env.category.icon,
        color: env.category.color,
        kind: env.category.kind,
      },
      allocated: env.allocated,
      spent: env.spent,
      remaining: env.allocated - env.spent,
      percentUsed: env.allocated > 0 ? (env.spent / env.allocated) * 100 : 0,
    }))

    // Calculate safe-to-spend (needs + wants remaining)
    const daysLeft = daysLeftInMonth()
    const spendableEnvelopes = envelopes.filter(e =>
      e.category.kind === 'need' || e.category.kind === 'want'
    )
    const totalSpendableRemaining = spendableEnvelopes.reduce(
      (sum, e) => sum + e.remaining,
      0
    )
    const safeToSpend = Math.max(0, totalSpendableRemaining)
    const safePerDay = daysLeft > 0 ? safeToSpend / daysLeft : 0

    // Total budget used
    const totalAllocated = envelopes.reduce((sum, e) => sum + e.allocated, 0)
    const totalSpent = envelopes.reduce((sum, e) => sum + e.spent, 0)
    const totalBudgetUsed = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0

    // Savings buckets
    const buckets = await prisma.savingsBucket.findMany()
    const savings = {
      liquid: buckets
        .filter(b => b.liquidity === 'liquid')
        .reduce((sum, b) => sum + b.balance, 0),
      reserved: buckets
        .filter(b => b.liquidity === 'reserved')
        .reduce((sum, b) => sum + b.balance, 0),
      locked: buckets
        .filter(b => b.liquidity === 'locked')
        .reduce((sum, b) => sum + b.balance, 0),
      total: buckets.reduce((sum, b) => sum + b.balance, 0),
      buckets: buckets,
    }

    // Recent transactions
    const recentTransactions = await prisma.transaction.findMany({
      where: {
        occurredAt: { gte: monthStart, lte: monthEnd },
      },
      include: {
        category: true,
      },
      orderBy: { occurredAt: 'desc' },
      take: 5,
    })

    const monthLabel = now.toLocaleDateString('en-IN', {
      month: 'long',
      year: 'numeric',
    })

    return NextResponse.json({
      period: {
        id: period.id,
        month: period.month,
        monthLabel,
        incomeTotal: period.incomeTotal,
        expectedIncome: period.expectedIncome,
        status: period.status,
      },
      envelopes,
      safeToSpend: Math.round(safeToSpend),
      safePerDay: Math.round(safePerDay),
      daysLeft,
      daysElapsed: now.getDate(),
      totalDays: daysInMonth(),
      totalBudgetUsed: Math.round(totalBudgetUsed),
      savings,
      recentTransactions: recentTransactions.map(t => ({
        id: t.id,
        narration: t.narration,
        amount: t.amount,
        type: t.type,
        occurredAt: t.occurredAt,
        category: t.category,
      })),
      hasSalary: period.incomeTotal > 0,
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
