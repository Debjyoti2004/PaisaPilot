'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ArrowLeftRight, Wallet, PiggyBank,
  Target, TrendingUp, Scissors, Calculator, Bot,
  User, ChevronRight, Tag
} from 'lucide-react'
import { LogoFull } from '@/components/ui/Logo'

const NAV = [
  {
    section: 'Main',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
      { href: '/envelopes', label: 'Envelopes', icon: Wallet },
    ],
  },
  {
    section: 'Money',
    items: [
      { href: '/savings', label: 'Savings', icon: PiggyBank },
      { href: '/goals', label: 'Goals', icon: Target },
      { href: '/investments', label: 'Investments', icon: TrendingUp },
    ],
  },
  {
    section: 'Tools',
    items: [
      { href: '/split', label: 'Income Split', icon: Scissors },
      { href: '/categories', label: 'Categories', icon: Tag },
      { href: '/calculators', label: 'Calculators', icon: Calculator },
      { href: '/assistant', label: 'AI Assistant', icon: Bot },
    ],
  },
  {
    section: 'Account',
    items: [
      { href: '/profile', label: 'Profile', icon: User },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="sidebar-desktop fixed left-0 top-0 h-full w-[240px] bg-[#0f0f1a] border-r border-white/[0.07] flex flex-col z-40 select-none">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-white/[0.07]">
        <LogoFull iconSize={34} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV.map(group => (
          <div key={group.section}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600 px-3 mb-1.5">{group.section}</p>
            <div className="space-y-0.5">
              {group.items.map(item => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 group relative ${
                      isActive
                        ? 'bg-indigo-500/10 text-indigo-400 border-l-2 border-indigo-500 pl-[10px]'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border-l-2 border-transparent'
                    }`}
                  >
                    <Icon size={15} strokeWidth={isActive ? 2 : 1.75} className={isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'} />
                    <span>{item.label}</span>
                    {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User card */}
      <div className="p-3 border-t border-white/[0.07]">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer group">
          <div className="w-7 h-7 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
            <span className="text-[11px] font-bold text-indigo-400">T</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-slate-200 truncate leading-none">Test User</p>
            <p className="text-[10px] text-slate-500 mt-0.5 truncate">test@gmail.com</p>
          </div>
          <ChevronRight size={12} className="text-slate-600 group-hover:text-slate-400 flex-shrink-0" />
        </div>
      </div>
    </aside>
  )
}
