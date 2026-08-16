import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Returns { needs: string[], wants: string[], investments: string[] }
export async function GET() {
  try {
    const userId = await requireUserId()
    const rows = await prisma.userSubcategory.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    })
    const result = { needs: [] as string[], wants: [] as string[], investments: [] as string[] }
    for (const r of rows) {
      const g = r.wealthGroup as keyof typeof result
      if (result[g]) result[g].push(r.name)
    }
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// POST { name, wealthGroup } → creates subcategory (rejects duplicates across all groups)
export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId()
    const { name, wealthGroup } = await request.json()
    if (!name?.trim() || !wealthGroup) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    const trimmed = name.trim()

    // Check duplicate across all groups for this user
    const existing = await prisma.userSubcategory.findFirst({
      where: { userId, name: { equals: trimmed, mode: 'insensitive' } },
    })
    if (existing) return NextResponse.json({ error: 'Name already exists' }, { status: 409 })

    const row = await prisma.userSubcategory.create({
      data: { userId, name: trimmed, wealthGroup },
    })
    return NextResponse.json({ row })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// DELETE ?name=X → removes subcategory
export async function DELETE(request: NextRequest) {
  try {
    const userId = await requireUserId()
    const { searchParams } = new URL(request.url)
    const name = searchParams.get('name')
    if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 })

    await prisma.userSubcategory.deleteMany({ where: { userId, name } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
