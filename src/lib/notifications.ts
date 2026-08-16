import { prisma } from '@/lib/prisma'

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`

export async function createTxNotification(userId: string, params: {
  narration: string
  amount: number
  type: string
  categoryName: string
  envelopeId: string | null
}) {
  const { amount, type, categoryName, envelopeId } = params

  if (type === 'debit' && envelopeId) {
    const envelope = await prisma.envelope.findUnique({
      where: { id: envelopeId },
      include: { category: true },
    })
    if (envelope && envelope.allocated > 0) {
      const pct = Math.round((envelope.spent / envelope.allocated) * 100)
      if (pct >= 100) {
        await prisma.notification.create({
          data: {
            userId,
            title: `${envelope.category.name} budget exceeded`,
            message: `Spent ${fmt(envelope.spent)} vs ${fmt(envelope.allocated)} budget (${pct}%). You're ${fmt(envelope.spent - envelope.allocated)} over limit.`,
            type: 'error',
          },
        })
      } else if (pct >= 90) {
        await prisma.notification.create({
          data: {
            userId,
            title: `${envelope.category.name} at ${pct}% budget`,
            message: `Only ${fmt(envelope.allocated - envelope.spent)} left in ${envelope.category.name} budget for the month.`,
            type: 'warning',
          },
        })
      }
    }
  }
}

export async function checkMonthlyAlerts(userId: string) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysGone = now.getDate()
  const daysLeft = daysInMonth - daysGone

  async function sentToday(key: string) {
    const n = await prisma.notification.findFirst({
      where: { userId, title: { contains: key }, createdAt: { gte: todayStart } },
    })
    return !!n
  }

  async function sentThisMonth(key: string) {
    const n = await prisma.notification.findFirst({
      where: { userId, title: { contains: key }, createdAt: { gte: monthStart } },
    })
    return !!n
  }

  // ── 1. Budget envelope checks ──────────────────────────────────────────────
  const period = await prisma.budgetPeriod.findFirst({
    where: { userId, month: monthStart, status: 'active' },
    include: { envelopes: { include: { category: true } } },
  })

  if (period && period.envelopes.length > 0) {
    const totalSpent  = period.envelopes.reduce((s, e) => s + e.spent, 0)
    const totalBudget = period.envelopes.reduce((s, e) => s + e.allocated, 0)
    const overallPct  = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0
    const expectedPct = Math.round((daysGone / daysInMonth) * 100)

    // Per-envelope: over budget (once per day)
    for (const env of period.envelopes) {
      if (env.allocated <= 0) continue
      const pct = Math.round((env.spent / env.allocated) * 100)
      if (pct >= 100 && !(await sentToday(`Over budget: ${env.category.name}`))) {
        await prisma.notification.create({
          data: {
            userId,
            title: `Over budget: ${env.category.name}`,
            message: `Spent ${fmt(env.spent)} vs ${fmt(env.allocated)} budget this month. You're ${fmt(env.spent - env.allocated)} over — consider adjusting.`,
            type: 'error',
          },
        })
      } else if (pct >= 85 && pct < 100 && !(await sentThisMonth(`${env.category.name} at`))) {
        await prisma.notification.create({
          data: {
            userId,
            title: `${env.category.name} at ${pct}% budget`,
            message: `Used ${fmt(env.spent)} of ${fmt(env.allocated)}. Only ${fmt(env.allocated - env.spent)} remaining with ${daysLeft} days left this month.`,
            type: 'warning',
          },
        })
      }
    }

    // Overall spending pace (once per day)
    if (overallPct > expectedPct + 20 && !(await sentToday('Spending pace'))) {
      await prisma.notification.create({
        data: {
          userId,
          title: 'Spending pace alert',
          message: `${daysGone} days in (${expectedPct}% of month) but you've used ${overallPct}% of your total budget (${fmt(totalSpent)} of ${fmt(totalBudget)}). Try to slow down.`,
          type: 'warning',
        },
      })
    }

    // End-of-month recap (once per month, last 5 days)
    if (daysLeft <= 5 && !(await sentThisMonth('Month ending'))) {
      await prisma.notification.create({
        data: {
          userId,
          title: `Month ending — ${daysLeft} day${daysLeft !== 1 ? 's' : ''} to go`,
          message: overallPct > 100
            ? `You've exceeded your ${fmt(totalBudget)} budget by ${fmt(totalSpent - totalBudget)}. Plan ahead for next month.`
            : `Spent ${fmt(totalSpent)} of ${fmt(totalBudget)} budget. ${fmt(totalBudget - totalSpent)} remaining — finish strong!`,
          type: overallPct > 100 ? 'error' : 'info',
        },
      })
    }
  }

  // ── 2. Upcoming recurring payments (next 7 days, once per day) ─────────────
  if (!(await sentToday('payment'))) {
    const sevenDaysLater = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000)
    const todayStr = todayStart.toISOString().slice(0, 10)
    const laterStr = sevenDaysLater.toISOString().slice(0, 10)

    const allRecurring = await prisma.recurringPayment.findMany({
      where: { userId, active: true },
      orderBy: [{ nextDate: 'asc' }, { amount: 'desc' }],
    })

    const upcoming = allRecurring.filter(r => r.nextDate >= todayStr && r.nextDate <= laterStr)

    if (upcoming.length > 0) {
      const totalDue = upcoming.reduce((s, r) => s + r.amount, 0)
      const topNames = upcoming.slice(0, 3).map(r => r.name).join(', ')
      const extra = upcoming.length > 3 ? ` +${upcoming.length - 3} more` : ''
      await prisma.notification.create({
        data: {
          userId,
          title: `${upcoming.length} payment${upcoming.length > 1 ? 's' : ''} due this week`,
          message: `${topNames}${extra} — total ${fmt(totalDue)} due in the next 7 days. Ensure sufficient balance.`,
          type: 'info',
        },
      })
    }
  }

  // ── 3. No investments logged this month (once per month after 10th) ─────────
  if (daysGone >= 10 && !(await sentThisMonth('No investment'))) {
    const INV_CATS = ['Mutual Funds', 'Stocks', 'EPF/NPS', 'Gold', 'Fixed Deposits', 'Debt Funds']
    const investTxns = await prisma.transaction.findMany({
      where: {
        userId,
        type: 'debit',
        occurredAt: { gte: monthStart },
        category: { name: { in: INV_CATS } },
      },
    })
    if (investTxns.length === 0) {
      await prisma.notification.create({
        data: {
          userId,
          title: 'No investment logged this month',
          message: `You haven't recorded any investment for ${now.toLocaleString('en-IN', { month: 'long' })} yet. SIP due? Log it in Transactions.`,
          type: 'warning',
        },
      })
    }
  }
}
