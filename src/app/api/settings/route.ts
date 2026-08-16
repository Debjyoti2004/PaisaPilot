import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const userId = await requireUserId()
    const settings = await prisma.appSettings.findUnique({ where: { userId } })
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
            driveFolder, driveEnabled, dashboardWidgets, customAccounts } = body
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

    const settings = await prisma.appSettings.upsert({
      where: { userId },
      update: updates,
      create: { userId, expectedSalary: 37000, savingsFloor: 3000, currency: 'INR', salaryKeywords: 'salary,credit,sal', emailReports: false, reportEmail: '', ...updates },
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
