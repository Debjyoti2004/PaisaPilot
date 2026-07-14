'use client'

import { useState, useEffect, useCallback } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { QuickAddModal } from '@/components/transactions/QuickAddModal'
import { VoiceQuickAdd } from '@/components/transactions/VoiceQuickAdd'
import { Plus, TrendingUp, TrendingDown, AlertCircle, ArrowRight, Scissors, IndianRupee, Target, PiggyBank } from 'lucide-react'
import { formatINR } from '@/lib/finance'
import Link from 'next/link'
import { clsx } from 'clsx'

interface Envelope {
  id: string
  category: { name: string; icon: string; color: string; kind: string }
  allocated: number; spent: number; remaining: number; percentUsed: number
}
interface DashboardData {
  period: { month: string; monthLabel: string; incomeTotal: number; expectedIncome: number } | null
  envelopes: Envelope[]
  safeToSpend: number; safePerDay: number; daysLeft: number; daysElapsed: number; totalDays: number; totalBudgetUsed: number
  savings: { liquid: number; reserved: number; locked: number; total: number }
  recentTransactions: Array<{ id: string; narration: string; amount: number; type: string; occurredAt: string; category: { name: string; icon: string; color: string } }>
  hasSalary: boolean
}

function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('skeleton rounded-xl', className)} />
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [voiceTrigger, setVoiceTrigger] = useState(false)

  const now = new Date()
  const monthLabel = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  const fetch_ = useCallback(async () => {
    try {
      const r = await fetch('/api/dashboard')
      const d = await r.json()
      // Only set data if we got a valid response with envelopes array
      if (d && Array.isArray(d.envelopes)) setData(d)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetch_() }, [fetch_])

  const spendableEnvs = data?.envelopes.filter(e => ['need','want'].includes(e.category.kind)) || []
  const totalSpent = data?.envelopes.reduce((s, e) => s + e.spent, 0) || 0

  return (
    <>
      <TopBar title={monthLabel} subtitle={`Day ${now.getDate()} of ${data?.totalDays || 31}`}
        onAdd={() => setModalOpen(true)}
        onVoice={() => setVoiceTrigger(true)}
      />

      <div className="flex-1 p-4 md:p-6 pb-36 md:pb-6 space-y-4 max-w-5xl mx-auto w-full">

        {/* No salary banner */}
        {!loading && data && !data.hasSalary && (
          <div className="flex items-center gap-4 p-4 bg-amber-500/[0.08] border border-amber-500/20 rounded-2xl">
            <AlertCircle size={18} className="text-amber-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white">Record your salary for {monthLabel}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Set up your budget envelopes to start tracking</p>
            </div>
            <Link href="/split" className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[12px] font-semibold rounded-xl border border-amber-500/20 transition-colors flex-shrink-0 whitespace-nowrap">
              <Scissors size={13} />
              Split Salary
            </Link>
          </div>
        )}

        {/* Hero row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Safe to Spend — hero */}
          <div className="md:col-span-2 bg-[#13131f] border border-white/[0.07] rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-3">Safe to Spend</p>
              {loading ? (
                <Skeleton className="h-12 w-48 mb-2" />
              ) : (
                <>
                  <p className="text-[40px] font-black text-white num" style={{ letterSpacing: '-0.04em' }}>
                    {formatINR(data?.safeToSpend || 0)}
                  </p>
                  <p className="text-slate-400 text-[13px] mt-1 num">
                    <span className="text-indigo-400 font-semibold">{formatINR(Math.round(data?.safePerDay || 0))}</span>
                    <span className="text-slate-500"> per day · </span>
                    <span className="text-slate-400">{data?.daysLeft || 0} days left</span>
                  </p>
                  {/* Month progress */}
                  <div className="mt-4">
                    <div className="flex justify-between text-[11px] text-slate-600 mb-1.5">
                      <span>Day {data?.daysElapsed || 0}</span>
                      <span>{Math.round(((data?.daysElapsed || 0) / (data?.totalDays || 31)) * 100)}% of month</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-600 to-violet-500 rounded-full"
                        style={{ width: `${Math.round(((data?.daysElapsed || 0) / (data?.totalDays || 31)) * 100)}%`, transition: 'width 0.6s ease' }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Stats column */}
          <div className="space-y-3">
            {/* Income */}
            <div className="bg-[#13131f] border border-white/[0.07] rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] uppercase tracking-widest text-slate-600">Income</p>
                <TrendingUp size={14} className="text-green-400" />
              </div>
              {loading ? <Skeleton className="h-7 w-32" /> : (
                <p className="text-[22px] font-bold text-white num" style={{ letterSpacing: '-0.03em' }}>{formatINR(data?.period?.incomeTotal || 0)}</p>
              )}
            </div>

            {/* Budget used */}
            <div className="bg-[#13131f] border border-white/[0.07] rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] uppercase tracking-widest text-slate-600">Budget Used</p>
                <span className={clsx('text-[11px] font-bold', (data?.totalBudgetUsed || 0) > 80 ? 'text-red-400' : 'text-slate-400')}>
                  {data?.totalBudgetUsed || 0}%
                </span>
              </div>
              {loading ? <Skeleton className="h-2 w-full" /> : (
                <>
                  <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden mb-1.5">
                    <div
                      className={clsx('h-full rounded-full transition-all duration-700', (data?.totalBudgetUsed || 0) >= 90 ? 'bg-red-500' : (data?.totalBudgetUsed || 0) >= 70 ? 'bg-amber-500' : 'bg-green-500')}
                      style={{ width: `${Math.min(100, data?.totalBudgetUsed || 0)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 num">{formatINR(totalSpent)} spent</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Add Expense', icon: Plus, onClick: () => setModalOpen(true), color: 'text-indigo-400', bg: 'bg-indigo-500/10 hover:bg-indigo-500/15 border-indigo-500/20' },
            { label: 'Salary Split', icon: Scissors, href: '/split', color: 'text-amber-400', bg: 'bg-amber-500/10 hover:bg-amber-500/15 border-amber-500/20' },
            { label: 'View Goals', icon: Target, href: '/goals', color: 'text-pink-400', bg: 'bg-pink-500/10 hover:bg-pink-500/15 border-pink-500/20' },
          ].map(({ label, icon: Icon, onClick, href, color, bg }) => (
            href ? (
              <Link key={label} href={href} className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border transition-all ${bg}`}>
                <Icon size={18} className={color} />
                <span className="text-[11px] font-medium text-slate-300 text-center">{label}</span>
              </Link>
            ) : (
              <button key={label} onClick={onClick} className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border transition-all ${bg}`}>
                <Icon size={18} className={color} />
                <span className="text-[11px] font-medium text-slate-300 text-center">{label}</span>
              </button>
            )
          ))}
        </div>

        {/* Envelopes */}
        {(!loading && data?.envelopes && data.envelopes.length > 0) && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-600">Budget Envelopes</p>
              <Link href="/envelopes" className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                View all <ArrowRight size={12} />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {data.envelopes.filter(e => e.category.kind !== 'income').slice(0, 6).map(env => {
                const pct = Math.min(100, env.percentUsed)
                const isOver = pct >= 100
                const isDanger = pct >= 90
                const isWarn = pct >= 70 && !isDanger
                return (
                  <div
                    key={env.id}
                    className={clsx(
                      'bg-[#13131f] border rounded-xl p-3.5 transition-all',
                      isDanger ? 'border-red-500/30 animate-pulse-red' : isWarn ? 'border-amber-500/20' : 'border-white/[0.07] hover:border-white/[0.12]'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="text-[18px]">{env.category.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-white truncate">{env.category.name}</p>
                        <p className="text-[10px] text-slate-600 num">{Math.round(100 - pct)}% left</p>
                      </div>
                    </div>
                    <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden mb-2">
                      <div
                        className={clsx('h-full rounded-full transition-all duration-500', isDanger ? 'bg-red-500' : isWarn ? 'bg-amber-500' : 'bg-green-500')}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between">
                      <span className={clsx('text-[11px] font-semibold num', isDanger ? 'text-red-400' : isWarn ? 'text-amber-400' : 'text-slate-300')}>{formatINR(env.spent)}</span>
                      <span className="text-[10px] text-slate-600 num">/ {formatINR(env.allocated)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Bottom row: Savings + Recent Transactions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Savings */}
          <div className="bg-[#13131f] border border-white/[0.07] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <PiggyBank size={14} className="text-green-400" />
                <p className="text-[10px] uppercase tracking-widest text-slate-600">Savings</p>
              </div>
              <Link href="/savings" className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1">View <ArrowRight size={11} /></Link>
            </div>
            {loading ? <Skeleton className="h-8 w-40 mb-3" /> : (
              <>
                <p className="text-[26px] font-bold text-white num mb-3" style={{ letterSpacing: '-0.03em' }}>{formatINR(data?.savings.total || 0)}</p>
                <div className="space-y-2">
                  {[
                    { label: 'Liquid', val: data?.savings.liquid || 0, color: 'bg-teal-500' },
                    { label: 'Reserved', val: data?.savings.reserved || 0, color: 'bg-pink-500' },
                    { label: 'Locked', val: data?.savings.locked || 0, color: 'bg-green-500' },
                  ].map(seg => (
                    <div key={seg.label} className="flex items-center gap-3">
                      <div className="flex items-center gap-2 w-20 flex-shrink-0">
                        <div className={`w-2 h-2 rounded-full ${seg.color}`} />
                        <span className="text-[11px] text-slate-500">{seg.label}</span>
                      </div>
                      <div className="flex-1 h-1 bg-white/[0.05] rounded-full overflow-hidden">
                        <div className={`h-full ${seg.color} rounded-full`} style={{ width: `${(data?.savings.total || 0) > 0 ? (seg.val / (data?.savings.total || 1)) * 100 : 0}%` }} />
                      </div>
                      <span className="text-[11px] text-slate-400 num w-20 text-right">{formatINR(seg.val)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Recent transactions */}
          <div className="bg-[#13131f] border border-white/[0.07] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-600">Recent Transactions</p>
              <Link href="/transactions" className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1">View all <ArrowRight size={11} /></Link>
            </div>
            {loading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : (data?.recentTransactions?.length || 0) === 0 ? (
              <div className="py-6 text-center">
                <p className="text-slate-500 text-[13px]">No transactions yet</p>
                <button onClick={() => setModalOpen(true)} className="mt-2 text-indigo-400 text-[12px] hover:text-indigo-300">+ Add your first expense</button>
              </div>
            ) : (
              <div className="space-y-1">
                {data?.recentTransactions.map(tx => {
                  const isCredit = tx.type === 'credit'
                  return (
                    <div key={tx.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/[0.03] transition-colors group">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[16px] flex-shrink-0" style={{ backgroundColor: `${tx.category.color}20` }}>
                        {tx.category.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-white truncate">{tx.narration}</p>
                        <p className="text-[10px] text-slate-600">{tx.category.name} · {new Date(tx.occurredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                      </div>
                      <span className={clsx('text-[12px] font-bold num flex-shrink-0', isCredit ? 'text-green-400' : 'text-slate-200')}>
                        {isCredit ? '+' : '-'}{formatINR(tx.amount)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Voice quick add (desktop FAB + modal) */}
      <VoiceQuickAdd onSuccess={fetch_} triggerStart={voiceTrigger} onTriggerConsumed={() => setVoiceTrigger(false)} />

      {/* Desktop-only FAB — + button */}
      <button
        onClick={() => setModalOpen(true)}
        className="hidden md:flex fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 rounded-full items-center justify-center shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 active:scale-95 z-40"
        aria-label="Add transaction"
      >
        <Plus size={22} className="text-white" strokeWidth={2.5} />
      </button>

      <QuickAddModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSuccess={fetch_} />
    </>
  )
}
