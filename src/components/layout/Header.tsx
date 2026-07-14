'use client'

import { Bell, Search } from 'lucide-react'

interface HeaderProps {
  title: string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <header className="h-16 border-b border-card-border bg-card/50 backdrop-blur-md flex items-center px-6 gap-4 sticky top-0 z-30">
      <div className="flex-1">
        <h2 className="text-text-primary font-semibold text-base leading-none">{title}</h2>
        {subtitle && <p className="text-text-secondary text-xs mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <p className="text-text-secondary text-xs hidden md:block">{dateStr}</p>

        <button className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-white/10 transition-colors">
          <Search size={15} />
        </button>

        <button className="relative w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-white/10 transition-colors">
          <Bell size={15} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
        </button>
      </div>
    </header>
  )
}
