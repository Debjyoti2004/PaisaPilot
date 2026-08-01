// ── Centralized category configuration ───────────────────────────────────────
// All pages import from here. Change a category name once → updates everywhere.

export type WealthGroup = 'needs' | 'wants' | 'investments' | 'income'

export const NEEDS_CATS: string[] = [
  'Housing', 'Groceries', 'Utilities', 'Transportation',
  'Insurance', 'Health', 'Subscriptions',
]

export const WANTS_CATS: string[] = [
  'Dining', 'Shopping', 'Entertainment', 'Travel', 'Other',
]

export const INV_CATS: string[] = [
  'Mutual Funds', 'Stocks', 'EPF/NPS', 'Gold',
  'Fixed Deposits', 'Debt Funds',
]

export const INCOME_CATS: string[] = [
  'Salary', 'Freelancing', 'Bonus', 'Gift',
  'Part-time', 'Rental Income', 'Interest', 'Dividends', 'Other Income',
]

// Extra category names the API uses for lookup (aliases / legacy names)
export const INVEST_API_CATS: string[] = [
  ...INV_CATS, 'Investments', 'Savings', 'EPF', 'NPS',
]

export const ALL_CATS: string[] = [...NEEDS_CATS, ...WANTS_CATS, ...INV_CATS]

export const GROUP_DEFAULT_CAT: Record<WealthGroup, string> = {
  needs:       'Groceries',
  wants:       'Shopping',
  investments: 'Mutual Funds',
  income:      'Salary',
}

export const GROUP_META: Record<WealthGroup, { label: string; emoji: string; color: string; bg: string }> = {
  needs:       { label: 'Needs',       emoji: '🏠', color: '#6558D3', bg: '#ede9fe' },
  wants:       { label: 'Wants',       emoji: '🛍️', color: '#f97316', bg: '#fff7ed' },
  investments: { label: 'Investments', emoji: '📈', color: '#10b981', bg: '#f0fdf4' },
  income:      { label: 'Income',      emoji: '💰', color: '#16a34a', bg: '#f0fdf4' },
}

export function catToGroup(cat: string): WealthGroup | null {
  if ((NEEDS_CATS as readonly string[]).includes(cat)) return 'needs'
  if ((WANTS_CATS as readonly string[]).includes(cat)) return 'wants'
  if ((INV_CATS   as readonly string[]).includes(cat)) return 'investments'
  return null
}

export function catsForGroup(wg: string | null | undefined): string[] {
  if (wg === 'needs')       return [...NEEDS_CATS]
  if (wg === 'wants')       return [...WANTS_CATS]
  if (wg === 'investments') return [...INV_CATS]
  if (wg === 'income')      return [...INCOME_CATS]
  return [...ALL_CATS]
}
