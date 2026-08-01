import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'
import { NEEDS_CATS, WANTS_CATS, INVEST_API_CATS as INVEST_CATS } from '@/config/categories'

export const dynamic = 'force-dynamic'

// Map transaction category names → exact instrument names used in BRACKET_CONFIGS
const CAT_TO_INSTRUMENT: Record<string, string> = {
  'Mutual Funds':   'Mutual Funds (SIP)',
  'Stocks':         'Stocks',
  'EPF/NPS':        'EPF/NPS',
  'EPF':            'EPF/NPS',
  'NPS':            'EPF/NPS',
  'Gold':           'Digital Gold',
  'Fixed Deposits': 'Fixed Deposits',
  'Debt Funds':     'Debt Fund',
}

function getGroupByCategory(catName: string): 'needs' | 'wants' | 'investments' | null {
  if (NEEDS_CATS.includes(catName)) return 'needs'
  if (WANTS_CATS.includes(catName)) return 'wants'
  if (INVEST_CATS.includes(catName)) return 'investments'
  return null
}

export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId()
    const { searchParams } = new URL(request.url)
    const plan = await prisma.wealthPlan.findUnique({
      where: { userId },
      include: { overrides: true },
    })

    // Fetch actual spending for the requested month (default: current month)
    const monthParam = searchParams.get('month') // YYYY-MM
    const now = new Date()
    const [yr, mo] = monthParam
      ? monthParam.split('-').map(Number)
      : [now.getFullYear(), now.getMonth() + 1]
    const monthStart = new Date(yr, mo - 1, 1)
    const monthEnd   = new Date(yr, mo, 0, 23, 59, 59)

    const txns = await prisma.transaction.findMany({
      where: { userId, type: 'debit', occurredAt: { gte: monthStart, lte: monthEnd } },
      include: { category: true },
    })

    // Determine group using wealthGroup field OR category name
    const getGroup = (t: typeof txns[0]) =>
      (t.wealthGroup as 'needs' | 'wants' | 'investments' | null) ??
      getGroupByCategory(t.category?.name ?? '')

    const actualNeeds   = txns.filter(t => getGroup(t) === 'needs').reduce((s, t) => s + t.amount, 0)
    const actualWants   = txns.filter(t => getGroup(t) === 'wants').reduce((s, t) => s + t.amount, 0)
    const actualInvest  = txns.filter(t => getGroup(t) === 'investments').reduce((s, t) => s + t.amount, 0)

    // Per-category spending for Allocation tab detail
    const catMap: Record<string, number> = {}
    const investByInstrument: Record<string, number> = {}
    txns.forEach(t => {
      const name = t.category?.name ?? 'Other'
      const g = getGroup(t)
      if (g === 'needs' || g === 'wants') {
        catMap[name] = (catMap[name] ?? 0) + t.amount
      }
      if (g === 'investments') {
        const instrument = CAT_TO_INSTRUMENT[name]
        if (instrument) {
          investByInstrument[instrument] = (investByInstrument[instrument] ?? 0) + t.amount
        }
      }
    })

    const CADENCE_MONTHLY: Record<string, number> = {
      weekly: 4.33, biweekly: 2.17, monthly: 1, quarterly: 1/3, annual: 1/12,
    }
    const recurringPayments = await prisma.recurringPayment.findMany({
      where: { userId, active: true }
    })
    const recurringByCat: Record<string, number> = {}
    for (const r of recurringPayments) {
      const monthly = r.amount * (CADENCE_MONTHLY[r.cadence] ?? 1)
      recurringByCat[r.category] = (recurringByCat[r.category] ?? 0) + monthly
    }

    return NextResponse.json({
      plan: plan ?? null,
      actuals: { needs: actualNeeds, wants: actualWants, investments: actualInvest },
      catActuals: catMap,
      investByInstrument,
      month: `${yr}-${String(mo).padStart(2, '0')}`,
      currentMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      recurringByCat,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await requireUserId()
    const body = await request.json()
    const { startingSalary, startingAge, incrementRate, inflationRate, extraMonthlyInvest, bracket } = body

    const plan = await prisma.wealthPlan.upsert({
      where: { userId },
      update: { startingSalary, startingAge, incrementRate, inflationRate, extraMonthlyInvest: extraMonthlyInvest ?? 0, bracket: bracket ?? 1 },
      create: { userId, startingSalary, startingAge, incrementRate: incrementRate ?? 0.1, inflationRate: inflationRate ?? 0.06, extraMonthlyInvest: extraMonthlyInvest ?? 0, bracket: bracket ?? 1 },
      include: { overrides: true },
    })

    return NextResponse.json({ plan })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
