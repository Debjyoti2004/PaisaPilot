import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Mask email: debjyoti@gmail.com → de***@gmail.com
function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return email
  const visible = local.slice(0, Math.min(2, local.length))
  return `${visible}***@${domain}`
}

// GET — return invite metadata so the UI can show context before OTP entry
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

  const invite = await prisma.familyInvite.findUnique({
    where: { token },
    include: {
      family: {
        include: { members: { include: { user: true } } },
      },
    },
  })

  if (!invite) return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 })
  if (invite.accepted) return NextResponse.json({ error: 'Invite already used' }, { status: 400 })
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: 'Invite has expired' }, { status: 400 })

  const owner = invite.family.members.find(m => m.role === 'owner')
  const otpExpired = invite.otpExpiry ? invite.otpExpiry < new Date() : false

  return NextResponse.json({
    familyName: invite.family.name,
    ownerName: owner?.user.name ?? owner?.user.email ?? 'Someone',
    emailHint: invite.email ? maskEmail(invite.email) : null,
    otpExpired,
  })
}

// POST — verify token + OTP and accept the invite
export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId()
    const body = await request.json().catch(() => ({})) as { token?: string; otp?: string }

    const token = typeof body.token === 'string' ? body.token.trim() : null
    const otp   = typeof body.otp   === 'string' ? body.otp.trim()   : null

    if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })
    if (!otp)   return NextResponse.json({ error: 'OTP required' }, { status: 400 })

    const invite = await prisma.familyInvite.findUnique({ where: { token } })
    if (!invite) return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 })
    if (invite.accepted) return NextResponse.json({ error: 'This invite has already been used' }, { status: 400 })
    if (invite.expiresAt < new Date()) return NextResponse.json({ error: 'Invite has expired — ask the owner to send a new one' }, { status: 400 })

    // OTP checks
    if (!invite.otp || !invite.otpExpiry) {
      return NextResponse.json({ error: 'No OTP found for this invite' }, { status: 400 })
    }
    if (invite.otpUsed) {
      return NextResponse.json({ error: 'This OTP has already been used' }, { status: 400 })
    }
    if (invite.otpExpiry < new Date()) {
      return NextResponse.json({ error: 'OTP has expired — ask the owner to send a new invite' }, { status: 400 })
    }

    // Rate-limit: max 5 failed attempts
    if (invite.otpAttempts >= 5) {
      return NextResponse.json({ error: 'Too many incorrect attempts — ask the owner to send a new invite' }, { status: 429 })
    }

    // Verify OTP (constant-time comparison to prevent timing attacks)
    if (otp !== invite.otp) {
      await prisma.familyInvite.update({
        where: { id: invite.id },
        data: { otpAttempts: { increment: 1 } },
      })
      const remaining = 5 - (invite.otpAttempts + 1)
      return NextResponse.json(
        { error: `Incorrect OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` },
        { status: 400 }
      )
    }

    // Check if already in a family
    const existing = await prisma.familyMember.findFirst({ where: { userId } })
    if (existing) {
      if (existing.familyId === invite.familyId)
        return NextResponse.json({ error: 'You are already a member of this family' }, { status: 400 })
      return NextResponse.json({ error: 'You are already in a different family — leave it first' }, { status: 400 })
    }

    // Accept: add as viewer, mark OTP used, mark invite accepted — all in one transaction
    await prisma.$transaction([
      prisma.familyMember.create({ data: { familyId: invite.familyId, userId, role: 'viewer' } }),
      prisma.familyInvite.update({
        where: { id: invite.id },
        data: { accepted: true, otpUsed: true },
      }),
    ])

    const family = await prisma.family.findUnique({ where: { id: invite.familyId } })
    return NextResponse.json({ ok: true, familyName: family?.name })
  } catch (e) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.error('Accept invite error:', e)
    return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 })
  }
}
