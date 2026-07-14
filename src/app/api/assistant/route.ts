import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function getMonthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)
  return { start, end }
}

function formatINR(amount: number): string {
  return amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 })
}

function detectIntent(msg: string): string {
  const lower = msg.toLowerCase()
  if (lower.includes('spend') || lower.includes('spent') || lower.includes('expense')) return 'spending'
  if (lower.includes('safe') || lower.includes('safe to spend')) return 'safe_to_spend'
  if (lower.includes('saving') || lower.includes('savings')) return 'savings'
  if (lower.includes('salary') || lower.includes('income')) return 'income'
  if (lower.includes('goal')) return 'goals'
  if (lower.includes('top') || lower.includes('categor')) return 'top_categories'
  if (lower.includes('track') || lower.includes('on track') || lower.includes('budget')) return 'budget_track'
  return 'summary'
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { message?: unknown }
    const message = typeof body.message === 'string' ? body.message : ''
    const intent = detectIntent(message)
    const { start, end } = getMonthRange()

    const monthLabel = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

    if (intent === 'spending') {
      const transactions = await prisma.transaction.findMany({
        where: { type: 'EXPENSE', occurredAt: { gte: start, lte: end } },
        include: { category: true },
      })
      const total = transactions.reduce((s, t) => s + t.amount, 0)

      const byCategory: Record<string, number> = {}
      for (const t of transactions) {
        const name = t.category?.name ?? 'Other'
        byCategory[name] = (byCategory[name] ?? 0) + t.amount
      }
      const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 5)

      let response = `In ${monthLabel}, you spent **${formatINR(total)}** across ${transactions.length} transactions.\n\nTop categories:\n`
      sorted.forEach(([cat, amt]) => {
        response += `• ${cat}: ${formatINR(amt)}\n`
      })
      return NextResponse.json({ message: response })
    }

    if (intent === 'safe_to_spend') {
      const period = await prisma.budgetPeriod.findFirst({
        where: { month: { gte: start, lte: end } },
        include: { envelopes: true },
      })
      if (!period) {
        return NextResponse.json({ message: "I couldn't find a budget period for this month. Please set up your salary split first." })
      }
      const totalBudget = period.envelopes.reduce((s, e) => s + e.allocated, 0)
      const totalSpent = period.envelopes.reduce((s, e) => s + e.spent, 0)
      const safeToSpend = totalBudget - totalSpent
      const daysLeft = end.getDate() - new Date().getDate() + 1
      const perDay = daysLeft > 0 ? safeToSpend / daysLeft : 0

      return NextResponse.json({
        message: `Your safe-to-spend balance is **${formatINR(safeToSpend)}**.\n\nThat's ${formatINR(perDay)}/day for the ${daysLeft} remaining days in ${monthLabel}.\n\nTotal budget: ${formatINR(totalBudget)} | Spent: ${formatINR(totalSpent)}`,
      })
    }

    if (intent === 'savings') {
      const buckets = await prisma.savingsBucket.findMany({ orderBy: { balance: 'desc' } })
      const total = buckets.reduce((s, b) => s + b.balance, 0)
      if (buckets.length === 0) {
        return NextResponse.json({ message: "You don't have any savings buckets yet. Go to the Savings page to create one!" })
      }
      let response = `Your total savings: **${formatINR(total)}** across ${buckets.length} buckets.\n\n`
      buckets.forEach((b) => {
        response += `${b.icon} ${b.name}: ${formatINR(b.balance)}\n`
      })
      return NextResponse.json({ message: response })
    }

    if (intent === 'income') {
      const income = await prisma.transaction.aggregate({
        where: { type: 'INCOME', occurredAt: { gte: start, lte: end } },
        _sum: { amount: true },
        _count: true,
      })
      const total = income._sum.amount ?? 0
      return NextResponse.json({
        message: `In ${monthLabel}, you received **${formatINR(total)}** in income across ${income._count} transaction(s).`,
      })
    }

    if (intent === 'goals') {
      const goals = await prisma.goal.findMany({ orderBy: { createdAt: 'asc' } })
      if (goals.length === 0) {
        return NextResponse.json({ message: "You haven't set any goals yet. Head to the Goals page to create your first one!" })
      }
      let response = `You have **${goals.length} active goal(s)**:\n\n`
      goals.forEach((g) => {
        const pct = g.targetAmount > 0 ? Math.round((g.savedAmount / g.targetAmount) * 100) : 0
        response += `${g.icon} **${g.name}**: ${formatINR(g.savedAmount)} / ${formatINR(g.targetAmount)} (${pct}%)\n`
      })
      return NextResponse.json({ message: response })
    }

    if (intent === 'top_categories') {
      const transactions = await prisma.transaction.findMany({
        where: { type: 'EXPENSE', occurredAt: { gte: start, lte: end } },
        include: { category: true },
      })
      const byCategory: Record<string, { amount: number; count: number; emoji: string }> = {}
      for (const t of transactions) {
        const name = t.category?.name ?? 'Other'
        const emoji = t.category?.icon ?? '💳'
        if (!byCategory[name]) byCategory[name] = { amount: 0, count: 0, emoji }
        byCategory[name].amount += t.amount
        byCategory[name].count += 1
      }
      const sorted = Object.entries(byCategory).sort((a, b) => b[1].amount - a[1].amount).slice(0, 3)
      if (sorted.length === 0) {
        return NextResponse.json({ message: `No expenses recorded in ${monthLabel} yet.` })
      }
      let response = `Your **top 3 spending categories** in ${monthLabel}:\n\n`
      sorted.forEach(([name, data], i) => {
        response += `${i + 1}. ${data.emoji} **${name}**: ${formatINR(data.amount)} (${data.count} transactions)\n`
      })
      return NextResponse.json({ message: response })
    }

    if (intent === 'budget_track') {
      const period = await prisma.budgetPeriod.findFirst({
        where: { month: { gte: start, lte: end } },
        include: { envelopes: true },
      })
      if (!period) {
        return NextResponse.json({ message: "No budget period found for this month. Please record your salary first!" })
      }
      const totalBudget = period.envelopes.reduce((s, e) => s + e.allocated, 0)
      const totalSpent = period.envelopes.reduce((s, e) => s + e.spent, 0)
      const usedPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0
      const dayOfMonth = new Date().getDate()
      const daysInMonth = end.getDate()
      const dayPct = Math.round((dayOfMonth / daysInMonth) * 100)

      const overBudgetEnvelopes = period.envelopes.filter((e) => e.spent > e.allocated)

      let status: string
      if (usedPct <= dayPct - 5) status = '✅ You are ahead of schedule — great job!'
      else if (usedPct <= dayPct + 5) status = '🟡 You are roughly on track for the month.'
      else status = '🔴 You are spending faster than expected — watch out!'

      let response = `**Budget Status for ${monthLabel}:**\n\n${status}\n\n`
      response += `• Spent: ${formatINR(totalSpent)} / ${formatINR(totalBudget)} (${usedPct}%)\n`
      response += `• Day ${dayOfMonth} of ${daysInMonth} (${dayPct}% through month)\n`

      if (overBudgetEnvelopes.length > 0) {
        response += `\n⚠️ Over-budget envelopes:\n`
        overBudgetEnvelopes.forEach((e) => {
          response += `• ${formatINR(e.spent)} / ${formatINR(e.allocated)} spent\n`
        })
      }
      return NextResponse.json({ message: response })
    }

    // Default: summary
    const [incomeAgg, expenseAgg, savingsCount, goalsCount] = await Promise.all([
      prisma.transaction.aggregate({ where: { type: 'INCOME', occurredAt: { gte: start, lte: end } }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { type: 'EXPENSE', occurredAt: { gte: start, lte: end } }, _sum: { amount: true } }),
      prisma.savingsBucket.count(),
      prisma.goal.count(),
    ])

    const income = incomeAgg._sum.amount ?? 0
    const expense = expenseAgg._sum.amount ?? 0
    const net = income - expense

    const response = `Here's your **${monthLabel} Summary**:\n\n💰 Income: ${formatINR(income)}\n💸 Expenses: ${formatINR(expense)}\n📊 Net: ${formatINR(net)}\n💾 Savings buckets: ${savingsCount}\n🎯 Active goals: ${goalsCount}\n\nAsk me anything specific about your finances!`
    return NextResponse.json({ message: response })
  } catch (err) {
    console.error('Assistant error:', err)
    return NextResponse.json({ message: 'Sorry, I encountered an error. Please try again.' }, { status: 500 })
  }
}
