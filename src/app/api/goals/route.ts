import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'
import { getEffectiveUserId } from '@/lib/family'

export const dynamic = 'force-dynamic'

function computeStatus(goal: { savedAmount: number; targetAmount: number; deadline: Date | null; monthlyNeeded: number | null }): 'ON_TRACK' | 'BEHIND' | 'ACHIEVED' {
  if (goal.savedAmount >= goal.targetAmount) return 'ACHIEVED'
  if (!goal.deadline) return 'ON_TRACK'

  const now = new Date()
  const monthsLeft = Math.max(0, (goal.deadline.getFullYear() - now.getFullYear()) * 12 + (goal.deadline.getMonth() - now.getMonth()))
  const needed = goal.targetAmount - goal.savedAmount
  const monthlyNeeded = monthsLeft > 0 ? needed / monthsLeft : needed

  if (goal.monthlyNeeded && monthlyNeeded > goal.monthlyNeeded * 1.2) return 'BEHIND'
  return 'ON_TRACK'
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getEffectiveUserId(request, { allowViewAs: true })
    const rawGoals = await prisma.goal.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } })

    const now = new Date()
    const goals = rawGoals.map((g) => {
      const percentComplete = g.targetAmount > 0 ? Math.min((g.savedAmount / g.targetAmount) * 100, 100) : 0
      const rawStatus = computeStatus({ savedAmount: g.savedAmount, targetAmount: g.targetAmount, deadline: g.deadline, monthlyNeeded: g.monthlyNeeded })
      const status = rawStatus === 'ACHIEVED' ? 'achieved' : rawStatus === 'BEHIND' ? 'overdue' : 'on-track'

      let monthsLeft: number | null = null
      if (g.deadline) {
        const diff = (g.deadline.getFullYear() - now.getFullYear()) * 12 + (g.deadline.getMonth() - now.getMonth())
        monthsLeft = Math.max(0, diff)
      }

      const needed = g.targetAmount - g.savedAmount
      const monthlyNeeded = monthsLeft && monthsLeft > 0 ? needed / monthsLeft : g.monthlyNeeded

      return { ...g, percentComplete: Math.round(percentComplete), status, monthsLeft, monthlyNeeded }
    })

    return NextResponse.json({ goals })
  } catch (err) {
    if (err instanceof Error && err.message === 'FORBIDDEN')
      return NextResponse.json({ error: 'Access revoked' }, { status: 403 })
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('GET goals error:', err)
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId()
    const body = await req.json() as {
      name?: unknown; icon?: unknown; color?: unknown
      targetAmount?: unknown; deadline?: unknown; monthlyNeeded?: unknown
    }

    const name = typeof body.name === 'string' ? body.name : 'Goal'
    const icon = typeof body.icon === 'string' ? body.icon : '🎯'
    const color = typeof body.color === 'string' ? body.color : '#6366f1'
    const targetAmount = typeof body.targetAmount === 'number' ? body.targetAmount : parseFloat(String(body.targetAmount ?? '0'))
    const deadline = body.deadline ? new Date(String(body.deadline)) : null
    const monthlyNeeded = body.monthlyNeeded ? parseFloat(String(body.monthlyNeeded)) : null

    const goal = await prisma.goal.create({
      data: { userId, name, icon, color, targetAmount, deadline, monthlyNeeded, savedAmount: 0 },
    })
    return NextResponse.json({ goal }, { status: 201 })
  } catch (err) {
    if (err instanceof Error && err.message === 'FORBIDDEN')
      return NextResponse.json({ error: 'Access revoked' }, { status: 403 })
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('POST goal error:', err)
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await requireUserId()
    const body = await req.json() as { id?: unknown; savedAmount?: unknown; amount?: unknown }
    const id = typeof body.id === 'string' ? body.id : undefined
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const existing = await prisma.goal.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    if (existing.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    let newSaved: number
    if (body.savedAmount !== undefined) {
      newSaved = parseFloat(String(body.savedAmount))
    } else if (body.amount !== undefined) {
      newSaved = existing.savedAmount + parseFloat(String(body.amount))
    } else {
      return NextResponse.json({ error: 'savedAmount or amount is required' }, { status: 400 })
    }

    const goal = await prisma.goal.update({
      where: { id },
      data: { savedAmount: Math.max(0, newSaved) },
    })
    return NextResponse.json({ goal })
  } catch (err) {
    if (err instanceof Error && err.message === 'FORBIDDEN')
      return NextResponse.json({ error: 'Access revoked' }, { status: 403 })
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('PATCH goal error:', err)
    return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await requireUserId()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const existing = await prisma.goal.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    if (existing.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await prisma.goal.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof Error && err.message === 'FORBIDDEN')
      return NextResponse.json({ error: 'Access revoked' }, { status: 403 })
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('DELETE goal error:', err)
    return NextResponse.json({ error: 'Failed to delete goal' }, { status: 500 })
  }
}
