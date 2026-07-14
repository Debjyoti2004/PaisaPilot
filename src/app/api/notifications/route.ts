import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ notifications })
  } catch (err) {
    console.error('GET notifications error:', err)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { title?: unknown; message?: unknown; type?: unknown }
    const title = typeof body.title === 'string' ? body.title : 'Notification'
    const message = typeof body.message === 'string' ? body.message : ''
    const type = typeof body.type === 'string' ? body.type : 'info'

    const notification = await prisma.notification.create({
      data: { title, message, type },
    })
    return NextResponse.json({ notification }, { status: 201 })
  } catch (err) {
    console.error('POST notification error:', err)
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json() as { id?: unknown }
    const id = typeof body.id === 'string' ? body.id : undefined

    if (id) {
      // Mark specific notification as read
      const notification = await prisma.notification.update({
        where: { id },
        data: { read: true },
      })
      return NextResponse.json({ notification })
    } else {
      // Mark all as read
      await prisma.notification.updateMany({
        where: { read: false },
        data: { read: true },
      })
      return NextResponse.json({ success: true })
    }
  } catch (err) {
    console.error('PATCH notification error:', err)
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    await prisma.notification.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE notification error:', err)
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 })
  }
}
