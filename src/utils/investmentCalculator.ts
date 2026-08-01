import type {
  Bracket, BracketConfig, CorpusMilestone, CorpusPoint,
  InstrumentMonthly, InvestmentProfile, YearlyRow,
} from '@/types/investment'

export const BRACKET_CONFIGS: Record<Bracket, BracketConfig> = {
  1: {
    id: 1,
    label: 'Bracket 1',
    salaryRange: 'Up to ₹25,000/mo',
    defaultSalary: 25000,
    needsPct: 0.53,
    wantsPct: 0.27,
    investmentPct: 0.20,
    emergencyPct: 0.00,
    monthlyRate: 0.010208,   // 12.25% / 12 (exact Excel value)
    blendedReturn: 12.25,
    instruments: [
      { name: 'Mutual Funds (SIP)', shortName: 'MF',    allocationPct: 0.45,   annualReturn: 15, color: '#6366f1' },
      { name: 'Debt Fund',          shortName: 'Debt',  allocationPct: 0.25,   annualReturn: 8,  color: '#22d3ee' },
      { name: 'Stocks',             shortName: 'Stocks',allocationPct: 0.15,   annualReturn: 15, color: '#10b981' },
      { name: 'Fixed Deposits',     shortName: 'FD',    allocationPct: 0.10,   annualReturn: 7,  color: '#f59e0b' },
      { name: 'Digital Gold',       shortName: 'Gold',  allocationPct: 0.05,   annualReturn: 11, color: '#f97316' },
    ],
    needsBreakdown: [
      { label: 'Housing / Rent',      pct: 0.28 },
      { label: 'Groceries & Food',    pct: 0.11 },
      { label: 'Utilities',           pct: 0.06 },
      { label: 'Mobile & Internet',   pct: 0.03 },
      { label: 'Transportation',      pct: 0.05 },
    ],
    wantsBreakdown: [
      { label: 'Eating Out / Delivery', pct: 0.06 },
      { label: 'Entertainment',         pct: 0.05 },
      { label: 'Shopping',              pct: 0.05 },
      { label: 'Personal Care',         pct: 0.04 },
      { label: 'Education / Upskilling',pct: 0.03 },
      { label: 'Travel / Vacations',    pct: 0.02 },
      { label: 'Gifts & Donations',     pct: 0.01 },
      { label: 'Miscellaneous',         pct: 0.01 },
    ],
  },
  2: {
    id: 2,
    label: 'Bracket 2',
    salaryRange: '₹25,001 – ₹75,000/mo',
    defaultSalary: 75000,
    needsPct: 0.50,
    wantsPct: 0.20,
    investmentPct: 0.20,
    emergencyPct: 0.05,
    monthlyRate: 0.010417,   // 12.50% / 12 (exact Excel value)
    blendedReturn: 12.50,
    instruments: [
      { name: 'Mutual Funds (SIP)', shortName: 'MF',    allocationPct: 0.50,   annualReturn: 15, color: '#6366f1' },
      { name: 'Debt Fund',          shortName: 'Debt',  allocationPct: 0.25,   annualReturn: 8,  color: '#22d3ee' },
      { name: 'Stocks',             shortName: 'Stocks',allocationPct: 0.125,  annualReturn: 15, color: '#10b981' },
      { name: 'Fixed Deposits',     shortName: 'FD',    allocationPct: 0.0625, annualReturn: 7,  color: '#f59e0b' },
      { name: 'Digital Gold',       shortName: 'Gold',  allocationPct: 0.0625, annualReturn: 11, color: '#f97316' },
    ],
    needsBreakdown: [
      { label: 'Housing / Rent',      pct: 0.25 },
      { label: 'Groceries & Food',    pct: 0.09 },
      { label: 'Utilities',           pct: 0.06 },
      { label: 'Mobile & Internet',   pct: 0.03 },
      { label: 'Transportation',      pct: 0.07 },
    ],
    wantsBreakdown: [
      { label: 'Eating Out / Delivery', pct: 0.05 },
      { label: 'Entertainment',         pct: 0.04 },
      { label: 'Shopping',              pct: 0.03 },
      { label: 'Personal Care',         pct: 0.03 },
      { label: 'Education / Upskilling',pct: 0.03 },
      { label: 'Travel / Vacations',    pct: 0.01 },
      { label: 'Gifts & Donations',     pct: 0.01 },
      { label: 'Miscellaneous',         pct: 0.00 },
    ],
  },
  3: {
    id: 3,
    label: 'Bracket 3',
    salaryRange: 'Above ₹75,000/mo',
    defaultSalary: 100000,
    needsPct: 0.45,
    wantsPct: 0.20,
    investmentPct: 0.20,
    emergencyPct: 0.05,
    monthlyRate: 0.011,      // 13.20% / 12 = 1.10% exactly
    blendedReturn: 13.20,
    instruments: [
      { name: 'Mutual Funds (SIP)', shortName: 'MF',    allocationPct: 0.60,   annualReturn: 15, color: '#6366f1' },
      { name: 'Debt Fund',          shortName: 'Debt',  allocationPct: 0.15,   annualReturn: 8,  color: '#22d3ee' },
      { name: 'Stocks',             shortName: 'Stocks',allocationPct: 0.125,  annualReturn: 15, color: '#10b981' },
      { name: 'Fixed Deposits',     shortName: 'FD',    allocationPct: 0.0625, annualReturn: 7,  color: '#f59e0b' },
      { name: 'Digital Gold',       shortName: 'Gold',  allocationPct: 0.0625, annualReturn: 11, color: '#f97316' },
    ],
    needsBreakdown: [
      { label: 'Housing / Rent',      pct: 0.20 },
      { label: 'Groceries & Food',    pct: 0.09 },
      { label: 'Utilities',           pct: 0.06 },
      { label: 'Mobile & Internet',   pct: 0.03 },
      { label: 'Transportation',      pct: 0.07 },
    ],
    wantsBreakdown: [
      { label: 'Eating Out / Delivery', pct: 0.05 },
      { label: 'Entertainment',         pct: 0.04 },
      { label: 'Shopping',              pct: 0.03 },
      { label: 'Personal Care',         pct: 0.03 },
      { label: 'Education / Upskilling',pct: 0.03 },
      { label: 'Travel / Vacations',    pct: 0.01 },
      { label: 'Gifts & Donations',     pct: 0.01 },
      { label: 'Miscellaneous',         pct: 0.00 },
    ],
  },
}

