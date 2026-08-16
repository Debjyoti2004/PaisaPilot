import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const userId = await requireUserId()
    const notes = await prisma.quickNote.findMany({
      where: { userId },
      orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
    })
    return NextResponse.json({ notes })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId()
    const body = await request.json()
    const note = await prisma.quickNote.create({
      data: {
        userId,
        title:   body.title   ?? '',
        content: body.content ?? '',
        color:   body.color   ?? '#ffffff',
        pinned:  body.pinned  ?? false,
      },
    })
    return NextResponse.json({ note })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await requireUserId()
    const body = await request.json()
    const { id, ...fields } = body
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const existing = await prisma.quickNote.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId)
      return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updates: Record<string, unknown> = {}
    if (fields.title   !== undefined) updates.title   = fields.title
    if (fields.content !== undefined) updates.content = fields.content
    if (fields.color   !== undefined) updates.color   = fields.color
    if (fields.pinned  !== undefined) updates.pinned  = fields.pinned

    const note = await prisma.quickNote.update({ where: { id }, data: updates })
    return NextResponse.json({ note })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await requireUserId()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const existing = await prisma.quickNote.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId)
      return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.quickNote.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
