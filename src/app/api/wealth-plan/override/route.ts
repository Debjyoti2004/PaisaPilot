import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId()
    const { month, instrument, extraAmount, note } = await request.json()

    const plan = await prisma.wealthPlan.findUnique({ where: { userId } })
    if (!plan) return NextResponse.json({ error: 'No wealth plan found. Create one first.' }, { status: 404 })

    const override = await prisma.wealthPlanOverride.upsert({
      where: { planId_month_instrument: { planId: plan.id, month, instrument } },
      update: { extraAmount, note: note ?? null },
      create: { planId: plan.id, month, instrument, extraAmount, note: note ?? null },
    })

    return NextResponse.json({ override })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to save override' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await requireUserId()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const plan = await prisma.wealthPlan.findUnique({ where: { userId } })
    if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.wealthPlanOverride.deleteMany({ where: { id, planId: plan.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
