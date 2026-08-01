'use client'

import { useState, useEffect, useMemo } from 'react'
import type { Bracket, InvestmentProfile } from '@/types/investment'
import {
  detectBracket, computeYearlyRows, computeCorpus,
  getMilestones, getInstrumentSplit, BRACKET_CONFIGS,
} from '@/utils/investmentCalculator'

const STORAGE_KEY = 'paisapilot_wealth_plan_v1'

export const DEFAULT_PROFILE: InvestmentProfile = {
  startingAge: 21,
  startingSalary: 25000,
  incrementRate: 0.10,
  inflationRate: 0.06,
  extraMonthlyInvestment: 0,
  bracket: 1,
}

export function useInvestmentPlan() {
  const [profile, setProfile] = useState<InvestmentProfile>(DEFAULT_PROFILE)
  const [loaded, setLoaded] = useState(false)
  const [isOnboarding, setIsOnboarding] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as InvestmentProfile
        setProfile({ ...DEFAULT_PROFILE, ...parsed })
      }
    } catch { /* ignore */ }
    setIsOnboarding(false)
    setLoaded(true)
  }, [])

  function persist(p: InvestmentProfile) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)) } catch { /* ignore */ }
  }

  function saveProfile(updates: Partial<InvestmentProfile>) {
    const next = { ...profile, ...updates }
    if (updates.startingSalary !== undefined) {
      next.bracket = detectBracket(updates.startingSalary)
    }
    setProfile(next)
    persist(next)
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
    persist(next)
  }

  function resetProfile() {
    setProfile(DEFAULT_PROFILE)
    setIsOnboarding(true)
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
  }

  const plan = useMemo(() => {
    if (!loaded) return null
    const config = BRACKET_CONFIGS[profile.bracket]
    const yearlyRows = computeYearlyRows(profile, config)
    const corpusData = computeCorpus(profile, config)
    const milestones = getMilestones(corpusData)
    const instrumentSplit = getInstrumentSplit(profile, config)

    // Corpus for each bracket using user's salary (for comparison chart)
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
