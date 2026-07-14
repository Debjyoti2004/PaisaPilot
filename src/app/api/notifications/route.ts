import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const userId = await requireUserId()
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ notifications })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('GET notifications error:', err)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId()
    const body = await req.json() as { title?: unknown; message?: unknown; type?: unknown }
    const title = typeof body.title === 'string' ? body.title : 'Notification'
    const message = typeof body.message === 'string' ? body.message : ''
    const type = typeof body.type === 'string' ? body.type : 'info'

    const notification = await prisma.notification.create({
      data: { userId, title, message, type },
    })
    return NextResponse.json({ notification }, { status: 201 })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('POST notification error:', err)
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await requireUserId()
    const body = await req.json() as { id?: unknown }
    const id = typeof body.id === 'string' ? body.id : undefined

    if (id) {
      const existing = await prisma.notification.findUnique({ where: { id } })
      if (!existing || existing.userId !== userId) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      const notification = await prisma.notification.update({
        where: { id },
        data: { read: true },
      })
      return NextResponse.json({ notification })
    } else {
      await prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true },
      })
      return NextResponse.json({ success: true })
    }
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('PATCH notification error:', err)
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await requireUserId()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const existing = await prisma.notification.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.notification.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('DELETE notification error:', err)
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 })
  }
}
