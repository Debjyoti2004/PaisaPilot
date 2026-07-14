import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'
import { runSplitEngine, SplitRuleInput, AdjustRuleInput } from '@/lib/split-engine'

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId()
    const body = await request.json()
    const { amount, simulate = false } = body

    if (!amount || isNaN(parseFloat(amount))) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 })
    }

    const salaryAmount = parseFloat(amount)

    const config = await prisma.splitConfig.findFirst({
      where: { userId, active: true },
      include: { rules: { include: { category: true } }, adjustRule: true },
    })

    if (!config) {
      return NextResponse.json({ error: 'No active split config found' }, { status: 404 })
    }

    const settings = await prisma.appSettings.findUnique({ where: { userId } })
    const expectedSalary = settings?.expectedSalary ?? 37000

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

    const splitResult = runSplitEngine(salaryAmount, rules, expectedSalary, adjustRule)

    if (simulate) {
      return NextResponse.json({ splitResult, config: { name: config.name } })
    }

    return NextResponse.json({ splitResult, config: { name: config.name } })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Salary POST error:', error)
    return NextResponse.json({ error: 'Failed to process salary' }, { status: 500 })
  }
}