export function detectBracket(monthlySalary: number): Bracket {
  if (monthlySalary <= 25000) return 1
  if (monthlySalary <= 75000) return 2
  return 3
}

export function salaryForYear(
  startingSalary: number,
  incrementRate: number,
  yearIndex: number,   // 0-based
): number {
  return startingSalary * Math.pow(1 + incrementRate, yearIndex)
}

export function computeYearlyRows(
  profile: InvestmentProfile,
  config: BracketConfig,
): YearlyRow[] {
  const rows: YearlyRow[] = []
  for (let y = 1; y <= 10; y++) {
    const s = salaryForYear(profile.startingSalary, profile.incrementRate, y - 1)
    rows.push({
      year: y,
      age: profile.startingAge + y - 1,
      monthlySalary: s,
      monthlyNeeds: s * config.needsPct,
      monthlyWants: s * config.wantsPct,
      monthlyInvestments: s * config.investmentPct,
      monthlyEmergency: s * config.emergencyPct,
      yearlyEmergency: s * config.emergencyPct * 12,
    })
  }
  return rows
}

// Corpus grows month-by-month for totalMonths.
// Salary increments every 10 months (replicates Excel Sheet 5 exactly).
// current_year = ceil(m / 10) — 1-indexed; yearIdx (0-based) = current_year - 1
export function computeCorpus(
  profile: InvestmentProfile,
  config: BracketConfig,
  totalMonths = 360,
): CorpusPoint[] {
  const { startingSalary, incrementRate, inflationRate, extraMonthlyInvestment } = profile
  const { investmentPct, monthlyRate } = config

  const results: CorpusPoint[] = []
  let corpus = 0

  for (let m = 1; m <= totalMonths; m++) {
    const yearIdx = Math.ceil(m / 10) - 1
    const salary = salaryForYear(startingSalary, incrementRate, yearIdx)
    const monthlyInvestment = salary * investmentPct + extraMonthlyInvestment

    corpus = (corpus + monthlyInvestment) * (1 + monthlyRate)

    const yearsElapsed = m / 12
    results.push({
      month: m,
      nominal: corpus,
      real: corpus / Math.pow(1 + inflationRate, yearsElapsed),
    })
  }

  return results
}

export function getMilestones(corpusData: CorpusPoint[]): CorpusMilestone[] {
  return [
    { label: '10 Yrs', years: 10, month: 120, nominal: corpusData[119]?.nominal ?? 0, real: corpusData[119]?.real ?? 0 },
    { label: '20 Yrs', years: 20, month: 240, nominal: corpusData[239]?.nominal ?? 0, real: corpusData[239]?.real ?? 0 },
    { label: '30 Yrs', years: 30, month: 360, nominal: corpusData[359]?.nominal ?? 0, real: corpusData[359]?.real ?? 0 },
  ]
}

export function getInstrumentSplit(
  profile: InvestmentProfile,
  config: BracketConfig,
): InstrumentMonthly[] {
  const monthlyBase = profile.startingSalary * config.investmentPct
  return config.instruments.map(inst => ({
    name: inst.name,
    shortName: inst.shortName,
    monthlyAmount: monthlyBase * inst.allocationPct,
    annualReturn: inst.annualReturn,
    color: inst.color,
  }))
}
