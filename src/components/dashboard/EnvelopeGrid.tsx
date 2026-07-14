'use client'

import { clsx } from 'clsx'
import { formatINR } from '@/lib/finance'

interface Envelope {
  id: string
  category: {
    name: string
    icon: string
    color: string
    kind: string
  }
  allocated: number
  spent: number
  remaining: number
  percentUsed: number
}

interface EnvelopeGridProps {
  envelopes: Envelope[]
}

function EnvelopeCard({ envelope }: { envelope: Envelope }) {
  const pct = Math.min(100, envelope.percentUsed)
  const isOver = pct >= 100
  const isDanger = pct >= 90
  const isWarning = pct >= 70 && pct < 90

  const barColor = isDanger
    ? 'from-danger to-red-400'
    : isWarning
    ? 'from-warning to-amber-400'
    : 'from-success to-emerald-400'

  const kindLabel: Record<string, string> = {
    need: 'Need',
    want: 'Want',
    save_short: 'Save',
    invest_long: 'Invest',
    goal: 'Goal',
    income: 'Income',
  }

  return (
    <div
      className={clsx(
        'bg-card border rounded-2xl p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-card',
        isDanger
          ? 'border-danger/30 animate-pulse-glow'
          : isWarning
          ? 'border-warning/20'
          : 'border-card-border hover:border-white/10'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{ backgroundColor: `${envelope.category.color}20` }}
          >
            {envelope.category.icon}
          </div>
          <div>
            <p className="text-text-primary text-sm font-semibold leading-none">{envelope.category.name}</p>
            <span className="text-xs mt-0.5 inline-block" style={{ color: envelope.category.color }}>
              {kindLabel[envelope.category.kind] ?? envelope.category.kind}
            </span>
          </div>
        </div>
        {isOver ? (
          <span className="text-xs font-bold text-danger bg-danger/10 px-2 py-0.5 rounded-full">Over!</span>
        ) : (
          <span className="text-xs text-text-secondary">{Math.round(100 - pct)}% left</span>
        )}
      </div>

      {/* Amounts */}
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-text-primary font-bold text-base">{formatINR(envelope.spent)}</span>
        <span className="text-text-secondary text-xs">/ {formatINR(envelope.allocated)}</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>

      {/* Remaining */}
      <p className={clsx('text-xs mt-2', isDanger ? 'text-danger' : isWarning ? 'text-warning' : 'text-text-secondary')}>
        {isOver
          ? `${formatINR(Math.abs(envelope.remaining))} over budget`
          : `${formatINR(envelope.remaining)} remaining`}
      </p>
    </div>
  )
}

export function EnvelopeGrid({ envelopes }: EnvelopeGridProps) {
  // Filter out income category from grid
  const displayEnvelopes = envelopes.filter(e => e.category.kind !== 'income')

  // Group by kind
  const needs = displayEnvelopes.filter(e => e.category.kind === 'need')
  const wants = displayEnvelopes.filter(e => e.category.kind === 'want')
  const savings = displayEnvelopes.filter(e =>
    ['save_short', 'invest_long', 'goal'].includes(e.category.kind)
  )

  return (
    <div className="space-y-6">
      {needs.length > 0 && (
        <section>
          <h3 className="text-text-secondary text-xs font-medium uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-warning inline-block" />
            Needs
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {needs.map(env => <EnvelopeCard key={env.id} envelope={env} />)}
          </div>
        </section>
      )}

      {wants.length > 0 && (
        <section>
          <h3 className="text-text-secondary text-xs font-medium uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary inline-block" />
            Wants
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {wants.map(env => <EnvelopeCard key={env.id} envelope={env} />)}
          </div>
        </section>
      )}

      {savings.length > 0 && (
        <section>
          <h3 className="text-text-secondary text-xs font-medium uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success inline-block" />
            Savings & Investments
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {savings.map(env => <EnvelopeCard key={env.id} envelope={env} />)}
          </div>
        </section>
      )}
    </div>
  )
}
