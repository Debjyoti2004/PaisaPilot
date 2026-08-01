'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  TrendingUp, TrendingDown, Wallet, AlertCircle, CheckCircle,
  PiggyBank, BarChart3, ArrowRight, Calendar, Lightbulb,
} from 'lucide-react'
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
function PeriodSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {PERIODS.map(p => (
        <button
          key={p.id}
          onClick={() => onChange(p.id)}
          className="period-badge"
          style={{
            background: value === p.id ? 'var(--violet)' : 'var(--bg-2)',
            color: value === p.id ? '#fff' : 'var(--text-2)',
            border: `1px solid ${value === p.id ? 'var(--violet)' : 'var(--border)'}`,
            fontWeight: value === p.id ? 600 : 400,
          }}
        >
          {p.label}
        </button>
      ))}
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
  const max = items[0]?.amount ?? 1
  return (
    <div className="card p-6">
      <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 16 }}>Top spending categories</h3>
      <div className="space-y-3">
        {items.slice(0, 8).map(c => (
          <div key={c.name}>
            <div className="flex items-center justify-between mb-1">
              <span style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 500 }}>{c.name}</span>
              <div>
                <span className="num" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{fmtC(c.amount)}</span>
                <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 6 }}>{c.count} txns</span>
              </div>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${(c.amount / max) * 100}%`, background: GROUP_COLORS[c.group] ?? 'var(--violet)' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────
export default function ConsolePage() {
  const [period, setPeriod] = useState('this-month')
  const [data, setData] = useState<ConsoleData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (p: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/console?period=${p}`)
      const d = await res.json()
      setData(d)
    } catch {} finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(period) }, [period, load])

  // Listen for refresh events (new transaction added via TopBar)
  useEffect(() => {
    const handler = () => load(period)
    window.addEventListener('paisapilot:refresh', handler)
    return () => window.removeEventListener('paisapilot:refresh', handler)
  }, [period, load])

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)' }}>Console</h2>
          <p style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 4 }}>Your financial intelligence hub — all insights in one place.</p>
        </div>
        <PeriodSelect value={period} onChange={p => { setPeriod(p); load(p) }} />
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

          {/* Top spending + Needs review */}
          <div className="grid md:grid-cols-2 gap-5">
            {data.byCategory.length > 0 && <TopSpending items={data.byCategory} />}
            {data.needsReview.length > 0 && <NeedsReviewPanel items={data.needsReview} />}
          </div>

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
