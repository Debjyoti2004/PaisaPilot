'use client'

interface MonthProgressProps {
  totalBudgetUsed: number
  incomeTotal: number
  totalSpent: number
}

export function MonthProgress({ totalBudgetUsed, incomeTotal, totalSpent }: MonthProgressProps) {
  const clampedPercent = Math.min(100, Math.max(0, totalBudgetUsed))
  const color =
    clampedPercent < 70 ? 'from-success to-emerald-400' :
    clampedPercent < 90 ? 'from-warning to-amber-400' :
    'from-danger to-red-400'

  return (
    <div className="bg-card border border-card-border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-text-secondary text-xs font-medium uppercase tracking-wider">Budget Used</span>
        <span className="text-text-primary text-sm font-bold">{clampedPercent}%</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-700`}
          style={{ width: `${clampedPercent}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-text-secondary">
        <span>₹{totalSpent.toLocaleString('en-IN')} spent</span>
        <span>of ₹{incomeTotal.toLocaleString('en-IN')}</span>
      </div>
    </div>
  )
}
