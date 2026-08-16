'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { BRACKET_CONFIGS, detectBracket } from '@/utils/investmentCalculator'
import {
  computeYearlyRows, computeCorpus, getMilestones, getInstrumentSplit,
} from '@/utils/investmentCalculator'
import { CorpusChart } from '@/components/investment/CorpusChart'
import type { Bracket, BracketConfig } from '@/types/investment'
import {
  TrendingUp, Info, RotateCcw, Sparkles, Plus, X,
  ChevronDown, ChevronLeft, ChevronRight, AlertCircle, Check,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, Legend, AreaChart, Area, CartesianGrid } from 'recharts'
import { ChartTooltip } from '@/components/ChartTooltip'

// ── Constants ────────────────────────────────────────────────────
const NEEDS_CATS    = ['Housing', 'Groceries', 'Utilities', 'Transportation', 'Insurance', 'Health', 'Subscriptions']
const WANTS_CATS    = ['Dining', 'Shopping', 'Entertainment', 'Travel', 'Other']
const INSTRUMENTS   = ['Mutual Funds', 'Stocks', 'Debt Funds', 'EPF/NPS', 'Gold', 'Fixed Deposits']

type WealthGroup = 'needs' | 'wants' | 'investments'

// ── Formatters ───────────────────────────────────────────────────
function fmtINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}
function fmtC(n: number) {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(2)} L`
  return fmtINR(n)
}

// ── Types ────────────────────────────────────────────────────────
interface WPActuals { needs: number; wants: number; investments: number }
interface CatActuals { [cat: string]: number }
interface InvestActuals { [instrument: string]: number }
interface Override {
  id: string; month: string; instrument: string; extraAmount: number; note?: string | null
}
interface DBPlan {
  startingSalary: number; startingAge: number; incrementRate: number
  inflationRate: number; extraMonthlyInvest: number; bracket: number
  overrides: Override[]
}

// ── Salary Input Bar ─────────────────────────────────────────────
function SalaryInputBar({ salary, age, incr, onUpdate }: {
  salary: number; age: number; incr: number
  onUpdate: (salary: number, age: number, increment: number) => void
}) {
  const [s, setS] = useState(String(salary))
  const [a, setA] = useState(String(age))
  const [i, setI] = useState(String((incr * 100).toFixed(0)))

  // Sync from parent (on DB load)
  useEffect(() => { setS(String(salary)) }, [salary])
  useEffect(() => { setA(String(age)) }, [age])
  useEffect(() => { setI(String((incr * 100).toFixed(0))) }, [incr])

  const bracket = detectBracket(parseFloat(s) || 0)
  const cfg = BRACKET_CONFIGS[bracket]

  function fire(sv: string, av: string, iv: string) {
    const ns = parseFloat(sv) || 0
    if (ns > 0) onUpdate(ns, parseInt(av) || 21, Math.min(50, parseFloat(iv) || 10))
  }

  return (
    <div className="card p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={16} style={{ color: 'var(--violet)' }} />
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>Your Wealth Plan</h2>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: 'var(--violet-bg)', color: 'var(--violet)', border: '1px solid var(--violet-border)' }}>
          {cfg.label} · {cfg.blendedReturn}% blended
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Monthly salary (₹)</label>
          <input type="number" value={s} onChange={e => { setS(e.target.value); fire(e.target.value, a, i) }} className="form-input" style={{ fontWeight: 600 }} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Current age</label>
          <input type="number" value={a} onChange={e => { setA(e.target.value); fire(s, e.target.value, i) }} className="form-input" />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Annual increment (%)</label>
          <input type="number" value={i} onChange={e => { setI(e.target.value); fire(s, a, e.target.value) }} className="form-input" />
        </div>
      </div>
    </div>
  )
}

// ── Actual vs Plan bar chart ─────────────────────────────────────
function ActualVsPlan({ salary, config, actuals }: {
  salary: number
  config: BracketConfig
  actuals: WPActuals
}) {
  const planned = {
    needs:       salary * config.needsPct,
    wants:       salary * config.wantsPct,
    investments: salary * config.investmentPct,
  }
  const data = [
    { group: 'Needs',       planned: planned.needs,       actual: actuals.needs,       color: '#6558D3' },
    { group: 'Wants',       planned: planned.wants,       actual: actuals.wants,       color: '#f59e0b' },
    { group: 'Investments', planned: planned.investments, actual: actuals.investments, color: '#10b981' },
  ]

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {data.map(d => {
          const over = d.actual > d.planned && d.group !== 'Investments'
          const under = d.actual < d.planned && d.group === 'Investments'
          return (
            <div key={d.group} className="p-3 rounded-xl text-center" style={{ background: 'var(--bg)' }}>
              <p style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500 }}>{d.group}</p>
              <p style={{ fontSize: 20, fontWeight: 800, color: d.color, marginTop: 4 }} className="num">{fmtINR(d.actual)}</p>
              <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>of {fmtINR(d.planned)} planned</p>
              <div className="progress-track mt-2">
                <div className="progress-fill" style={{ width: `${Math.min(100, d.planned > 0 ? (d.actual / d.planned) * 100 : 0)}%`, background: over ? 'var(--orange)' : d.color }} />
              </div>
              {over  && <p style={{ fontSize: 10, color: 'var(--orange)', marginTop: 4 }}>Over budget ↑</p>}
              {under && <p style={{ fontSize: 10, color: 'var(--orange)', marginTop: 4 }}>Under target ↓</p>}
            </div>
          )
        })}
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} barGap={4} barCategoryGap="40%">
          <XAxis dataKey="group" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={v => fmtC(v)} width={55} />
          <Tooltip content={<ChartTooltip formatValue={fmtINR} />} cursor={{ fill: 'rgba(101,88,211,0.04)' }} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="planned" name="Planned" radius={[4,4,0,0]} maxBarSize={36}>
            {data.map(d => <Cell key={d.group} fill={d.color} opacity={0.25} />)}
          </Bar>
          <Bar dataKey="actual" name="Actual" radius={[4,4,0,0]} maxBarSize={36}>
            {data.map(d => <Cell key={d.group} fill={d.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Override Modal ──────────────────────────────────────────────
function OverrideModal({ month, onClose, onSaved }: {
  month: string; onClose: () => void; onSaved: (o: Override) => void
}) {
  const [group, setGroup] = useState<WealthGroup>('investments')
  const [category, setCategory] = useState(INSTRUMENTS[0])
  const [extra, setExtra] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  // Reset category when group changes
  useEffect(() => {
    if (group === 'investments') setCategory(INSTRUMENTS[0])
    else if (group === 'needs') setCategory(NEEDS_CATS[0])
    else setCategory(WANTS_CATS[0])
  }, [group])

  const categoryOptions = group === 'investments' ? INSTRUMENTS : group === 'needs' ? NEEDS_CATS : WANTS_CATS

  const groupDesc: Record<WealthGroup, string> = {
    needs: 'housing, groceries, utilities, transport…',
    wants: 'dining, shopping, entertainment…',
    investments: 'SIP, stocks, gold, FD…',
  }

  async function save() {
    const amt = parseFloat(extra)
    if (!isFinite(amt) || amt <= 0) { setErr('Enter a valid positive amount'); return }
    setSaving(true); setErr('')
    try {
      const res = await fetch('/api/wealth-plan/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, instrument: `${group}:${category}`, extraAmount: amt, note: note.trim() || null }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Save failed')
      onSaved(d.override)
      onClose()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 440 }}>
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-1)' }}>Add monthly extra</h3>
          <button className="btn-ghost" style={{ padding: 8 }} onClick={onClose}><X size={16} /></button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
            Add a one-time extra amount on top of your plan for <strong>{month}</strong> only.
          </p>

          {/* Group selector */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 8 }}>Budget group</label>
            <div className="seg-track" style={{ width: '100%' }}>
              {(['needs', 'wants', 'investments'] as WealthGroup[]).map(g => (
                <button key={g} className={`seg-btn flex-1 ${group === g ? 'active' : ''}`} onClick={() => setGroup(g)}>
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>{groupDesc[group]}</p>
          </div>

          {/* Category / Instrument */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>
              {group === 'investments' ? 'Instrument' : 'Category'}
            </label>
            <div className="relative">
              <select value={category} onChange={e => setCategory(e.target.value)} className="form-select">
                {categoryOptions.map(o => <option key={o}>{o}</option>)}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Extra amount (₹)</label>
            <input type="number" placeholder="e.g. 2000" value={extra} onChange={e => setExtra(e.target.value)} className="form-input" />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Note (optional)</label>
            <input type="text" placeholder="Bonus, one-time expense…" value={note} onChange={e => setNote(e.target.value)} className="form-input" />
          </div>
          {err && <p style={{ fontSize: 13, color: 'var(--red)', background: 'var(--red-bg)', padding: '10px 14px', borderRadius: 8 }}>{err}</p>}
        </div>
        <div className="flex gap-3 px-6 py-4 justify-end" style={{ borderTop: '1px solid var(--border)' }}>
          <button className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Add extra'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Overrides list ───────────────────────────────────────────────
function OverridesList({ overrides, currentMonth, onDelete }: {
  overrides: Override[]; currentMonth: string; onDelete: (id: string) => void
}) {
  const monthOverrides = overrides.filter(o => o.month === currentMonth)
  if (monthOverrides.length === 0) return null
  return (
    <div className="mt-4 space-y-2">
      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>Extra this month:</p>
      {monthOverrides.map(o => {
        const parts = o.instrument.split(':')
        const label = parts.length === 2 ? `${parts[0]} › ${parts[1]}` : o.instrument
        return (
          <div key={o.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--green-bg)', border: '1px solid var(--green-border)' }}>
            <Check size={14} style={{ color: 'var(--green)', flexShrink: 0 }} />
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{label} — {fmtINR(o.extraAmount)} extra</p>
              {o.note && <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>{o.note}</p>}
            </div>
            <button className="btn-ghost" style={{ padding: 6 }} onClick={() => onDelete(o.id)}>
              <X size={13} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ── Actual Corpus Tracker ─────────────────────────────────────────
type TrackerPoint = {
  label: string
  plan: number
  actual: number | null       // past only
  projected: number | null    // future + today boundary
}
type TrackerMilestone = { label: string; plan: number; projected: number; projInvested: number; planInvested: number }

function ActualCorpusTracker({ profile, config }: {
  profile: typeof DEFAULT_PROFILE
  config: BracketConfig
}) {
  const [chartData, setChartData]   = useState<TrackerPoint[]>([])
  const [milestones, setMilestones] = useState<TrackerMilestone[]>([])
  const [totals, setTotals]         = useState({ invested: 0, actualCorpus: 0, planCorpus: 0, avgMonthly: 0 })
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch('/api/wealth-plan/history')
      .then(r => r.json())
      .then(d => {
        const months = (d.months ?? []) as { month: string; invested: number }[]
        if (months.length === 0) { setLoading(false); return }

        const { monthlyRate } = config
        const planMonthly = profile.startingSalary * config.investmentPct + profile.extraMonthlyInvestment

        let actualCorpus = 0
        let planCorpus   = 0
        let totalInvested = 0
        const pastPoints: TrackerPoint[] = []

        // ── Phase 1: historical corpus ──────────────────────────────
        for (const m of months) {
          actualCorpus  = (actualCorpus + m.invested) * (1 + monthlyRate)
          planCorpus    = (planCorpus   + planMonthly) * (1 + monthlyRate)
          totalInvested += m.invested
          const [yr, mo] = m.month.split('-')
          const label = new Date(parseInt(yr), parseInt(mo) - 1, 1)
            .toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
          pastPoints.push({ label, plan: Math.round(planCorpus), actual: Math.round(actualCorpus), projected: null })
        }

        // Bridge: last historical point seeds the projected line
        if (pastPoints.length > 0) {
          pastPoints[pastPoints.length - 1].projected = Math.round(actualCorpus)
        }

        // ── Phase 2: project 10 years forward ──────────────────────
        const avgMonthly = totalInvested / months.length
        let proj = actualCorpus
        let fPlan = planCorpus
        let projInvestedAcc = totalInvested   // cumulative invested in projection
        let planInvestedAcc = totalInvested   // plan: same starting base
        const futurePoints: TrackerPoint[] = []
        const mileStoneMonths = [12, 24, 36, 60, 120]
        const ms: TrackerMilestone[] = []

        for (let i = 1; i <= 120; i++) {
          proj  = (proj  + avgMonthly)  * (1 + monthlyRate)
          fPlan = (fPlan + planMonthly) * (1 + monthlyRate)
          projInvestedAcc += avgMonthly
          planInvestedAcc += planMonthly

          if (mileStoneMonths.includes(i)) {
            ms.push({
              label: `${i / 12} Year${i / 12 > 1 ? 's' : ''}`,
              plan: Math.round(fPlan), projected: Math.round(proj),
              projInvested: Math.round(projInvestedAcc),
              planInvested: Math.round(planInvestedAcc),
            })
          }
          // Keep every 6 months for chart density
          if (i % 6 === 0) {
            const yrs = i / 12
            futurePoints.push({
              label: `+${yrs}yr`,
              plan: Math.round(fPlan),
              actual: null,
              projected: Math.round(proj),
            })
          }
        }

        setChartData([...pastPoints, ...futurePoints])
        setMilestones(ms)
        setTotals({ invested: totalInvested, actualCorpus, planCorpus, avgMonthly })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [profile, config])

  if (loading) return (
    <div className="card p-6">
      <div style={{ height: 260, background: 'var(--bg-2)', borderRadius: 12, opacity: 0.5 }} />
    </div>
  )

  if (chartData.length === 0) return (
    <div className="card p-6">
      <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>Investment Corpus Tracker</h3>
      <p style={{ fontSize: 13, color: 'var(--text-3)' }}>No investment transactions found. Import your bank statements to track corpus growth.</p>
    </div>
  )

  const behind = totals.actualCorpus < totals.planCorpus
  const tenYrMs = milestones.find(m => m.label.startsWith('10'))

  return (
    <div className="card p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>Investment Corpus Tracker</h3>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>
            Past actual + future projection at your current rate vs plan
          </p>
        </div>
        <div className="text-right">
          <p className="num" style={{ fontSize: 17, fontWeight: 800, color: behind ? 'var(--orange)' : '#10b981' }}>
            {fmtC(totals.actualCorpus)}
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>today&apos;s corpus</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total invested', value: totals.invested,     color: 'var(--text-1)' },
          { label: 'Avg / month',    value: totals.avgMonthly,   color: '#10b981'       },
          { label: 'Plan / month',   value: profile.startingSalary * config.investmentPct, color: 'var(--violet)' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{s.label}</p>
            <p className="num" style={{ fontSize: 14, fontWeight: 700, color: s.color, marginTop: 2 }}>{fmtINR(Math.round(s.value))}</p>
          </div>
        ))}
      </div>

      {/* Area chart — past (solid) + future (dashed) */}
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="planGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}   />
              </linearGradient>
              <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10b981" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}   />
              </linearGradient>
              <linearGradient id="actualGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10b981" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}   />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tickFormatter={v => fmtC(v)} tick={{ fontSize: 9, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} width={60} />
            <Tooltip content={<ChartTooltip formatValue={fmtC} />} />
            <Legend iconType="plainline" formatter={v => <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{v}</span>} />
            {/* Plan — dashed violet, full span */}
            <Area type="monotone" dataKey="plan" name="Plan" stroke="#6366f1" strokeWidth={1.5} strokeDasharray="5 3" fill="url(#planGrad2)" dot={false} connectNulls />
            {/* Actual — solid green, past only */}
            <Area type="monotone" dataKey="actual" name="Actual" stroke="#10b981" strokeWidth={2.5} fill="url(#actualGrad2)" dot={false} />
            {/* Projected — dashed green, future only */}
            <Area type="monotone" dataKey="projected" name="At current rate" stroke="#10b981" strokeWidth={1.5} strokeDasharray="5 3" fill="url(#projGrad)" dot={false} connectNulls />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Milestone cards — Year 1 / 2 / 3 / 5 / 10 with profit */}
      {milestones.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Future corpus projection (at current rate)
          </p>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${milestones.length}, 1fr)` }}>
            {milestones.map(m => {
              const projBehind = m.projected < m.plan
              const profit = m.projected - m.projInvested
              return (
                <div key={m.label} className="rounded-xl p-3 text-center" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 3 }}>{m.label}</p>
                  <p className="num" style={{ fontSize: 13, fontWeight: 700, color: projBehind ? 'var(--orange)' : '#10b981' }}>{fmtC(m.projected)}</p>
                  <p style={{ fontSize: 10, fontWeight: 600, color: '#10b981', marginTop: 2 }}>+{fmtC(profit)} profit</p>
                  <p style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 1 }}>plan: {fmtC(m.plan)}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Summary bar */}
      {tenYrMs && (
        <div className="rounded-xl p-3" style={{
          background: behind ? 'rgba(249,115,22,0.06)' : 'rgba(16,185,129,0.06)',
          border: `1px solid ${behind ? 'rgba(249,115,22,0.2)' : 'rgba(16,185,129,0.2)'}`,
        }}>
          <p style={{ fontSize: 12, color: behind ? 'var(--orange)' : '#10b981', fontWeight: 500 }}>
            At your current pace ({fmtINR(Math.round(totals.avgMonthly))}/mo), 10-year corpus:{' '}
            <strong>{fmtC(tenYrMs.projected)}</strong>
            {behind
              ? ` — ${fmtC(tenYrMs.plan - tenYrMs.projected)} less than plan (${fmtINR(Math.round(profile.startingSalary * config.investmentPct))}/mo)`
              : ` — on track with plan`}
          </p>
        </div>
      )}
    </div>
  )
}

