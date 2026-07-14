'use client'

import { useState, useEffect, useCallback } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { QuickAddModal } from '@/components/transactions/QuickAddModal'
import { VoiceQuickAdd } from '@/components/transactions/VoiceQuickAdd'
import { Plus, Search, TrendingUp, TrendingDown, Minus, Trash2, X } from 'lucide-react'
import { formatINR } from '@/lib/finance'
import { clsx } from 'clsx'

interface Transaction {
  id: string; narration: string; amount: number; type: string; occurredAt: string; note?: string | null
  categoryId: string
  category: { id: string; name: string; icon: string; color: string; kind: string }
}

function groupByDate(txns: Transaction[]) {
  const groups: Record<string, Transaction[]> = {}
  const today = new Date(); today.setHours(0,0,0,0)
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
  txns.forEach(tx => {
    const d = new Date(tx.occurredAt); d.setHours(0,0,0,0)
    let label: string
    if (d.getTime() === today.getTime()) label = 'Today'
    else if (d.getTime() === yesterday.getTime()) label = 'Yesterday'
    else label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined })
    if (!groups[label]) groups[label] = []
    groups[label].push(tx)
  })
  return groups
}

export default function TransactionsPage() {
  const [txns, setTxns] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTx, setEditTx] = useState<Transaction | null>(null)
  const [voiceTrigger, setVoiceTrigger] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'debit' | 'credit'>('all')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const now = new Date()
  const monthParam = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const fetch_ = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams({ month: monthParam })
      if (search) p.set('search', search)
      const r = await fetch(`/api/transactions?${p}`)
      const d = await r.json()
      setTxns(d.transactions || [])
    } catch {}
    finally { setLoading(false) }
  }, [monthParam, search])

  useEffect(() => {
    const t = setTimeout(fetch_, search ? 300 : 0)
    return () => clearTimeout(t)
  }, [fetch_, search])

  const deleteTx = async (id: string) => {
    setDeleting(id)
    try {
      await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
      setConfirmDelete(null)
      fetch_()
    } finally { setDeleting(null) }
  }

  const filtered = txns.filter(t => typeFilter === 'all' || t.type === typeFilter)
  const groups = groupByDate(filtered)
  const totalIn = txns.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0)
  const totalOut = txns.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0)
  const net = totalIn - totalOut

  return (
    <>
      <TopBar
        title="Transactions"
        subtitle={now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        onAdd={() => { setEditTx(null); setModalOpen(true) }}
        onVoice={() => setVoiceTrigger(true)}
      />
      <div className="flex-1 p-4 md:p-6 pb-36 md:pb-6 space-y-4 max-w-3xl mx-auto w-full">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#13131f] border border-green-500/10 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <TrendingUp size={12} className="text-green-400" />
              <p className="text-[10px] uppercase tracking-widest text-slate-600">Income</p>
            </div>
            <p className="text-[15px] font-bold text-green-400 num">{formatINR(totalIn)}</p>
          </div>
          <div className="bg-[#13131f] border border-red-500/10 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <TrendingDown size={12} className="text-red-400" />
              <p className="text-[10px] uppercase tracking-widest text-slate-600">Spent</p>
            </div>
            <p className="text-[15px] font-bold text-red-400 num">{formatINR(totalOut)}</p>
          </div>
          <div className="bg-[#13131f] border border-white/[0.07] rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Minus size={12} className="text-slate-400" />
              <p className="text-[10px] uppercase tracking-widest text-slate-600">Net</p>
            </div>
            <p className={clsx('text-[15px] font-bold num', net >= 0 ? 'text-green-400' : 'text-red-400')}>{net >= 0 ? '+' : ''}{formatINR(net)}</p>
          </div>
        </div>

        {/* Search + filters */}
        <div className="flex gap-2.5">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search transactions..."
              className="w-full pl-9 pr-3 py-2.5 bg-[#13131f] border border-white/[0.08] rounded-xl text-[13px] text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
          </div>
          <div className="flex gap-1 p-1 bg-[#13131f] border border-white/[0.08] rounded-xl">
            {(['all', 'debit', 'credit'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={clsx('px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all', typeFilter === t ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-500 hover:text-slate-300')}
              >
                {t === 'all' ? 'All' : t === 'debit' ? 'Expense' : 'Income'}
              </button>
            ))}
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="w-10 h-10 bg-indigo-600 hover:bg-indigo-500 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
          >
            <Plus size={18} className="text-white" />
          </button>
        </div>

        {/* Transaction list */}
        {loading ? (
          <div className="space-y-2">{[1,2,3,4,5].map(i => (
            <div key={i} className="h-14 skeleton rounded-xl" />
          ))}</div>
        ) : filtered.length === 0 ? (
          <div className="bg-[#13131f] border border-white/[0.07] rounded-2xl py-12 text-center">
            <p className="text-slate-500 text-[13px]">{search ? `No results for "${search}"` : 'No transactions yet'}</p>
            {!search && <button onClick={() => setModalOpen(true)} className="mt-2 text-indigo-400 text-[12px]">+ Add first transaction</button>}
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groups).map(([date, items]) => {
              const dayTotal = items.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0)
              return (
                <div key={date}>
                  <div className="flex items-center justify-between px-1 mb-2">
                    <p className="text-[11px] font-semibold text-slate-500">{date}</p>
                    <p className="text-[11px] text-slate-600 num">-{formatINR(dayTotal)}</p>
                  </div>
                  <div className="bg-[#13131f] border border-white/[0.07] rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
                    {items.map(tx => {
                      const isCredit = tx.type === 'credit'
                      const isConfirming = confirmDelete === tx.id

                      return (
                        <div key={tx.id} className="group">
                          {/* Confirm delete bar */}
                          {isConfirming && (
                            <div className="flex items-center gap-3 px-4 py-3 bg-red-500/[0.08] border-b border-red-500/20 animate-slide-up">
                              <p className="flex-1 text-[12px] text-red-400 font-medium">Delete &quot;{tx.narration}&quot;?</p>
                              <button
                                onClick={() => deleteTx(tx.id)}
                                disabled={deleting === tx.id}
                                className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-[11px] font-bold rounded-lg transition-colors disabled:opacity-50"
                              >
                                {deleting === tx.id ? '...' : 'Delete'}
                              </button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="w-6 h-6 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-slate-400 flex items-center justify-center transition-colors"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          )}

                          <div className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-white/[0.02] transition-colors">
                            {/* Tap to edit */}
                            <button
                              onClick={() => { setEditTx(tx); setModalOpen(true) }}
                              className="flex items-center gap-3.5 flex-1 min-w-0 text-left"
                            >
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[17px] flex-shrink-0" style={{ backgroundColor: `${tx.category.color}20` }}>
                                {tx.category.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-medium text-white truncate">{tx.narration}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md" style={{ backgroundColor: `${tx.category.color}15`, color: tx.category.color }}>{tx.category.name}</span>
                                  <span className="text-[10px] text-slate-600">{new Date(tx.occurredAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              </div>
                              <div className="flex flex-col items-end flex-shrink-0">
                                <span className={clsx('text-[14px] font-bold num', isCredit ? 'text-green-400' : 'text-white')}>
                                  {isCredit ? '+' : '-'}{formatINR(tx.amount)}
                                </span>
                              </div>
                            </button>
                            {/* Delete button — visible on hover (desktop) / always visible (mobile) */}
                            <button
                              onClick={() => setConfirmDelete(isConfirming ? null : tx.id)}
                              className={clsx(
                                'w-7 h-7 rounded-lg flex items-center justify-center transition-all flex-shrink-0',
                                isConfirming
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'text-slate-700 hover:text-red-400 hover:bg-red-500/10 opacity-100 md:opacity-0 md:group-hover:opacity-100'
                              )}
                              title="Delete transaction"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Voice (desktop FAB + modal; mobile triggered from TopBar) */}
      <VoiceQuickAdd onSuccess={fetch_} triggerStart={voiceTrigger} onTriggerConsumed={() => setVoiceTrigger(false)} />

      {/* Desktop-only + FAB */}
      <button onClick={() => { setEditTx(null); setModalOpen(true) }}
        className="hidden md:flex fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 rounded-full items-center justify-center shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 active:scale-95 z-40">
        <Plus size={22} className="text-white" strokeWidth={2.5} />
      </button>

      <QuickAddModal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditTx(null) }} onSuccess={fetch_} transaction={editTx} />
    </>
  )
}
