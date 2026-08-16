import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

async function getUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return null
  return prisma.user.findUnique({ where: { email: session.user.email } })
}

async function getSettings(userId: string) {
  return prisma.appSettings.upsert({
    where: { userId },
    update: {},
    create: { userId },
  })
}

// GET — return pin status + whether prompt has been shown
export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const s = await getSettings(user.id)
  return NextResponse.json({ enabled: s.pinEnabled, promptSeen: s.pinPromptSeen })
}

// POST — enable PIN; body: { pin } to set PIN, or { skip: true } to dismiss prompt without enabling
export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()

  // Skip — just mark prompt as seen
  if (body.skip) {
    await prisma.appSettings.upsert({
      where: { userId: user.id },
      update: { pinPromptSeen: true },
      create: { userId: user.id, pinPromptSeen: true },
    })
    return NextResponse.json({ ok: true })
  }

  const { pin } = body
  if (!/^\d{4}$/.test(pin)) return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 })
  const pinHash = await bcrypt.hash(pin, 12)
  await prisma.appSettings.upsert({
    where: { userId: user.id },
    update: { pinEnabled: true, pinHash, pinPromptSeen: true },
    create: { userId: user.id, pinEnabled: true, pinHash, pinPromptSeen: true },
  })
  return NextResponse.json({ ok: true })
}

// PUT — change PIN (requires old PIN)
export async function PUT(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { oldPin, newPin } = await req.json()
  if (!/^\d{4}$/.test(newPin)) return NextResponse.json({ error: 'New PIN must be exactly 4 digits' }, { status: 400 })
  const s = await getSettings(user.id)
  if (!s.pinEnabled || !s.pinHash) return NextResponse.json({ error: 'PIN not set' }, { status: 400 })
  const match = await bcrypt.compare(String(oldPin), s.pinHash)
  if (!match) return NextResponse.json({ error: 'Current PIN is incorrect' }, { status: 400 })
  const pinHash = await bcrypt.hash(newPin, 12)
  await prisma.appSettings.update({ where: { userId: user.id }, data: { pinHash } })
  return NextResponse.json({ ok: true })
}

// DELETE — disable PIN (requires current PIN)
export async function DELETE(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { pin } = await req.json()
  const s = await getSettings(user.id)
  if (!s.pinEnabled || !s.pinHash) return NextResponse.json({ error: 'PIN not enabled' }, { status: 400 })
  const match = await bcrypt.compare(String(pin), s.pinHash)
  if (!match) return NextResponse.json({ error: 'Incorrect PIN' }, { status: 400 })
  await prisma.appSettings.update({
    where: { userId: user.id },
    data: { pinEnabled: false, pinHash: null },
  })
  return NextResponse.json({ ok: true })
}
