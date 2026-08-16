import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const DEFAULT_ACCOUNTS = [
  { name: 'Savings Account', type: 'savings' },
  { name: 'Salary Account',  type: 'savings' },
  { name: 'Cash',            type: 'checking' },
  { name: 'Credit Card',     type: 'credit_card' },
  { name: 'Debit Card',      type: 'debit_card' },
]

export async function GET() {
  try {
    const userId = await requireUserId()
    let settings = await prisma.appSettings.findUnique({ where: { userId } })

    // Merge default accounts into existing customAccounts — never remove user data
    const existing: { name: string; type: string }[] = (() => {
      try { return JSON.parse(settings?.customAccounts ?? '[]') } catch { return [] }
    })()
    const existingWidgets: string[] = (() => {
      try { return JSON.parse(settings?.dashboardWidgets ?? '[]') } catch { return [] }
    })()
    const existingNames = new Set(existing.map(a => a.name))
    const missingDefaults = DEFAULT_ACCOUNTS.filter(d => !existingNames.has(d.name))

    if (missingDefaults.length > 0 || !settings) {
      const mergedAccounts = [...existing, ...missingDefaults]
      // Add missing default names to widgets (enabled by default)
      const widgetSet = new Set(existingWidgets)
      missingDefaults.forEach(d => widgetSet.add(d.name))
      const mergedWidgets = Array.from(widgetSet)

      settings = await prisma.appSettings.upsert({
        where: { userId },
        update: {
          customAccounts:   JSON.stringify(mergedAccounts),
          dashboardWidgets: JSON.stringify(mergedWidgets),
        },
        create: {
          userId,
          expectedSalary:   0,
          savingsFloor:     0,
          currency:         'INR',
          salaryKeywords:   'salary,credit,sal',
          emailReports:     false,
          reportEmail:      '',
          customAccounts:   JSON.stringify(mergedAccounts),
          dashboardWidgets: JSON.stringify(mergedWidgets),
        },
      })
    }

    return NextResponse.json({ settings })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error(error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await requireUserId()
    const body = await request.json()
    const { expectedSalary, savingsFloor, emailReports, reportEmail, salaryCarryover,
            assetsTotal, liabilitiesTotal, netWorthConfigured,
            driveFolder, driveEnabled, dashboardWidgets, customAccounts, currency } = body
    const updates: Record<string, unknown> = {}
    if (expectedSalary !== undefined)       updates.expectedSalary = parseFloat(expectedSalary)
    if (savingsFloor !== undefined)         updates.savingsFloor = parseFloat(savingsFloor)
    if (emailReports !== undefined)         updates.emailReports = emailReports
    if (reportEmail !== undefined)          updates.reportEmail = reportEmail
    if (salaryCarryover !== undefined)      updates.salaryCarryover = salaryCarryover
    if (assetsTotal !== undefined)          updates.assetsTotal = parseFloat(assetsTotal)
    if (liabilitiesTotal !== undefined)     updates.liabilitiesTotal = parseFloat(liabilitiesTotal)
    if (netWorthConfigured !== undefined)   updates.netWorthConfigured = netWorthConfigured
    if (driveFolder !== undefined)          updates.driveFolder = driveFolder
    if (driveEnabled !== undefined)         updates.driveEnabled = driveEnabled
    if (dashboardWidgets !== undefined)     updates.dashboardWidgets = JSON.stringify(dashboardWidgets)
    if (customAccounts !== undefined)       updates.customAccounts = JSON.stringify(customAccounts)
    if (currency !== undefined)             updates.currency = currency

    const settings = await prisma.appSettings.upsert({
      where: { userId },
      update: updates,
      create: { userId, expectedSalary: 0, savingsFloor: 0, currency: 'INR', salaryKeywords: 'salary,credit,sal', emailReports: false, reportEmail: '', ...updates },
    })
    return NextResponse.json({ settings })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error(error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
