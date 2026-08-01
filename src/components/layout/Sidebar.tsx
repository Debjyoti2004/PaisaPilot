'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  LayoutDashboard, ArrowLeftRight, RefreshCw, CreditCard,
  Wallet, FileText, BookOpen, Settings,
  Sparkles, Gauge, ChevronRight, Shield, FileSearch,
} from 'lucide-react'

const NAV = [
  { href: '/',              label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/transactions',  label: 'Transactions', icon: ArrowLeftRight },
  { href: '/recurring',     label: 'Recurring',    icon: RefreshCw },
  { href: '/subscriptions', label: 'Subscriptions',icon: CreditCard },
  { href: '/budgets',       label: 'Budgets',      icon: Wallet },
  { href: '/documents',     label: 'Documents',    icon: FileText },
  { href: '/rules',         label: 'Rules',        icon: BookOpen },
  { href: '/settings',      label: 'Settings',     icon: Settings },
  { href: '/wealth-plan',   label: 'Wealth Plan',  icon: Sparkles },
  { href: '/console',       label: 'Console',      icon: Gauge },
  { href: '/bank-compare',  label: 'Bank Compare', icon: FileSearch },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const user = session?.user as { name?: string | null; email?: string | null; image?: string | null } | undefined
  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.[0] ?? 'U').toUpperCase()

  return (
    <aside
      className="sidebar-desktop fixed left-0 top-0 h-full flex flex-col z-40"
      style={{
        width: 'var(--sidebar-w)',
        background: '#ffffff',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Logo */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--violet)', color: '#fff', fontWeight: 700, fontSize: 15 }}
          >
            P
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.1 }}>PaisaPilot</p>
            <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>Personal finance</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <div className="space-y-0.5">
          {NAV.slice(0, 9).map(item => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 rounded-xl transition-all duration-150 ${
                  isActive ? 'nav-active' : 'nav-inactive'
                }`}
                style={{ height: 40, fontSize: 14 }}
              >
                <Icon
                  size={16}
                  strokeWidth={isActive ? 2.2 : 1.8}
                  style={{ color: isActive ? 'var(--violet)' : 'var(--text-3)', flexShrink: 0 }}
                />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>

        {/* Divider + additional tools */}
        <div className="my-3" style={{ height: 1, background: 'var(--border)' }} />
        <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', padding: '0 12px', marginBottom: 4 }}>
          Tools
        </p>
        <div className="space-y-0.5">
          {NAV.slice(9).map(item => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 rounded-xl transition-all duration-150 ${
                  isActive ? 'nav-active' : 'nav-inactive'
                }`}
                style={{ height: 40, fontSize: 14 }}
              >
                <Icon
                  size={16}
                  strokeWidth={isActive ? 2.2 : 1.8}
                  style={{ color: isActive ? 'var(--violet)' : 'var(--text-3)', flexShrink: 0 }}
                />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Private by design badge */}
      <div className="px-3 pb-2">
        <div
          className="flex items-start gap-2 p-3 rounded-xl"
          style={{ background: 'var(--violet-bg)', border: '1px solid var(--violet-border)' }}
        >
          <Shield size={14} style={{ color: 'var(--violet)', marginTop: 1, flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--violet)' }}>Private by design</p>
            <p style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 1, lineHeight: 1.4 }}>
              Your records stay in your account only.
            </p>
          </div>
        </div>
      </div>

      {/* User card */}
      <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
        <Link
          href="/profile"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl nav-inactive transition-colors cursor-pointer"
        >
          {user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt={user.name ?? 'User'}
              className="w-7 h-7 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--violet-bg)', border: '1px solid var(--violet-border)' }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--violet)' }}>{initials}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }} className="truncate leading-none">
              {user?.name ?? 'User'}
            </p>
            <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }} className="truncate">
              {user?.email ?? ''}
            </p>
          </div>
          <ChevronRight size={12} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
        </Link>
      </div>
    </aside>
  )
}
