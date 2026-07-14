'use client'

import { useState, useEffect, useCallback } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { IndianRupee, TrendingUp, TrendingDown, Check, ChevronRight, Plus, Trash2, Briefcase, Laptop2, Coins } from 'lucide-react'
import { formatINR } from '@/lib/finance'
import { clsx } from 'clsx'

interface EnvAlloc { categoryId: string; categoryName: string; allocated: number; mode: string; kind: string }
interface SplitResult { envelopes: EnvAlloc[]; total: number; isSurplus: boolean; isShortfall: boolean; surplus: number; shortfall: number }
interface IncomeSource { id: string; label: string; amount: string; icon: string }

const KIND_COLOR: Record<string, string> = { need: '#f59e0b', want: '#6366f1', save_short: '#14b8a6', invest_long: '#10b981', goal: '#f43f5e', income: '#22c55e' }
const KIND_LABEL: Record<string, string> = { need: 'Need', want: 'Want', save_short: 'Save', invest_long: 'Invest', goal: 'Goal', income: 'Income' }

const PRESET_SOURCES = [
  { label: 'Salary', icon: '💼' },
  { label: 'Freelancing', icon: '💻' },
  { label: 'Business', icon: '🏢' },
  { label: 'Rental Income', icon: '🏠' },
  { label: 'Side Project', icon: '⚡' },
  { label: 'Dividends', icon: '📈' },
  { label: 'Other', icon: '💰' },
]

function uid() { return Math.random().toString(36).slice(2) }

