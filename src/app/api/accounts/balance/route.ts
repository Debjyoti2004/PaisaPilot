import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const userId = await requireUserId()

    const [faRows, txns] = await Promise.all([
      prisma.financialAccount.findMany({ where: { userId } }),
      prisma.transaction.findMany({
        where: { userId },
        select: {
          account: true, accountId: true, type: true, amount: true,
          isTransfer: true, cardPaid: true,
          finAccount: { select: { name: true, type: true } },
        },
      }),
    ])

    // Build ID → FinancialAccount map for type lookups
    const faById = new Map(faRows.map(fa => [fa.id, fa]))

    const resolvedName = (t: { accountId: string | null; account: string | null; finAccount?: { name: string } | null }) =>
      t.finAccount?.name ?? t.account ?? 'Savings Account'

    const isCard = (t: { accountId: string | null; finAccount?: { name: string; type: string } | null; account: string | null }) => {
      if (t.accountId) {
        const fa = faById.get(t.accountId)
        if (fa) return fa.type === 'credit_card' || fa.type === 'debit_card'
      }
      if (t.finAccount) return t.finAccount.type === 'credit_card' || t.finAccount.type === 'debit_card'
      const n = (t.account ?? '').toLowerCase()
      return n.includes('credit') || n.includes('debit') || n.includes('card')
    }

    const balances: Record<string, number> = {}
    const cardData: Record<string, { cardPaidSum: number; unpaidDebitSum: number; transferCreditSum: number }> = {}

    for (const t of txns) {
      const acc = resolvedName(t)
      if (!(acc in balances)) balances[acc] = 0
      balances[acc] += t.type === 'credit' ? t.amount : -t.amount

      if (isCard(t)) {
        if (!cardData[acc]) cardData[acc] = { cardPaidSum: 0, unpaidDebitSum: 0, transferCreditSum: 0 }
        if (t.type === 'debit' && !t.isTransfer) {
          if (t.cardPaid) cardData[acc].cardPaidSum += t.amount
          else cardData[acc].unpaidDebitSum += t.amount
        } else if (t.type === 'credit' && t.isTransfer) {
          cardData[acc].transferCreditSum += t.amount
        }
      }
    }

    const outstanding: Record<string, number> = {}
    for (const acc of Object.keys(balances)) {
      if (cardData[acc]) {
        const { cardPaidSum, unpaidDebitSum, transferCreditSum } = cardData[acc]
        const extraTransfer = Math.max(0, transferCreditSum - cardPaidSum)
        outstanding[acc] = Math.max(0, unpaidDebitSum - extraTransfer)
      } else {
        outstanding[acc] = 0
      }
    }

    const result: Record<string, { balance: number; outstanding: number; isCard: boolean; accountId: string | null }> = {}
    // Also index by accountId for frontends that look up by ID
    const byId: Record<string, { balance: number; outstanding: number; isCard: boolean; name: string }> = {}

    for (const acc of Object.keys(balances)) {
      const cardFlag = !!cardData[acc]
      result[acc] = { balance: balances[acc], outstanding: outstanding[acc] ?? 0, isCard: cardFlag, accountId: null }
    }
    // Attach accountId to result entries
    for (const fa of faRows) {
      if (result[fa.name]) {
        result[fa.name].accountId = fa.id
        byId[fa.id] = {
          balance: result[fa.name].balance,
          outstanding: result[fa.name].outstanding,
          isCard: result[fa.name].isCard,
          name: fa.name,
        }
      }
    }

    return NextResponse.json({ byName: result, byId })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
