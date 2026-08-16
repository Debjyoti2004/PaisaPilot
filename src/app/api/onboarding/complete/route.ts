import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId()
    const body = await req.json()
    const { accounts, salary, age, bracket } = body

    if (!Array.isArray(accounts) || accounts.length === 0) {
      return NextResponse.json({ error: 'At least one account required' }, { status: 400 })
    }

    // Create FinancialAccounts (skip any with no name)
    const validAccounts = accounts.filter((a: { name: string; type: string }) => a.name?.trim())
    for (let i = 0; i < validAccounts.length; i++) {
      const a = validAccounts[i]
      await prisma.financialAccount.upsert({
        where: { userId_name: { userId, name: a.name.trim() } },
        update: { type: a.type, sortOrder: i, showOnDash: true },
        create: { userId, name: a.name.trim(), type: a.type, isDefault: i === 0, showOnDash: true, sortOrder: i },
      })
    }

    // Determine salary bracket
    const salaryNum = parseFloat(salary) || 25000
    const ageNum    = parseInt(age) || 25
    const bracketNum = bracket ?? (salaryNum <= 50000 ? 1 : salaryNum <= 100000 ? 2 : 3)

    // Upsert WealthPlan
    await prisma.wealthPlan.upsert({
      where: { userId },
      update: { startingSalary: salaryNum, startingAge: ageNum, bracket: bracketNum },
      create: { userId, startingSalary: salaryNum, startingAge: ageNum, bracket: bracketNum, incrementRate: 0.10, inflationRate: 0.06, extraMonthlyInvest: 0 },
    })

    // Update AppSettings: expectedSalary + onboardingCompleted
    await prisma.appSettings.upsert({
      where: { userId },
      update: { expectedSalary: salaryNum, onboardingCompleted: true },
      create: {
        userId, expectedSalary: salaryNum, savingsFloor: 0, currency: 'INR',
        salaryKeywords: 'salary,credit,sal', emailReports: false, reportEmail: '',
        dashboardWidgets: JSON.stringify(validAccounts.map((a: { name: string }) => a.name)),
        onboardingCompleted: true,
      },
    })

    return NextResponse.json({ ok: true, accountsCreated: validAccounts.length })
  } catch (err) {
    console.error('Onboarding complete error:', err)
    return NextResponse.json({ error: 'Failed to complete onboarding' }, { status: 500 })
  }
}
