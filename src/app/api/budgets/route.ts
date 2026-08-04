import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'
import { getEffectiveUserId } from '@/lib/family'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const userId = await getEffectiveUserId(request, { allowViewAs: true })

    // Get all budgets
    const budgets = await prisma.userBudget.findMany({ where: { userId }, orderBy: { category: 'asc' } })

    // Get this month's actual spending per category
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    const txns = await prisma.transaction.findMany({
      where: { userId, type: 'debit', occurredAt: { gte: monthStart, lte: monthEnd } },
      include: { category: true },
    })

    const actualByCategory: Record<string, number> = {}
    for (const t of txns) {
      const cat = t.category?.name ?? 'Other'
      actualByCategory[cat] = (actualByCategory[cat] ?? 0) + t.amount
    }

    const result = budgets.map(b => ({
      id: b.id,
      category: b.category,
      monthlyLimit: b.monthlyLimit,
      active: b.active,
      spent: actualByCategory[b.category] ?? 0,
    }))

    return NextResponse.json({ budgets: result, month: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}` })
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN')
      return NextResponse.json({ error: 'Access revoked' }, { status: 403 })
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId()
    const { category, monthlyLimit } = await request.json()
    if (!category || !monthlyLimit) return NextResponse.json({ error: 'category and monthlyLimit required' }, { status: 400 })

    const budget = await prisma.userBudget.upsert({
      where: { userId_category: { userId, category } },
      update: { monthlyLimit: parseFloat(monthlyLimit), active: true },
      create: { userId, category, monthlyLimit: parseFloat(monthlyLimit), active: true },
    })
    return NextResponse.json({ budget }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN')
      return NextResponse.json({ error: 'Access revoked' }, { status: 403 })
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await requireUserId()
    const { id, monthlyLimit, active } = await request.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const existing = await prisma.userBudget.findFirst({ where: { id, userId } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const budget = await prisma.userBudget.update({
      where: { id },
      data: {
        monthlyLimit: monthlyLimit !== undefined ? parseFloat(monthlyLimit) : undefined,
        active:       active !== undefined ? active : undefined,
      },
    })
    return NextResponse.json({ budget })
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN')
      return NextResponse.json({ error: 'Access revoked' }, { status: 403 })
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await requireUserId()
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const existing = await prisma.userBudget.findFirst({ where: { id, userId } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.userBudget.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN')
      return NextResponse.json({ error: 'Access revoked' }, { status: 403 })
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
