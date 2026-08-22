import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { sendEmail, emailLogoBlock } from '@/lib/email-utils'

function genOtp() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

async function sendPinResetEmail(to: string, otp: string) {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
    <div style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:24px 32px 20px">
      ${emailLogoBlock()}
      <h1 style="margin:0;font-size:22px;font-weight:800;color:#fff">PIN Reset Request</h1>
    </div>
    <div style="padding:28px 32px">
      <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6">
        Someone requested a PIN reset for your PaisaPilot account. Use the OTP below to set a new PIN.
      </p>
      <div style="margin:0 0 20px;padding:20px;background:#f0eeff;border-radius:12px;border:1px solid #c4b5fd;text-align:center">
        <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#6558D3">Your OTP</p>
        <p style="margin:0;font-size:36px;font-weight:800;letter-spacing:0.18em;color:#1e1e2e">${otp}</p>
        <p style="margin:12px 0 0;font-size:12px;color:#9ca3af">Expires in 10 minutes</p>
      </div>
      <p style="margin:0;font-size:13px;color:#9ca3af">If you didn't request this, you can safely ignore this email. Your PIN remains unchanged.</p>
    </div>
    <div style="padding:16px 32px 24px;border-top:1px solid #f3f4f6">
      <p style="margin:0;font-size:11px;color:#9ca3af">PaisaPilot · Your money, clearly. Sent to ${to}.</p>
    </div>
  </div>
</body>
</html>`

  await sendEmail({ to, subject: 'Your PIN Reset OTP — PaisaPilot', html })
}

// POST — send OTP to registered email
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const otp = genOtp()
  const expiry = new Date(Date.now() + 10 * 60 * 1000)

  await prisma.appSettings.upsert({
    where: { userId: user.id },
    update: { pinOtp: otp, pinOtpExpiry: expiry },
    create: { userId: user.id, pinOtp: otp, pinOtpExpiry: expiry },
  })

  try {
    await sendPinResetEmail(user.email!, otp)
  } catch (e) {
    console.error('PIN reset email failed:', e)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] PIN reset OTP for ${user.email}: ${otp}`)
      const [local, domain] = user.email!.split('@')
      const masked = local.slice(0, 2) + '***@' + domain
      return NextResponse.json({ ok: true, maskedEmail: masked, devOtp: otp })
    }
    return NextResponse.json({ error: 'Failed to send OTP email. Please try again or contact support.' }, { status: 500 })
  }

  const [local, domain] = user.email!.split('@')
  const masked = local.slice(0, 2) + '***@' + domain
  return NextResponse.json({ ok: true, maskedEmail: masked })
}

// PUT — confirm OTP + set new PIN
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { otp, newPin } = await req.json()
  if (!/^\d{4}$/.test(newPin)) return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 })

  const s = await prisma.appSettings.findUnique({ where: { userId: user.id } })
  if (!s?.pinOtp || !s.pinOtpExpiry) return NextResponse.json({ error: 'No OTP requested' }, { status: 400 })
  if (new Date() > s.pinOtpExpiry) return NextResponse.json({ error: 'OTP expired. Request a new one.' }, { status: 400 })
  if (s.pinOtp !== String(otp)) return NextResponse.json({ error: 'Incorrect OTP' }, { status: 400 })

  const pinHash = await bcrypt.hash(newPin, 12)
  await prisma.appSettings.update({
    where: { userId: user.id },
    data: { pinEnabled: true, pinHash, pinOtp: null, pinOtpExpiry: null },
  })
  return NextResponse.json({ ok: true })
}
