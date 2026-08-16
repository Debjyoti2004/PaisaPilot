'use client'

import { useState, useEffect, useMemo } from 'react'
import type { Bracket, InvestmentProfile } from '@/types/investment'
import {
  detectBracket, computeYearlyRows, computeCorpus,
  getMilestones, getInstrumentSplit, BRACKET_CONFIGS,
} from '@/utils/investmentCalculator'

export const DEFAULT_PROFILE: InvestmentProfile = {
  startingAge: 21,
  startingSalary: 25000,
  incrementRate: 0.10,
  inflationRate: 0.06,
  extraMonthlyInvestment: 0,
  bracket: 1,
}

async function loadFromDB(): Promise<InvestmentProfile | null> {
  try {
    const res = await fetch('/api/wealth-plan')
    if (!res.ok) return null
    const d = await res.json()
    if (!d.plan) return null
    return {
      startingAge:            d.plan.startingAge,
      startingSalary:         d.plan.startingSalary,
      incrementRate:          d.plan.incrementRate,
      inflationRate:          d.plan.inflationRate,
      extraMonthlyInvestment: d.plan.extraMonthlyInvest ?? 0,
      bracket:                d.plan.bracket ?? 1,
    }
  } catch {
    return null
  }
}

async function saveToDB(p: InvestmentProfile): Promise<void> {
  try {
    await fetch('/api/wealth-plan', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startingAge:          p.startingAge,
        startingSalary:       p.startingSalary,
        incrementRate:        p.incrementRate,
        inflationRate:        p.inflationRate,
        extraMonthlyInvest:   p.extraMonthlyInvestment,
        bracket:              p.bracket,
      }),
    })
  } catch { /* ignore */ }
}

export function useInvestmentPlan() {
  const [profile, setProfile] = useState<InvestmentProfile>(DEFAULT_PROFILE)
  const [loaded, setLoaded] = useState(false)
  const [isOnboarding, setIsOnboarding] = useState(false)

  useEffect(() => {
    loadFromDB().then(dbProfile => {
      if (dbProfile) {
        setProfile({ ...DEFAULT_PROFILE, ...dbProfile })
      }
      setIsOnboarding(false)
      setLoaded(true)
    })
  }, [])

  function saveProfile(updates: Partial<InvestmentProfile>) {
    const next = { ...profile, ...updates }
    if (updates.startingSalary !== undefined) {
      next.bracket = detectBracket(updates.startingSalary)
    }
    setProfile(next)
    saveToDB(next)
  }

  function completeOnboarding(data: {
    startingAge: number
    startingSalary: number
    incrementRate: number
  }) {
    const bracket: Bracket = detectBracket(data.startingSalary)
    const next: InvestmentProfile = { ...DEFAULT_PROFILE, ...data, bracket }
    setProfile(next)
    setIsOnboarding(false)
    saveToDB(next)
  }

  function resetProfile() {
    setProfile(DEFAULT_PROFILE)
    setIsOnboarding(true)
    saveToDB(DEFAULT_PROFILE)
  }

  const plan = useMemo(() => {
    if (!loaded) return null
    const config = BRACKET_CONFIGS[profile.bracket]
    const yearlyRows = computeYearlyRows(profile, config)
    const corpusData = computeCorpus(profile, config)
    const milestones = getMilestones(corpusData)
    const instrumentSplit = getInstrumentSplit(profile, config)

    const comparisonCorpus = {
      1: computeCorpus({ ...profile, bracket: 1 }, BRACKET_CONFIGS[1]),
      2: computeCorpus({ ...profile, bracket: 2 }, BRACKET_CONFIGS[2]),
      3: computeCorpus({ ...profile, bracket: 3 }, BRACKET_CONFIGS[3]),
    }

    return {
      profile,
      config,
      yearlyRows,
      corpusData,
      milestones,
      instrumentSplit,
      comparisonCorpus,
      currentMonthlyInvestment:
        profile.startingSalary * config.investmentPct + profile.extraMonthlyInvestment,
    }
  }, [profile, loaded])

  return { profile, plan, loaded, isOnboarding, saveProfile, completeOnboarding, resetProfile }
}
