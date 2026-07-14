'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, ArrowLeftRight, Wallet, PiggyBank,
  MoreHorizontal, Target, TrendingUp, Scissors,
  Calculator, Bot, User, Tag, X
} from 'lucide-react'

const PRIMARY = [
  { href: '/',             label: 'Home',    icon: LayoutDashboard },
  { href: '/transactions', label: 'Txns',   icon: ArrowLeftRight  },
  { href: '/envelopes',    label: 'Budget',  icon: Wallet          },
  { href: '/savings',      label: 'Savings', icon: PiggyBank       },
]

const MORE_ITEMS = [
  { href: '/goals',       label: 'Goals',       icon: Target      },
  { href: '/investments', label: 'Investments', icon: TrendingUp  },
  { href: '/split',       label: 'Income Split',icon: Scissors    },
  { href: '/categories',  label: 'Categories',  icon: Tag         },
  { href: '/calculators', label: 'Calculators', icon: Calculator  },
  { href: '/assistant',   label: 'AI Assistant',icon: Bot         },
  { href: '/profile',     label: 'Profile',     icon: User        },
]

const MORE_HREFS = new Set(MORE_ITEMS.map(i => i.href))

export function MobileNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isMoreActive = MORE_HREFS.has(pathname)

  return (
    <>
      <nav
        className="w-full bg-[#0f0f1a]/95 backdrop-blur-md border-t border-white/[0.07] flex items-stretch"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {PRIMARY.map(item => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex-1 flex flex-col items-center justify-center gap-[3px] py-3 min-h-[56px] transition-colors ${
                isActive ? 'text-indigo-400' : 'text-slate-500'
              }`}
            >
              <Icon size={21} strokeWidth={isActive ? 2.2 : 1.5} />
              <span className="text-[9px] font-semibold tracking-wide leading-none">{item.label}</span>
              {isActive && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[2px] rounded-full bg-indigo-400" />}
            </Link>
          )
        })}

        {/* More button */}
        <button
          onClick={() => setOpen(true)}
          className={`relative flex-1 flex flex-col items-center justify-center gap-[3px] py-3 min-h-[56px] transition-colors ${
            isMoreActive ? 'text-indigo-400' : 'text-slate-500'
          }`}
        >
          <MoreHorizontal size={21} strokeWidth={isMoreActive ? 2.2 : 1.5} />
          <span className="text-[9px] font-semibold tracking-wide leading-none">More</span>
          {isMoreActive && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[2px] rounded-full bg-indigo-400" />}
        </button>
      </nav>

      {/* More sheet */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Sheet */}
          <div className="fixed bottom-0 left-0 right-0 z-[70] bg-[#0f0f1a] border-t border-white/[0.08] rounded-t-2xl pb-safe"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Close row */}
            <div className="flex items-center justify-between px-5 py-2 border-b border-white/[0.06]">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">More</span>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300">
                <X size={18} />
              </button>
            </div>

            {/* Grid of items */}
            <div className="grid grid-cols-4 gap-px p-3">
              {MORE_ITEMS.map(item => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex flex-col items-center justify-center gap-1.5 py-3.5 px-1 rounded-xl transition-colors ${
                      isActive
                        ? 'bg-indigo-600/20 text-indigo-400'
                        : 'text-slate-400 active:bg-white/[0.05]'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isActive ? 'bg-indigo-600/20' : 'bg-white/[0.05]'
                    }`}>
                      <Icon size={20} strokeWidth={isActive ? 2.2 : 1.6} />
                    </div>
                    <span className="text-[10px] font-semibold text-center leading-tight">{item.label}</span>
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
