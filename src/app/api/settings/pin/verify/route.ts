import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { pin } = await req.json()
  const s = await prisma.appSettings.findUnique({ where: { userId: user.id } })
  if (!s?.pinEnabled || !s.pinHash) return NextResponse.json({ ok: true }) // PIN not enabled — always pass
  const match = await bcrypt.compare(String(pin), s.pinHash)
  if (!match) return NextResponse.json({ error: 'Incorrect PIN' }, { status: 400 })
  return NextResponse.json({ ok: true })
}
