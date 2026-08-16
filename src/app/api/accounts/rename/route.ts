import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// POST { oldName, newName }
// Cascades account rename across all transactions, dashboardWidgets, customAccounts
export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId()
    const { oldName, newName } = await request.json()
    if (!oldName || !newName || oldName === newName) {
      return NextResponse.json({ error: 'Invalid names' }, { status: 400 })
    }
    const trimmed = newName.trim()
    if (!trimmed) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })

    // 1. Rename all transactions
    await prisma.transaction.updateMany({
      where: { userId, account: oldName },
      data: { account: trimmed },
    })

    // 2. Update settings: customAccounts and dashboardWidgets
    const settings = await prisma.appSettings.findUnique({ where: { userId } })
    if (settings) {
      const customAccounts: { name: string; type: string }[] = (() => {
        try { return JSON.parse(settings.customAccounts ?? '[]') } catch { return [] }
      })()
      const dashboardWidgets: string[] = (() => {
        try { return JSON.parse(settings.dashboardWidgets ?? '[]') } catch { return [] }
      })()

      const newCustom = customAccounts.map(a => a.name === oldName ? { ...a, name: trimmed } : a)
      const newWidgets = dashboardWidgets.map(w => w === oldName ? trimmed : w)

      await prisma.appSettings.update({
        where: { userId },
        data: {
          customAccounts: JSON.stringify(newCustom),
          dashboardWidgets: JSON.stringify(newWidgets),
        },
      })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
