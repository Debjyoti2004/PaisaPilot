import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// DELETE — remove a member (owner removes viewer, or viewer removes themselves)
export async function DELETE(request: NextRequest) {
  try {
    const userId = await requireUserId()
    const { memberId } = await request.json()

    const myMembership = await prisma.familyMember.findFirst({ where: { userId } })
    if (!myMembership) return NextResponse.json({ error: 'Not in a family' }, { status: 404 })

    const target = await prisma.familyMember.findUnique({ where: { id: memberId } })
    if (!target || target.familyId !== myMembership.familyId)
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })

    // Owners can remove anyone; viewers can only remove themselves
    if (myMembership.role !== 'owner' && target.userId !== userId)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Can't remove the owner
    if (target.role === 'owner')
      return NextResponse.json({ error: 'Cannot remove the owner' }, { status: 400 })

    await prisma.familyMember.delete({ where: { id: memberId } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
