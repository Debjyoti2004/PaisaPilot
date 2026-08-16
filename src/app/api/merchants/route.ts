import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { INDIAN_MERCHANTS } from '@/lib/indian-merchants'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const q = req.nextUrl.searchParams.get('q')?.trim().toLowerCase() ?? ''

  if (!session?.user?.email) {
    if (!q) return NextResponse.json({ merchants: [] })
    const matches = INDIAN_MERCHANTS.filter(m => m.toLowerCase().includes(q)).slice(0, 10)
    return NextResponse.json({ merchants: matches })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    if (!q) return NextResponse.json({ merchants: [] })
    const matches = INDIAN_MERCHANTS.filter(m => m.toLowerCase().includes(q)).slice(0, 10)
    return NextResponse.json({ merchants: matches })
  }

  const rows = await prisma.transaction.findMany({
    where: { userId: user.id, ...(q ? { merchant: { contains: q, mode: 'insensitive' } } : {}) },
    select: { merchant: true },
    distinct: ['merchant'],
    orderBy: { merchant: 'asc' },
    take: q ? 50 : undefined,
  })

  const dbMerchants = rows.map(r => r.merchant).filter(Boolean) as string[]

  if (!q) {
    // No search — return user's own merchants only (for local caching)
    return NextResponse.json({ merchants: dbMerchants }, {
      headers: { 'Cache-Control': 'private, max-age=60' },
    })
  }

  // Search mode — merge DB results + static list matches
  const dbSet = new Set(dbMerchants.map(m => m.toLowerCase()))
  const staticMatches = INDIAN_MERCHANTS
    .filter(m => m.toLowerCase().includes(q) && !dbSet.has(m.toLowerCase()))
    .slice(0, 10)

  const merged = [...dbMerchants, ...staticMatches].slice(0, 10)
  return NextResponse.json({ merchants: merged }, {
    headers: { 'Cache-Control': 'private, max-age=300' },
  })
}
