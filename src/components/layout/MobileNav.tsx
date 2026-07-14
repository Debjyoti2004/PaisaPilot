'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ArrowLeftRight, Wallet, PiggyBank, MoreHorizontal } from 'lucide-react'

const ITEMS = [
  { href: '/', label: 'Home', icon: LayoutDashboard },
  { href: '/transactions', label: 'Txns', icon: ArrowLeftRight },
  { href: '/envelopes', label: 'Budget', icon: Wallet },
  { href: '/savings', label: 'Savings', icon: PiggyBank },
  { href: '/profile', label: 'More', icon: MoreHorizontal },
]

export function MobileNav() {
  const pathname = usePathname()
  return (
    <nav
      className="w-full bg-[#0f0f1a]/95 backdrop-blur-md border-t border-white/[0.07] flex items-stretch"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {ITEMS.map(item => {
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
    </nav>
  )
}
