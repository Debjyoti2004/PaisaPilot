import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthSessionProvider } from '@/components/providers/AuthSessionProvider'
import { AppShell } from '@/components/layout/AppShell'
import { PinLock } from '@/components/PinLock'

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
    <html lang="en" spellCheck={true}>
      <body className="antialiased" autoCorrect="on" autoCapitalize="sentences">
        <AuthSessionProvider>
          <PinLock />
          <AppShell>{children}</AppShell>
        </AuthSessionProvider>
      </body>
    </html>
  )
}
