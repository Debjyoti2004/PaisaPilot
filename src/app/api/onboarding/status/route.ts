import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const userId = await requireUserId()

    const [count, settings] = await Promise.all([
      prisma.financialAccount.count({ where: { userId } }),
      prisma.appSettings.findUnique({ where: { userId } }),
    ])

    // Existing user who already has accounts — auto-complete onboarding
    if (count > 0 && settings && !settings.onboardingCompleted) {
      await prisma.appSettings.update({ where: { userId }, data: { onboardingCompleted: true } })
      return NextResponse.json({ needsOnboarding: false })
    }

    if (settings?.onboardingCompleted) return NextResponse.json({ needsOnboarding: false })

    // New user: no accounts, not completed
    if (count === 0) return NextResponse.json({ needsOnboarding: true })

    return NextResponse.json({ needsOnboarding: false })
  } catch {
    return NextResponse.json({ needsOnboarding: false })
  }
}
