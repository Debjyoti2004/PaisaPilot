'use client'

import { useState, useEffect, useCallback } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { QuickAddModal } from '@/components/transactions/QuickAddModal'
import { Plus, ChevronDown, ChevronRight, ArrowUpRight } from 'lucide-react'
import { formatINR } from '@/lib/finance'
import { clsx } from 'clsx'

interface Transaction { id: string; narration: string; amount: number; type: string; occurredAt: string }
interface Envelope {
  id: string
  category: { id: string; name: string; icon: string; color: string; kind: string }
  allocated: number; spent: number; remaining: number; percentUsed: number; rollover: boolean
  recentTransactions: Transaction[]
}

export default function EnvelopesPage() {
  const [envelopes, setEnvelopes] = useState<Envelope[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    try { const r = await fetch('/api/envelopes'); const d = await r.json(); setEnvelopes(d.envelopes || []) }
    catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { fetch_() }, [fetch_])

  const groups = [
    { label: 'Needs', kinds: ['need'], dotColor: 'bg-amber-500' },
    { label: 'Wants', kinds: ['want'], dotColor: 'bg-indigo-500' },
    { label: 'Savings & Investments', kinds: ['save_short', 'invest_long', 'goal'], dotColor: 'bg-green-500' },
  ]

  return (
    <>
      <TopBar title="Envelopes" subtitle="Monthly budget allocation" onAdd={() => setModalOpen(true)} />
      <div className="flex-1 p-4 md:p-6 pb-36 md:pb-6 space-y-5 max-w-3xl mx-auto w-full">
        <div className="flex justify-end">
          <button onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[13px] font-semibold rounded-xl transition-colors">
            <Plus size={15} /> Add Transaction
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 skeleton rounded-2xl" />)}</div>
        ) : envelopes.length === 0 ? (
          <div className="bg-[#13131f] border border-white/[0.07] rounded-2xl py-12 text-center">
            <p className="text-slate-500 text-[13px]">No envelopes yet. Record salary to create envelopes.</p>
          </div>
        ) : (
          groups.map(group => {
            const items = envelopes.filter(e => group.kinds.includes(e.category.kind))
            if (!items.length) return null
            const gSpent = items.reduce((s, e) => s + e.spent, 0)
            const gAllocated = items.reduce((s, e) => s + e.allocated, 0)
            return (
              <div key={group.label}>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${group.dotColor}`} />
                    <p className="text-[11px] uppercase tracking-widest font-semibold text-slate-500">{group.label}</p>
                  </div>
                  <p className="text-[11px] text-slate-600 num">{formatINR(gSpent)} / {formatINR(gAllocated)}</p>
                </div>
                <div className="bg-[#13131f] border border-white/[0.07] rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
                  {items.map(env => {
                    const pct = Math.min(100, env.percentUsed)
                    const isDanger = pct >= 90
                    const isWarn = pct >= 70 && !isDanger
                    const isOpen = expanded === env.id
                    return (
                      <div key={env.id} className={clsx(isDanger && 'border-l-2 border-red-500')}>
                        <button
                          onClick={() => setExpanded(isOpen ? null : env.id)}
                          className="w-full flex items-center gap-3.5 px-4 py-4 hover:bg-white/[0.02] transition-colors text-left"
                        >
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[17px] flex-shrink-0" style={{ backgroundColor: `${env.category.color}20` }}>
                            {env.category.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1.5">
                              <p className="text-[13px] font-medium text-white">{env.category.name}</p>
                              <span className="text-[12px] text-slate-400 num ml-2">{formatINR(env.spent)} / {formatINR(env.allocated)}</span>
                            </div>
                            <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                              <div
                                className={clsx('h-full rounded-full transition-all duration-500', isDanger ? 'bg-red-500' : isWarn ? 'bg-amber-500' : 'bg-green-500')}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <span className={clsx('text-[11px] font-semibold', isDanger ? 'text-red-400' : isWarn ? 'text-amber-400' : 'text-slate-500')}>
                              {Math.round(100 - pct)}% left
                            </span>
                            {isOpen ? <ChevronDown size={14} className="text-slate-600" /> : <ChevronRight size={14} className="text-slate-600" />}
                          </div>
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-4 border-t border-white/[0.04] pt-3 animate-slide-up">
                            <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-2">Recent Transactions</p>
                            {env.recentTransactions.length === 0 ? (
                              <p className="text-slate-600 text-[12px]">No transactions yet</p>
                            ) : (
                              <div className="space-y-1.5">
                                {env.recentTransactions.map(tx => (
                                  <div key={tx.id} className="flex items-center justify-between py-1">
                                    <div>
                                      <p className="text-[12px] text-slate-300">{tx.narration}</p>
                                      <p className="text-[10px] text-slate-600">{new Date(tx.occurredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <ArrowUpRight size={11} className="text-red-400" />
                                      <span className="text-[12px] font-semibold text-white num">{formatINR(tx.amount)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>
      {/* Desktop-only FAB */}
      <button onClick={() => setModalOpen(true)}
        className="hidden md:flex fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 rounded-full items-center justify-center shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 active:scale-95 z-40">
        <Plus size={22} className="text-white" strokeWidth={2.5} />
      </button>
      <QuickAddModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSuccess={fetch_} />
    </>
  )
}
