import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'

export const dynamic = 'force-dynamic'

function genOtp() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

async function sendEmail(to: string, otp: string) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY not set')
  const from = process.env.RESEND_FROM ?? 'PaisaPilot <onboarding@resend.dev>'
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from, to,
      subject: 'Confirm: Clear all transactions — PaisaPilot',
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
    <div style="background:#dc2626;padding:28px 32px">
      <p style="margin:0;font-size:13px;font-weight:600;color:rgba(255,255,255,0.7);letter-spacing:0.08em;text-transform:uppercase">PaisaPilot</p>
      <h1 style="margin:6px 0 0;font-size:22px;font-weight:800;color:#fff">⚠️ Clear All Transactions</h1>
    </div>
    <div style="padding:28px 32px">
      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6">
        You requested to permanently delete <strong>all your transactions</strong>. This action <strong>cannot be undone</strong>.
      </p>
      <div style="margin:0 0 20px;padding:20px;background:#fef2f2;border-radius:12px;border:1px solid #fecaca;text-align:center">
        <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#dc2626">Confirmation OTP</p>
        <p style="margin:0;font-size:36px;font-weight:800;letter-spacing:0.18em;color:#1e1e2e">${otp}</p>
        <p style="margin:12px 0 0;font-size:12px;color:#9ca3af">Expires in 10 minutes</p>
      </div>
      <p style="margin:0;font-size:13px;color:#9ca3af">If you did not request this, ignore this email — your data is safe.</p>
    </div>
  </div>
</body>
</html>`,
    }),
  })
  if (!res.ok) throw new Error(`Email failed: ${await res.text()}`)
}

// POST — send OTP to user's email before clearing
export async function POST() {
  try {
    const userId = await requireUserId()

    // Look up the user's email from DB
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
    if (!user?.email) return NextResponse.json({ error: 'User email not found' }, { status: 400 })

    const otp = genOtp()
    const expiry = new Date(Date.now() + 10 * 60 * 1000) // 10 min

    await prisma.appSettings.upsert({
      where: { userId },
      update: { clearOtp: otp, clearOtpExpiry: expiry },
      create: { userId, clearOtp: otp, clearOtpExpiry: expiry },
    })

    try {
      await sendEmail(user.email, otp)
    } catch (e) {
      console.error('Clear OTP email failed:', e)
      // In dev: return OTP in response so it can be tested without Resend
      const [local, domain] = user.email.split('@')
      const masked = local!.slice(0, 2) + '***@' + domain
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEV] Clear data OTP for ${user.email}: ${otp}`)
        return NextResponse.json({ ok: true, maskedEmail: masked, devOtp: otp })
      }
      return NextResponse.json({ error: 'Failed to send OTP email. Try again.' }, { status: 500 })
    }

    const [local, domain] = user.email.split('@')
    const masked = local!.slice(0, 2) + '***@' + domain
    return NextResponse.json({ ok: true, maskedEmail: masked })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Clear OTP error:', error)
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 })
  }
}

// DELETE — verify OTP then delete all transactions
export async function DELETE(req: NextRequest) {
  try {
    const userId = await requireUserId()
    const body = await req.json().catch(() => ({})) as { otp?: string }

    if (!body.otp) return NextResponse.json({ error: 'OTP required' }, { status: 400 })

    const settings = await prisma.appSettings.findUnique({ where: { userId } })
    if (!settings?.clearOtp || !settings.clearOtpExpiry) {
      return NextResponse.json({ error: 'No OTP requested. Click "Clear data" first.' }, { status: 400 })
    }
    if (new Date() > settings.clearOtpExpiry) {
      return NextResponse.json({ error: 'OTP has expired. Request a new one.' }, { status: 400 })
    }
    if (settings.clearOtp !== String(body.otp).trim()) {
      return NextResponse.json({ error: 'Incorrect OTP. Please check and try again.' }, { status: 400 })
    }

    // OTP valid — clear transactions and wipe OTP atomically
    await prisma.$transaction([
      prisma.transaction.deleteMany({ where: { userId } }),
      prisma.appSettings.update({ where: { userId }, data: { clearOtp: null, clearOtpExpiry: null } }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Clear transactions error:', error)
    return NextResponse.json({ error: 'Failed to clear transactions' }, { status: 500 })
  }
}
