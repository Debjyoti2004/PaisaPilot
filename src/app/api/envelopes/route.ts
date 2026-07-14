import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const monthParam = searchParams.get('month') // e.g. "2026-07"

    let monthStart: Date
    if (monthParam) {
      const [year, month] = monthParam.split('-').map(Number)
      monthStart = new Date(year, month - 1, 1)
    } else {
      const now = new Date()
      monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    const period = await prisma.budgetPeriod.findFirst({
      where: { month: monthStart, status: 'active' },
      include: {
        envelopes: {
          include: {
            category: true,
            transactions: {
              orderBy: { occurredAt: 'desc' },
              take: 10,
            },
          },
        },
      },
    })

    if (!period) {
      return NextResponse.json({ envelopes: [], period: null })
    }

    const envelopes = period.envelopes.map(env => ({
      id: env.id,
      category: env.category,
      allocated: env.allocated,
      spent: env.spent,
      remaining: env.allocated - env.spent,
      percentUsed: env.allocated > 0 ? (env.spent / env.allocated) * 100 : 0,
      rollover: env.rollover,
      recentTransactions: env.transactions,
    }))

    return NextResponse.json({
      envelopes,
      period: {
        id: period.id,
        month: period.month,
        incomeTotal: period.incomeTotal,
        expectedIncome: period.expectedIncome,
      },
    })
  } catch (error) {
    console.error('Envelopes GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch envelopes' }, { status: 500 })
  }
}
