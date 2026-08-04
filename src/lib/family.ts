import { NextRequest } from 'next/server'
import { prisma } from './prisma'
import { requireUserId } from './auth'

// Returns the userId whose data to read.
// If viewAs is in the request and the caller is a family member, returns viewAs.
// Mutations should never pass allowViewAs: they always operate on the caller's own data.
export async function getEffectiveUserId(
  request: NextRequest,
  { allowViewAs = false } = {}
): Promise<string> {
  const callerId = await requireUserId()
  if (!allowViewAs) return callerId

  const viewAs = request.nextUrl.searchParams.get('viewAs')
  if (!viewAs || viewAs === callerId) return callerId

  // Caller must be a viewer; target (viewAs) must be an owner in the same family.
  // Owners cannot browse viewers' data — viewers only chose to share the owner's data.
  const membership = await prisma.familyMember.findFirst({
    where: {
      userId: callerId,
      role: 'viewer',
      family: { members: { some: { userId: viewAs, role: 'owner' } } },
    },
  })
  if (!membership) throw new Error('FORBIDDEN')
  return viewAs
}

// Check if a user can view another user's data
export async function canViewUser(callerId: string, targetId: string): Promise<boolean> {
  if (callerId === targetId) return true
  const membership = await prisma.familyMember.findFirst({
    where: {
      userId: callerId,
      family: { members: { some: { userId: targetId } } },
    },
  })
  return !!membership
}
