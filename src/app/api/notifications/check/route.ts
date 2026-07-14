import { NextResponse } from 'next/server'
import { requireUserId } from '@/lib/auth'
import { checkMonthlyAlerts } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const userId = await requireUserId()
    await checkMonthlyAlerts(userId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
