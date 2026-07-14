import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding PaisaPilot database...')

  await prisma.transaction.deleteMany()
  await prisma.envelope.deleteMany()
  await prisma.bucketEntry.deleteMany()
  await prisma.savingsBucket.deleteMany()
  await prisma.goal.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.suggestion.deleteMany()
  await prisma.adjustRule.deleteMany()
  await prisma.splitRule.deleteMany()
  await prisma.budgetPeriod.deleteMany()
  await prisma.splitConfig.deleteMany()
  await prisma.category.deleteMany()
  await prisma.appSettings.deleteMany()
  await prisma.user.deleteMany()

  const hashedPassword = await bcrypt.hash('test@2026', 10)
  await prisma.user.create({
    data: { email: 'test@gmail.com', password: hashedPassword, name: 'Test User' },
  })

  await prisma.appSettings.create({
    data: { id: 'singleton', expectedSalary: 37000, savingsFloor: 3000, currency: 'INR', salaryKeywords: 'salary,credit,sal', emailReports: false, reportEmail: '' },
  })

  const food = await prisma.category.create({ data: { name: 'Food', kind: 'need', icon: '🍛', color: '#f59e0b' } })
  const faceCare = await prisma.category.create({ data: { name: 'Face Care', kind: 'want', icon: '✨', color: '#ec4899' } })
  const grooming = await prisma.category.create({ data: { name: 'Grooming', kind: 'want', icon: '✂️', color: '#8b5cf6' } })
  const clothes = await prisma.category.create({ data: { name: 'Clothes', kind: 'want', icon: '👕', color: '#f97316' } })
  const funMisc = await prisma.category.create({ data: { name: 'Fun / Misc', kind: 'want', icon: '🎮', color: '#84cc16' } })
  const emi = await prisma.category.create({ data: { name: 'EMI', kind: 'need', icon: '🏦', color: '#3b82f6' } })
  const gym = await prisma.category.create({ data: { name: 'Gym', kind: 'need', icon: '💪', color: '#8b5cf6' } })
  const gymSupp = await prisma.category.create({ data: { name: 'Gym Supplements', kind: 'need', icon: '💊', color: '#06b6d4' } })
  const sip = await prisma.category.create({ data: { name: 'Nifty 50 SIP', kind: 'invest_long', icon: '📈', color: '#10b981' } })
  const stf = await prisma.category.create({ data: { name: 'Short-term Fund', kind: 'save_short', icon: '💵', color: '#14b8a6' } })
  const emergency = await prisma.category.create({ data: { name: 'Emergency Fund', kind: 'save_short', icon: '🛡️', color: '#6366f1' } })
  const travel = await prisma.category.create({ data: { name: 'Travel Goal', kind: 'goal', icon: '✈️', color: '#f43f5e' } })
  const buffer = await prisma.category.create({ data: { name: 'Buffer', kind: 'save_short', icon: '🎯', color: '#94a3b8' } })
  await prisma.category.create({ data: { name: 'Income', kind: 'income', icon: '💰', color: '#22c55e' } })
  const transport = await prisma.category.create({ data: { name: 'Transport', kind: 'need', icon: '🚗', color: '#0ea5e9' } })
  await prisma.category.create({ data: { name: 'Health', kind: 'need', icon: '🏥', color: '#ef4444' } })
  await prisma.category.create({ data: { name: 'Utilities', kind: 'need', icon: '💡', color: '#eab308' } })

  await prisma.category.createMany({ data: [
    { name: 'Groceries', kind: 'need', icon: '🛒', color: '#f59e0b', parentId: food.id },
    { name: 'Eating Out', kind: 'need', icon: '🍽️', color: '#ef4444', parentId: food.id },
    { name: 'Coffee & Drinks', kind: 'want', icon: '☕', color: '#92400e', parentId: food.id },
    { name: 'Serum', kind: 'want', icon: '🧴', color: '#ec4899', parentId: faceCare.id },
    { name: 'Face Wash', kind: 'want', icon: '🫧', color: '#db2777', parentId: faceCare.id },
    { name: 'Moisturizer', kind: 'want', icon: '💧', color: '#be185d', parentId: faceCare.id },
    { name: 'Sunscreen', kind: 'want', icon: '🌞', color: '#f472b6', parentId: faceCare.id },
    { name: 'Haircut', kind: 'want', icon: '💇', color: '#8b5cf6', parentId: grooming.id },
    { name: 'Shaving', kind: 'want', icon: '🪒', color: '#7c3aed', parentId: grooming.id },
    { name: 'Fuel', kind: 'need', icon: '⛽', color: '#0ea5e9', parentId: transport.id },
    { name: 'Cab / Auto', kind: 'need', icon: '🚕', color: '#38bdf8', parentId: transport.id },
    { name: 'Metro / Bus', kind: 'need', icon: '🚇', color: '#0369a1', parentId: transport.id },
  ]})

  const config = await prisma.splitConfig.create({ data: { name: 'Standard ₹37k Plan', active: true, version: 1 } })

  await prisma.splitRule.createMany({ data: [
    { configId: config.id, categoryId: emi.id, mode: 'fixed', value: 7000, priority: 1, flexRank: 10 },
    { configId: config.id, categoryId: gym.id, mode: 'fixed', value: 1000, priority: 2, flexRank: 9 },
    { configId: config.id, categoryId: gymSupp.id, mode: 'fixed', value: 2200, priority: 3, flexRank: 7 },
    { configId: config.id, categoryId: sip.id, mode: 'fixed', value: 5000, priority: 4, flexRank: 6 },
    { configId: config.id, categoryId: emergency.id, mode: 'fixed', value: 2000, priority: 5, flexRank: 5 },
    { configId: config.id, categoryId: stf.id, mode: 'fixed', value: 1000, priority: 6, flexRank: 4 },
    { configId: config.id, categoryId: travel.id, mode: 'fixed', value: 1000, priority: 7, flexRank: 3 },
    { configId: config.id, categoryId: food.id, mode: 'percent', value: 33.78, priority: 8, flexRank: 2 },
    { configId: config.id, categoryId: grooming.id, mode: 'fixed', value: 2000, priority: 9, flexRank: 2 },
    { configId: config.id, categoryId: clothes.id, mode: 'fixed', value: 1500, priority: 10, flexRank: 1 },
    { configId: config.id, categoryId: funMisc.id, mode: 'fixed', value: 1300, priority: 11, flexRank: 1 },
    { configId: config.id, categoryId: buffer.id, mode: 'remainder', value: 0, priority: 12, flexRank: 0 },
  ]})

  await prisma.adjustRule.create({ data: {
    configId: config.id,
    surplusSplit: { sip: 60, emergency: 20, goal: 10, fun: 10 },
    shortfallOrder: ['Buffer', 'Fun / Misc', 'Clothes', 'Grooming', 'Travel Goal', 'Short-term Fund'],
  }})

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const period = await prisma.budgetPeriod.create({
    data: { configId: config.id, month: monthStart, incomeTotal: 37000, expectedIncome: 37000, status: 'active' },
  })

  await prisma.envelope.createMany({ data: [
    { periodId: period.id, categoryId: emi.id, allocated: 7000 },
    { periodId: period.id, categoryId: gym.id, allocated: 1000 },
    { periodId: period.id, categoryId: gymSupp.id, allocated: 2200 },
    { periodId: period.id, categoryId: sip.id, allocated: 5000 },
    { periodId: period.id, categoryId: emergency.id, allocated: 2000 },
    { periodId: period.id, categoryId: stf.id, allocated: 1000 },
    { periodId: period.id, categoryId: travel.id, allocated: 1000 },
    { periodId: period.id, categoryId: food.id, allocated: 12500 },
    { periodId: period.id, categoryId: grooming.id, allocated: 2000 },
    { periodId: period.id, categoryId: clothes.id, allocated: 1500 },
    { periodId: period.id, categoryId: funMisc.id, allocated: 1300 },
    { periodId: period.id, categoryId: buffer.id, allocated: 500 },
  ]})

  await prisma.savingsBucket.createMany({ data: [
    { name: 'Emergency Fund', liquidity: 'liquid', balance: 0, icon: '🛡️', color: '#6366f1' },
    { name: 'Short-term Fund', liquidity: 'liquid', balance: 0, icon: '💵', color: '#14b8a6' },
    { name: 'Travel Goal', liquidity: 'reserved', balance: 0, icon: '✈️', color: '#f43f5e' },
    { name: 'Nifty 50 SIP', liquidity: 'locked', balance: 0, icon: '📈', color: '#10b981' },
    { name: 'Buffer', liquidity: 'liquid', balance: 0, icon: '🎯', color: '#94a3b8' },
  ]})

  await prisma.goal.createMany({ data: [
    { name: 'Goa Trip', icon: '🏖️', color: '#f43f5e', targetAmount: 30000, savedAmount: 5000, deadline: new Date('2027-01-01'), monthlyNeeded: 2083 },
    { name: 'Laptop Upgrade', icon: '💻', color: '#6366f1', targetAmount: 80000, savedAmount: 12000, deadline: new Date('2027-06-01'), monthlyNeeded: 5818 },
  ]})

  await prisma.notification.create({
    data: { title: 'Welcome to PaisaPilot!', message: 'Your personal finance tracker is ready. Record your salary to get started.', type: 'success' },
  })

  console.log('✅ Seed complete!')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
