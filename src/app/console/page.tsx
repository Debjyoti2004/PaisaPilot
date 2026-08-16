'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  TrendingUp, AlertCircle, CheckCircle,
  PiggyBank, ArrowRight, Calendar, Lightbulb,
  CalendarDays, ChevronDown,
} from 'lucide-react'
import { DatePicker } from '@/components/DatePicker'
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell,
  AreaChart, Area, Legend,
} from 'recharts'
import { ChartTooltip } from '@/components/ChartTooltip'

// ── Types ─────────────────────────────────────────────────────────
interface ConsoleData {
  period: string
  summary: { income: number; expenses: number; savings: number; savingsRate: number }
  byGroup: { needs: number; wants: number; investments: number; other: number }
  byCategory: { name: string; amount: number; count: number; group: string }[]
  investBreakdown: { name: string; amount: number }[]
  trend: { month: string; income: number; expenses: number }[]
  upcomingPayments: { id: string; name: string; amount: number; nextDue: string | null; category: string }[]
  needsReview: { id: string; merchant: string; amount: number; date: string; category: string }[]
  insights: string[]
  wealthPlan: { salary: number; plannedNeeds: number; plannedWants: number; plannedInvest: number } | null
}

const PERIODS = [
  { id: 'this-month',    label: 'This month'    },
  { id: 'last-month',    label: 'Last month'    },
  { id: 'last-3-months', label: 'Last 3 months' },
  { id: 'last-6-months', label: 'Last 6 months' },
  { id: 'this-year',     label: 'This year'     },
  { id: 'all-time',      label: 'All time'      },
  { id: 'custom',        label: 'Custom range'  },
]

function fmtINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}
function fmtC(n: number) {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(1)}L`
  return fmtINR(n)
}

// ── Period Selector ────────────────────────────────────────────────
function PeriodSelect({
  value, onChange, customRange, onCustomRange,
}: {
  value: string
  onChange: (v: string) => void
  customRange: { start: string; end: string }
  onCustomRange: (r: { start: string; end: string }) => void
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const [tempRange, setTempRange] = useState(customRange)
  const btnRef = useRef<HTMLButtonElement>(null)

  const label = value === 'custom' && customRange.start && customRange.end
    ? `${customRange.start} → ${customRange.end}`
    : (PERIODS.find(p => p.id === value)?.label ?? 'This month')

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('scroll', close, true)
    return () => window.removeEventListener('scroll', close, true)
  }, [open])

  function handleOpen() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 6, left: r.right - 224 })
    }
    setTempRange(customRange)
    setOpen(o => !o)
  }

  return (
    <div style={{ flexShrink: 0 }}>
      <button ref={btnRef} className="period-badge" onClick={handleOpen} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <CalendarDays size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
        <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        <ChevronDown size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="z-50 animate-slide-down" style={{
            position: 'fixed', top: pos.top, left: Math.max(8, pos.left),
            width: 224, background: '#fff', border: '1px solid var(--border)',
            borderRadius: 12, boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
          }}>
            {PERIODS.map(p => (
              <button
                key={p.id}
                onClick={() => { onChange(p.id); if (p.id !== 'custom') setOpen(false) }}
                className="w-full text-left flex items-center gap-2 px-4 py-2.5 transition-colors"
                style={{
                  fontSize: 13, fontWeight: p.id === value ? 700 : 400,
                  color: p.id === value ? 'var(--violet)' : 'var(--text-1)',
                  background: p.id === value ? 'var(--violet-bg)' : 'transparent',
                  border: 'none', cursor: 'pointer',
                }}
              >
                {p.id === value && <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--violet)', flexShrink: 0 }} />}
                {p.label}
              </button>
            ))}
            {value === 'custom' && (
              <div style={{ padding: '10px 12px 12px', borderTop: '1px solid var(--border)', background: 'var(--violet-bg)' }}>
                <div style={{ marginBottom: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 3 }}>From</label>
                  <DatePicker compact value={tempRange.start} max={tempRange.end || undefined}
                    onChange={v => setTempRange(r => ({ ...r, start: v }))} placeholder="Start date" />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 3 }}>To</label>
                  <DatePicker compact value={tempRange.end} min={tempRange.start || undefined}
                    onChange={v => setTempRange(r => ({ ...r, end: v }))} placeholder="End date" />
                </div>
                <button
                  className="btn-primary"
                  style={{ width: '100%', padding: '7px', fontSize: 12 }}
                  disabled={!tempRange.start || !tempRange.end}
                  onClick={() => { onCustomRange(tempRange); setOpen(false) }}
                >
                  Apply range
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Summary Cards ─────────────────────────────────────────────────
function SummaryCards({ d }: { d: ConsoleData }) {
  const { summary } = d
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="card p-5">
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Income</p>
        <p className="num" style={{ fontSize: 24, fontWeight: 800, color: 'var(--green)' }}>{fmtC(summary.income)}</p>
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>credited</p>
      </div>
      <div className="card p-5">
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Expenses</p>
        <p className="num" style={{ fontSize: 24, fontWeight: 800, color: 'var(--orange)' }}>{fmtC(summary.expenses)}</p>
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>debited</p>
      </div>
      <div className="card p-5">
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Savings</p>
        <p className="num" style={{ fontSize: 24, fontWeight: 800, color: summary.savings >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtC(Math.abs(summary.savings))}</p>
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{summary.savings >= 0 ? 'saved' : 'deficit'}</p>
      </div>
      <div className="card p-5">
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Savings rate</p>
        <p className="num" style={{ fontSize: 24, fontWeight: 800, color: summary.savingsRate >= 20 ? 'var(--green)' : 'var(--orange)' }}>{summary.savingsRate.toFixed(1)}%</p>
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{summary.savingsRate >= 20 ? 'on target' : 'below 20% target'}</p>
      </div>
    </div>
  )
}

// ── Wealth Group Tracker ───────────────────────────────────────────
const GROUP_COLORS: Record<string, string> = {
  needs: '#6558D3', wants: '#f59e0b', investments: '#10b981', other: '#9ca3af',
}
const GROUP_LABELS: Record<string, string> = {
  needs: 'Needs', wants: 'Wants', investments: 'Investments', other: 'Other',
}

function GroupTracker({ d }: { d: ConsoleData }) {
  const plan = d.wealthPlan
  const groups = ['needs', 'wants', 'investments'] as const

  const planAmounts: Record<string, number> = plan
    ? { needs: plan.plannedNeeds, wants: plan.plannedWants, investments: plan.plannedInvest }
    : {}

  const chartData = groups.map(g => ({
    group: GROUP_LABELS[g],
    planned: planAmounts[g] ?? 0,
    actual: d.byGroup[g] ?? 0,
    color: GROUP_COLORS[g],
  }))

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>Warikoo Group Tracker</h3>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Actual vs plan for each wealth group</p>
        </div>
        {!plan && (
          <Link href="/wealth-plan" className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px', gap: 5 }}>
            Set up plan <ArrowRight size={12} />
          </Link>
        )}
      </div>

      {/* Progress cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {groups.map(g => {
          const actual  = d.byGroup[g] ?? 0
          const planned = planAmounts[g] ?? 0
          const over    = planned > 0 && actual > planned && g !== 'investments'
          const under   = planned > 0 && actual < planned && g === 'investments'
          const pct     = planned > 0 ? Math.min(100, (actual / planned) * 100) : 0

          return (
            <div key={g} className="p-3 rounded-xl" style={{ background: 'var(--bg)' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{GROUP_LABELS[g]}</p>
              <p className="num" style={{ fontSize: 20, fontWeight: 800, color: GROUP_COLORS[g], marginTop: 4 }}>{fmtC(actual)}</p>
              {plan && (
                <>
                  <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>of {fmtC(planned)}</p>
                  <div className="progress-track mt-2">
                    <div className="progress-fill" style={{ width: `${pct}%`, background: over ? 'var(--orange)' : GROUP_COLORS[g] }} />
                  </div>
                  {over  && <p style={{ fontSize: 10, color: 'var(--orange)', marginTop: 3 }}>Over budget</p>}
                  {under && <p style={{ fontSize: 10, color: 'var(--orange)', marginTop: 3 }}>Under target</p>}
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Bar chart */}
      {plan && (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartData} barGap={4} barCategoryGap="40%">
            <XAxis dataKey="group" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={v => fmtC(v)} width={52} />
            <Tooltip content={<ChartTooltip formatValue={fmtINR} />} cursor={{ fill: 'rgba(101,88,211,0.04)' }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="planned" name="Planned" radius={[4,4,0,0]} maxBarSize={32}>
              {chartData.map(d => <Cell key={d.group} fill={d.color} opacity={0.25} />)}
            </Bar>
            <Bar dataKey="actual" name="Actual" radius={[4,4,0,0]} maxBarSize={32}>
              {chartData.map(d => <Cell key={d.group} fill={d.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

// ── 6-Month Trend ─────────────────────────────────────────────────
function TrendChart({ data }: { data: ConsoleData['trend'] }) {
  return (
    <div className="card p-6">
      <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 16 }}>6-Month Trend</h3>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.12} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.12} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={v => fmtC(v)} width={48} />
          <Tooltip content={<ChartTooltip formatValue={fmtINR} />} cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          <Area dataKey="income" name="Income" stroke="#10b981" strokeWidth={2} fill="url(#incomeGrad)" dot={false} />
          <Area dataKey="expenses" name="Expenses" stroke="#f97316" strokeWidth={2} fill="url(#expGrad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Investment Breakdown ───────────────────────────────────────────
const CAT_COLORS: Record<string, string> = {
  'Mutual Funds': '#6558D3', Stocks: '#10b981', 'Debt Funds': '#06b6d4',
  'EPF': '#3b82f6', 'NPS': '#8b5cf6', Gold: '#f59e0b', Savings: '#16a34a', Other: '#9ca3af',
}

function InvestmentBreakdown({ items }: { items: ConsoleData['investBreakdown'] }) {
  const total = items.reduce((s, i) => s + i.amount, 0)
  if (items.length === 0) return (
    <div className="card p-6">
      <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 12 }}>Investment breakdown</h3>
      <div className="empty-state" style={{ padding: '24px 0' }}>
        <PiggyBank size={24} style={{ color: 'var(--text-3)' }} />
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>No investment transactions yet</p>
        <Link href="/transactions" className="btn-secondary" style={{ fontSize: 12, marginTop: 8 }}>Add transactions</Link>
      </div>
    </div>
  )
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>Investment breakdown</h3>
        <span className="num" style={{ fontSize: 18, fontWeight: 800, color: 'var(--green)' }}>{fmtC(total)}</span>
      </div>
      <div className="space-y-3">
        {items.map(i => {
          const pct = total > 0 ? (i.amount / total) * 100 : 0
          const color = CAT_COLORS[i.name] ?? '#9ca3af'
          return (
            <div key={i.name}>
              <div className="flex items-center justify-between mb-1">
                <span style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 500 }}>{i.name}</span>
                <div>
                  <span className="num" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{fmtC(i.amount)}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 6 }}>{pct.toFixed(0)}%</span>
                </div>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Insights Panel ─────────────────────────────────────────────────
function InsightPanel({ insights }: { insights: string[] }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb size={15} style={{ color: 'var(--violet)' }} />
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>Insights</h3>
      </div>
      <div className="space-y-3">
        {insights.map((insight, i) => {
          const isGood = insight.toLowerCase().includes('on track') || insight.toLowerCase().includes('great')
          return (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl"
              style={{ background: isGood ? 'var(--green-bg)' : 'var(--orange-bg)', border: `1px solid ${isGood ? 'var(--green-border)' : 'var(--orange-border)'}` }}>
              {isGood
                ? <CheckCircle size={14} style={{ color: 'var(--green)', flexShrink: 0, marginTop: 1 }} />
                : <AlertCircle size={14} style={{ color: 'var(--orange)', flexShrink: 0, marginTop: 1 }} />
              }
              <p style={{ fontSize: 13, color: 'var(--text-1)', lineHeight: 1.5 }}>{insight}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Upcoming Payments ──────────────────────────────────────────────
function UpcomingPayments({ payments }: { payments: ConsoleData['upcomingPayments'] }) {
  if (payments.length === 0) return null
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Calendar size={15} style={{ color: 'var(--violet)' }} />
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>Upcoming payments</h3>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: 'var(--orange-bg)', color: 'var(--orange)', border: '1px solid var(--orange-border)', marginLeft: 'auto' }}>
          Next 30 days
        </span>
      </div>
      <div className="space-y-2">
        {payments.map(p => {
          const daysUntil = p.nextDue
            ? Math.ceil((new Date(p.nextDue + 'T12:00:00').getTime() - Date.now()) / 86400000)
            : null
          return (
            <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--violet-bg)', border: '1px solid var(--violet-border)' }}>
                <Calendar size={14} style={{ color: 'var(--violet)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>{p.name}</p>
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>
                  {p.category}
                  {daysUntil !== null && ` · ${daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`}`}
                </p>
              </div>
              <span className="num" style={{ fontSize: 14, fontWeight: 700, color: daysUntil !== null && daysUntil <= 3 ? 'var(--orange)' : 'var(--text-1)' }}>
                {fmtINR(p.amount)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Needs Review ───────────────────────────────────────────────────
function NeedsReviewPanel({ items }: { items: ConsoleData['needsReview'] }) {
  if (items.length === 0) return null
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertCircle size={15} style={{ color: 'var(--orange)' }} />
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>Uncategorized</h3>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'var(--orange-bg)', color: 'var(--orange)', border: '1px solid var(--orange-border)' }}>
            {items.length}
          </span>
        </div>
        <Link href="/transactions" style={{ fontSize: 12, color: 'var(--violet)', fontWeight: 500 }}>
          Review all →
        </Link>
      </div>
      <div className="space-y-2">
        {items.map(t => (
          <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold"
              style={{ background: 'var(--orange-bg)', color: 'var(--orange)' }}>
              {t.merchant.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.merchant}</p>
              <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{t.date} · {t.category}</p>
            </div>
            <span className="num" style={{ fontSize: 13, fontWeight: 700, color: 'var(--orange)' }}>−{fmtINR(t.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Top Spending ───────────────────────────────────────────────────
function TopSpending({ items }: { items: ConsoleData['byCategory'] }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const visible = items.slice(0, 8)
  const total   = visible.reduce((s, c) => s + c.amount, 0)
  const max     = visible[0]?.amount ?? 1

  if (visible.length === 0) return null

  return (
    <div className="card p-6" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>Top spending categories</h3>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
            {visible.length} categories · {fmtC(total)} total
          </p>
        </div>
        <span className="num" style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>{fmtC(total)}</span>
      </div>

      <div style={{ maxHeight: 240, overflowY: 'auto', paddingRight: 4 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {visible.map((c, i) => {
            const pct   = total > 0 ? c.amount / total : 0
            const color = GROUP_COLORS[c.group] ?? 'var(--violet)'
            return (
              <div
                key={c.name}
                style={{
                  borderRadius: 9, padding: '6px 8px', cursor: 'default',
                  background: hovered === i ? `${color}14` : 'transparent',
                  border: `1.5px solid ${hovered === i ? color + '30' : 'transparent'}`,
                  opacity: hovered === null || hovered === i ? 1 : 0.4,
                  transition: 'all 0.18s',
                }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.name}
                  </span>
                  <span className="num" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', flexShrink: 0 }}>{fmtC(c.amount)}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0, minWidth: 34, textAlign: 'right' }}>{(pct * 100).toFixed(0)}%</span>
                </div>
                <div style={{ height: 5, borderRadius: 99, background: 'var(--bg)', overflow: 'hidden', marginLeft: 18 }}>
                  <div style={{ height: '100%', borderRadius: 99, background: color, width: `${(c.amount / max) * 100}%`, transition: 'width 0.5s ease' }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Spending Donut ─────────────────────────────────────────────────
const DONUT_COLORS = [
  '#6558D3', '#10b981', '#f59e0b', '#3b82f6', '#ec4899',
  '#06b6d4', '#f97316', '#a855f7', '#14b8a6', '#9ca3af',
]

function SpendingDonut({ items }: { items: ConsoleData['byCategory'] }) {
  const [hovered, setHovered] = useState<number | null>(null)

  const MAX = 8
  const sorted = [...items].sort((a, b) => b.amount - a.amount)
  const total = sorted.reduce((s, i) => s + i.amount, 0)
  if (total === 0 || sorted.length === 0) return null

  // Group items below 2% threshold into "Other"
  const mainItems = sorted.filter(i => i.amount / total >= 0.02)
  const tinyItems = sorted.filter(i => i.amount / total < 0.02)
  const tinyAmt = tinyItems.reduce((s, i) => s + i.amount, 0)
  const topItems = mainItems.slice(0, MAX)
  const overflowAmt = mainItems.slice(MAX).reduce((s, i) => s + i.amount, 0)
  const otherAmt = tinyAmt + overflowAmt

  const slices: { name: string; amount: number; count: number; group: string }[] =
    otherAmt / total > 0.005
      ? [...topItems, { name: 'Other', amount: otherAmt, count: 0, group: 'other' }]
      : topItems

  const spending = slices.reduce((s, i) => s + i.amount, 0)

  const CX = 110, CY = 110, ROUT = 90, RIN = 54
  const GAP = slices.length > 1 ? 0.018 : 0

  let angle = -Math.PI / 2
  const segs = slices.map((item, idx) => {
    const fullArc = (item.amount / spending) * 2 * Math.PI
    const sweep = Math.max(0.02, fullArc - GAP)
    const s = angle + GAP / 2
    const e = s + sweep
    angle += fullArc
    return { ...item, start: s, end: e, color: DONUT_COLORS[idx % DONUT_COLORS.length], pct: item.amount / spending }
  })

  function arcPath(ro: number, ri: number, a0: number, a1: number) {
    const x1 = CX + ro * Math.cos(a0), y1 = CY + ro * Math.sin(a0)
    const x2 = CX + ro * Math.cos(a1), y2 = CY + ro * Math.sin(a1)
    const x3 = CX + ri * Math.cos(a1), y3 = CY + ri * Math.sin(a1)
    const x4 = CX + ri * Math.cos(a0), y4 = CY + ri * Math.sin(a0)
    const lg = a1 - a0 > Math.PI ? 1 : 0
    return `M${x1},${y1} A${ro},${ro} 0 ${lg},1 ${x2},${y2} L${x3},${y3} A${ri},${ri} 0 ${lg},0 ${x4},${y4}Z`
  }

  const hSeg = hovered !== null ? segs[hovered] : null

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>Spending breakdown</h3>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{slices.length} categories · hover to explore</p>
        </div>
        <span className="num" style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>{fmtC(spending)}</span>
      </div>

      <div className="flex flex-col md:flex-row gap-6" style={{ alignItems: 'flex-start' }}>
        {/* Donut SVG */}
        <div style={{ flexShrink: 0, width: 200, alignSelf: 'center' }}>
          <svg viewBox="0 0 220 220" style={{ width: '100%', overflow: 'visible' }}>
            {segs.map((seg, i) => (
              <path
                key={seg.name}
                d={arcPath(ROUT, RIN, seg.start, seg.end)}
                fill={seg.color}
                opacity={hovered === null || hovered === i ? 1 : 0.25}
                style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            ))}
            {/* Inner hole */}
            <circle cx={CX} cy={CY} r={RIN - 1} fill="white" style={{ pointerEvents: 'none' }} />
            {/* Center label — changes on hover */}
            {hSeg ? (
              <>
                <text x={CX} y={CY - 14} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={hSeg.color} style={{ pointerEvents: 'none' }}>{hSeg.name}</text>
                <text x={CX} y={CY + 6}  textAnchor="middle" fontSize={15} fontWeight={800} fill="#0f172a" style={{ pointerEvents: 'none' }}>{fmtC(hSeg.amount)}</text>
                <text x={CX} y={CY + 22} textAnchor="middle" fontSize={10} fill="#64748b" style={{ pointerEvents: 'none' }}>{(hSeg.pct * 100).toFixed(1)}% of total</text>
              </>
            ) : (
              <>
                <text x={CX} y={CY - 8}  textAnchor="middle" fontSize={9} fill="#94a3b8" fontWeight={600} style={{ pointerEvents: 'none' }}>TOTAL SPENT</text>
                <text x={CX} y={CY + 13} textAnchor="middle" fontSize={16} fontWeight={800} fill="#0f172a" style={{ pointerEvents: 'none' }}>{fmtC(spending)}</text>
              </>
            )}
          </svg>
        </div>

        {/* Legend — scrollable, fixed height */}
        <div style={{ flex: 1, minWidth: 0, width: '100%', maxHeight: 240, overflowY: 'auto', paddingRight: 4 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {segs.map((seg, i) => (
              <div
                key={seg.name}
                style={{
                  borderRadius: 9, padding: '6px 8px', cursor: 'pointer',
                  background: hovered === i ? `${seg.color}14` : 'transparent',
                  border: `1.5px solid ${hovered === i ? seg.color + '30' : 'transparent'}`,
                  opacity: hovered === null || hovered === i ? 1 : 0.4,
                  transition: 'all 0.18s',
                }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: seg.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {seg.name}
                  </span>
                  <span className="num" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', flexShrink: 0 }}>{fmtC(seg.amount)}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0, minWidth: 34, textAlign: 'right' }}>{(seg.pct * 100).toFixed(0)}%</span>
                </div>
                <div style={{ height: 5, borderRadius: 99, background: 'var(--bg)', overflow: 'hidden', marginLeft: 18 }}>
                  <div style={{ height: '100%', borderRadius: 99, background: seg.color, width: `${seg.pct * 100}%`, transition: 'width 0.5s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────
export default function ConsolePage() {
  const [period, setPeriod]         = useState('this-month')
  const [customRange, setCustomRange] = useState({ start: '', end: '' })
  const [data, setData]             = useState<ConsoleData | null>(null)
  const [loading, setLoading]       = useState(true)

  const load = useCallback(async (p: string, range?: { start: string; end: string }) => {
    if (p === 'custom' && (!range?.start || !range?.end)) return
    setLoading(true)
    try {
      let url = `/api/console?period=${p}`
      if (p === 'custom' && range?.start && range?.end) url += `&from=${range.start}&to=${range.end}`
      const res = await fetch(url)
      const d = await res.json()
      setData(d)
    } catch {} finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (period !== 'custom') load(period)
  }, [period, load])

  // Listen for refresh events (new transaction added via TopBar)
  useEffect(() => {
    const handler = () => period !== 'custom'
      ? load(period)
      : load('custom', customRange)
    window.addEventListener('paisapilot:refresh', handler)
    return () => window.removeEventListener('paisapilot:refresh', handler)
  }, [period, customRange, load])

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)' }}>Console</h2>
          <p style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 4 }}>Your financial intelligence hub — all insights in one place.</p>
        </div>
        <PeriodSelect
          value={period}
          onChange={p => { setPeriod(p); if (p !== 'custom') load(p) }}
          customRange={customRange}
          onCustomRange={r => { setCustomRange(r); load('custom', r) }}
        />
      </div>

      {loading && (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="card skeleton" style={{ height: 120 }} />)}
        </div>
      )}

      {!loading && data && (
        <>
          {/* Summary cards */}
          <SummaryCards d={data} />

          {/* Insights + Group tracker side by side on wide screens */}
          <div className="grid md:grid-cols-2 gap-5">
            <GroupTracker d={data} />
            <div className="space-y-5">
              <InsightPanel insights={data.insights} />
              {data.upcomingPayments.length > 0 && <UpcomingPayments payments={data.upcomingPayments} />}
            </div>
          </div>

          {/* Trend + Investment breakdown */}
          <div className="grid md:grid-cols-2 gap-5">
            <TrendChart data={data.trend} />
            <InvestmentBreakdown items={data.investBreakdown} />
          </div>

          {/* Spending breakdown + Top categories — side by side */}
          {data.byCategory.length > 0 && (
            <div className="grid md:grid-cols-2 gap-5">
              <SpendingDonut items={data.byCategory} />
              <TopSpending items={data.byCategory} />
            </div>
          )}

          {/* Needs review — full width */}
          {data.needsReview.length > 0 && <NeedsReviewPanel items={data.needsReview} />}

          {/* CTA to wealth plan if not set */}
          {!data.wealthPlan && (
            <div className="card p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--violet-bg)', border: '1px solid var(--violet-border)' }}>
                <TrendingUp size={18} style={{ color: 'var(--violet)' }} />
              </div>
              <div className="flex-1">
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>Set up your Wealth Plan</p>
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Add your salary to unlock the Needs/Wants/Investments tracker and get personalized insights.</p>
              </div>
              <Link href="/wealth-plan" className="btn-primary" style={{ fontSize: 13, padding: '8px 16px', flexShrink: 0 }}>
                Set up →
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  )
}
