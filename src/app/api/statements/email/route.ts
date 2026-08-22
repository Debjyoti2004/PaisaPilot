import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'
import { sendEmail, emailLogoBlock } from '@/lib/email-utils'

export const dynamic = 'force-dynamic'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function buildCsv(transactions: Array<{
  occurredAt: Date; narration: string; amount: number; type: string;
  category: { name: string } | null; finAccount: { name: string } | null; isTransfer: boolean; wealthGroup: string | null
}>) {
  const header = 'Date,Narration,Amount,Type,Category,Account,Group,Transfer'
  const rows = transactions.map(t => {
    const date = t.occurredAt.toISOString().slice(0, 10)
    const narration = `"${t.narration.replace(/"/g, '""')}"`
    const amount = t.amount.toFixed(2)
    const type = t.type === 'credit' ? 'Income' : 'Expense'
    const cat = t.category?.name ?? ''
    const acc = t.finAccount?.name ?? ''
    const group = t.wealthGroup ?? ''
    const transfer = t.isTransfer ? 'Yes' : 'No'
    return `${date},${narration},${amount},${type},${cat},${acc},${group},${transfer}`
  })
  return [header, ...rows].join('\n')
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { accountId, month, email: toEmail } = await req.json() as {
    accountId?: string; month: string; email: string
  }

  if (!month || !toEmail) return NextResponse.json({ error: 'month and email are required' }, { status: 400 })

  const [yr, mo] = month.split('-').map(Number)
  if (!yr || !mo) return NextResponse.json({ error: 'Invalid month format' }, { status: 400 })

  const monthStart = new Date(yr, mo - 1, 1)
  const monthEnd   = new Date(yr, mo, 0, 23, 59, 59)
  const monthLabel = `${MONTHS[mo - 1]} ${yr}`

  const where: Record<string, unknown> = {
    userId,
    occurredAt: { gte: monthStart, lte: monthEnd },
  }
  if (accountId && accountId !== 'all') where.accountId = accountId

  const transactions = await prisma.transaction.findMany({
    where,
    include: { category: true, finAccount: true },
    orderBy: { occurredAt: 'asc' },
  })

  const csv = buildCsv(transactions)

  const income  = transactions.filter(t => t.type === 'credit' && !t.isTransfer).reduce((s, t) => s + t.amount, 0)
  const expense = transactions.filter(t => t.type === 'debit'  && !t.isTransfer).reduce((s, t) => s + t.amount, 0)
  const inr = (n: number) => `&#8377;${n.toLocaleString('en-IN')}`

  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;background:#f8fafc;margin:0;padding:24px;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:24px 32px 20px;">
    ${emailLogoBlock()}
    <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0;">${monthLabel} Statement</h1>
  </div>
  <div style="padding:28px 32px;">
    <div style="display:flex;gap:16px;margin-bottom:24px;">
      <div style="flex:1;background:#f0fdf4;border-radius:12px;padding:16px;">
        <p style="font-size:11px;color:#16a34a;font-weight:700;margin:0 0 4px;text-transform:uppercase;">Income</p>
        <p style="font-size:20px;font-weight:800;color:#15803d;margin:0;">${inr(Math.round(income))}</p>
      </div>
      <div style="flex:1;background:#fef2f2;border-radius:12px;padding:16px;">
        <p style="font-size:11px;color:#ef4444;font-weight:700;margin:0 0 4px;text-transform:uppercase;">Expense</p>
        <p style="font-size:20px;font-weight:800;color:#dc2626;margin:0;">${inr(Math.round(expense))}</p>
      </div>
      <div style="flex:1;background:#ede9fe;border-radius:12px;padding:16px;">
        <p style="font-size:11px;color:#6558D3;font-weight:700;margin:0 0 4px;text-transform:uppercase;">Net Savings</p>
        <p style="font-size:20px;font-weight:800;color:#6558D3;margin:0;">${inr(Math.round(income - expense))}</p>
      </div>
    </div>
    <p style="font-size:13px;color:#64748b;margin:0;">
      ${transactions.length} transaction${transactions.length !== 1 ? 's' : ''} total.
      The full statement is attached as a CSV file — open in Excel or Google Sheets.
    </p>
  </div>
  <div style="padding:16px 32px 24px;border-top:1px solid #f1f5f9;">
    <p style="font-size:11px;color:#94a3b8;margin:0;">Sent from PaisaPilot · Your records stay private.</p>
  </div>
</div>
</body></html>`

  await sendEmail({
    to: toEmail,
    subject: `PaisaPilot — ${monthLabel} Statement`,
    html,
    attachments: [{ filename: `PaisaPilot-Statement-${month}.csv`, content: Buffer.from(csv) }],
  })

  await prisma.notification.create({
    data: {
      userId,
      title: `${monthLabel} statement sent`,
      message: `Your statement was emailed to ${toEmail}.`,
      type: 'success',
    },
  })

  return NextResponse.json({ ok: true })
}
