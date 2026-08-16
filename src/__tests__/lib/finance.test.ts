import {
  sipFV,
  stepUpSipFV,
  lumpsumFV,
  emi,
  requiredMonthly,
  inflationAdjust,
  formatINR,
  formatINRCompact,
  daysInMonth,
} from '@/lib/finance'

// ─── sipFV ────────────────────────────────────────────────────────────────────

describe('sipFV', () => {
  it('returns principal × months when return rate is 0', () => {
    expect(sipFV(10_000, 5, 0)).toBe(10_000 * 60)
  })

  it('grows larger than simple sum with positive return', () => {
    expect(sipFV(10_000, 10, 12)).toBeGreaterThan(10_000 * 120)
  })

  it('higher return produces higher future value', () => {
    expect(sipFV(10_000, 10, 15)).toBeGreaterThan(sipFV(10_000, 10, 12))
  })

  it('longer tenure produces higher future value', () => {
    expect(sipFV(10_000, 20, 12)).toBeGreaterThan(sipFV(10_000, 10, 12))
  })

  it('scales linearly with monthly amount', () => {
    const base = sipFV(10_000, 10, 12)
    expect(sipFV(20_000, 10, 12)).toBeCloseTo(base * 2, 0)
  })

  it('returns a finite positive number', () => {
    const result = sipFV(5_000, 30, 12)
    expect(isFinite(result)).toBe(true)
    expect(result).toBeGreaterThan(0)
  })
})

// ─── stepUpSipFV ──────────────────────────────────────────────────────────────

describe('stepUpSipFV', () => {
  it('produces higher value than flat SIP with same initial amount', () => {
    expect(stepUpSipFV(10_000, 10, 12, 10)).toBeGreaterThan(sipFV(10_000, 10, 12))
  })

  it('with 0% step-up behaves close to plain sipFV', () => {
    const plain = sipFV(10_000, 10, 12)
    const stepUp = stepUpSipFV(10_000, 10, 12, 0)
    // stepUpSipFV loops compounding differently (future value per remaining month)
    // both should be in the same ballpark
    expect(stepUp).toBeGreaterThan(plain * 0.9)
    expect(stepUp).toBeLessThan(plain * 1.1)
  })

  it('higher step-up percentage yields more wealth', () => {
    expect(stepUpSipFV(10_000, 10, 12, 15)).toBeGreaterThan(stepUpSipFV(10_000, 10, 12, 5))
  })

  it('returns a finite positive number', () => {
    const result = stepUpSipFV(5_000, 20, 12, 10)
    expect(isFinite(result)).toBe(true)
    expect(result).toBeGreaterThan(0)
  })
})

// ─── lumpsumFV ────────────────────────────────────────────────────────────────

describe('lumpsumFV', () => {
  it('returns the original amount at 0% return', () => {
    expect(lumpsumFV(100_000, 10, 0)).toBeCloseTo(100_000)
  })

  it('doubles roughly every 6 years at 12%', () => {
    // Rule of 72: 72/12 = 6 years
    const result = lumpsumFV(100_000, 6, 12)
    expect(result).toBeGreaterThan(180_000)
    expect(result).toBeLessThan(220_000)
  })

  it('grows with higher return rate', () => {
    expect(lumpsumFV(100_000, 10, 15)).toBeGreaterThan(lumpsumFV(100_000, 10, 12))
  })

  it('grows with longer tenure', () => {
    expect(lumpsumFV(100_000, 20, 12)).toBeGreaterThan(lumpsumFV(100_000, 10, 12))
  })
})

// ─── emi ──────────────────────────────────────────────────────────────────────

describe('emi', () => {
  it('returns principal divided by tenure when rate is 0', () => {
    expect(emi(600_000, 0, 60)).toBeCloseTo(10_000)
  })

  it('returns a value higher than principal/tenure with non-zero rate', () => {
    const flatEmi = 600_000 / 60
    expect(emi(600_000, 10, 60)).toBeGreaterThan(flatEmi)
  })

  it('higher interest rate increases EMI', () => {
    expect(emi(1_000_000, 12, 120)).toBeGreaterThan(emi(1_000_000, 8, 120))
  })

  it('shorter tenure increases EMI', () => {
    expect(emi(1_000_000, 10, 60)).toBeGreaterThan(emi(1_000_000, 10, 120))
  })

  it('home loan sanity check (≈1Cr, 8.5%, 20yr ≈ ₹86,782)', () => {
    const result = emi(10_000_000, 8.5, 240)
    expect(result).toBeGreaterThan(80_000)
    expect(result).toBeLessThan(95_000)
  })
})

