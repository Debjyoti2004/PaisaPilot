import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json()

    if (!email || !password) return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    if (password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })

    const hashed = await hash(password, 12)
    const user = await prisma.user.create({
      data: {
        email,
        name: name?.trim() || email.split('@')[0],
        password: hashed,
        emailVerified: new Date(),
      },
    })

    // Seed defaults
    const { seedUserDefaults } = await import('@/lib/seed-user')
    await seedUserDefaults(user.id).catch(() => {})

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
