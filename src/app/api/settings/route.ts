import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const settings = await prisma.appSettings.findUnique({ where: { id: 'singleton' } })
    return NextResponse.json({ settings })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { expectedSalary, savingsFloor, emailReports, reportEmail } = body
    const updates: Record<string, unknown> = {}
    if (expectedSalary !== undefined) updates.expectedSalary = parseFloat(expectedSalary)
    if (savingsFloor !== undefined) updates.savingsFloor = parseFloat(savingsFloor)
    if (emailReports !== undefined) updates.emailReports = emailReports
    if (reportEmail !== undefined) updates.reportEmail = reportEmail

    const settings = await prisma.appSettings.upsert({
      where: { id: 'singleton' },
      update: updates,
      create: { id: 'singleton', expectedSalary: 37000, savingsFloor: 3000, currency: 'INR', salaryKeywords: 'salary,credit,sal', emailReports: false, reportEmail: '', ...updates },
    })
    return NextResponse.json({ settings })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
