import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const PAGES = [
  { name: 'Dashboard', href: '/', icon: 'LayoutDashboard', description: 'Overview & summary' },
  { name: 'Transactions', href: '/transactions', icon: 'ArrowLeftRight', description: 'All income & expenses' },
  { name: 'Envelopes', href: '/envelopes', icon: 'Wallet', description: 'Monthly budget envelopes' },
  { name: 'Savings', href: '/savings', icon: 'PiggyBank', description: 'Savings buckets' },
  { name: 'Goals', href: '/goals', icon: 'Target', description: 'Financial goals tracker' },
  { name: 'Investments', href: '/investments', icon: 'TrendingUp', description: 'SIP & investment tracker' },
  { name: 'Salary Split', href: '/split', icon: 'Scissors', description: 'Record salary & split budgets' },
  { name: 'Calculators', href: '/calculators', icon: 'Calculator', description: 'SIP, EMI & goal calculators' },
  { name: 'AI Assistant', href: '/assistant', icon: 'Bot', description: 'Ask about your finances' },
  { name: 'Profile', href: '/profile', icon: 'User', description: 'Settings & preferences' },
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim().toLowerCase()

    if (!q || q.length < 2) {
      return NextResponse.json({ results: { pages: PAGES.slice(0, 5), transactions: [], categories: [] } })
    }

    const [transactions, categories] = await Promise.all([
      prisma.transaction.findMany({
        where: { narration: { contains: q, mode: 'insensitive' } },
        include: { category: true },
        orderBy: { occurredAt: 'desc' },
        take: 8,
      }),
      prisma.category.findMany({
        where: { name: { contains: q, mode: 'insensitive' } },
        take: 5,
      }),
    ])

    const pages = PAGES.filter(p =>
      p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    )

    return NextResponse.json({ results: { pages, transactions, categories } })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
