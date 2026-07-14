import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'
import { jsPDF } from 'jspdf'
import nodemailer from 'nodemailer'

export const dynamic = 'force-dynamic'

const fmt = (n: number) => `Rs.${n.toLocaleString('en-IN')}`
const inr = (n: number) => `&#8377;${n.toLocaleString('en-IN')}`

type EmailParams = {
  monthLabel: string
  totalIncome: number
  totalExpense: number
  netSavings: number
  totalSavings: number
  transactions: Array<{ occurredAt: Date; type: string; amount: number; narration: string; category?: { name: string } | null }>
  period: { envelopes: Array<{ allocated: number; spent: number; category: { name: string } }> } | null
  goals: Array<{ name: string; savedAmount: number; targetAmount: number }>
  catRows: Array<[string, { amount: number; count: number }]>
}

function buildEmailHtml(p: EmailParams): string {
  const { monthLabel, totalIncome, totalExpense, netSavings, totalSavings, transactions, period, goals, catRows } = p
  const generated = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0

  const envRows = (period?.envelopes ?? [])
    .sort((a, b) => b.spent - a.spent)
    .map(env => {
      const pct = env.allocated > 0 ? Math.round((env.spent / env.allocated) * 100) : 0
      const over = env.spent > env.allocated
      const barColor = over ? '#ef4444' : pct >= 90 ? '#f97316' : '#6366f1'
      const barW = Math.min(pct, 100)
      return `
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:10px 12px;font-size:13px;color:#1e293b;">${env.category.name}</td>
          <td style="padding:10px 12px;font-size:13px;color:#475569;text-align:right;">${inr(env.allocated)}</td>
          <td style="padding:10px 12px;font-size:13px;color:#1e293b;font-weight:600;text-align:right;">${inr(env.spent)}</td>
          <td style="padding:10px 12px;font-size:13px;color:${env.allocated - env.spent >= 0 ? '#16a34a' : '#ef4444'};text-align:right;">${inr(env.allocated - env.spent)}</td>
          <td style="padding:10px 12px;width:80px;">
            <div style="background:#e2e8f0;border-radius:4px;height:6px;width:100%;">
              <div style="background:${barColor};border-radius:4px;height:6px;width:${barW}%;"></div>
            </div>
            <div style="font-size:10px;color:${over ? '#ef4444' : '#64748b'};text-align:right;margin-top:2px;">${pct}%</div>
          </td>
        </tr>`
    }).join('')

  const catRowsHtml = catRows.slice(0, 6).map(([cat, d], i) => `
    <tr style="border-bottom:1px solid #f1f5f9;">
      <td style="padding:9px 12px;font-size:13px;color:#374151;">${i + 1}. ${cat}</td>
      <td style="padding:9px 12px;font-size:12px;color:#6b7280;text-align:center;">${d.count} txn${d.count > 1 ? 's' : ''}</td>
      <td style="padding:9px 12px;font-size:13px;font-weight:600;color:#1e293b;text-align:right;">${inr(d.amount)}</td>
    </tr>`).join('')

  const recentTxns = transactions.slice(-15).reverse().map(t => {
    const isCredit = t.type === 'credit'
    return `
      <tr style="border-bottom:1px solid #f8fafc;">
        <td style="padding:8px 12px;font-size:12px;color:#6b7280;white-space:nowrap;">${t.occurredAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
        <td style="padding:8px 12px;font-size:12px;color:#374151;max-width:200px;overflow:hidden;">${t.narration.slice(0, 40)}</td>
        <td style="padding:8px 12px;font-size:12px;color:#6b7280;">${t.category?.name ?? 'Other'}</td>
        <td style="padding:8px 12px;font-size:13px;font-weight:600;color:${isCredit ? '#16a34a' : '#dc2626'};text-align:right;white-space:nowrap;">${isCredit ? '+' : '−'}${inr(t.amount)}</td>
      </tr>`
  }).join('')

  const goalsHtml = goals.map(g => {
    const pct = g.targetAmount > 0 ? Math.round((g.savedAmount / g.targetAmount) * 100) : 0
    return `
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:9px 12px;font-size:13px;color:#374151;">${g.name}</td>
        <td style="padding:9px 12px;font-size:12px;color:#6b7280;text-align:right;">${inr(g.savedAmount)} / ${inr(g.targetAmount)}</td>
        <td style="padding:9px 12px;font-size:12px;font-weight:600;color:#6366f1;text-align:right;">${pct}%</td>
      </tr>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PaisaPilot — ${monthLabel} Report</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- HEADER -->
  <tr><td style="background:linear-gradient(135deg,#4f46e5 0%,#6366f1 60%,#818cf8 100%);border-radius:12px 12px 0 0;padding:0;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:28px 32px 20px;">
          <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">PaisaPilot</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.7);margin-top:2px;letter-spacing:0.5px;">PERSONAL FINANCE STATEMENT</div>
        </td>
        <td style="padding:28px 32px 20px;text-align:right;vertical-align:top;">
          <div style="font-size:13px;font-weight:700;color:#ffffff;">${monthLabel.toUpperCase()}</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.6);margin-top:2px;">Generated: ${generated}</div>
        </td>
      </tr>
      <!-- Summary bar -->
      <tr><td colspan="2" style="padding:0 32px 28px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.12);border-radius:10px;">
          <tr>
            <td style="padding:16px 20px;border-right:1px solid rgba(255,255,255,0.15);">
              <div style="font-size:10px;color:rgba(255,255,255,0.65);letter-spacing:0.8px;text-transform:uppercase;">Total Income</div>
              <div style="font-size:20px;font-weight:700;color:#86efac;margin-top:4px;">${inr(totalIncome)}</div>
            </td>
            <td style="padding:16px 20px;border-right:1px solid rgba(255,255,255,0.15);">
              <div style="font-size:10px;color:rgba(255,255,255,0.65);letter-spacing:0.8px;text-transform:uppercase;">Total Expenses</div>
              <div style="font-size:20px;font-weight:700;color:#fca5a5;margin-top:4px;">${inr(totalExpense)}</div>
            </td>
            <td style="padding:16px 20px;">
              <div style="font-size:10px;color:rgba(255,255,255,0.65);letter-spacing:0.8px;text-transform:uppercase;">Net Savings</div>
              <div style="font-size:20px;font-weight:700;color:#ffffff;margin-top:4px;">${inr(netSavings)}</div>
              <div style="font-size:11px;color:rgba(255,255,255,0.6);margin-top:2px;">Savings rate: ${savingsRate}%</div>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </td></tr>

  <!-- ACCOUNT SUMMARY -->
  <tr><td style="background:#ffffff;padding:0 32px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:3px solid #6366f1;margin-top:0;">
      <tr>
        <td style="padding:20px 0 12px;"><div style="font-size:11px;font-weight:700;color:#6366f1;letter-spacing:1px;text-transform:uppercase;">Account Summary</div></td>
      </tr>
      <tr>
        <td>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="50%" style="padding-bottom:12px;">
                <div style="font-size:11px;color:#94a3b8;margin-bottom:3px;">Statement Period</div>
                <div style="font-size:13px;font-weight:600;color:#1e293b;">${monthLabel}</div>
              </td>
              <td width="50%" style="padding-bottom:12px;">
                <div style="font-size:11px;color:#94a3b8;margin-bottom:3px;">Total Transactions</div>
                <div style="font-size:13px;font-weight:600;color:#1e293b;">${transactions.length} entries</div>
              </td>
            </tr>
            <tr>
              <td width="50%" style="padding-bottom:16px;">
                <div style="font-size:11px;color:#94a3b8;margin-bottom:3px;">Savings Buckets Total</div>
                <div style="font-size:13px;font-weight:600;color:#1e293b;">${inr(totalSavings)}</div>
              </td>
              <td width="50%" style="padding-bottom:16px;">
                <div style="font-size:11px;color:#94a3b8;margin-bottom:3px;">Savings Rate</div>
                <div style="font-size:13px;font-weight:600;color:${savingsRate >= 10 ? '#16a34a' : '#ef4444'};">${savingsRate}% of income</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </td></tr>

  ${period && period.envelopes.length > 0 ? `
  <!-- BUDGET ENVELOPES -->
  <tr><td style="background:#ffffff;padding:0 32px 24px;">
    <div style="font-size:11px;font-weight:700;color:#6366f1;letter-spacing:1px;text-transform:uppercase;padding-bottom:12px;border-top:1px solid #e2e8f0;padding-top:20px;">Budget Envelopes</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <tr style="background:#f8fafc;">
        <th style="padding:10px 12px;font-size:11px;font-weight:600;color:#64748b;text-align:left;letter-spacing:0.5px;">CATEGORY</th>
        <th style="padding:10px 12px;font-size:11px;font-weight:600;color:#64748b;text-align:right;letter-spacing:0.5px;">ALLOCATED</th>
        <th style="padding:10px 12px;font-size:11px;font-weight:600;color:#64748b;text-align:right;letter-spacing:0.5px;">SPENT</th>
        <th style="padding:10px 12px;font-size:11px;font-weight:600;color:#64748b;text-align:right;letter-spacing:0.5px;">BALANCE</th>
        <th style="padding:10px 12px;font-size:11px;font-weight:600;color:#64748b;text-align:left;letter-spacing:0.5px;width:90px;">USAGE</th>
      </tr>
      ${envRows}
    </table>
  </td></tr>` : ''}

  ${catRows.length > 0 ? `
  <!-- TOP SPENDING -->
  <tr><td style="background:#ffffff;padding:0 32px 24px;">
    <div style="font-size:11px;font-weight:700;color:#6366f1;letter-spacing:1px;text-transform:uppercase;padding-bottom:12px;border-top:1px solid #e2e8f0;padding-top:20px;">Top Spending Categories</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <tr style="background:#f8fafc;">
        <th style="padding:10px 12px;font-size:11px;font-weight:600;color:#64748b;text-align:left;">CATEGORY</th>
        <th style="padding:10px 12px;font-size:11px;font-weight:600;color:#64748b;text-align:center;">TRANSACTIONS</th>
        <th style="padding:10px 12px;font-size:11px;font-weight:600;color:#64748b;text-align:right;">AMOUNT</th>
      </tr>
      ${catRowsHtml}
    </table>
  </td></tr>` : ''}

  ${transactions.length > 0 ? `
  <!-- RECENT TRANSACTIONS -->
  <tr><td style="background:#ffffff;padding:0 32px 24px;">
    <div style="font-size:11px;font-weight:700;color:#6366f1;letter-spacing:1px;text-transform:uppercase;padding-bottom:12px;border-top:1px solid #e2e8f0;padding-top:20px;">Recent Transactions (Last 15)</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <tr style="background:#f8fafc;">
        <th style="padding:9px 12px;font-size:11px;font-weight:600;color:#64748b;text-align:left;">DATE</th>
        <th style="padding:9px 12px;font-size:11px;font-weight:600;color:#64748b;text-align:left;">DESCRIPTION</th>
        <th style="padding:9px 12px;font-size:11px;font-weight:600;color:#64748b;text-align:left;">CATEGORY</th>
        <th style="padding:9px 12px;font-size:11px;font-weight:600;color:#64748b;text-align:right;">AMOUNT</th>
      </tr>
      ${recentTxns}
    </table>
    <div style="font-size:11px;color:#94a3b8;text-align:center;margin-top:8px;">Full transaction list available in attached PDF</div>
  </td></tr>` : ''}

  ${goals.length > 0 ? `
  <!-- GOALS -->
  <tr><td style="background:#ffffff;padding:0 32px 24px;">
    <div style="font-size:11px;font-weight:700;color:#6366f1;letter-spacing:1px;text-transform:uppercase;padding-bottom:12px;border-top:1px solid #e2e8f0;padding-top:20px;">Financial Goals</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <tr style="background:#f8fafc;">
        <th style="padding:9px 12px;font-size:11px;font-weight:600;color:#64748b;text-align:left;">GOAL</th>
        <th style="padding:9px 12px;font-size:11px;font-weight:600;color:#64748b;text-align:right;">SAVED / TARGET</th>
        <th style="padding:9px 12px;font-size:11px;font-weight:600;color:#64748b;text-align:right;">PROGRESS</th>
      </tr>
      ${goalsHtml}
    </table>
  </td></tr>` : ''}

  <!-- FOOTER -->
  <tr><td style="background:#1e293b;border-radius:0 0 12px 12px;padding:24px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <div style="font-size:15px;font-weight:700;color:#ffffff;">PaisaPilot</div>
          <div style="font-size:11px;color:#64748b;margin-top:4px;">Your personal finance companion</div>
        </td>
        <td style="text-align:right;vertical-align:top;">
          <div style="font-size:11px;color:#64748b;">${monthLabel} Financial Statement</div>
          <div style="font-size:11px;color:#475569;margin-top:2px;">Confidential — For personal use only</div>
        </td>
      </tr>
      <tr><td colspan="2" style="padding-top:16px;border-top:1px solid #334155;margin-top:16px;">
        <div style="font-size:10px;color:#475569;line-height:1.6;">
          This statement is auto-generated by PaisaPilot based on transactions recorded in your account.
          Please verify against your bank records. All amounts are in Indian Rupees (INR).
        </div>
      </td></tr>
    </table>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId()
    const body = await req.json() as { month?: string; email?: string }

    // Parse month (defaults to current month)
    let monthStart: Date
    if (body.month) {
      const [y, m] = body.month.split('-').map(Number)
      monthStart = new Date(y, m - 1, 1)
    } else {
      const now = new Date()
      monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    }
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59)
    const monthLabel = monthStart.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

    const [period, transactions, savings, goals, settings] = await Promise.all([
      prisma.budgetPeriod.findFirst({
        where: { userId, month: monthStart, status: 'active' },
        include: { envelopes: { include: { category: true } } },
      }),
      prisma.transaction.findMany({
        where: { userId, occurredAt: { gte: monthStart, lte: monthEnd } },
        include: { category: true },
        orderBy: { occurredAt: 'asc' },
      }),
      prisma.savingsBucket.findMany({ where: { userId }, orderBy: { balance: 'desc' } }),
      prisma.goal.findMany({ where: { userId } }),
      prisma.appSettings.findUnique({ where: { userId } }),
    ])

    const totalIncome = transactions.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0)
    const totalExpense = transactions.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0)
    const netSavings = totalIncome - totalExpense
    const totalSavings = savings.reduce((s, b) => s + b.balance, 0)

    // Build by-category breakdown
    const byCat: Record<string, { amount: number; count: number }> = {}
    for (const t of transactions.filter(x => x.type === 'debit')) {
      const k = t.category?.name ?? 'Other'
      if (!byCat[k]) byCat[k] = { amount: 0, count: 0 }
      byCat[k].amount += t.amount
      byCat[k].count += 1
    }
    const catRows = Object.entries(byCat).sort((a, b) => b[1].amount - a[1].amount)

    // ─── Generate PDF ─────────────────────────────────────────────────────────
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const W = 210
    let y = 15

    const line = (color = '#e2e8f0') => {
      doc.setDrawColor(color)
      doc.line(15, y, W - 15, y)
      y += 4
    }

    // Header
    doc.setFillColor(99, 102, 241)
    doc.rect(0, 0, W, 30, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('PaisaPilot', 15, 13)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(`Monthly Report — ${monthLabel}`, 15, 22)
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, W - 15, 22, { align: 'right' })

    y = 40

    // Summary cards
    doc.setTextColor(30, 30, 60)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('FINANCIAL SUMMARY', 15, y)
    y += 6
    line()

    const summaryRows = [
      ['Total Income', fmt(totalIncome)],
      ['Total Expenses', fmt(totalExpense)],
      ['Net Savings', fmt(netSavings)],
      ['Savings Buckets Total', fmt(totalSavings)],
      ['Total Transactions', String(transactions.length)],
    ]
    doc.setFontSize(11)
    for (const [label, value] of summaryRows) {
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(80, 80, 100)
      doc.text(label, 20, y)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 30, 60)
      doc.text(value, W - 20, y, { align: 'right' })
      y += 7
    }
    y += 4

    // Envelope breakdown
    if (period && period.envelopes.length > 0) {
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 30, 60)
      doc.text('BUDGET ENVELOPES', 15, y)
      y += 6
      line()

      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(100, 100, 120)
      doc.text('Category', 20, y)
      doc.text('Allocated', 95, y, { align: 'right' })
      doc.text('Spent', 130, y, { align: 'right' })
      doc.text('Remaining', 170, y, { align: 'right' })
      doc.text('%', W - 20, y, { align: 'right' })
      y += 5
      line('#cbd5e1')

      const sortedEnvelopes = [...period.envelopes].sort((a, b) => b.spent - a.spent)
      doc.setFontSize(9)
      for (const env of sortedEnvelopes) {
        const pct = env.allocated > 0 ? Math.round((env.spent / env.allocated) * 100) : 0
        const over = env.spent > env.allocated
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(over ? 200 : 50, over ? 50 : 50, over ? 50 : 50)
        doc.text(env.category.name, 20, y)
        doc.text(fmt(env.allocated), 95, y, { align: 'right' })
        doc.text(fmt(env.spent), 130, y, { align: 'right' })
        doc.text(fmt(env.allocated - env.spent), 170, y, { align: 'right' })
        doc.text(`${pct}%`, W - 20, y, { align: 'right' })
        y += 6
        if (y > 260) { doc.addPage(); y = 20 }
      }
      y += 4
    }

    // Category breakdown
    if (catRows.length > 0) {
      if (y > 220) { doc.addPage(); y = 20 }
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 30, 60)
      doc.text('SPENDING BY CATEGORY', 15, y)
      y += 6
      line()

      doc.setFontSize(9)
      for (const [cat, data] of catRows) {
        if (y > 270) { doc.addPage(); y = 20 }
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(60, 60, 80)
        doc.text(cat, 20, y)
        doc.text(`${data.count} txn${data.count > 1 ? 's' : ''}`, 110, y, { align: 'right' })
        doc.setFont('helvetica', 'bold')
        doc.text(fmt(data.amount), W - 20, y, { align: 'right' })
        y += 6
      }
      y += 4
    }

    // Goals
    if (goals.length > 0) {
      if (y > 220) { doc.addPage(); y = 20 }
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 30, 60)
      doc.text('GOALS PROGRESS', 15, y)
      y += 6
      line()

      doc.setFontSize(9)
      for (const g of goals) {
        if (y > 270) { doc.addPage(); y = 20 }
        const pct = g.targetAmount > 0 ? Math.round((g.savedAmount / g.targetAmount) * 100) : 0
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(60, 60, 80)
        doc.text(g.name, 20, y)
        doc.text(`${fmt(g.savedAmount)} / ${fmt(g.targetAmount)} (${pct}%)`, W - 20, y, { align: 'right' })
        y += 6
      }
      y += 4
    }

    // All transactions (new page)
    if (transactions.length > 0) {
      doc.addPage()
      y = 20
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 30, 60)
      doc.text(`ALL TRANSACTIONS — ${monthLabel}`, 15, y)
      y += 6
      line()

      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(100, 100, 120)
      doc.text('Date', 20, y)
      doc.text('Description', 50, y)
      doc.text('Category', 120, y)
      doc.text('Amount', W - 20, y, { align: 'right' })
      y += 5
      line('#cbd5e1')

      doc.setFontSize(8)
      for (const t of transactions) {
        if (y > 270) { doc.addPage(); y = 20 }
        const isCredit = t.type === 'credit'
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(80, 80, 100)
        doc.text(t.occurredAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), 20, y)
        doc.text(t.narration.slice(0, 35), 50, y)
        doc.text((t.category?.name ?? 'Other').slice(0, 20), 120, y)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(isCredit ? 20 : 180, isCredit ? 150 : 40, isCredit ? 80 : 40)
        doc.text(`${isCredit ? '+' : '-'}${fmt(t.amount)}`, W - 20, y, { align: 'right' })
        y += 5.5
      }
    }

    // Footer
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 170)
      doc.text(`PaisaPilot | ${monthLabel} Report | Page ${i} of ${pageCount}`, W / 2, 290, { align: 'center' })
    }

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

    // ─── Send email ──────────────────────────────────────────────────────────
    const toEmail = body.email ?? settings?.reportEmail ?? ''
    if (!toEmail) {
      // Return PDF as download if no email configured
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="PaisaPilot-${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}.pdf"`,
        },
      })
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="PaisaPilot-${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}.pdf"`,
        },
      })
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })

    await transporter.sendMail({
      from: `PaisaPilot <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `PaisaPilot — Your ${monthLabel} Financial Report`,
      html: buildEmailHtml({ monthLabel, totalIncome, totalExpense, netSavings, totalSavings, transactions, period, goals, catRows }),
      attachments: [{
        filename: `PaisaPilot-${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }],
    })

    // Create in-app notification
    await prisma.notification.create({
      data: {
        userId,
        title: `${monthLabel} report sent`,
        message: `Your monthly financial summary was emailed to ${toEmail}.`,
        type: 'success',
      },
    })

    return NextResponse.json({
      success: true,
      message: `Report sent to ${toEmail}`,
      summary: { totalIncome, totalExpense, netSavings, transactions: transactions.length },
    })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Monthly report error:', err)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
