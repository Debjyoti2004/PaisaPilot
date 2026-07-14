import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const fmt = (n: number) =>
  n.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 })

async function buildFinancialContext(userId: string): Promise<string> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  const monthLabel = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  const [period, transactions, savings, goals, settings] = await Promise.all([
    prisma.budgetPeriod.findFirst({
      where: { userId, month: monthStart, status: 'active' },
      include: { envelopes: { include: { category: true } } },
    }),
    prisma.transaction.findMany({
      where: { userId, occurredAt: { gte: monthStart, lte: monthEnd } },
      include: { category: true },
      orderBy: { occurredAt: 'desc' },
      take: 50,
    }),
    prisma.savingsBucket.findMany({ where: { userId }, orderBy: { balance: 'desc' } }),
    prisma.goal.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
    prisma.appSettings.findUnique({ where: { userId } }),
  ])

  const daysLeft = monthEnd.getDate() - now.getDate() + 1
  const totalDebits = transactions.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0)
  const totalCredits = transactions.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0)

  let ctx = `You are PaisaPilot, a smart personal finance assistant for an Indian user named Debjyoti.
You have full access to their real financial data below. Answer conversationally and helpfully.
Use ₹ symbol for amounts. Be concise but specific. Give actionable advice.

TODAY: ${now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
DAYS LEFT IN MONTH: ${daysLeft}
MONTH: ${monthLabel}

USER SETTINGS:
- Expected monthly salary: ${fmt(settings?.expectedSalary ?? 37000)}
- Savings floor: ${fmt(settings?.savingsFloor ?? 3000)}
`

  if (period) {
    ctx += `
INCOME THIS MONTH: ${fmt(period.incomeTotal)} (expected: ${fmt(period.expectedIncome)})

BUDGET ENVELOPES:
`
    const sorted = [...period.envelopes].sort((a, b) => b.spent - a.spent)
    for (const env of sorted) {
      const pct = env.allocated > 0 ? Math.round((env.spent / env.allocated) * 100) : 0
      const status = pct >= 100 ? '🔴 OVER' : pct >= 90 ? '🟠 NEAR LIMIT' : pct >= 70 ? '🟡 WATCH' : '🟢 OK'
      ctx += `  ${status} ${env.category.name}: ${fmt(env.spent)} / ${fmt(env.allocated)} (${pct}%) [${env.category.kind}]\n`
    }
  } else {
    ctx += `\nBUDGET: Salary not recorded yet for ${monthLabel}.\n`
  }

  ctx += `
MONTHLY SPENDING SUMMARY:
- Total spent: ${fmt(totalDebits)}
- Total income: ${fmt(totalCredits)}
- Net: ${fmt(totalCredits - totalDebits)}
- Transactions count: ${transactions.length}
`

  if (transactions.length > 0) {
    const byCat: Record<string, number> = {}
    for (const t of transactions.filter(x => x.type === 'debit')) {
      const k = t.category?.name ?? 'Other'
      byCat[k] = (byCat[k] ?? 0) + t.amount
    }
    const topCats = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 5)
    ctx += `\nTOP SPENDING CATEGORIES:\n`
    topCats.forEach(([cat, amt]) => { ctx += `  • ${cat}: ${fmt(amt)}\n` })

    ctx += `\nRECENT TRANSACTIONS (last 15):\n`
    for (const t of transactions.slice(0, 15)) {
      ctx += `  • ${t.occurredAt.toLocaleDateString('en-IN')} | ${t.type === 'credit' ? '+' : '-'}${fmt(t.amount)} | ${t.narration} [${t.category?.name ?? 'Uncategorized'}]\n`
    }
  }

  if (savings.length > 0) {
    ctx += `\nSAVINGS BUCKETS:\n`
    for (const b of savings) {
      ctx += `  • ${b.icon} ${b.name}: ${fmt(b.balance)} [${b.liquidity}]\n`
    }
    ctx += `  TOTAL: ${fmt(savings.reduce((s, b) => s + b.balance, 0))}\n`
  }

  if (goals.length > 0) {
    ctx += `\nFINANCIAL GOALS:\n`
    for (const g of goals) {
      const pct = g.targetAmount > 0 ? Math.round((g.savedAmount / g.targetAmount) * 100) : 0
      const dl = g.deadline ? ` | deadline: ${new Date(g.deadline).toLocaleDateString('en-IN')}` : ''
      ctx += `  • ${g.icon} ${g.name}: ${fmt(g.savedAmount)} / ${fmt(g.targetAmount)} (${pct}%)${dl}\n`
    }
  }

  return ctx
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId()
    const body = await req.json() as { message?: unknown; history?: unknown[] }
    const message = typeof body.message === 'string' ? body.message : ''
    if (!message.trim()) {
      return NextResponse.json({ message: 'Please ask me something!' })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ message: 'AI is not configured yet. Please add GEMINI_API_KEY to env.' })
    }

    const [context] = await Promise.all([buildFinancialContext(userId)])

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: context,
    })

    // Build chat history from request (up to last 10 turns)
    const rawHistory = Array.isArray(body.history) ? body.history : []
    const history = rawHistory
      .filter((h): h is { role: string; content: string } =>
        typeof h === 'object' && h !== null && 'role' in h && 'content' in h
      )
      .slice(-10)
      .map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }],
      }))

    const chat = model.startChat({ history })
    const result = await chat.sendMessage(message)
    const text = result.response.text()

    return NextResponse.json({ message: text })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Assistant error:', msg)
    if (msg.includes('429') || msg.includes('quota') || msg.includes('Too Many')) {
      return NextResponse.json({ message: "I'm getting too many requests right now. Please wait a moment and try again." })
    }
    return NextResponse.json({ message: 'Sorry, I had trouble thinking that through. Please try again.' })
  }
}
