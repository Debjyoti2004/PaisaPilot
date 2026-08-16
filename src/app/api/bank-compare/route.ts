import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface CsvRow {
  date: string; narration: string; amount: number
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId()
    const body = await request.json()
    const rows: CsvRow[] = body.rows ?? []
    const accountId: string | undefined = body.accountId

    if (!rows.length) return NextResponse.json({ error: 'No rows provided' }, { status: 400 })

    // Find date range from CSV rows
    const dates = rows.map(r => new Date(r.date)).filter(d => !isNaN(d.getTime()))
    if (dates.length === 0) return NextResponse.json({ error: 'No valid dates in CSV' }, { status: 400 })

    const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))
    minDate.setDate(minDate.getDate() - 3) // ±3 day tolerance
    maxDate.setDate(maxDate.getDate() + 3)

    // Build account filter — support both migrated (accountId FK) and legacy (account name)
    let accountFilter: Record<string, unknown> = {}
    if (accountId) {
      const fa = await prisma.financialAccount.findUnique({ where: { id: accountId }, select: { name: true } })
      if (fa) {
        accountFilter = { OR: [{ accountId }, { accountId: null, account: fa.name }] }
      } else {
        accountFilter = { accountId }
      }
    }

    // Fetch existing transactions in that date range
    const txns = await prisma.transaction.findMany({
      where: {
        userId,
        type: 'debit',
        occurredAt: { gte: minDate, lte: maxDate },
        ...accountFilter,
      },
      select: { id: true, narration: true, amount: true, occurredAt: true, account: true },
    })

    // Match each CSV row to an existing transaction
    const usedTxnIds = new Set<string>()

    const results = rows.map(row => {
      const rowDate = new Date(row.date)
      if (isNaN(rowDate.getTime())) return { csvRow: row, matched: false }

      // Find best match: amount within ±1 AND date within ±3 days
      const candidates = txns.filter(t => {
        const amtMatch = Math.abs(t.amount - row.amount) <= 1
        const dayDiff = Math.abs(t.occurredAt.getTime() - rowDate.getTime()) / 86400000
        return amtMatch && dayDiff <= 3 && !usedTxnIds.has(t.id)
      })

      if (candidates.length === 0) {
        // Find nearest transaction by date only (for "did you mean?" hint)
        const nearMatch = txns
          .filter(t => !usedTxnIds.has(t.id))
          .sort((a, b) =>
            Math.abs(a.occurredAt.getTime() - rowDate.getTime()) -
            Math.abs(b.occurredAt.getTime() - rowDate.getTime())
          )[0]
        return {
          csvRow: row,
          matched: false,
          nearMatch: nearMatch ? {
            id: nearMatch.id,
            narration: nearMatch.narration ?? '',
            amount: nearMatch.amount,
            occurredAt: nearMatch.occurredAt.toISOString(),
            account: nearMatch.account ?? '',
          } : undefined,
        }
      }

      // Pick closest by date
      const best = candidates.sort((a, b) =>
        Math.abs(a.occurredAt.getTime() - rowDate.getTime()) -
        Math.abs(b.occurredAt.getTime() - rowDate.getTime())
      )[0]!

      usedTxnIds.add(best.id)
      return {
        csvRow: row,
        matched: true,
        txn: {
          id: best.id,
          narration: best.narration ?? '',
          amount: best.amount,
          occurredAt: best.occurredAt.toISOString(),
          account: best.account ?? '',
        },
      }
    })

    return NextResponse.json({ results, total: rows.length, matched: results.filter(r => r.matched).length })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Bank compare error:', error)
    return NextResponse.json({ error: 'Comparison failed' }, { status: 500 })
  }
}
