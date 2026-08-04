import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET — return the caller's family (if any) with members
export async function GET() {
  try {
    const userId = await requireUserId()

    const membership = await prisma.familyMember.findFirst({
      where: { userId },
      include: {
        family: {
          include: {
            members: {
              include: { user: { select: { id: true, name: true, email: true, image: true } } },
              orderBy: { createdAt: 'asc' },
            },
            invites: {
              where: { accepted: false, expiresAt: { gt: new Date() } },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    })

    if (!membership) return NextResponse.json({ family: null })

    return NextResponse.json({
      family: membership.family,
      myRole: membership.role,
    })
  } catch (e) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.error('[GET /api/family]', e)
    return NextResponse.json({ error: 'Failed', detail: String(e) }, { status: 500 })
  }
}

// POST — create a new family (caller becomes owner)
export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId()
    const { name } = await request.json()

    // Can't be in two families
    const existing = await prisma.familyMember.findFirst({ where: { userId } })
    if (existing) return NextResponse.json({ error: 'Already in a family' }, { status: 400 })

    const family = await prisma.family.create({
      data: {
        name: (name as string)?.trim() || 'My Family',
        members: { create: { userId, role: 'owner' } },
      },
    })

    return NextResponse.json({ family }, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.error('[POST /api/family]', e)
    return NextResponse.json({ error: 'Failed', detail: String(e) }, { status: 500 })
  }
}

// DELETE — leave family (owner deletes it; viewer leaves)
export async function DELETE() {
  try {
    const userId = await requireUserId()

    const membership = await prisma.familyMember.findFirst({
      where: { userId },
      include: { family: { include: { members: true } } },
    })
    if (!membership) return NextResponse.json({ error: 'Not in a family' }, { status: 404 })

    if (membership.role === 'owner') {
      await prisma.family.delete({ where: { id: membership.familyId } })
    } else {
      await prisma.familyMember.delete({ where: { id: membership.id } })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
