'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell,
} from 'recharts'
import {
  ArrowUpRight, CalendarDays, ChevronDown, Settings,
  RefreshCw, AlertCircle, ArrowRight, TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import { ChartTooltip } from '@/components/ChartTooltip'
import { useViewMode } from '@/contexts/ViewContext'
import { DatePicker } from '@/components/DatePicker'

// ── Types ─────────────────────────────────────────────────────
interface DashboardData {
  period: string
  income: number
  expenses: number
  savingsRate: number
  cashFlow: { month: string; income: number; spending: number }[]
  spendingByCategory: { name: string; amount: number; color: string; pct: number }[]
  highestSpending: { name: string; amount: number; pct: number } | null
  recentTransactions: {
    id: string; merchant: string; date: string; category: string
    account: string; amount: number; type: string; tags: string[]
  }[]
  netWorth: { assets: number; liabilities: number; value: number } | null
  comingUp: { id: string; name: string; category: string; amount: number; nextDate: string; cadence: string }[]
  needsReview: number
  savedPeriod: string
}

type Period = 'all-time' | 'this-month' | 'last-month' | 'last-3-months' | 'last-6-months' | 'this-year' | 'custom'
const PERIODS: { value: Period; label: string }[] = [
  { value: 'all-time',      label: 'All time'      },
  { value: 'this-month',    label: 'This month'    },
  { value: 'last-month',    label: 'Last month'    },
  { value: 'last-3-months', label: 'Last 3 months' },
  { value: 'last-6-months', label: 'Last 6 months' },
  { value: 'this-year',     label: 'This year'     },
  { value: 'custom',        label: 'Custom range'  },
]

// ── Formatters ─────────────────────────────────────────────────
function fmt(n: number) {
  if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(1)}L`
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}
function fmtFull(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

// ── Avatar initials ─────────────────────────────────────────────
function getInitials(name?: string | null, email?: string | null) {
  if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  return (email?.[0] ?? 'U').toUpperCase()
}

// ── Period selector ─────────────────────────────────────────────
function PeriodSelector({
  value, onChange, customRange, onCustomRange,
}: {
  value: Period
  onChange: (p: Period) => void
  customRange: { start: string; end: string }
  onCustomRange: (r: { start: string; end: string }) => void
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const [tempRange, setTempRange] = useState(customRange)
  const btnRef = useRef<HTMLButtonElement>(null)

  const label = value === 'custom' && customRange.start && customRange.end
    ? `${customRange.start} → ${customRange.end}`
    : (PERIODS.find(p => p.value === value)?.label ?? 'All time')

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('scroll', close, true)
    return () => window.removeEventListener('scroll', close, true)
  }, [open])

  function handleOpen() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 6, left: r.right - 220 })
    }
    setTempRange(customRange)
    setOpen(o => !o)
  }

  return (
    <div style={{ flexShrink: 0 }}>
      <button ref={btnRef} className="period-badge" onClick={handleOpen}>
        <CalendarDays size={14} style={{ color: 'var(--text-3)' }} />
        <span style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        <ChevronDown size={13} style={{ color: 'var(--text-3)' }} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="z-50 animate-slide-down" style={{
            position: 'fixed', top: pos.top, left: Math.max(8, pos.left),
            width: 220, background: '#fff', border: '1px solid var(--border)',
            borderRadius: 12, boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
          }}>
            {PERIODS.map(p => (
              <button key={p.value} onClick={() => { onChange(p.value); if (p.value !== 'custom') setOpen(false) }}
                className="w-full text-left flex items-center gap-2 px-4 py-2.5 transition-colors"
                style={{
                  fontSize: 13, fontWeight: p.value === value ? 700 : 400,
                  color: p.value === value ? 'var(--violet)' : 'var(--text-1)',
                  background: p.value === value ? 'var(--violet-bg)' : 'transparent',
                  border: 'none', cursor: 'pointer',
                }}>
                {p.value === value && <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--violet)' }} />}
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
                <button className="btn-primary" style={{ width: '100%', padding: '7px', fontSize: 12 }}
                  disabled={!tempRange.start || !tempRange.end}
                  onClick={() => { onCustomRange(tempRange); setOpen(false) }}>
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

// ── Summary Cards ────────────────────────────────────────────────
function SummaryCards({ data }: { data: DashboardData }) {
  const savings = data.income - data.expenses
  const savingsRate = data.income > 0 ? Math.max(0, data.savingsRate) : 0

  // Card definitions: variant controls visual style
  type CardDef = {
    label: string; value: string; sub: string; link: string
    variant: 'dark' | 'green' | 'orange' | 'blue' | 'violet'
    extra?: React.ReactNode
  }
  const cards: CardDef[] = [
    {
      label: 'Net Worth',
      value: data.netWorth ? fmtFull(data.netWorth.value) : 'Not set',
      sub: data.netWorth ? 'Assets minus liabilities' : 'Set up in Settings',
      link: '/settings#networth',
      variant: 'dark',
      extra: !data.netWorth ? (
        <Link href="/settings#networth" style={{ fontSize: 11, color: '#a78bfa', marginTop: 8, display: 'block' }}>Set up →</Link>
      ) : null,
    },
    {
      label: 'Income',
      value: fmtFull(data.income),
      sub: 'Credited this period',
      link: '/transactions',
      variant: 'green',
    },
    {
      label: 'Spending',
      value: fmtFull(data.expenses),
      sub: 'Debited this period',
      link: '/transactions',
      variant: 'orange',
    },
    {
      label: 'Net savings',
      value: fmtFull(Math.abs(savings)),
      sub: savings >= 0 ? `${savingsRate}% savings rate` : 'Exceeded income',
      link: '/console',
      variant: 'blue',
    },
    ...(data.highestSpending ? [{
      label: 'Top spending',
      value: data.highestSpending.name,
      sub: `${fmtFull(data.highestSpending.amount)} · ${data.highestSpending.pct}% of total`,
      link: '/transactions',
      variant: 'violet' as const,
    }] : []),
  ]

  const styles: Record<CardDef['variant'], {
    bg: string; border: string; topBorder?: string
    labelColor: string; valueColor: string; subColor: string; iconColor: string
  }> = {
    dark:   { bg: '#111827', border: '#1f2937', labelColor: '#9ca3af', valueColor: '#f9fafb', subColor: '#6b7280', iconColor: '#9ca3af' },
    green:  { bg: 'var(--surface)', border: 'var(--border)', topBorder: '#22c55e', labelColor: 'var(--text-3)', valueColor: '#16a34a', subColor: 'var(--text-3)', iconColor: 'var(--text-3)' },
    orange: { bg: 'var(--surface)', border: 'var(--border)', topBorder: '#f97316', labelColor: 'var(--text-3)', valueColor: '#ea580c', subColor: 'var(--text-3)', iconColor: 'var(--text-3)' },
    blue:   { bg: 'var(--surface)', border: 'var(--border)', topBorder: '#3b82f6', labelColor: 'var(--text-3)', valueColor: savings >= 0 ? '#2563eb' : '#ea580c', subColor: 'var(--text-3)', iconColor: 'var(--text-3)' },
    violet: { bg: 'var(--violet)', border: 'var(--violet)', labelColor: 'rgba(255,255,255,0.7)', valueColor: '#fff', subColor: 'rgba(255,255,255,0.65)', iconColor: 'rgba(255,255,255,0.7)' },
  }

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
      {cards.map((c) => {
        const s = styles[c.variant]
        return (
          <div key={c.label} style={{
            background: s.bg,
            border: `1px solid ${s.border}`,
            borderRadius: 14,
            borderTop: s.topBorder ? `3px solid ${s.topBorder}` : `1px solid ${s.border}`,
            padding: '12px 14px 14px',
            display: 'flex', flexDirection: 'column', gap: 0,
            minHeight: 110,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: s.labelColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {c.label}
              </p>
              <Link href={c.link} style={{ color: s.iconColor, display: 'flex', opacity: 0.8 }}>
                <ArrowUpRight size={14} />
              </Link>
            </div>
            <p className="num" style={{ fontSize: 22, fontWeight: 800, color: s.valueColor, lineHeight: 1.15, wordBreak: 'break-all', flex: 1 }}>
              {c.value}
            </p>
            <p style={{ fontSize: 11, color: s.subColor, marginTop: 6, lineHeight: 1.3 }}>{c.sub}</p>
            {c.extra}
          </div>
        )
      })}
    </div>
  )
}

// ── Cash Flow Chart ─────────────────────────────────────────────
function CashFlowChart({ data }: { data: DashboardData['cashFlow'] }) {
  const hasData = data.some(d => d.income > 0 || d.spending > 0)

  return (
    <div className="card p-6">
      <div className="mb-4">
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>Cash flow</h2>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>Up to seven months of saved activity</p>
      </div>
      {!hasData ? (
        <div className="empty-state">
          <div className="empty-state-icon"><TrendingUp size={22} /></div>
          <p style={{ fontSize: 14, color: 'var(--text-2)' }}>Import or add transactions to see cash flow.</p>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-4 justify-end mb-4">
            <span className="flex items-center gap-1.5" style={{ fontSize: 12, color: 'var(--text-2)' }}>
              <div className="w-3 h-3 rounded-sm" style={{ background: 'var(--violet)' }} />Income
            </span>
            <span className="flex items-center gap-1.5" style={{ fontSize: 12, color: 'var(--text-2)' }}>
              <div className="w-3 h-3 rounded-sm" style={{ background: 'var(--orange)' }} />Spending
            </span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} barGap={4} barCategoryGap="30%">
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={v => fmt(v)} width={55} />
              <Tooltip content={<ChartTooltip formatValue={fmtFull} />} cursor={{ fill: 'rgba(101,88,211,0.04)' }} />
              <Bar dataKey="income" name="Income" fill="var(--violet)" radius={[4,4,0,0]} maxBarSize={40} />
              <Bar dataKey="spending" name="Spending" fill="var(--orange)" radius={[4,4,0,0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

// ── Spending by Category ────────────────────────────────────────
const CAT_COLORS: Record<string, string> = {
  Housing: '#6558D3', Utilities: '#f59e0b', Insurance: '#3b82f6',
  Subscriptions: '#8b5cf6', Groceries: '#10b981', Dining: '#f97316',
  Transportation: '#06b6d4', Shopping: '#ec4899', Health: '#ef4444',
  Entertainment: '#a855f7', Income: '#16a34a', Other: '#9ca3af',
  'Needs review': '#d97706',
}

function SpendingByCategory({ data }: { data: DashboardData['spendingByCategory'] }) {
  return (
    <div className="card p-6 h-full">
      <div className="mb-4">
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>Spending by category</h2>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>Real expenses in this period</p>
      </div>
      {data.length === 0 ? (
        <div className="empty-state" style={{ padding: '24px 0' }}>
          <p style={{ fontSize: 13, color: 'var(--text-3)' }}>No expenses in this period.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map(cat => (
            <div key={cat.name}>
              <div className="flex items-center gap-2 mb-1" style={{ minWidth: 0 }}>
                <span style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</span>
                <span style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 600, flexShrink: 0 }} className="num">{fmtFull(cat.amount)}</span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{
                    width: `${cat.pct}%`,
                    background: CAT_COLORS[cat.name] ?? 'var(--violet)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Recent Activity ─────────────────────────────────────────────
function RecentActivity({ txns }: { txns: DashboardData['recentTransactions'] }) {
  function getInitialChar(name: string) {
    return name.trim()[0]?.toUpperCase() ?? '?'
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>Recent activity</h2>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>Five newest entries</p>
        </div>
        <Link href="/transactions">
          <button className="btn-ghost" style={{ fontSize: 12, gap: 4 }}>
            View all <ArrowRight size={13} />
          </button>
        </Link>
      </div>
      {txns.length === 0 ? (
        <div className="empty-state" style={{ padding: '24px 0' }}>
          <p style={{ fontSize: 13, color: 'var(--text-3)' }}>No transactions yet. Add one or import a statement.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {txns.map(tx => (
            <div key={tx.id} className="flex items-center gap-2.5 py-2 px-2 rounded-xl" style={{ background: 'transparent', transition: 'background 0.1s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--bg-3)', fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}
              >
                {getInitialChar(tx.merchant)}
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tx.merchant}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tx.date} · {tx.category}
                </p>
              </div>
              <span
                className="num"
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: tx.type === 'income' ? 'var(--green)' : 'var(--text-1)',
                  flexShrink: 0,
                  marginLeft: 8,
                }}
              >
                {tx.type === 'income' ? '+' : '–'}{fmtFull(tx.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Ledgerly Insight ────────────────────────────────────────────
function InsightPanel({ needsReview }: { needsReview: number }) {
  return (
    <div className="card p-6 h-full">
      <div className="mb-4">
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>Ledgerly insight</h2>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>Based on your records</p>
      </div>
      {needsReview > 0 ? (
        <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'var(--orange-bg)', border: '1px solid var(--orange-border)' }}>
          <AlertCircle size={16} style={{ color: 'var(--orange)', marginTop: 1, flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>{needsReview} need{needsReview !== 1 ? 's' : ''} review</p>
            <p style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
              Assign categories to keep your overview accurate.
            </p>
            <Link href="/transactions">
              <p style={{ fontSize: 12, color: 'var(--violet)', marginTop: 4, fontWeight: 500 }}>Review now →</p>
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'var(--green-bg)', border: '1px solid var(--green-border)' }}>
          <div style={{ fontSize: 16 }}>✅</div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>All categorized</p>
            <p style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
              Every transaction has a category. Your overview is accurate.
            </p>
          </div>
        </div>
      )}

      {/* Wealth Plan teaser */}
      <div className="mt-4 flex items-start gap-3 p-3 rounded-xl" style={{ background: 'var(--violet-bg)', border: '1px solid var(--violet-border)' }}>
        <TrendingUp size={16} style={{ color: 'var(--violet)', marginTop: 1, flexShrink: 0 }} />
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>Wealth Plan active</p>
          <p style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
            See how your spending maps to Needs / Wants / Investments.
          </p>
          <Link href="/wealth-plan">
            <p style={{ fontSize: 12, color: 'var(--violet)', marginTop: 4, fontWeight: 500 }}>View plan →</p>
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Coming Up ───────────────────────────────────────────────────
function ComingUp({ items }: { items: DashboardData['comingUp'] }) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>Coming up</h2>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>Confirmed payments</p>
        </div>
        <Link href="/recurring">
          <button className="btn-ghost" style={{ fontSize: 12, gap: 4 }}>
            Manage <ArrowRight size={13} />
          </button>
        </Link>
      </div>
      {items.length === 0 ? (
        <div className="empty-state" style={{ padding: '16px 0' }}>
          <RefreshCw size={20} style={{ color: 'var(--text-3)' }} />
          <p style={{ fontSize: 13, color: 'var(--text-3)' }}>No confirmed recurring payments due soon.</p>
          <Link href="/recurring">
            <p style={{ fontSize: 13, color: 'var(--violet)', fontWeight: 500, marginTop: 4 }}>Set up recurring →</p>
          </Link>
        </div>
      ) : (
        <div className="space-y-1">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-3 py-2.5 px-2 rounded-xl"
              style={{ background: 'transparent', transition: 'background 0.1s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--bg-3)' }}
              >
                <RefreshCw size={15} style={{ color: 'var(--text-3)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }} className="truncate">{item.name}</p>
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>{item.nextDate}</p>
              </div>
              <span className="num" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', flexShrink: 0 }}>
                {fmtFull(item.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Dashboard ──────────────────────────────────────────────
export default function DashboardPage() {
  const { data: session } = useSession()
  const { isViewing, viewingUser, accessRevoked } = useViewMode()
  const user = session?.user as { name?: string | null; email?: string | null; image?: string | null } | undefined

  const [period, setPeriod] = useState<Period>('all-time')
  const [customRange, setCustomRange] = useState({ start: '', end: '' })
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async (p: Period, viewAs?: string, ownerName?: string, cr?: { start: string; end: string }) => {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams({ period: p })
      if (viewAs) params.set('viewAs', viewAs)
      if (p === 'custom' && cr?.start && cr?.end) {
        params.set('startDate', cr.start)
        params.set('endDate', cr.end)
      }
      const res = await fetch(`/api/dashboard?${params}`)
      if (res.status === 403) { accessRevoked(ownerName ?? 'user'); return }
      if (!res.ok) throw new Error('Failed to load dashboard')
      const d = await res.json()
      setData(d)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [accessRevoked])

  // On mount, load saved period first
  useEffect(() => {
    async function init() {
      try {
        const params = new URLSearchParams({ period: 'all-time' })
        if (viewingUser?.id) params.set('viewAs', viewingUser.id)
        const res = await fetch(`/api/dashboard?${params}`)
        if (res.status === 403) { accessRevoked(viewingUser?.name ?? 'user'); setLoading(false); return }
        const d = await res.json()
        const saved = (isViewing ? 'all-time' : (d.savedPeriod ?? 'all-time')) as Period
        setPeriod(saved)
        if (saved === 'all-time') {
          setData(d)
          setLoading(false)
        } else {
          await load(saved, viewingUser?.id, viewingUser?.name)
        }
      } catch {
        setLoading(false); setError('Failed to load')
      }
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, viewingUser?.id, accessRevoked])

  // Refresh on global event
  useEffect(() => {
    const handler = () => load(period, viewingUser?.id, viewingUser?.name, period === 'custom' ? customRange : undefined)
    window.addEventListener('paisapilot:refresh', handler)
    return () => window.removeEventListener('paisapilot:refresh', handler)
  }, [period, load, viewingUser?.id, customRange])

  const handlePeriodChange = (p: Period) => {
    setPeriod(p)
    if (p !== 'custom') load(p, viewingUser?.id, viewingUser?.name)
  }

  const handleCustomRange = (range: { start: string; end: string }) => {
    setCustomRange(range)
    load('custom', viewingUser?.id, viewingUser?.name, range)
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  if (error) return (
    <div className="p-6">
      <div className="card p-8 text-center">
        <AlertCircle size={32} style={{ color: 'var(--red)', margin: '0 auto 12px' }} />
        <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)' }}>Failed to load dashboard</p>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>{error}</p>
        <button className="btn-primary mt-4" onClick={() => load(period, undefined, undefined, customRange)}>Retry</button>
      </div>
    </div>
  )

  return (
    <div className="p-6 space-y-6" style={{ minWidth: 0 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1.15 }}>
            {greeting()}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}.
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 3 }}>
            A calm overview built only from your saved records.
          </p>
        </div>
        <PeriodSelector value={period} onChange={handlePeriodChange} customRange={customRange} onCustomRange={handleCustomRange} />
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
            {[1,2,3,4,5].map(i => <div key={i} className="card skeleton" style={{ height: 130 }} />)}
          </div>
          <div className="card skeleton" style={{ height: 280 }} />
          <div className="card skeleton" style={{ height: 200 }} />
        </div>
      )}

      {/* Content */}
      {!loading && data && (
        <>
          <SummaryCards data={data} />

          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <CashFlowChart data={data.cashFlow} />
            <SpendingByCategory data={data.spendingByCategory} />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <RecentActivity txns={data.recentTransactions} />
            <InsightPanel needsReview={data.needsReview} />
          </div>

          <ComingUp items={data.comingUp} />
        </>
      )}
    </div>
  )
}
