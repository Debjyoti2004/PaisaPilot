'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  LayoutDashboard, ArrowLeftRight, RefreshCw, CreditCard,
  Wallet, FileText, BookOpen, Settings,
  Sparkles, Gauge, ChevronRight, Shield, FileSearch,
  PanelLeftClose, PanelLeftOpen, StickyNote,
} from 'lucide-react'

const EXPANDED_W = 238
const COLLAPSED_W = 60
const LS_KEY = 'pp_sidebar_collapsed'

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
  { href: '/notes',         label: 'Quick Notes',  icon: StickyNote },
]

type Tip = { label: string; y: number }

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [collapsed, setCollapsed] = useState<boolean | undefined>(undefined)
  const [ready, setReady] = useState(false)
  const [tip, setTip] = useState<Tip | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY) === 'true'
    setCollapsed(stored)
    document.documentElement.style.setProperty('--sidebar-w', `${stored ? COLLAPSED_W : EXPANDED_W}px`)
    requestAnimationFrame(() => setReady(true))
  }, [])

  function toggle() {
    const next = !collapsed
    setCollapsed(next)
    setTip(null)
    localStorage.setItem(LS_KEY, String(next))
    document.documentElement.style.setProperty('--sidebar-w', `${next ? COLLAPSED_W : EXPANDED_W}px`)
  }

  function showTip(e: React.MouseEvent, label: string) {
    if (!collapsed) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setTip({ label, y: rect.top + rect.height / 2 })
  }

  // Hold a blank shell until localStorage is read — prevents flash on refresh
  if (collapsed === undefined) {
    return (
      <aside
        className="sidebar-desktop fixed left-0 top-0 h-full z-40"
        style={{ width: EXPANDED_W, background: '#ffffff', borderRight: '1px solid var(--border)' }}
      />
    )
  }

  const user = session?.user as { name?: string | null; email?: string | null; image?: string | null } | undefined
  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.[0] ?? 'U').toUpperCase()

  return (
    <>
    {/* Instant tooltip rendered at fixed position — not clipped by sidebar overflow:hidden */}
    {collapsed && tip && (
      <div style={{
        position: 'fixed',
        left: COLLAPSED_W + 10,
        top: tip.y,
        transform: 'translateY(-50%)',
        background: '#18181b',
        color: '#fff',
        padding: '5px 10px',
        borderRadius: 7,
        fontSize: 12,
        fontWeight: 500,
        whiteSpace: 'nowrap',
        zIndex: 9999,
        pointerEvents: 'none',
        boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
      }}>
        {tip.label}
      </div>
    )}
    <aside
      className="sidebar-desktop fixed left-0 top-0 h-full flex flex-col z-40"
      style={{
        width: collapsed ? COLLAPSED_W : EXPANDED_W,
        background: '#ffffff',
        borderRight: '1px solid var(--border)',
        transition: ready ? 'width 0.22s cubic-bezier(0.4,0,0.2,1)' : 'none',
        overflow: 'hidden',
      }}
    >
      {/* Logo + toggle — 64px to match TopBar */}
      <div
        className="px-3 flex items-center flex-shrink-0"
        style={{
          height: 64,
          borderBottom: '1px solid var(--border)',
          justifyContent: collapsed ? 'center' : 'space-between',
        }}
      >
        {!collapsed && (
          <div className="flex items-center gap-2.5 pl-2">
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
        )}
        <button
          onClick={toggle}
          className="btn-ghost flex-shrink-0"
          style={{ padding: 7, color: 'var(--text-3)', minHeight: 'unset' }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3" style={{ overflowX: 'hidden' }}>
        <div className="space-y-0.5">
          {NAV.slice(0, 9).map(item => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onMouseEnter={e => showTip(e, item.label)}
                onMouseLeave={() => setTip(null)}
                className={`flex items-center rounded-xl transition-all duration-150 ${isActive ? 'nav-active' : 'nav-inactive'}`}
                style={{
                  height: 40, fontSize: 14,
                  gap: collapsed ? 0 : 10,
                  paddingLeft: collapsed ? 0 : 12,
                  paddingRight: collapsed ? 0 : 12,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                }}
              >
                <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8}
                  style={{ color: isActive ? 'var(--violet)' : 'var(--text-3)', flexShrink: 0 }} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </div>

        <div className="my-3" style={{ height: 1, background: 'var(--border)' }} />

        {!collapsed && (
          <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', padding: '0 12px', marginBottom: 4 }}>
            Tools
          </p>
        )}

        <div className="space-y-0.5">
          {NAV.slice(9).map(item => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onMouseEnter={e => showTip(e, item.label)}
                onMouseLeave={() => setTip(null)}
                className={`flex items-center rounded-xl transition-all duration-150 ${isActive ? 'nav-active' : 'nav-inactive'}`}
                style={{
                  height: 40, fontSize: 14,
                  gap: collapsed ? 0 : 10,
                  paddingLeft: collapsed ? 0 : 12,
                  paddingRight: collapsed ? 0 : 12,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                }}
              >
                <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8}
                  style={{ color: isActive ? 'var(--violet)' : 'var(--text-3)', flexShrink: 0 }} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Private by design — hidden when collapsed */}
      {!collapsed && (
        <div className="px-3 pb-2">
          <div className="flex items-start gap-2 p-3 rounded-xl"
            style={{ background: 'var(--violet-bg)', border: '1px solid var(--violet-border)' }}>
            <Shield size={14} style={{ color: 'var(--violet)', marginTop: 1, flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--violet)' }}>Private by design</p>
              <p style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 1, lineHeight: 1.4 }}>
                Your records stay in your account only.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* User card */}
      <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
        <Link
          href="/profile"
          title={collapsed ? (user?.name ?? 'Profile') : undefined}
          className="flex items-center rounded-xl nav-inactive transition-colors cursor-pointer"
          style={{
            gap: collapsed ? 0 : 10,
            paddingLeft: collapsed ? 0 : 12,
            paddingRight: collapsed ? 0 : 12,
            paddingTop: 10, paddingBottom: 10,
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
        >
          {user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt={user.name ?? 'User'}
              className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--violet-bg)', border: '1px solid var(--violet-border)' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--violet)' }}>{initials}</span>
            </div>
          )}
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }} className="truncate leading-none">
                  {user?.name ?? 'User'}
                </p>
                <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }} className="truncate">
                  {user?.email ?? ''}
                </p>
              </div>
              <ChevronRight size={12} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
            </>
          )}
        </Link>
      </div>
    </aside>
    </>
  )
}
