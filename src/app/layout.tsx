import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'

export const metadata: Metadata = {
  title: 'PaisaPilot — Personal Finance',
  description: 'Personal finance tracker for India. Track expenses, manage budgets, grow savings.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0d0d14] text-slate-100 antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 min-h-screen flex flex-col main-pad">
            {children}
          </main>
          <div className="mobile-nav fixed bottom-0 left-0 right-0 z-50 w-full">
            <MobileNav />
          </div>
        </div>
      </body>
    </html>
  )
}
