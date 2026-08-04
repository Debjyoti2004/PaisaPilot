import { NextRequest, NextResponse } from 'next/server'
import { randomInt } from 'crypto'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'
import { sendInviteEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

// POST — send an OTP invite to an email address (owner only)
export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId()
    const body = await request.json().catch(() => ({})) as { email?: string; label?: string }
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : null

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 })
    }

    const membership = await prisma.familyMember.findFirst({
      where: { userId },
      include: { family: { include: { members: { include: { user: true } } } } },
    })
    if (!membership) return NextResponse.json({ error: 'Not in a family' }, { status: 400 })
    if (membership.role !== 'owner') return NextResponse.json({ error: 'Only the owner can invite' }, { status: 403 })

    // Prevent inviting someone already in the family
    const alreadyMember = membership.family.members.find(
      m => m.user.email?.toLowerCase() === email
    )
    if (alreadyMember) {
      return NextResponse.json({ error: 'This email is already a member of your family' }, { status: 400 })
    }

    // Cancel any existing pending invites to the same email
    await prisma.familyInvite.deleteMany({
      where: { familyId: membership.familyId, email, accepted: false },
    })

    // Generate a 6-digit OTP using cryptographically secure random
    const otp = String(randomInt(100000, 1000000))
    const now = new Date()
    const otpExpiry = new Date(now.getTime() + 5 * 60 * 1000)  // 5 minutes
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000) // 1 hour (URL stays valid)

    const invite = await prisma.familyInvite.create({
      data: {
        familyId: membership.familyId,
        label: body.label || null,
        email,
        otp,
        otpExpiry,
        expiresAt,
      },
    })

    // Build the accept URL
    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
    const acceptUrl = `${baseUrl}/invite/accept?token=${invite.token}`

    // Get owner's display name
    const owner = membership.family.members.find(m => m.role === 'owner')
    const ownerName = owner?.user.name ?? owner?.user.email ?? 'Someone'

    // Send the email — if this fails, delete the invite so no orphan records remain
    try {
      await sendInviteEmail({
        to: email,
        ownerName,
        familyName: membership.family.name,
        otp,
        acceptUrl,
      })
    } catch (emailErr) {
      // Roll back the invite
      await prisma.familyInvite.delete({ where: { id: invite.id } }).catch(() => {})
      console.error('Email send error:', emailErr)
      const msg = emailErr instanceof Error ? emailErr.message : String(emailErr)
      const isAuth = msg.includes('535') || msg.includes('BadCredentials') || msg.includes('Invalid login')
      return NextResponse.json(
        { error: isAuth
            ? 'Email delivery failed: Gmail credentials are invalid. Please update SMTP_USER and SMTP_PASS in your .env.local and restart the server.'
            : `Email delivery failed: ${msg}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, email }, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.error('Invite error:', e)
    return NextResponse.json({ error: 'Failed to send invite' }, { status: 500 })
  }
}

// DELETE — cancel a pending invite (owner only)
export async function DELETE(request: NextRequest) {
  try {
    const userId = await requireUserId()
    const { inviteId } = await request.json()

    const membership = await prisma.familyMember.findFirst({ where: { userId } })
    if (!membership || membership.role !== 'owner')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await prisma.familyInvite.deleteMany({
      where: { id: inviteId, familyId: membership.familyId },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
