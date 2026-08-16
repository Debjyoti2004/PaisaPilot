'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, ArrowLeftRight, Wallet,
  MoreHorizontal, RefreshCw, CreditCard, FileText,
  BookOpen, Settings, Sparkles, Gauge, X, StickyNote,
} from 'lucide-react'

const PRIMARY = [
  { href: '/',             label: 'Home',   icon: LayoutDashboard },
  { href: '/transactions', label: 'Txns',   icon: ArrowLeftRight  },
  { href: '/budgets',      label: 'Budgets',icon: Wallet          },
]

const MORE_ITEMS = [
  { href: '/recurring',     label: 'Recurring',     icon: RefreshCw  },
  { href: '/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { href: '/notes',         label: 'Quick Notes',   icon: StickyNote },
  { href: '/documents',     label: 'Documents',     icon: FileText   },
  { href: '/rules',         label: 'Rules',         icon: BookOpen   },
  { href: '/settings',      label: 'Settings',      icon: Settings   },
  { href: '/wealth-plan',   label: 'Wealth Plan',   icon: Sparkles   },
  { href: '/console',       label: 'Console',       icon: Gauge      },
]

const MORE_HREFS = new Set(MORE_ITEMS.map(i => i.href))

export function MobileNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const isMoreActive = MORE_HREFS.has(pathname)

  return (
    <>
      <nav
        className="w-full flex items-stretch"
        style={{
          background: '#ffffff',
          borderTop: '1px solid var(--border)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {PRIMARY.map(item => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex-1 flex flex-col items-center justify-center gap-1 py-2.5"
              style={{ minHeight: 56, color: isActive ? 'var(--violet)' : 'var(--text-3)' }}
            >
              {isActive && (
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full"
                  style={{ width: 24, height: 2.5, background: 'var(--violet)' }}
                />
              )}
              <Icon size={21} strokeWidth={isActive ? 2.2 : 1.6} />
              <span style={{ fontSize: 9, fontWeight: isActive ? 700 : 500, letterSpacing: '0.03em', lineHeight: 1 }}>
                {item.label}
              </span>
            </Link>
          )
        })}

        {/* More */}
        <button
          onClick={() => setOpen(true)}
          className="relative flex-1 flex flex-col items-center justify-center gap-1 py-2.5"
          style={{ minHeight: 56, color: isMoreActive ? 'var(--violet)' : 'var(--text-3)', background: 'transparent', border: 'none' }}
        >
          {isMoreActive && (
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full"
              style={{ width: 24, height: 2.5, background: 'var(--violet)' }}
            />
          )}
          <MoreHorizontal size={21} strokeWidth={isMoreActive ? 2.2 : 1.6} />
          <span style={{ fontSize: 9, fontWeight: isMoreActive ? 700 : 500, letterSpacing: '0.03em', lineHeight: 1 }}>More</span>
        </button>
      </nav>

      {/* More sheet */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-[60]"
            style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}
            onClick={() => setOpen(false)}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-2xl"
            style={{ background: '#ffffff', borderTop: '1px solid var(--border)', paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
            </div>

            <div className="flex items-center justify-between px-5 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)' }}>More</span>
              <button
                onClick={() => setOpen(false)}
                style={{ padding: 6, borderRadius: 8, background: 'var(--bg)', border: 'none', cursor: 'pointer', color: 'var(--text-2)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 p-4">
              {MORE_ITEMS.map(item => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex flex-col items-center justify-center gap-1.5 rounded-xl py-3"
                    style={{
                      background: isActive ? 'var(--violet-bg)' : 'var(--bg)',
                      color: isActive ? 'var(--violet)' : 'var(--text-2)',
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: isActive ? 'rgba(101,88,211,0.12)' : '#ffffff' }}
                    >
                      <Icon size={20} strokeWidth={isActive ? 2.2 : 1.6} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </>
      )}
    </>
  )
}
