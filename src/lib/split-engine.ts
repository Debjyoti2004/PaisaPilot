/**
 * Split Engine — core allocation logic for PaisaPilot
 * Determines how salary is distributed across envelopes
 */

export interface SplitRuleInput {
  id: string
  categoryId: string
  categoryName: string
  mode: 'fixed' | 'percent' | 'remainder'
  value: number
  priority: number
  minFloor?: number | null
  maxCap?: number | null
  flexRank: number
  kind: string // category kind: need|want|save_short|invest_long|goal|income
}

export interface AdjustRuleInput {
  surplusSplit: {
    sip: number
    emergency: number
    goal: number
    fun: number
  }
  shortfallOrder: string[]
}

export interface EnvelopeAllocation {
  categoryId: string
  categoryName: string
  allocated: number
  mode: string
  flexRank: number
  kind: string
}

export interface SplitResult {
  envelopes: EnvelopeAllocation[]
  total: number
  isSurplus: boolean
  isShortfall: boolean
  surplus: number
  shortfall: number
  surplusAllocation?: Record<string, number>
  shortfallCuts?: Record<string, number>
}

export function runSplitEngine(
  salaryAmount: number,
  rules: SplitRuleInput[],
  expectedSalary: number,
  adjustRule?: AdjustRuleInput
): SplitResult {
  const isSurplus = salaryAmount > expectedSalary
  const isShortfall = salaryAmount < expectedSalary
  const surplus = isSurplus ? salaryAmount - expectedSalary : 0
  const shortfall = isShortfall ? expectedSalary - salaryAmount : 0

  // Sort rules by priority
  const sorted = [...rules].sort((a, b) => a.priority - b.priority)

  let remaining = salaryAmount
  const envelopes: EnvelopeAllocation[] = []

  // Identify fixed and percent rules (not remainder)
  const fixedRules = sorted.filter(r => r.mode === 'fixed')
  const percentRules = sorted.filter(r => r.mode === 'percent')
  const remainderRules = sorted.filter(r => r.mode === 'remainder')

  // Step 1: Allocate fixed rules by priority
  for (const rule of fixedRules) {
    let amount = rule.value

    // Shortfall handling: cut wants by flexRank (lower flexRank = cut first)
    if (isShortfall && adjustRule && rule.kind === 'want') {
      const cutOrder = adjustRule.shortfallOrder
      const pos = cutOrder.indexOf(rule.categoryName)
      if (pos !== -1) {
        // Reduce proportionally, cutting lowest flexRank first
        const cutFactor = Math.max(0, Math.min(1, remaining / (salaryAmount * 0.6)))
        amount = Math.max(rule.minFloor ?? 0, amount * cutFactor)
      }
    }

    amount = Math.min(amount, remaining)
    amount = Math.max(0, amount)

    if (rule.maxCap !== null && rule.maxCap !== undefined) {
      amount = Math.min(amount, rule.maxCap)
    }

    remaining -= amount
    envelopes.push({
      categoryId: rule.categoryId,
      categoryName: rule.categoryName,
      allocated: Math.round(amount),
      mode: rule.mode,
      flexRank: rule.flexRank,
      kind: rule.kind,
    })
  }

  // Step 2: Allocate percent rules on remaining
  const baseForPercent = remaining
  for (const rule of percentRules) {
    let amount = (rule.value / 100) * baseForPercent
    amount = Math.min(amount, remaining)
    amount = Math.max(0, amount)

    remaining -= amount
    envelopes.push({
      categoryId: rule.categoryId,
      categoryName: rule.categoryName,
      allocated: Math.round(amount),
      mode: rule.mode,
      flexRank: rule.flexRank,
      kind: rule.kind,
    })
  }

  // Step 3: Remainder rules
  for (const rule of remainderRules) {
    const amount = Math.max(0, remaining)
    remaining = 0
    envelopes.push({
      categoryId: rule.categoryId,
      categoryName: rule.categoryName,
      allocated: Math.round(amount),
      mode: rule.mode,
      flexRank: rule.flexRank,
      kind: rule.kind,
    })
  }

  // Step 4: Surplus allocation
  let surplusAllocation: Record<string, number> | undefined
  if (isSurplus && adjustRule) {
    const split = adjustRule.surplusSplit
    surplusAllocation = {
      'Nifty 50 SIP': Math.round((surplus * split.sip) / 100),
      'Emergency Fund': Math.round((surplus * split.emergency) / 100),
      'Travel Goal': Math.round((surplus * split.goal) / 100),
      'Fun / Misc': Math.round((surplus * split.fun) / 100),
    }

    // Add surplus to corresponding envelopes
    for (const env of envelopes) {
      if (surplusAllocation[env.categoryName]) {
        env.allocated += surplusAllocation[env.categoryName]
      }
    }
  }

  const total = envelopes.reduce((sum, e) => sum + e.allocated, 0)

  return {
    envelopes,
    total,
    isSurplus,
    isShortfall,
    surplus,
    shortfall,
    surplusAllocation,
  }
}

/**
 * Calculate safe-to-spend amount across need envelopes
 */
export function calcSafeToSpend(
  envelopes: { categoryName: string; allocated: number; spent: number; kind: string }[],
  daysLeft: number
): { safeToSpend: number; safePerDay: number } {
  const needEnvelopes = envelopes.filter(e =>
    e.kind === 'need' || e.kind === 'want'
  )
  const totalRemaining = needEnvelopes.reduce(
    (sum, e) => sum + (e.allocated - e.spent),
    0
  )
  const safePerDay = daysLeft > 0 ? totalRemaining / daysLeft : 0
  return {
    safeToSpend: Math.max(0, totalRemaining),
    safePerDay: Math.max(0, safePerDay),
  }
}
