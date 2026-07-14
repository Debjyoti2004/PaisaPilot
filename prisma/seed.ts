import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding global categories...')

  const categories = [
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
    { name: 'Income',          kind: 'income',      icon: '💰', color: '#22c55e' },
    { name: 'Transport',       kind: 'need',        icon: '🚌', color: '#0ea5e9' },
    { name: 'Utilities',       kind: 'need',        icon: '⚡', color: '#eab308' },
    { name: 'Healthcare',      kind: 'need',        icon: '🏥', color: '#14b8a6' },
  ]

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    })
  }

  console.log(`✅ Seeded ${categories.length} categories`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
