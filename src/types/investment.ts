export type Bracket = 1 | 2 | 3

export interface InvestmentProfile {
  startingAge: number
  startingSalary: number           // monthly salary in ₹
  incrementRate: number            // decimal e.g. 0.10 = 10%
  inflationRate: number            // decimal e.g. 0.06 = 6%
  extraMonthlyInvestment: number   // additional monthly SIP on top of formula
  bracket: Bracket                 // auto-detected from salary
}

export interface NeedsWantsItem {
  label: string
  pct: number   // as fraction of total salary
}

export interface InstrumentConfig {
  name: string
  shortName: string
  allocationPct: number   // fraction of total investment amount
  annualReturn: number    // e.g. 15 for 15%
  color: string
}

export interface BracketConfig {
  id: Bracket
  label: string
  salaryRange: string
  defaultSalary: number
  needsPct: number
  wantsPct: number
  investmentPct: number
  emergencyPct: number
  monthlyRate: number    // exact Excel value
  blendedReturn: number  // annual %
  instruments: InstrumentConfig[]
  needsBreakdown: NeedsWantsItem[]
  wantsBreakdown: NeedsWantsItem[]
}

export interface YearlyRow {
  year: number
  age: number
  monthlySalary: number
  monthlyNeeds: number
  monthlyWants: number
  monthlyInvestments: number
  monthlyEmergency: number
  yearlyEmergency: number
}

export interface CorpusPoint {
  month: number
  nominal: number
  real: number
}

export interface CorpusMilestone {
  label: string
  years: number
  month: number
  nominal: number
  real: number
}

export interface InstrumentMonthly {
  name: string
  shortName: string
  monthlyAmount: number
  annualReturn: number
  color: string
}