export default function SplitPage() {
  const [sources, setSources] = useState<IncomeSource[]>([
    { id: uid(), label: 'Salary', amount: '', icon: '💼' },
  ])
  const [result, setResult] = useState<SplitResult | null>(null)
  const [configName, setConfigName] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState('')

  const totalIncome = sources.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0)

  const simulate = useCallback(async (total: number) => {
    if (!total || total <= 0) { setResult(null); return }
    setLoading(true); setError('')
    try {
      const r = await fetch('/api/salary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: total, simulate: true }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setResult(d.splitResult)
      setConfigName(d.config?.name || '')
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => simulate(totalIncome), 400)
    return () => clearTimeout(t)
  }, [totalIncome, simulate])

  const confirm = async () => {
    if (!result) return
    setConfirming(true); setError('')
    try {
      const validSources = sources.filter(s => parseFloat(s.amount) > 0).map(s => ({ label: s.label, amount: parseFloat(s.amount) }))
      const r = await fetch('/api/salary/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources: validSources }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setConfirmed(true)
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setConfirming(false) }
  }

  const addSource = () => {
    setSources(s => [...s, { id: uid(), label: 'Other', amount: '', icon: '💰' }])
    setConfirmed(false)
  }

  const removeSource = (id: string) => {
    setSources(s => s.filter(x => x.id !== id))
    setConfirmed(false)
  }

  const updateSource = (id: string, field: keyof IncomeSource, value: string) => {
    setSources(s => s.map(x => x.id === id ? { ...x, [field]: value } : x))
    setConfirmed(false)
  }

  const needs = result?.envelopes.filter(e => e.kind === 'need').reduce((s, e) => s + e.allocated, 0) || 0
  const wants = result?.envelopes.filter(e => e.kind === 'want').reduce((s, e) => s + e.allocated, 0) || 0
  const savings = result?.envelopes.filter(e => ['save_short','invest_long','goal'].includes(e.kind)).reduce((s, e) => s + e.allocated, 0) || 0

  return (
    <>
      <TopBar title="Income Split" subtitle="Split your total income across envelopes" />
      <div className="flex-1 p-4 md:p-6 space-y-4 max-w-2xl mx-auto w-full">

        {/* Income sources */}
        <div className="bg-[#13131f] border border-white/[0.07] rounded-2xl p-4 md:p-5 space-y-4 overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-600">Income Sources</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Add salary, freelancing, side projects…</p>
            </div>
            {loading && <div className="w-4 h-4 border-2 border-indigo-600/30 border-t-indigo-400 rounded-full animate-spin-smooth" />}
          </div>

          <div className="space-y-3">
            {sources.map((src, i) => (
              <div key={src.id} className="group flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3.5 py-3 overflow-hidden">
                {/* Icon picker */}
                <div className="relative">
                  <select
                    value={src.icon + '|' + src.label}
                    onChange={e => {
                      const [icon, label] = e.target.value.split('|')
                      updateSource(src.id, 'icon', icon)
                      updateSource(src.id, 'label', label)
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  >
                    {PRESET_SOURCES.map(p => (
                      <option key={p.label} value={`${p.icon}|${p.label}`}>{p.icon} {p.label}</option>
                    ))}
                  </select>
                  <div className="w-9 h-9 rounded-xl bg-white/[0.05] flex items-center justify-center text-lg flex-shrink-0 cursor-pointer hover:bg-white/[0.08] transition-colors">
                    {src.icon}
                  </div>
                </div>

                <div className="flex-1 min-w-0 flex flex-col gap-0.5 overflow-hidden">
                  <input
                    value={src.label}
                    onChange={e => updateSource(src.id, 'label', e.target.value)}
                    placeholder="Source name"
                    className="bg-transparent text-[11px] text-slate-400 focus:outline-none focus:text-white transition-colors w-full"
                  />
                  <div className="flex items-center gap-1.5">
                    <IndianRupee size={14} className="text-indigo-400 flex-shrink-0" />
                    <input
                      type="number"
                      value={src.amount}
                      onChange={e => updateSource(src.id, 'amount', e.target.value)}
                      placeholder="0"
                      min="0"
                      autoFocus={i === 0}
                      className="flex-1 bg-transparent text-[18px] md:text-[22px] font-black text-white placeholder:text-slate-700 focus:outline-none num w-0 min-w-0"
                      style={{ letterSpacing: '-0.03em' }}
                    />
                  </div>
                </div>

                {sources.length > 1 && (
                  <button onClick={() => removeSource(src.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0 opacity-100">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button onClick={addSource}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-white/[0.1] text-slate-500 hover:text-indigo-400 hover:border-indigo-500/30 hover:bg-indigo-500/[0.03] transition-all text-[12px]">
            <Plus size={14} />
            Add income source
          </button>

          {/* Total */}
          {totalIncome > 0 && (
            <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
              <div className="flex items-center gap-2 text-slate-500 text-[12px]">
                <Coins size={14} />
                <span>Total Income</span>
                {configName && <span className="text-indigo-400">· {configName}</span>}
              </div>
              <p className="text-[20px] font-black text-white num" style={{ letterSpacing: '-0.03em' }}>{formatINR(totalIncome)}</p>
            </div>
          )}
        </div>

        {/* Breakdown pills */}
        {result && totalIncome > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Needs', val: needs, color: '#f59e0b', icon: Briefcase },
              { label: 'Wants', val: wants, color: '#6366f1', icon: Laptop2 },
              { label: 'Savings', val: savings, color: '#10b981', icon: Coins },
            ].map(({ label, val, color, icon: Icon }) => (
              <div key={label} className="bg-[#13131f] border border-white/[0.07] rounded-xl p-3 text-center">
                <Icon size={14} className="mx-auto mb-1.5" style={{ color }} />
                <p className="text-[10px] text-slate-600 mb-1">{label}</p>
                <p className="text-[13px] font-bold text-white num">{formatINR(val)}</p>
                <p className="text-[10px] text-slate-600 mt-0.5">{totalIncome > 0 ? ((val / totalIncome) * 100).toFixed(0) : 0}%</p>
              </div>
            ))}
          </div>
        )}

        {/* Surplus / shortfall */}
        {result && (result.isSurplus || result.isShortfall) && (
          <div className={clsx('flex items-center gap-3 p-4 rounded-2xl border', result.isSurplus ? 'bg-green-500/[0.07] border-green-500/20' : 'bg-amber-500/[0.07] border-amber-500/20')}>
            {result.isSurplus ? <TrendingUp size={18} className="text-green-400 flex-shrink-0" /> : <TrendingDown size={18} className="text-amber-400 flex-shrink-0" />}
            <div>
              <p className={clsx('text-[13px] font-semibold', result.isSurplus ? 'text-green-400' : 'text-amber-400')}>
                {result.isSurplus ? `Surplus: +${formatINR(result.surplus)}` : `Shortfall: -${formatINR(result.shortfall)}`}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {result.isSurplus ? 'Extra split: 60% SIP, 20% Emergency, 10% Travel, 10% Fun' : 'Wants will be trimmed. Needs are protected.'}
              </p>
            </div>
          </div>
        )}

        {/* Allocation table */}
        {result && (
          <div className="bg-[#13131f] border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-widest text-slate-600">Allocation Preview</p>
              <p className="text-[12px] font-semibold text-white num">{formatINR(result.total)}</p>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {result.envelopes.map(env => {
                const color = KIND_COLOR[env.kind] || '#94a3b8'
                const pct = result.total > 0 ? (env.allocated / result.total) * 100 : 0
                return (
                  <div key={env.categoryId} className="flex items-center gap-3.5 px-5 py-3">
                    <div className="w-1.5 h-7 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-[13px] font-medium text-white">{env.categoryName}</p>
                        <p className="text-[13px] font-bold text-white num">{formatINR(env.allocated)}</p>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[10px]" style={{ color }}>{KIND_LABEL[env.kind]} · {env.mode}</span>
                        <span className="text-[10px] text-slate-600">{pct.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {error && <p className="text-red-400 text-[12px] bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>}

        {result && !confirmed && (
          <button
            onClick={confirm}
            disabled={confirming || totalIncome <= 0}
            className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[14px] transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {confirming ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-smooth" />Confirming...</>
            ) : (
              <><Check size={18} />Confirm — Record {formatINR(totalIncome)} Income</>
            )}
          </button>
        )}

        {confirmed && (
          <div className="flex items-center gap-3 p-4 bg-green-500/[0.08] border border-green-500/20 rounded-2xl">
            <div className="w-9 h-9 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0">
              <Check size={18} className="text-green-400" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-green-400">Income recorded — {formatINR(totalIncome)}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{sources.filter(s => parseFloat(s.amount) > 0).length} source(s) recorded. Envelopes updated.</p>
            </div>
            <ChevronRight size={16} className="text-slate-600 ml-auto" />
          </div>
        )}
      </div>
    </>
  )
}
