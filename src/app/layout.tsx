import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthSessionProvider } from '@/components/providers/AuthSessionProvider'
import { AppShell } from '@/components/layout/AppShell'

export const metadata: Metadata = {
  title: 'PaisaPilot — Personal Finance',
  description: 'Personal finance tracker. Track expenses, manage budgets, grow savings.',
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
    <html lang="en">
      <body className="antialiased">
        <AuthSessionProvider>
          <AppShell>{children}</AppShell>
        </AuthSessionProvider>
      </body>
    </html>
  )
}
