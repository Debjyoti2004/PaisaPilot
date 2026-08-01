import { prisma } from '@/lib/prisma'

// Seeds default categories, split config, budget period, and savings buckets
// for a brand-new user. Safe to call multiple times — checks existence first.
export async function seedUserDefaults(userId: string) {
  // Already seeded?
  const existing = await prisma.splitConfig.findFirst({ where: { userId } })
  if (existing) return

  // Ensure global categories exist (shared across all users)
  const cats = await upsertCategories()

  // Create default split config for this user
  const config = await prisma.splitConfig.create({
    data: {
      userId,
      name: 'Standard ₹37k Plan',
      active: true,
      version: 1,
      rules: {
        create: [
          { categoryId: cats.emi,         mode: 'fixed',   value: 7000, priority: 1,  flexRank: 10 },
          { categoryId: cats.gym,         mode: 'fixed',   value: 1000, priority: 2,  flexRank: 9  },
          { categoryId: cats.supplements, mode: 'fixed',   value: 2200, priority: 3,  flexRank: 7  },
          { categoryId: cats.sip,         mode: 'fixed',   value: 5000, priority: 4,  flexRank: 6  },
          { categoryId: cats.emergency,   mode: 'fixed',   value: 2000, priority: 5,  flexRank: 5  },
          { categoryId: cats.shortTerm,   mode: 'fixed',   value: 1000, priority: 6,  flexRank: 4  },
          { categoryId: cats.travel,      mode: 'fixed',   value: 1000, priority: 7,  flexRank: 3  },
          { categoryId: cats.grooming,    mode: 'fixed',   value: 2000, priority: 8,  flexRank: 2  },
          { categoryId: cats.clothes,     mode: 'fixed',   value: 1500, priority: 9,  flexRank: 1  },
          { categoryId: cats.fun,         mode: 'fixed',   value: 1300, priority: 10, flexRank: 1  },
          { categoryId: cats.food,        mode: 'fixed',   value: 12500,priority: 11, flexRank: 2  },
          { categoryId: cats.buffer,      mode: 'remainder',value: 0,   priority: 12, flexRank: 0  },
        ],
      },
      adjustRule: {
        create: {
          surplusSplit: { sip: 60, emergency: 20, travel: 10, fun: 10 },
          shortfallOrder: { flexRanks: [1, 2, 3] },
        },
      },
    },
  })

  // Create current month budget period with envelopes
  const now = new Date()
  const month = new Date(now.getFullYear(), now.getMonth(), 1)

  await prisma.budgetPeriod.create({
    data: {
      userId,
      configId: config.id,
      month,
      incomeTotal: 37000,
      expectedIncome: 37000,
      status: 'active',
      envelopes: {
        create: [
          { categoryId: cats.emi,         allocated: 7000  },
          { categoryId: cats.gym,         allocated: 1000  },
          { categoryId: cats.supplements, allocated: 2200  },
          { categoryId: cats.sip,         allocated: 5000  },
          { categoryId: cats.emergency,   allocated: 2000  },
          { categoryId: cats.shortTerm,   allocated: 1000  },
          { categoryId: cats.travel,      allocated: 1000  },
          { categoryId: cats.grooming,    allocated: 2000  },
          { categoryId: cats.clothes,     allocated: 1500  },
          { categoryId: cats.fun,         allocated: 1300  },
          { categoryId: cats.food,        allocated: 12500 },
          { categoryId: cats.buffer,      allocated: 500   },
        ],
      },
    },
  })

  // Create savings buckets for this user
  await prisma.savingsBucket.createMany({
    data: [
      { userId, name: 'Emergency Fund', liquidity: 'liquid',   icon: '🛡️', color: '#6366f1', balance: 0 },
      { userId, name: 'Short-term Fund',liquidity: 'liquid',   icon: '💵', color: '#14b8a6', balance: 0 },
      { userId, name: 'Travel Goal',    liquidity: 'reserved', icon: '✈️', color: '#f43f5e', balance: 0 },
      { userId, name: 'Nifty 50 SIP',  liquidity: 'locked',   icon: '📈', color: '#10b981', balance: 0 },
      { userId, name: 'Buffer',         liquidity: 'liquid',   icon: '🎯', color: '#94a3b8', balance: 0 },
    ],
  })

  // Create default app settings for this user
  await prisma.appSettings.create({
    data: { userId, expectedSalary: 37000, savingsFloor: 3000 },
  })
}

