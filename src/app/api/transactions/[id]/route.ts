import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await req.json() as {
      amount?: unknown
      narration?: unknown
      categoryId?: unknown
      occurredAt?: unknown
      note?: unknown
      type?: unknown
    }

    // Fetch existing transaction
    const existing = await prisma.transaction.findUnique({
      where: { id },
      include: { envelope: true },
    })
    if (!existing) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })

    const newAmount = body.amount !== undefined ? parseFloat(String(body.amount)) : existing.amount
    const newNarration = typeof body.narration === 'string' ? body.narration : existing.narration
    const newCategoryId = typeof body.categoryId === 'string' ? body.categoryId : existing.categoryId
    const newOccurredAt = body.occurredAt ? new Date(String(body.occurredAt)) : existing.occurredAt
    const newNote = typeof body.note === 'string' ? body.note : existing.note ?? undefined
    const newType = typeof body.type === 'string' ? body.type : existing.type

    // Reverse old envelope spent, apply new
    if (existing.envelopeId && existing.envelope) {
      const oldContribution = existing.type === 'EXPENSE' ? existing.amount : 0
      const newContribution = newType === 'EXPENSE' ? newAmount : 0
      const delta = newContribution - oldContribution

      if (delta !== 0) {
        await prisma.envelope.update({
          where: { id: existing.envelopeId },
          data: { spent: { increment: delta } },
        })
      }
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        amount: newAmount,
        narration: newNarration,
        categoryId: newCategoryId,
        occurredAt: newOccurredAt,
        note: newNote,
        type: newType,
      },
      include: { category: true, envelope: true },
    })

    return NextResponse.json({ transaction })
  } catch (err) {
    console.error('PATCH transaction error:', err)
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const existing = await prisma.transaction.findUnique({
      where: { id },
      include: { envelope: true },
    })
    if (!existing) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })

    // Reverse envelope spent for expenses
    if (existing.envelopeId && existing.type === 'EXPENSE') {
      await prisma.envelope.update({
        where: { id: existing.envelopeId },
        data: { spent: { decrement: existing.amount } },
      })
    }

    await prisma.transaction.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE transaction error:', err)
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 })
  }
}
