'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { formatINR } from '@/lib/finance'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { DownloadMenu } from '@/components/DownloadMenu'
import { clsx } from 'clsx'
import { ChartTooltip } from '@/components/ChartTooltip'

interface Transaction {
  id: string; narration: string; amount: number; type: string; occurredAt: string
  category: { id: string; name: string; icon: string; color: string; kind: string }
}

type Period = 'day' | 'week' | 'month'
type Mode = 'income' | 'expense'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) { return formatINR(Math.round(n)) }
function fmtC(n: number) {
  if (n >= 10_000_000) return `₹${(n/10_000_000).toFixed(1)}Cr`
  if (n >= 100_000) return `₹${(n/100_000).toFixed(1)}L`
  return fmt(n)
}

const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const COLORS = ['#6366f1','#22d3ee','#10b981','#f59e0b','#f97316','#ec4899','#8b5cf6','#3b82f6','#06b6d4']


// ── Main ──────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [txns, setTxns] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<Mode>('expense')
  const [period, setPeriod] = useState<Period>('month')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const now = new Date()
  const monthParam = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}`

  const fetch_ = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/transactions?month=${monthParam}`)
      const d = await r.json()
      setTxns(d.transactions || [])
    } catch {}
    finally { setLoading(false) }
  }, [monthParam])

  useEffect(() => { fetch_() }, [fetch_])

  const filtered = useMemo(() =>
    txns.filter(t => {
      if (mode === 'expense' && t.type !== 'debit') return false
      if (mode === 'income' && t.type !== 'credit') return false
      if (selectedCategory && t.category.id !== selectedCategory) return false
      return true
    }),
    [txns, mode, selectedCategory]
  )

  const totalIn = txns.filter(t => t.type === 'credit').reduce((s,t) => s + t.amount, 0)
  const totalOut = txns.filter(t => t.type === 'debit').reduce((s,t) => s + t.amount, 0)
  const net = totalIn - totalOut

  // ── Category breakdown ────────────────────────────────────────────────────
  const catData = useMemo(() => {
    const map: Record<string, { name: string; icon: string; color: string; amount: number; count: number }> = {}
    txns.filter(t => t.type === (mode === 'expense' ? 'debit' : 'credit')).forEach(t => {
      const k = t.category.id
      if (!map[k]) map[k] = { name: t.category.name, icon: t.category.icon, color: t.category.color, amount: 0, count: 0 }
      map[k].amount += t.amount
      map[k].count++
    })
    return Object.entries(map)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.amount - a.amount)
  }, [txns, mode])

  const totalForMode = catData.reduce((s, c) => s + c.amount, 0)

  // ── Time-series data ──────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (period === 'day') {
      // Daily within current week
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - now.getDay())
      weekStart.setHours(0,0,0,0)
      const days: Record<number, { income: number; expense: number }> = {}
      for (let i = 0; i < 7; i++) days[i] = { income: 0, expense: 0 }
      filtered.forEach(t => {
        const d = new Date(t.occurredAt)
        if (d >= weekStart) {
          const idx = d.getDay()
          if (t.type === 'credit') days[idx].income += t.amount
          else days[idx].expense += t.amount
        }
      })
      return Object.entries(days).map(([i, v]) => ({ label: DAY_LABELS[parseInt(i)], ...v }))
    }
    if (period === 'week') {
      // Weekly last 8 weeks
      const weeks: Record<number, { income: number; expense: number }> = {}
      for (let i = 0; i < 8; i++) weeks[i] = { income: 0, expense: 0 }
      filtered.forEach(t => {
        const d = new Date(t.occurredAt)
        const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000*60*60*24))
        const weekIdx = Math.floor(diffDays / 7)
        if (weekIdx >= 0 && weekIdx < 8) {
          const idx = 7 - weekIdx
          if (t.type === 'credit') weeks[idx].income += t.amount
          else weeks[idx].expense += t.amount
        }
      })
      return Object.entries(weeks).map(([i, v]) => ({ label: `W${i}`, ...v }))
    }
    // Month: day-by-day for current month
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const days: Record<number, { income: number; expense: number }> = {}
    for (let i = 1; i <= daysInMonth; i++) days[i] = { income: 0, expense: 0 }
    filtered.forEach(t => {
      const d = new Date(t.occurredAt)
      if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
        const day = d.getDate()
        if (t.type === 'credit') days[day].income += t.amount
        else days[day].expense += t.amount
      }
    })
    return Object.entries(days).map(([d, v]) => ({
      label: parseInt(d) % 5 === 0 || parseInt(d) === 1 ? d : '',
      day: parseInt(d),
      ...v
    }))
  }, [filtered, period, now])

  // ── Bar chart data ─────────────────────────────────────────────────────────
  const barData = useMemo(() => {
    if (period !== 'day') return null
    // Side-by-side income vs expense per day of week
    return chartData
  }, [chartData, period])

  const categories = useMemo(() => {
    const seen = new Set<string>()
    return txns.map(t => t.category).filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true })
  }, [txns])

  return (
    <>
      <TopBar title="Reports" subtitle={now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} />
      <div className="flex-1 p-4 md:p-6 pb-32 md:pb-6 max-w-4xl mx-auto w-full space-y-5">

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Income', value: totalIn, color: 'text-green-400', bg: 'border-green-500/15 bg-green-500/[0.05]', icon: TrendingUp, iconColor: 'text-green-400' },
            { label: 'Expenses', value: totalOut, color: 'text-red-400', bg: 'border-red-500/15 bg-red-500/[0.05]', icon: TrendingDown, iconColor: 'text-red-400' },
            { label: 'Net', value: net, color: net >= 0 ? 'text-green-400' : 'text-red-400', bg: 'border-white/[0.07] bg-[#13131f]', icon: net >= 0 ? TrendingUp : TrendingDown, iconColor: net >= 0 ? 'text-green-400' : 'text-red-400' },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl p-4 border ${s.bg}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] uppercase tracking-widest text-slate-600">{s.label}</p>
                <s.icon size={13} className={s.iconColor} />
              </div>
              <p className={`text-[17px] font-black num ${s.color}`} style={{ letterSpacing: '-0.03em' }}>
                {net < 0 && s.label === 'Net' ? '-' : ''}{fmtC(Math.abs(s.value))}
              </p>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Income / Expense toggle */}
          <div className="flex gap-1 p-1 bg-white/[0.04] border border-white/[0.07] rounded-xl">
            {(['income', 'expense'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-4 py-1.5 rounded-lg text-[12px] font-semibold capitalize transition-all ${
                  mode === m
                    ? m === 'income' ? 'bg-green-600 text-white' : 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m === 'income' ? 'Income' : 'Expenses'}
              </button>
            ))}
          </div>

          {/* Day/Week/Month tabs */}
          <div className="flex gap-1 p-1 bg-white/[0.04] border border-white/[0.07] rounded-xl">
            {(['day', 'week', 'month'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold capitalize transition-all ${
                  period === p ? 'bg-white/[0.12] text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>

          <DownloadMenu
            filename={`report-${mode}-${period}-${monthParam}`}
            rows={filtered.map(t => ({
              Date: t.occurredAt.slice(0, 10),
              Merchant: t.narration,
              Category: t.category.name,
              Type: t.type,
              Amount: t.amount,
            }))}
            columns={[
              { key: 'Date', header: 'Date' },
              { key: 'Merchant', header: 'Merchant' },
              { key: 'Category', header: 'Category' },
              { key: 'Type', header: 'Type' },
              { key: 'Amount', header: 'Amount (₹)' },
            ]}
            label="Export"
            className="text-[11px] !py-1.5 !px-3"
          />
        </div>

        {/* Main chart */}
        <div className="bg-[#13131f] border border-white/[0.07] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-slate-600">
                {mode === 'income' ? 'Income' : 'Expenses'} — {period === 'day' ? 'This Week' : period === 'week' ? 'Last 8 Weeks' : MONTH_LABELS[now.getMonth()]}
              </p>
              <p className="text-[22px] font-black text-white num mt-0.5" style={{ letterSpacing: '-0.03em' }}>
                {loading ? '...' : fmtC(totalForMode)}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="h-52 bg-white/[0.03] rounded-xl animate-pulse" />
          ) : period === 'day' && barData ? (
            // Bar chart for day view
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} stroke="rgba(255,255,255,0.06)" />
                  <YAxis tickFormatter={v => fmtC(v)} tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} stroke="rgba(255,255,255,0.06)" width={50} />
                  <Tooltip content={<ChartTooltip formatValue={fmtC} />} cursor={{ fill: 'rgba(101,88,211,0.04)' }} />
                  <Bar dataKey="income" name="Income" fill="#10b981" radius={[4,4,0,0]} opacity={0.85} />
                  <Bar dataKey="expense" name="Expenses" fill="#6366f1" radius={[4,4,0,0]} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            // Area chart for week/month
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} stroke="rgba(255,255,255,0.06)" />
                  <YAxis tickFormatter={v => fmtC(v)} tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} stroke="rgba(255,255,255,0.06)" width={50} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="income" name="Income" stroke="#10b981" strokeWidth={2} fill="url(#incGrad)" dot={false} activeDot={{ r: 4, fill: '#10b981' }} />
                  <Area type="monotone" dataKey="expense" name="Expenses" stroke="#6366f1" strokeWidth={2} fill="url(#expGrad)" dot={false} activeDot={{ r: 4, fill: '#6366f1' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Category filter + donut */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Category breakdown */}
          <div className="bg-[#13131f] border border-white/[0.07] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[11px] uppercase tracking-widest text-slate-600">By Category</p>
              {selectedCategory && (
                <button onClick={() => setSelectedCategory(null)} className="text-[10px] text-indigo-400 hover:text-indigo-300">
                  Clear filter
                </button>
              )}
            </div>

            {/* Donut */}
            {catData.length > 0 && (
              <div className="flex justify-center mb-4">
                <PieChart width={160} height={160}>
                  <Pie
                    data={catData}
                    cx={80} cy={80}
                    innerRadius={50} outerRadius={72}
                    dataKey="amount"
                    stroke="none"
                    paddingAngle={2}
                  >
                    {catData.map((entry, i) => (
                      <Cell
                        key={entry.id}
                        fill={entry.color || COLORS[i % COLORS.length]}
                        opacity={selectedCategory && selectedCategory !== entry.id ? 0.3 : 1}
                        cursor="pointer"
                        onClick={() => setSelectedCategory(selectedCategory === entry.id ? null : entry.id)}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip formatValue={fmtC} />} />
                </PieChart>
              </div>
            )}

            {/* Category list */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {catData.map((cat, i) => {
                const pct = totalForMode > 0 ? (cat.amount / totalForMode) * 100 : 0
                const isSelected = selectedCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(isSelected ? null : cat.id)}
                    className={clsx(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all',
                      isSelected ? 'bg-indigo-500/10 border border-indigo-500/20' : 'hover:bg-white/[0.03]'
                    )}
                  >
                    <span className="text-lg w-6 text-center flex-shrink-0">{cat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-[12px] font-medium text-white truncate">{cat.name}</span>
                        <span className="text-[11px] font-bold text-white num ml-2">{fmtC(cat.amount)}</span>
                      </div>
                      <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: cat.color || COLORS[i % COLORS.length] }}
                        />
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-600 flex-shrink-0">{pct.toFixed(0)}%</span>
                  </button>
                )
              })}
              {catData.length === 0 && !loading && (
                <p className="text-center text-slate-600 text-[13px] py-4">No {mode} data this month</p>
              )}
            </div>
          </div>

          {/* Transaction list filtered */}
          <div className="bg-[#13131f] border border-white/[0.07] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[11px] uppercase tracking-widest text-slate-600">
                {selectedCategory ? categories.find(c => c.id === selectedCategory)?.name || 'Filtered' : 'All Transactions'}
              </p>
              <span className="text-[10px] text-slate-600">{filtered.length} items</span>
            </div>
            <div className="space-y-0 divide-y divide-white/[0.04] max-h-80 overflow-y-auto">
              {filtered.slice(0, 30).map(tx => (
                <div key={tx.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[15px] flex-shrink-0" style={{ background: `${tx.category.color}20` }}>
                    {tx.category.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-white truncate">{tx.narration}</p>
                    <p className="text-[10px] text-slate-600">{new Date(tx.occurredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                  </div>
                  <span className={clsx('text-[12px] font-bold num flex-shrink-0', tx.type === 'credit' ? 'text-green-400' : 'text-white')}>
                    {tx.type === 'credit' ? '+' : '-'}{fmtC(tx.amount)}
                  </span>
                </div>
              ))}
              {filtered.length === 0 && (
                <p className="text-center text-slate-600 text-[12px] py-6">No transactions</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </>
  )
}