async function upsertCategories() {
  const defs = [
    { name: 'Food',            kind: 'need',        icon: '🍛', color: '#f59e0b' },
    { name: 'Groceries',       kind: 'need',        icon: '🛒', color: '#f59e0b' },
    { name: 'Eating Out',      kind: 'need',        icon: '🍽️', color: '#ef4444' },
    { name: 'EMI',             kind: 'need',        icon: '🏦', color: '#3b82f6' },
    { name: 'Gym',             kind: 'need',        icon: '💪', color: '#8b5cf6' },
    { name: 'Gym Supplements', kind: 'need',        icon: '💊', color: '#06b6d4' },
    { name: 'Grooming',        kind: 'want',        icon: '✂️', color: '#ec4899' },
    { name: 'Clothes',         kind: 'want',        icon: '👕', color: '#f97316' },
    { name: 'Fun / Misc',      kind: 'want',        icon: '🎮', color: '#84cc16' },
    { name: 'Nifty 50 SIP',   kind: 'invest_long', icon: '📈', color: '#10b981' },
    { name: 'Short-term Fund', kind: 'save_short',  icon: '💵', color: '#14b8a6' },
    { name: 'Emergency Fund',  kind: 'save_short',  icon: '🛡️', color: '#6366f1' },
    { name: 'Travel Goal',     kind: 'goal',        icon: '✈️', color: '#f43f5e' },
    { name: 'Buffer',          kind: 'save_short',  icon: '🎯', color: '#94a3b8' },
    { name: 'Salary',          kind: 'income',      icon: '💼', color: '#22c55e' },
    { name: 'Freelancing',     kind: 'income',      icon: '💻', color: '#10b981' },
    { name: 'Bonus',           kind: 'income',      icon: '🎁', color: '#16a34a' },
    { name: 'Gift',            kind: 'income',      icon: '🎀', color: '#84cc16' },
    { name: 'Part-time',       kind: 'income',      icon: '⏰', color: '#14b8a6' },
    { name: 'Rental Income',   kind: 'income',      icon: '🏠', color: '#0891b2' },
    { name: 'Interest',        kind: 'income',      icon: '📊', color: '#6366f1' },
    { name: 'Dividends',       kind: 'income',      icon: '📈', color: '#8b5cf6' },
    { name: 'Other Income',    kind: 'income',      icon: '💰', color: '#6b7280' },
  ]

  const result: Record<string, string> = {}
  for (const d of defs) {
    const cat = await prisma.category.upsert({
      where: { name: d.name },
      update: {},
      create: d,
    })
    result[keyFor(d.name)] = cat.id
  }
  return result as {
    food: string; emi: string; gym: string; supplements: string
    grooming: string; clothes: string; fun: string; sip: string
    shortTerm: string; emergency: string; travel: string; buffer: string; income: string
  }
}

function keyFor(name: string): string {
  const map: Record<string, string> = {
    'Food': 'food', 'EMI': 'emi', 'Gym': 'gym', 'Gym Supplements': 'supplements',
    'Grooming': 'grooming', 'Clothes': 'clothes', 'Fun / Misc': 'fun',
    'Nifty 50 SIP': 'sip', 'Short-term Fund': 'shortTerm', 'Emergency Fund': 'emergency',
    'Travel Goal': 'travel', 'Buffer': 'buffer', 'Income': 'income',
  }
  return map[name] ?? name.toLowerCase().replace(/\s+/g, '_')
}
