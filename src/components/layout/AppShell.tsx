'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { TopBar } from './TopBar'
import { ViewProvider } from '@/contexts/ViewContext'
import { ViewBanner } from './ViewBanner'
import dynamic from 'next/dynamic'

const OnboardingGate = dynamic(
  () => import('@/components/Onboarding').then(m => ({ default: m.OnboardingGate })),
  { ssr: false }
)

const PAGE_META: Record<string, { title: string; subtitle?: string }> = {
  '/':              { title: 'Dashboard',     subtitle: 'YOUR MONEY, CLEARLY' },
  '/transactions':  { title: 'Transactions',  subtitle: 'YOUR MONEY, CLEARLY' },
  '/recurring':     { title: 'Recurring',     subtitle: 'YOUR MONEY, CLEARLY' },
  '/subscriptions': { title: 'Subscriptions', subtitle: 'YOUR MONEY, CLEARLY' },
  '/budgets':       { title: 'Budgets',       subtitle: 'YOUR MONEY, CLEARLY' },
  '/goals':         { title: 'Goals',         subtitle: 'YOUR MONEY, CLEARLY' },
  '/documents':     { title: 'Documents',     subtitle: 'YOUR MONEY, CLEARLY' },
  '/rules':         { title: 'Rules',         subtitle: 'YOUR MONEY, CLEARLY' },
  '/settings':      { title: 'Settings',      subtitle: 'YOUR MONEY, CLEARLY' },
  '/wealth-plan':   { title: 'Wealth Plan',   subtitle: 'YOUR MONEY, CLEARLY' },
  '/console':       { title: 'Console',       subtitle: 'YOUR MONEY, CLEARLY' },
  '/bank-compare':  { title: 'Bank Compare',  subtitle: 'YOUR MONEY, CLEARLY' },
  '/profile':       { title: 'Profile',       subtitle: 'YOUR MONEY, CLEARLY' },
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (pathname === '/login') {
    return <>{children}</>
  }

  const meta = PAGE_META[pathname] ?? { title: 'PaisaPilot', subtitle: 'YOUR MONEY, CLEARLY' }

  return (
    <ViewProvider>
      <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>
        <Sidebar />
        <main className="flex-1 min-h-screen flex flex-col main-pad" style={{ minWidth: 0 }}>
          <TopBar title={meta.title} subtitle={meta.subtitle} />
          <ViewBanner />
          <div className="flex-1" style={{ minWidth: 0 }}>
            {children}
          </div>
        </main>
        <div className="mobile-nav fixed bottom-0 left-0 right-0 z-50 w-full">
          <MobileNav />
        </div>
        <OnboardingGate />
      </div>
    </ViewProvider>
  )
}
