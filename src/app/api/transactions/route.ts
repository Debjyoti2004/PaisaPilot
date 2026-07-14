import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'
import { createHash } from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId()
    const { searchParams } = new URL(request.url)
    const monthParam = searchParams.get('month')
    const categoryId = searchParams.get('categoryId')
    const search = searchParams.get('search')
    const envelopeId = searchParams.get('envelopeId')

    const where: Record<string, unknown> = { userId }

    if (monthParam) {
      const [year, month] = monthParam.split('-').map(Number)
      const start = new Date(year, month - 1, 1)
      const end = new Date(year, month, 0, 23, 59, 59)
      where.occurredAt = { gte: start, lte: end }
    }

    if (categoryId) where.categoryId = categoryId
    if (envelopeId) where.envelopeId = envelopeId
    if (search) where.narration = { contains: search, mode: 'insensitive' }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        category: true,
        envelope: { include: { category: true } },
      },
      orderBy: { occurredAt: 'desc' },
      take: 100,
    })

    return NextResponse.json({ transactions })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Transactions GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId()
    const body = await request.json()
    const { amount, categoryId, narration, merchantKey, occurredAt, type = 'debit' } = body

    if (!amount || !categoryId || !narration) {
      return NextResponse.json({ error: 'amount, categoryId, and narration are required' }, { status: 400 })
    }

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    const txDate = occurredAt ? new Date(occurredAt) : new Date()
    const monthStart = new Date(txDate.getFullYear(), txDate.getMonth(), 1)

    const period = await prisma.budgetPeriod.findFirst({
      where: { userId, month: monthStart, status: 'active' },
    })

    let envelopeId: string | null = null
    if (period) {
      const envelope = await prisma.envelope.findFirst({
        where: { periodId: period.id, categoryId },
      })
      if (envelope) {
        envelopeId = envelope.id
        if (type === 'debit') {
          await prisma.envelope.update({
            where: { id: envelope.id },
            data: { spent: { increment: parsedAmount } },
          })
        }
      }
    }

    const hashInput = `${userId}-${parsedAmount}-${categoryId}-${narration}-${txDate.toISOString().split('T')[0]}`
    const dedupeHash = createHash('md5').update(hashInput).digest('hex')

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        amount: parsedAmount,
        categoryId,
        narration,
        merchantKey: merchantKey || null,
        occurredAt: txDate,
        type,
        source: 'manual',
        envelopeId,
        dedupeHash,
      },
      include: { category: true },
    })

    const category = await prisma.category.findUnique({ where: { id: categoryId } })
    if (category && ['save_short', 'invest_long', 'goal'].includes(category.kind) && type === 'debit') {
      const bucket = await prisma.savingsBucket.findFirst({
        where: { userId, name: category.name },
      })
      if (bucket) {
        await prisma.savingsBucket.update({
          where: { id: bucket.id },
          data: { balance: { increment: parsedAmount } },
        })
        await prisma.bucketEntry.create({
          data: { bucketId: bucket.id, amount: parsedAmount, month: monthStart, note: narration },
        })
      }
    }

    return NextResponse.json({ transaction }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Transaction POST error:', error)
    if (error instanceof Error && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Duplicate transaction detected' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
  }
}
