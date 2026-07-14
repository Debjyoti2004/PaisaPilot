export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const buckets = await prisma.savingsBucket.findMany({
      include: {
        entries: {
          orderBy: { month: 'desc' },
          take: 12,
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    const summary = {
      liquid: buckets.filter(b => b.liquidity === 'liquid').reduce((sum, b) => sum + b.balance, 0),
      reserved: buckets.filter(b => b.liquidity === 'reserved').reduce((sum, b) => sum + b.balance, 0),
      locked: buckets.filter(b => b.liquidity === 'locked').reduce((sum, b) => sum + b.balance, 0),
      total: buckets.reduce((sum, b) => sum + b.balance, 0),
    }

    return NextResponse.json({ buckets, summary })
  } catch (error) {
    console.error('Savings GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch savings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bucketId, amount, note, action } = body

    // Create a new bucket
    if (action === 'create_bucket') {
      const { name, liquidity, icon, color } = body
      if (!name || !liquidity) return NextResponse.json({ error: 'name and liquidity required' }, { status: 400 })
      const bucket = await prisma.savingsBucket.create({
        data: { name, liquidity, icon: icon || '💰', color: color || '#6366f1', balance: 0 },
      })
      return NextResponse.json({ bucket }, { status: 201 })
    }

    if (!bucketId || amount === undefined) {
      return NextResponse.json({ error: 'bucketId and amount are required' }, { status: 400 })
    }

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount)) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const bucket = await prisma.savingsBucket.update({
      where: { id: bucketId },
      data: { balance: { increment: parsedAmount } },
    })

    const entry = await prisma.bucketEntry.create({
      data: { bucketId, amount: parsedAmount, month: monthStart, note: note || null },
    })

    return NextResponse.json({ bucket, entry }, { status: 201 })
  } catch (error) {
    console.error('Savings POST error:', error)
    return NextResponse.json({ error: 'Failed to update savings' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const entryId = searchParams.get('entryId')
    const bucketId = searchParams.get('bucketId')

    if (entryId) {
      // Delete a single entry and reverse its amount from the bucket balance
      const entry = await prisma.bucketEntry.findUnique({ where: { id: entryId } })
      if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

      await prisma.bucketEntry.delete({ where: { id: entryId } })
      await prisma.savingsBucket.update({
        where: { id: entry.bucketId },
        data: { balance: { decrement: entry.amount } },
      })
      return NextResponse.json({ ok: true })
    }

    if (bucketId) {
      // Delete entire bucket (entries cascade)
      await prisma.savingsBucket.delete({ where: { id: bucketId } })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'entryId or bucketId required' }, { status: 400 })
  } catch (error) {
    console.error('Savings DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { bucketId, name, icon, color, liquidity } = body
    if (!bucketId) return NextResponse.json({ error: 'bucketId required' }, { status: 400 })

    const bucket = await prisma.savingsBucket.update({
      where: { id: bucketId },
      data: { ...(name && { name }), ...(icon && { icon }), ...(color && { color }), ...(liquidity && { liquidity }) },
    })
    return NextResponse.json({ bucket })
  } catch (error) {
    console.error('Savings PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update bucket' }, { status: 500 })
  }
}
