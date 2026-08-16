import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET ?accountId=<FinancialAccount.id>  (preferred)
// GET ?account=<name>                   (legacy fallback)
export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId()
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const accountName = searchParams.get('account')

    if (!accountId && !accountName) return NextResponse.json({ bills: [] })

    let where: Record<string, unknown>
    if (accountId) {
      const fa = await prisma.financialAccount.findUnique({ where: { id: accountId }, select: { name: true } })
      where = {
        userId, type: 'debit', isTransfer: false, cardPaid: false,
        OR: fa
          ? [{ accountId }, { accountId: null, account: fa.name }]
          : [{ accountId }],
      }
    } else {
      where = { userId, account: accountName!, type: 'debit', isTransfer: false, cardPaid: false }
    }

    const bills = await prisma.transaction.findMany({
      where,
      select: { id: true, merchant: true, narration: true, amount: true, occurredAt: true },
      orderBy: { occurredAt: 'desc' },
    })

    return NextResponse.json({ bills })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
