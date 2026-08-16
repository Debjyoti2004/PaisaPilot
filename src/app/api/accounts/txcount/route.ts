import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET ?account=AccountName — returns count of transactions for that account
export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId()
    const account = new URL(request.url).searchParams.get('account') ?? ''
    const count = await prisma.transaction.count({ where: { userId, account } })
    return NextResponse.json({ count })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
