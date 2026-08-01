import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const userId = await requireUserId()
    const rules = await prisma.categoryRule.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } })
    return NextResponse.json({ rules })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId()
    const { whenText, thenText } = await request.json()
    if (!whenText?.trim() || !thenText?.trim()) {
      return NextResponse.json({ error: 'whenText and thenText required' }, { status: 400 })
    }
    const rule = await prisma.categoryRule.create({
      data: { userId, whenText: whenText.trim(), thenText: thenText.trim(), enabled: true },
    })
    return NextResponse.json({ rule }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await requireUserId()
    const { id, enabled, whenText, thenText } = await request.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const existing = await prisma.categoryRule.findFirst({ where: { id, userId } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const rule = await prisma.categoryRule.update({
      where: { id },
      data: {
        enabled:  enabled !== undefined  ? enabled  : undefined,
        whenText: whenText !== undefined ? whenText.trim() : undefined,
        thenText: thenText !== undefined ? thenText.trim() : undefined,
      },
    })
    return NextResponse.json({ rule })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await requireUserId()
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const existing = await prisma.categoryRule.findFirst({ where: { id, userId } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.categoryRule.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
