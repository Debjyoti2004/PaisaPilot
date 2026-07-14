'use client'

import { formatINR } from '@/lib/finance'
import { Card, CardContent } from '@/components/ui/card'
import { Droplets, Lock, Bookmark, TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface SavingsCardProps {
  savings: {
    liquid: number
    reserved: number
    locked: number
    total: number
    buckets?: Array<{ name: string; balance: number; icon: string; color: string; liquidity: string }>
  }
}

export function SavingsCard({ savings }: SavingsCardProps) {
  const segments = [
    { label: 'Liquid', value: savings.liquid, icon: Droplets, color: '#14b8a6', bgColor: '#14b8a620' },
    { label: 'Reserved', value: savings.reserved, icon: Bookmark, color: '#f43f5e', bgColor: '#f43f5e20' },
    { label: 'Locked', value: savings.locked, icon: Lock, color: '#10b981', bgColor: '#10b98120' },
  ]

  return (
    <Card glow="emerald">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-success" />
            <p className="text-text-secondary text-xs font-medium uppercase tracking-wider">Savings Hub</p>
          </div>
          <Link href="/savings" className="text-primary-light text-xs hover:underline">
            View all →
          </Link>
        </div>

        {/* Total */}
        <div className="mb-4">
          <span className="text-2xl font-black text-text-primary">{formatINR(savings.total)}</span>
          <p className="text-text-secondary text-xs mt-0.5">Total across all buckets</p>
        </div>

        {/* Breakdown */}
        <div className="space-y-2.5">
          {segments.map(seg => {
            const Icon = seg.icon
            const pct = savings.total > 0 ? (seg.value / savings.total) * 100 : 0
            return (
              <div key={seg.label} className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: seg.bgColor }}
                >
                  <Icon size={14} style={{ color: seg.color }} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-text-secondary">{seg.label}</span>
                    <span className="text-text-primary font-medium">{formatINR(seg.value)}</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: seg.color }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
