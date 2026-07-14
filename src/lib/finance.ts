export function sipFV(monthly: number, years: number, annualReturn: number): number {
  const r = annualReturn / 100 / 12
  const n = years * 12
  if (r === 0) return monthly * n
  return monthly * (((Math.pow(1 + r, n) - 1) / r) * (1 + r))
}

export function stepUpSipFV(monthly: number, years: number, annualReturn: number, stepUpPercent: number): number {
  const monthlyRate = annualReturn / 100 / 12
  let fv = 0
  let currentMonthly = monthly
  for (let year = 0; year < years; year++) {
    for (let month = 0; month < 12; month++) {
      const monthsRemaining = (years - year) * 12 - month
      fv += currentMonthly * Math.pow(1 + monthlyRate, monthsRemaining)
    }
    currentMonthly *= 1 + stepUpPercent / 100
  }
  return fv
}

export function lumpsumFV(amount: number, years: number, annualReturn: number): number {
  return amount * Math.pow(1 + annualReturn / 100, years)
}

export function emi(principal: number, annualRate: number, tenureMonths: number): number {
  const r = annualRate / 100 / 12
  if (r === 0) return principal / tenureMonths
  return (principal * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1)
}

export function requiredMonthly(target: number, months: number, annualReturn: number): number {
  const r = annualReturn / 100 / 12
  if (r === 0) return target / months
  return target / ((((Math.pow(1 + r, months) - 1) / r) * (1 + r)))
}

export function inflationAdjust(amount: number, years: number, inflationRate = 6): number {
  return amount * Math.pow(1 + inflationRate / 100, years)
}

export function formatINR(amount: number): string {
  return amount.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

export function formatINRCompact(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`
  return formatINR(amount)
}

export function daysLeftInMonth(): number {
  const now = new Date()
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  return lastDay - now.getDate()
}

export function daysInMonth(date?: Date): number {
  const d = date ?? new Date()
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
}
