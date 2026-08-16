import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'
import { runSplitEngine, SplitRuleInput, AdjustRuleInput } from '@/lib/split-engine'

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId()
    const body = await request.json()
    const { amount, sources } = body

    let totalAmount: number
    let incomeItems: Array<{ label: string; amount: number }> = []

    if (sources && Array.isArray(sources) && sources.length > 0) {
      incomeItems = sources.filter((s: { label: string; amount: number }) => s.amount > 0)
      totalAmount = incomeItems.reduce((sum: number, s: { label: string; amount: number }) => sum + s.amount, 0)
    } else if (amount) {
      totalAmount = parseFloat(amount)
      incomeItems = [{ label: 'Salary', amount: totalAmount }]
    } else {
      return NextResponse.json({ error: 'Valid amount or sources required' }, { status: 400 })
    }

    if (isNaN(totalAmount) || totalAmount <= 0) {
      return NextResponse.json({ error: 'Total income must be greater than 0' }, { status: 400 })
    }

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const config = await prisma.splitConfig.findFirst({
      where: { userId, active: true },
      include: { rules: { include: { category: true } }, adjustRule: true },
    })

    if (!config) return NextResponse.json({ error: 'No active split config found' }, { status: 404 })

    const settings = await prisma.appSettings.findUnique({ where: { userId } })
    const expectedSalary = settings?.expectedSalary ?? 0

    const rules: SplitRuleInput[] = config.rules.map(rule => ({
      id: rule.id, categoryId: rule.categoryId, categoryName: rule.category.name,
      mode: rule.mode as 'fixed' | 'percent' | 'remainder', value: rule.value,
      priority: rule.priority, minFloor: rule.minFloor, maxCap: rule.maxCap,
      flexRank: rule.flexRank, kind: rule.category.kind,
    }))

    let adjustRule: AdjustRuleInput | undefined
    if (config.adjustRule) {
      adjustRule = {
        surplusSplit: config.adjustRule.surplusSplit as AdjustRuleInput['surplusSplit'],
        shortfallOrder: config.adjustRule.shortfallOrder as string[],
      }
    }

    const splitResult = runSplitEngine(totalAmount, rules, expectedSalary, adjustRule)

    let period = await prisma.budgetPeriod.findFirst({
      where: { userId, month: monthStart, configId: config.id },
    })

    if (period) {
      period = await prisma.budgetPeriod.update({
        where: { id: period.id },
        data: { incomeTotal: totalAmount, expectedIncome: expectedSalary },
      })
      await prisma.envelope.deleteMany({ where: { periodId: period.id } })
    } else {
      period = await prisma.budgetPeriod.create({
        data: { userId, configId: config.id, month: monthStart, incomeTotal: totalAmount, expectedIncome: expectedSalary, status: 'active' },
      })
    }

    await prisma.envelope.createMany({
      data: splitResult.envelopes.map(env => ({
        periodId: period!.id, categoryId: env.categoryId, allocated: env.allocated, spent: 0,
      })),
    })

    const incomeCategory = await prisma.category.findFirst({ where: { kind: 'income' } })
    if (incomeCategory) {
      for (const src of incomeItems) {
        await prisma.transaction.create({
          data: {
            userId,
            categoryId: incomeCategory.id, amount: src.amount, type: 'credit',
            narration: src.label, source: 'manual', occurredAt: now,
          },
        })
      }
    }

    return NextResponse.json({ success: true, period: { id: period.id, month: period.month }, splitResult, totalAmount })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Salary confirm error:', error)
    return NextResponse.json({ error: 'Failed to confirm salary' }, { status: 500 })
  }
}
