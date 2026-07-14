'use client'

import { formatINR } from '@/lib/finance'
import { Card, CardContent } from '@/components/ui/card'
import { Shield, Calendar } from 'lucide-react'

interface SafeToSpendProps {
  safeToSpend: number
  safePerDay: number
  daysLeft: number
  daysElapsed: number
  totalDays: number
}

export function SafeToSpend({ safeToSpend, safePerDay, daysLeft, daysElapsed, totalDays }: SafeToSpendProps) {
  const progressPercent = Math.round((daysElapsed / totalDays) * 100)

  return (
    <Card className="relative overflow-hidden" glow="indigo">
      {/* Decorative gradient blob */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      <CardContent className="p-6 relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-text-secondary text-xs font-medium uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Shield size={12} className="text-primary-light" />
              Safe to Spend
            </p>
            <p className="text-text-secondary text-xs">Total remaining budget</p>
          </div>
          <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-lg px-2.5 py-1.5">
            <Calendar size={12} className="text-primary-light" />
            <span className="text-primary-light text-xs font-medium">{daysLeft}d left</span>
          </div>
        </div>

        {/* Big number */}
        <div className="mb-4">
          <span className="text-4xl font-black text-text-primary tracking-tight leading-none">
            {formatINR(safeToSpend)}
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary-light">{formatINR(Math.round(safePerDay))}</span>
            <span className="text-text-secondary text-sm">/day</span>
          </div>
        </div>

        {/* Month progress */}
        <div>
          <div className="flex justify-between text-xs text-text-secondary mb-1.5">
            <span>Day {daysElapsed}</span>
            <span>{progressPercent}% through month</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
