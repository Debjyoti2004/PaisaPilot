import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await requireUserId()
    const { id } = params
    const body = await req.json() as {
      amount?: unknown; narration?: unknown; categoryId?: unknown
      occurredAt?: unknown; note?: unknown; type?: unknown
    }

    const existing = await prisma.transaction.findUnique({
      where: { id },
      include: { envelope: true },
    })
    if (!existing) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    if (existing.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const newAmount = body.amount !== undefined ? parseFloat(String(body.amount)) : existing.amount
    const newNarration = typeof body.narration === 'string' ? body.narration : existing.narration
    const newCategoryId = typeof body.categoryId === 'string' ? body.categoryId : existing.categoryId
    const newOccurredAt = body.occurredAt ? new Date(String(body.occurredAt)) : existing.occurredAt
    const newNote = typeof body.note === 'string' ? body.note : (existing.note ?? undefined)
    const newType = typeof body.type === 'string' ? body.type : existing.type

    if (existing.envelopeId && existing.envelope) {
      const oldContribution = existing.type === 'debit' ? existing.amount : 0
      const newContribution = newType === 'debit' ? newAmount : 0
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
      data: { amount: newAmount, narration: newNarration, categoryId: newCategoryId, occurredAt: newOccurredAt, note: newNote, type: newType },
      include: { category: true, envelope: true },
    })

    return NextResponse.json({ transaction })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('PATCH transaction error:', err)
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await requireUserId()
    const { id } = params

    const existing = await prisma.transaction.findUnique({
      where: { id },
      include: { envelope: true },
    })
    if (!existing) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    if (existing.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if (existing.envelopeId && existing.type === 'debit') {
      await prisma.envelope.update({
        where: { id: existing.envelopeId },
        data: { spent: { decrement: existing.amount } },
      })
    }

    // When deleting a transfer credit that paid specific bills → un-mark those bills
    const unmarkBills = async (creditTxId: string) => {
      await prisma.transaction.updateMany({
        where: { userId, linkedTxId: creditTxId, cardPaid: true, isTransfer: false },
        data: { cardPaid: false, linkedTxId: null },
      })
    }

    if (existing.isTransfer) {
      if (existing.type === 'credit') {
        await unmarkBills(id)
      }
      // Delete the linked side of the transfer pair as well
      if (existing.linkedTxId) {
        const linked = await prisma.transaction.findUnique({ where: { id: existing.linkedTxId } })
        if (linked && linked.userId === userId) {
          if (linked.type === 'credit') await unmarkBills(linked.id)
          await prisma.transaction.delete({ where: { id: existing.linkedTxId } })
        }
      }
    }

    await prisma.transaction.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('DELETE transaction error:', err)
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 })
  }
}
