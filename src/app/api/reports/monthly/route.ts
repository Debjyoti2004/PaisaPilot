import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'
import { jsPDF } from 'jspdf'
import nodemailer from 'nodemailer'

export const dynamic = 'force-dynamic'

const fmt = (n: number) => `Rs.${n.toLocaleString('en-IN')}`

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
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <div style="background: #6366f1; padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 22px;">PaisaPilot</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0;">Your ${monthLabel} report is ready</p>
          </div>
          <div style="background: #f8fafc; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #64748b;">Total Income</td><td style="text-align: right; font-weight: bold; color: #10b981;">${fmt(totalIncome)}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;">Total Expenses</td><td style="text-align: right; font-weight: bold; color: #ef4444;">${fmt(totalExpense)}</td></tr>
              <tr style="border-top: 1px solid #e2e8f0;"><td style="padding: 8px 0; font-weight: bold;">Net Savings</td><td style="text-align: right; font-weight: bold; color: #6366f1;">${fmt(netSavings)}</td></tr>
            </table>
            <p style="color: #64748b; font-size: 13px; margin-top: 16px;">Your full report with all transactions and budget breakdown is attached as a PDF.</p>
          </div>
        </div>
      `,
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
