'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'

  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen flex flex-col main-pad">
        {children}
      </main>
      <div className="mobile-nav fixed bottom-0 left-0 right-0 z-50 w-full">
        <MobileNav />
      </div>
    </div>
  )
}
