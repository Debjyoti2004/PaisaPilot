import { prisma } from '@/lib/prisma'

export async function createTxNotification(userId: string, params: {
  narration: string
  amount: number
  type: string
  categoryName: string
  envelopeId: string | null
}) {
  const { narration, amount, type, categoryName, envelopeId } = params
  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`

  if (type === 'debit') {
    // Check envelope budget status
    if (envelopeId) {
      const envelope = await prisma.envelope.findUnique({
        where: { id: envelopeId },
        include: { category: true },
      })
      if (envelope) {
        const pct = envelope.allocated > 0
          ? Math.round((envelope.spent / envelope.allocated) * 100)
          : 0

        if (pct >= 100) {
          await prisma.notification.create({
            data: {
              userId,
              title: `${envelope.category.name} budget exceeded`,
              message: `You've spent ${fmt(envelope.spent)} vs ${fmt(envelope.allocated)} budget (${pct}%). Consider cutting back.`,
              type: 'warning',
            },
          })
        } else if (pct >= 90) {
          await prisma.notification.create({
            data: {
              userId,
              title: `${envelope.category.name} almost full`,
              message: `${pct}% of your ${envelope.category.name} budget used. Only ${fmt(envelope.allocated - envelope.spent)} remaining.`,
              type: 'warning',
            },
          })
        }
      }
    }

    // Transaction confirmation notification
    await prisma.notification.create({
      data: {
        userId,
        title: `${fmt(amount)} spent on ${categoryName}`,
        message: `"${narration}" recorded successfully.`,
        type: 'info',
      },
    })
  } else {
    // Income notification
    await prisma.notification.create({
      data: {
        userId,
        title: `Income received: ${fmt(amount)}`,
        message: `"${narration}" added to your account.`,
        type: 'success',
      },
    })
  }
}

export async function checkMonthlyAlerts(userId: string) {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysLeft = daysInMonth - now.getDate() + 1
  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`

  const period = await prisma.budgetPeriod.findFirst({
    where: { userId, month: monthStart, status: 'active' },
    include: { envelopes: { include: { category: true } } },
  })
  if (!period) return

  // Over-budget alerts
  for (const env of period.envelopes) {
    if (env.spent > env.allocated) {
      const existing = await prisma.notification.findFirst({
        where: {
          userId,
          title: { contains: env.category.name },
          type: 'warning',
          createdAt: { gte: monthStart },
        },
      })
      if (!existing) {
        await prisma.notification.create({
          data: {
            userId,
            title: `Over budget: ${env.category.name}`,
            message: `Spent ${fmt(env.spent)} vs ${fmt(env.allocated)} budget this month.`,
            type: 'warning',
          },
        })
      }
    }
  }

  // End-of-month reminder (last 3 days)
  if (daysLeft <= 3) {
    const existing = await prisma.notification.findFirst({
      where: { userId, title: { contains: 'Month ending' }, createdAt: { gte: monthStart } },
    })
    if (!existing) {
      const totalSpent = period.envelopes.reduce((s, e) => s + e.spent, 0)
      const totalBudget = period.envelopes.reduce((s, e) => s + e.allocated, 0)
      await prisma.notification.create({
        data: {
          userId,
          title: `Month ending in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`,
          message: `You've spent ${fmt(totalSpent)} of ${fmt(totalBudget)} this month. Check your report!`,
          type: 'info',
        },
      })
    }
  }
}
