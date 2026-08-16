import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const DEFAULT_ACCOUNTS = [
  { name: 'Savings Account',  type: 'savings',     sortOrder: 0 },
  { name: 'Salary Account',   type: 'salary',      sortOrder: 1 },
  { name: 'Cash',             type: 'cash',        sortOrder: 2 },
  { name: 'Credit Card',      type: 'credit_card', sortOrder: 3 },
  { name: 'Debit Card',       type: 'debit_card',  sortOrder: 4 },
]

async function ensureDefaults(userId: string) {
  const count = await prisma.financialAccount.count({ where: { userId } })
  if (count > 0) return // user already has accounts — never overwrite renames/deletions
  // Don't seed if user hasn't completed onboarding — the onboarding flow will create accounts
  const settings = await prisma.appSettings.findUnique({ where: { userId }, select: { onboardingCompleted: true } })
  if (!settings?.onboardingCompleted) return
  for (const d of DEFAULT_ACCOUNTS) {
    await prisma.financialAccount.create({
      data: { userId, name: d.name, type: d.type, isDefault: true, showOnDash: true, sortOrder: d.sortOrder },
    })
  }
}

export async function GET() {
  try {
    const userId = await requireUserId()
    await ensureDefaults(userId)
    const accounts = await prisma.financialAccount.findMany({
      where: { userId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
    return NextResponse.json({ accounts })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId()
    const { name, type = 'savings' } = await req.json()
    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

    const maxOrder = await prisma.financialAccount.aggregate({
      where: { userId }, _max: { sortOrder: true },
    })
    const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1

    const account = await prisma.financialAccount.create({
      data: { userId, name: name.trim(), type, showOnDash: true, sortOrder },
    })
    return NextResponse.json({ account }, { status: 201 })
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && (err as { code: string }).code === 'P2002')
      return NextResponse.json({ error: 'Account name already exists' }, { status: 409 })
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await requireUserId()
    const { id, name, type, showOnDash, sortOrder } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const existing = await prisma.financialAccount.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId)
      return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updates: Record<string, unknown> = {}
    if (name !== undefined && name.trim()) updates.name = name.trim()
    if (type !== undefined) updates.type = type
    if (showOnDash !== undefined) updates.showOnDash = Boolean(showOnDash)
    if (sortOrder !== undefined) updates.sortOrder = Number(sortOrder)

    const account = await prisma.financialAccount.update({ where: { id }, data: updates })
    return NextResponse.json({ account })
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && (err as { code: string }).code === 'P2002')
      return NextResponse.json({ error: 'Account name already exists' }, { status: 409 })
    return NextResponse.json({ error: 'Failed to update account' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await requireUserId()
    const id = new URL(req.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const existing = await prisma.financialAccount.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId)
      return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const txCount = await prisma.transaction.count({ where: { userId, accountId: id } })
    if (txCount > 0)
      return NextResponse.json({ error: `Cannot delete: ${txCount} transaction(s) use this account.`, txCount }, { status: 409 })

    await prisma.financialAccount.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}