// ── What-If Simulator ────────────────────────────────────────────
function WhatIfCalculator({ profile, config, instrumentSplit, investByInstrument }: {
  profile: typeof DEFAULT_PROFILE
  config: BracketConfig
  instrumentSplit: { name: string; monthlyAmount: number; annualReturn: number; color: string }[]
  investByInstrument: InvestActuals
}) {
  const [whatIf, setWhatIf] = useState(1000)
  const [inputVal, setInputVal] = useState('1000')

  const baseMs  = useMemo(() => getMilestones(computeCorpus(profile, config)), [profile, config])
  const extraMs = useMemo(() => getMilestones(computeCorpus(
    { ...profile, extraMonthlyInvestment: profile.extraMonthlyInvestment + whatIf }, config,
  )), [profile, config, whatIf])

  const suggestions = useMemo(() => {
    return instrumentSplit
      .map(inst => {
        const actual     = investByInstrument[inst.name] ?? 0
        const gap        = Math.max(0, inst.monthlyAmount - actual)
        const fundedPct  = inst.monthlyAmount > 0 ? actual / inst.monthlyAmount : 1
        const score      = (1 - fundedPct) * inst.annualReturn
        return { ...inst, actual, gap, fundedPct, score }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
  }, [instrumentSplit, investByInstrument])

  const allFunded = suggestions.every(s => s.gap === 0)

  return (
    <div className="card p-6 space-y-5">
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>What-If Simulator</h3>
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>See how extra monthly investment changes your 30-year corpus</p>
      </div>

      {/* Slider + input */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>Extra monthly investment</span>
          <div className="flex items-center gap-1">
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>₹</span>
            <input
              type="number" min={0} max={50000}
              value={inputVal}
              onChange={e => {
                setInputVal(e.target.value)
                const v = parseInt(e.target.value) || 0
                setWhatIf(Math.max(0, Math.min(50000, v)))
              }}
              className="form-input"
              style={{ width: 100, textAlign: 'right', fontWeight: 700, fontSize: 14, color: 'var(--violet)', padding: '4px 8px' }}
            />
          </div>
        </div>
        <input type="range" min={0} max={20000} step={500}
          value={Math.min(20000, whatIf)}
          onChange={e => { const v = parseInt(e.target.value); setWhatIf(v); setInputVal(String(v)) }}
          style={{ width: '100%', accentColor: 'var(--violet)' }}
        />
        <div className="flex justify-between" style={{ marginTop: 2 }}>
          <span style={{ fontSize: 10, color: 'var(--text-3)' }}>₹0</span>
          <span style={{ fontSize: 10, color: 'var(--text-3)' }}>₹20,000 / mo</span>
        </div>
      </div>

      {/* Corpus comparison */}
      {whatIf > 0 && (
        <div>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>
            Corpus impact of +{fmtINR(whatIf)}/mo
          </p>
          <div className="grid grid-cols-3 gap-3">
            {baseMs.map((bm, idx) => {
              const em   = extraMs[idx]
              const diff = em.nominal - bm.nominal
              return (
                <div key={bm.label} className="rounded-xl p-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 3 }}>{bm.label}</p>
                  <p className="num" style={{ fontSize: 15, fontWeight: 700, color: 'var(--violet)' }}>{fmtC(em.nominal)}</p>
                  <p style={{ fontSize: 10, color: 'var(--text-3)', textDecoration: 'line-through', marginTop: 1 }}>{fmtC(bm.nominal)}</p>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#10b981', marginTop: 3 }}>+{fmtC(diff)}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Where to invest */}
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 8 }}>
          {whatIf > 0
            ? `Where to put ${fmtINR(whatIf)} for best returns?`
            : 'Where to invest for maximum returns?'}
        </p>
        {allFunded ? (
          <div className="rounded-xl p-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: 13, color: 'var(--text-2)' }}>All instruments are fully funded — consider increasing SIP or Stocks for maximum compounding.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {suggestions.map((s, idx) => (
              <div key={s.name} className="flex items-center gap-3 rounded-xl p-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>{idx + 1}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{s.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: s.color, flexShrink: 0 }}>{s.annualReturn}% /yr</span>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                    {s.actual === 0
                      ? `Not started · plan ${fmtINR(s.monthlyAmount)}/mo`
                      : `${fmtINR(s.actual)} of ${fmtINR(s.monthlyAmount)} · ${(s.gap / s.monthlyAmount * 100).toFixed(0)}% gap`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Allocation Tab ───────────────────────────────────────────────
function AllocationTab({ salary, config, instrumentSplit, actuals, catActuals, recurringByCat, investByInstrument, bracket }: {
  salary: number
  config: BracketConfig
  instrumentSplit: { name: string; monthlyAmount: number; annualReturn: number; color: string }[]
  actuals: WPActuals
  catActuals: CatActuals
  recurringByCat: CatActuals
  investByInstrument: InvestActuals
  bracket: number
}) {
  const investBudget = salary * config.investmentPct

  function GroupRow({ name, budget, actual, color, trackColor, recurringAmt }: {
    name: string; budget: number; actual: number; color: string; trackColor: string; recurringAmt?: number
  }) {
    const pct = budget > 0 ? Math.min(100, (actual / budget) * 100) : 0
    const over = actual > budget
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <span style={{ fontSize: 14, color: 'var(--text-1)', fontWeight: 500 }}>{name}</span>
          <div className="flex items-center gap-2">
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
              background: over ? '#fff0e6' : trackColor,
              color: over ? 'var(--orange)' : color,
            }}>
              {pct.toFixed(0)}%
            </span>
            <span className="num" style={{ fontSize: 13, color: over ? 'var(--orange)' : 'var(--text-2)' }}>{fmtINR(actual)}</span>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>/ {fmtINR(budget)}</span>
            {over && <span style={{ fontSize: 10, color: 'var(--orange)', fontWeight: 700 }}>↑</span>}
          </div>
        </div>
        <div className="progress-track" style={{ background: trackColor }}>
          <div className="progress-fill" style={{
            width: `${pct}%`,
            background: over ? 'var(--orange)' : color,
            minWidth: pct > 0 ? 4 : 0,
          }} />
        </div>
        {recurringAmt !== undefined && recurringAmt > 0 && (
          <p style={{ fontSize: 11, color: color, marginTop: 4 }}>↩ {fmtINR(recurringAmt)}/mo committed</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Investments only */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>Investments — Bracket {bracket}</h3>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>SIP, stocks, gold, fixed deposits</p>
          </div>
          <div className="text-right">
            <p className="num" style={{ fontSize: 16, fontWeight: 700, color: '#10b981' }}>{fmtINR(actuals.investments)}</p>
            <p style={{ fontSize: 11, color: 'var(--text-3)' }}>of {fmtINR(investBudget)} target</p>
          </div>
        </div>
        <div className="space-y-4">
          {instrumentSplit.map(inst => {
            const allocPct = investBudget > 0 ? inst.monthlyAmount / investBudget : 0
            const actual = investByInstrument[inst.name] ?? 0
            const actualPct = inst.monthlyAmount > 0 ? Math.min(100, (actual / inst.monthlyAmount) * 100) : 0
            const over = actual > inst.monthlyAmount
            const notStarted = actual === 0
            return (
              <div key={inst.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span style={{ fontSize: 14, color: 'var(--text-1)', fontWeight: 500 }}>{inst.name}</span>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="num" style={{ fontSize: 13, fontWeight: 700, color: notStarted ? 'var(--text-3)' : inst.color }}>
                        {fmtINR(actual)}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 3 }}>actual</span>
                    </div>
                    <div style={{ width: 1, height: 14, background: 'var(--border)' }} />
                    <div className="text-right">
                      <span className="num" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>{fmtINR(inst.monthlyAmount)}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 3 }}>plan · {(allocPct * 100).toFixed(0)}%</span>
                    </div>
                    {over && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--orange)' }}>↑ over</span>}
                    {notStarted && <span style={{ fontSize: 10, color: 'var(--text-3)', fontStyle: 'italic' }}>not started</span>}
                  </div>
                </div>
                {/* Dual-track: plan (light) + actual (solid) */}
                <div style={{ position: 'relative', height: 7, borderRadius: 99, background: `${inst.color}18` }}>
                  <div style={{ position: 'absolute', width: `${Math.min(100, allocPct * 100)}%`, height: '100%', borderRadius: 99, background: `${inst.color}35` }} />
                  <div style={{ position: 'absolute', width: `${Math.min(100, actualPct)}%`, height: '100%', borderRadius: 99, background: inst.color, minWidth: actualPct > 0 ? 4 : 0 }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────
const DEFAULT_PROFILE = { startingSalary: 25000, startingAge: 21, incrementRate: 0.10, inflationRate: 0.06, extraMonthlyInvestment: 0, bracket: 1 as Bracket }

export default function WealthPlanPage() {
  const [profile, setProfile] = useState(DEFAULT_PROFILE)
  const [actuals, setActuals] = useState<WPActuals>({ needs: 0, wants: 0, investments: 0 })
  const [catActuals, setCatActuals] = useState<CatActuals>({})
  const [recurringByCat, setRecurringByCat] = useState<CatActuals>({})
  const [investByInstrument, setInvestByInstrument] = useState<InvestActuals>({})
  const [overrides, setOverrides] = useState<Override[]>([])
  const [currentMonth, setCurrentMonth] = useState('')
  const [viewMonth, setViewMonth] = useState('')
  const [overrideOpen, setOverrideOpen] = useState(false)
  const [loading, setLoading] = useState(true)  // single loading state
  const [actualsLoading, setActualsLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'overview' | 'allocation' | 'projection' | 'chart'>('overview')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load EVERYTHING from DB in one shot → no triple blink
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/wealth-plan')
      .then(r => r.json())
      .then(d => {
        if (cancelled) return
        if (d.plan) {
          setProfile({
            startingSalary: d.plan.startingSalary,
            startingAge: d.plan.startingAge,
            incrementRate: d.plan.incrementRate,
            inflationRate: d.plan.inflationRate,
            extraMonthlyInvestment: d.plan.extraMonthlyInvest ?? 0,
            bracket: detectBracket(d.plan.startingSalary) as Bracket,
          })
          setOverrides(d.plan.overrides ?? [])
        }
        if (d.actuals) setActuals(d.actuals)
        if (d.catActuals) setCatActuals(d.catActuals)
        if (d.recurringByCat) setRecurringByCat(d.recurringByCat)
        if (d.investByInstrument) setInvestByInstrument(d.investByInstrument)
        if (d.month) { setCurrentMonth(d.currentMonth ?? d.month); setViewMonth(d.month) }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  // Re-fetch actuals when viewMonth changes (after initial load)
  const fetchActuals = useCallback((month: string) => {
    if (!month) return
    setActualsLoading(true)
    fetch(`/api/wealth-plan?month=${month}`)
      .then(r => r.json())
      .then(d => {
        if (d.actuals) setActuals(d.actuals)
        if (d.catActuals) setCatActuals(d.catActuals)
        if (d.investByInstrument) setInvestByInstrument(d.investByInstrument)
      })
      .catch(() => {})
      .finally(() => setActualsLoading(false))
  }, [])

  function shiftMonth(delta: number) {
    if (!viewMonth) return
    const [y, m] = viewMonth.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    setViewMonth(next)
    fetchActuals(next)
  }

  const isCurrentMonth = viewMonth === currentMonth

  // Save profile to DB (debounced 800ms)
  const saveProfile = useCallback((updates: Partial<typeof DEFAULT_PROFILE>) => {
    setProfile(prev => {
      const next = { ...prev, ...updates }
      if (updates.startingSalary !== undefined) {
        next.bracket = detectBracket(updates.startingSalary) as Bracket
      }
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(async () => {
        setSaving(true)
        await fetch('/api/wealth-plan', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startingSalary: next.startingSalary,
            startingAge: next.startingAge,
            incrementRate: next.incrementRate,
            inflationRate: next.inflationRate,
            extraMonthlyInvest: next.extraMonthlyInvestment,
            bracket: next.bracket,
          }),
        }).catch(() => {}).finally(() => setSaving(false))
      }, 800)
      return next
    })
  }, [])

  async function deleteOverride(id: string) {
    await fetch(`/api/wealth-plan/override?id=${id}`, { method: 'DELETE' })
    setOverrides(prev => prev.filter(o => o.id !== id))
  }

  // Computed plan from profile
  const plan = useMemo(() => {
    const config = BRACKET_CONFIGS[profile.bracket]
    const yearlyRows   = computeYearlyRows(profile as Parameters<typeof computeYearlyRows>[0], config)
    const corpusData   = computeCorpus(profile as Parameters<typeof computeCorpus>[0], config)
    const milestones   = getMilestones(corpusData)
    const instrumentSplit = getInstrumentSplit(profile as Parameters<typeof getInstrumentSplit>[0], config)
    const currentMonthlyInvestment = profile.startingSalary * config.investmentPct
    return { config, yearlyRows, corpusData, milestones, instrumentSplit, currentMonthlyInvestment }
  }, [profile])

  const monthExtra = overrides.filter(o => o.month === currentMonth).reduce((s, o) => s + o.extraAmount, 0)

  // Single loading skeleton — no blink
  if (loading) return (
    <div className="p-6 space-y-4">
      <div className="card skeleton" style={{ height: 130 }} />
      <div className="card skeleton" style={{ height: 320 }} />
      <div className="grid grid-cols-3 gap-4">
        {[1,2,3].map(i => <div key={i} className="card skeleton" style={{ height: 120 }} />)}
      </div>
    </div>
  )

  const { config, instrumentSplit, milestones, yearlyRows, corpusData, currentMonthlyInvestment } = plan

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)' }}>Wealth Plan</h2>
        <p style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 4 }}>
          Your wealth formula — live, customizable, tracked against your real spending.
          {saving && <span style={{ fontSize: 12, color: 'var(--violet)', marginLeft: 8 }}>Saving…</span>}
        </p>
      </div>

      {/* Salary Input */}
      <SalaryInputBar
        salary={profile.startingSalary}
        age={profile.startingAge}
        incr={profile.incrementRate}
        onUpdate={(salary, age, increment) => saveProfile({ startingSalary: salary, startingAge: age, incrementRate: increment / 100 })}
      />

      {/* Month navigator + Actual vs Plan */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>Actual vs Plan</h3>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>How your spending tracks against the wealth formula</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => shiftMonth(-1)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }}>
              <ChevronLeft size={15} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, color: isCurrentMonth ? 'var(--violet)' : 'var(--text-1)', minWidth: 90, textAlign: 'center' }}>
              {viewMonth ? new Date(viewMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : ''}
              {!isCurrentMonth && <span style={{ fontSize: 10, display: 'block', color: 'var(--text-3)', fontWeight: 400 }}>← viewing past month</span>}
            </span>
            <button onClick={() => shiftMonth(1)} disabled={isCurrentMonth} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', cursor: isCurrentMonth ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isCurrentMonth ? 'var(--text-3)' : 'var(--text-2)', opacity: isCurrentMonth ? 0.4 : 1 }}>
              <ChevronRight size={15} />
            </button>
            {!isCurrentMonth && (
              <button onClick={() => { setViewMonth(currentMonth); fetchActuals(currentMonth) }} style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 8, border: '1px solid var(--violet-border)', background: 'var(--violet-bg)', color: 'var(--violet)', cursor: 'pointer' }}>
                Today
              </button>
            )}
            {actualsLoading && <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--violet)', borderTopColor: 'transparent', animation: 'spin 0.6s linear infinite' }} />}
          </div>
        </div>
        <ActualVsPlan salary={profile.startingSalary} config={config} actuals={actuals} />
      </div>

      {/* Monthly override */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>Extra this month</h3>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
              Got a bonus or one-time expense? Add it on top of the formula for {currentMonth} only.
            </p>
          </div>
          <button className="btn-primary" style={{ gap: 6, fontSize: 13, padding: '8px 14px', minHeight: 38 }} onClick={() => setOverrideOpen(true)}>
            <Plus size={14} />Add extra
          </button>
        </div>
        <OverridesList overrides={overrides} currentMonth={currentMonth} onDelete={deleteOverride} />
        {monthExtra > 0 && (
          <div className="mt-3 p-3 rounded-xl" style={{ background: 'var(--violet-bg)', border: '1px solid var(--violet-border)' }}>
            <p style={{ fontSize: 13, color: 'var(--violet)', fontWeight: 600 }}>
              This month investment total: {fmtINR(currentMonthlyInvestment + monthExtra)} (formula {fmtINR(currentMonthlyInvestment)} + extra {fmtINR(monthExtra)})
            </p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="seg-track" style={{ width: '100%', borderRadius: 12 }}>
        {([
          { id: 'overview',   label: 'Overview'    },
          { id: 'allocation', label: 'Allocation'  },
          { id: 'projection', label: '10-Yr Plan'  },
          { id: 'chart',      label: 'Growth Chart'},
        ] as const).map(t => (
          <button key={t.id} className={`seg-btn flex-1 ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: 'Needs',       desc: `${(config.needsPct * 100).toFixed(0)}% — housing, food, utilities`, amount: profile.startingSalary * config.needsPct,       color: 'var(--violet)' },
            { label: 'Wants',       desc: `${(config.wantsPct * 100).toFixed(0)}% — dining, entertainment`,   amount: profile.startingSalary * config.wantsPct,       color: 'var(--amber)'  },
            { label: 'Investments', desc: `${(config.investmentPct * 100).toFixed(0)}% — SIP, stocks, gold`,  amount: currentMonthlyInvestment,                       color: 'var(--green)'  },
          ].map(g => (
            <div key={g.label} className="card p-5">
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{g.label}</p>
              <p style={{ fontSize: 28, fontWeight: 800, color: g.color, lineHeight: 1.1 }} className="num">{fmtINR(g.amount)}</p>
              <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>{g.desc}</p>
            </div>
          ))}
          <div className="card p-5 md:col-span-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {milestones.map(m => (
                <div key={m.label} className="text-center">
                  <p style={{ fontSize: 12, color: 'var(--text-3)' }}>{m.label}</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)', marginTop: 4 }} className="num">{fmtC(m.nominal)}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>at age {profile.startingAge + m.years - 1}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Allocation tab — shows all 3 groups */}
      {tab === 'allocation' && (
        <>
          <AllocationTab
            salary={profile.startingSalary}
            config={config}
            instrumentSplit={instrumentSplit}
            actuals={actuals}
            catActuals={catActuals}
            recurringByCat={recurringByCat}
            investByInstrument={investByInstrument}
            bracket={profile.bracket}
          />
          <ActualCorpusTracker
            profile={profile}
            config={config}
          />
          <WhatIfCalculator
            profile={profile}
            config={config}
            instrumentSplit={instrumentSplit}
            investByInstrument={investByInstrument}
          />
        </>
      )}

      {/* 10-Yr projection */}
      {tab === 'projection' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>YEAR</th><th>AGE</th><th>SALARY</th><th>INVEST/MO</th><th>CORPUS</th></tr>
              </thead>
              <tbody>
                {yearlyRows.slice(0, 10).map((row, idx) => {
                  const endCorpus = corpusData[idx * 12 + 11]?.nominal ?? 0
                  return (
                    <tr key={row.year}>
                      <td style={{ fontWeight: 600 }}>Y{row.year}</td>
                      <td>{row.age}</td>
                      <td className="num">{fmtINR(row.monthlySalary)}</td>
                      <td className="num">{fmtINR(row.monthlyInvestments)}</td>
                      <td className="num" style={{ fontWeight: 700, color: 'var(--violet)' }}>{fmtC(endCorpus)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Growth chart */}
      {tab === 'chart' && (
        <div className="card p-6">
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 16 }}>30-Year Corpus Growth</h3>
          <CorpusChart data={corpusData} milestones={milestones} />
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
        <Info size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
        <p style={{ fontSize: 12, color: 'var(--text-3)' }}>
          All numbers update live. Your plan is saved to the cloud — accessible from any device.
        </p>
        <button className="btn-ghost ml-auto" style={{ padding: '5px 10px', fontSize: 12, gap: 5, flexShrink: 0 }}
          onClick={() => saveProfile({ startingSalary: 25000, startingAge: 21, incrementRate: 0.10 })}>
          <RotateCcw size={12} />Reset
        </button>
      </div>

      {overrideOpen && (
        <OverrideModal
          month={currentMonth}
          onClose={() => setOverrideOpen(false)}
          onSaved={o => setOverrides(prev => [...prev.filter(x => !(x.month === o.month && x.instrument === o.instrument)), o])}
        />
      )}
    </div>
  )
}
