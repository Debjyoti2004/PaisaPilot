import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { runSplitEngine, SplitRuleInput, AdjustRuleInput } from '@/lib/split-engine'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, simulate = false } = body

    if (!amount || isNaN(parseFloat(amount))) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 })
    }

    const salaryAmount = parseFloat(amount)

    // Get active split config with rules
    const config = await prisma.splitConfig.findFirst({
      where: { active: true },
      include: {
        rules: {
          include: {
            category: true,
          },
        },
        adjustRule: true,
      },
    })

    if (!config) {
      return NextResponse.json({ error: 'No active split config found' }, { status: 404 })
    }

    const settings = await prisma.appSettings.findUnique({
      where: { id: 'singleton' },
    })

    const expectedSalary = settings?.expectedSalary ?? 37000

    // Build rule inputs
    const rules: SplitRuleInput[] = config.rules.map(rule => ({
      id: rule.id,
      categoryId: rule.categoryId,
      categoryName: rule.category.name,
      mode: rule.mode as 'fixed' | 'percent' | 'remainder',
      value: rule.value,
      priority: rule.priority,
      minFloor: rule.minFloor,
      maxCap: rule.maxCap,
      flexRank: rule.flexRank,
      kind: rule.category.kind,
    }))

    let adjustRule: AdjustRuleInput | undefined
    if (config.adjustRule) {
      const ar = config.adjustRule
      adjustRule = {
        surplusSplit: ar.surplusSplit as AdjustRuleInput['surplusSplit'],
        shortfallOrder: ar.shortfallOrder as string[],
      }
    }

    // Run split engine
    const splitResult = runSplitEngine(salaryAmount, rules, expectedSalary, adjustRule)

    if (simulate) {
      return NextResponse.json({ splitResult, config: { name: config.name } })
    }

    return NextResponse.json({ splitResult, config: { name: config.name } })
  } catch (error) {
    console.error('Salary POST error:', error)
    return NextResponse.json({ error: 'Failed to process salary' }, { status: 500 })
  }
}