// ─── requiredMonthly ─────────────────────────────────────────────────────────

describe('requiredMonthly', () => {
  it('returns target divided by months when rate is 0', () => {
    expect(requiredMonthly(1_200_000, 120, 0)).toBeCloseTo(10_000)
  })

  it('investing required_monthly at given rate reaches the target', () => {
    const target = 5_000_000
    const monthly = requiredMonthly(target, 120, 12)
    const reached = sipFV(monthly, 10, 12)
    expect(reached).toBeCloseTo(target, -3)
  })

  it('higher return reduces required monthly', () => {
    expect(requiredMonthly(5_000_000, 120, 15)).toBeLessThan(
      requiredMonthly(5_000_000, 120, 12)
    )
  })
})

// ─── inflationAdjust ─────────────────────────────────────────────────────────

describe('inflationAdjust', () => {
  it('uses 6% default rate', () => {
    const result = inflationAdjust(100_000, 10)
    const expected = 100_000 * Math.pow(1.06, 10)
    expect(result).toBeCloseTo(expected)
  })

  it('uses custom rate when provided', () => {
    const result = inflationAdjust(100_000, 10, 8)
    const expected = 100_000 * Math.pow(1.08, 10)
    expect(result).toBeCloseTo(expected)
  })

  it('returns original amount at 0% inflation', () => {
    expect(inflationAdjust(100_000, 10, 0)).toBeCloseTo(100_000)
  })

  it('larger years produces more inflation erosion', () => {
    expect(inflationAdjust(100_000, 20, 6)).toBeGreaterThan(inflationAdjust(100_000, 10, 6))
  })
})

// ─── formatINR ────────────────────────────────────────────────────────────────

describe('formatINR', () => {
  it('formats zero as ₹0', () => {
    expect(formatINR(0)).toContain('0')
  })

  it('includes the rupee symbol', () => {
    const result = formatINR(50_000)
    expect(result).toContain('₹')
  })

  it('formats 1 lakh correctly', () => {
    const result = formatINR(100_000)
    expect(result).toContain('1,00,000')
  })

  it('formats negative values', () => {
    const result = formatINR(-10_000)
    expect(result).toContain('10,000')
  })

  it('omits decimal places', () => {
    expect(formatINR(1234.56)).not.toContain('.')
  })
})

// ─── formatINRCompact ────────────────────────────────────────────────────────

describe('formatINRCompact', () => {
  it('shows K suffix for thousands', () => {
    expect(formatINRCompact(5_000)).toContain('K')
  })

  it('shows L suffix for lakhs (≥1 lakh)', () => {
    expect(formatINRCompact(1_00_000)).toContain('L')
  })

  it('shows Cr suffix for crores (≥1 crore)', () => {
    expect(formatINRCompact(1_00_00_000)).toContain('Cr')
  })

  it('falls back to full rupee format below 1000', () => {
    const result = formatINRCompact(500)
    expect(result).not.toContain('K')
    expect(result).not.toContain('L')
    expect(result).not.toContain('Cr')
  })

  it('1.5 crore formats as ₹1.5Cr', () => {
    expect(formatINRCompact(1_50_00_000)).toBe('₹1.5Cr')
  })

  it('25 lakh formats as ₹25.0L', () => {
    expect(formatINRCompact(25_00_000)).toBe('₹25.0L')
  })
})

// ─── daysInMonth ─────────────────────────────────────────────────────────────

describe('daysInMonth', () => {
  it('returns 31 for January', () => {
    expect(daysInMonth(new Date(2025, 0, 1))).toBe(31)
  })

  it('returns 28 for February in a non-leap year', () => {
    expect(daysInMonth(new Date(2025, 1, 1))).toBe(28)
  })

  it('returns 29 for February in a leap year', () => {
    expect(daysInMonth(new Date(2024, 1, 1))).toBe(29)
  })

  it('returns 30 for April', () => {
    expect(daysInMonth(new Date(2025, 3, 1))).toBe(30)
  })

  it('returns 31 for December', () => {
    expect(daysInMonth(new Date(2025, 11, 1))).toBe(31)
  })

  it('uses current month when no date provided', () => {
    const now = new Date()
    const expected = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    expect(daysInMonth()).toBe(expected)
  })
})
