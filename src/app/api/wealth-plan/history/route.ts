import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'
import { INVEST_API_CATS as INVEST_CATS } from '@/config/categories'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const userId = await requireUserId()

    const txns = await prisma.transaction.findMany({
      where: {
        userId,
        type: 'debit',
        OR: [
          { wealthGroup: 'investments' },
          { category: { name: { in: INVEST_CATS } } },
        ],
      },
      include: { category: true },
      orderBy: { occurredAt: 'asc' },
    })

    // Group total invested per month
    const monthMap: Record<string, number> = {}
    for (const tx of txns) {
      const d   = tx.occurredAt
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthMap[key] = (monthMap[key] ?? 0) + tx.amount
    }

    const months = Object.entries(monthMap)
      .map(([month, invested]) => ({ month, invested }))
      .sort((a, b) => a.month.localeCompare(b.month))

    return NextResponse.json({ months })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
