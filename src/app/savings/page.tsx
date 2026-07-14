'use client'

import { useState, useEffect, useCallback } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { Plus, X, Check, Droplets, Lock, Bookmark, TrendingUp, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { formatINR } from '@/lib/finance'
import { clsx } from 'clsx'

interface Entry { id: string; amount: number; month: string; note?: string | null }
interface Bucket { id: string; name: string; liquidity: string; balance: number; icon: string; color: string; entries: Entry[] }

export default function SavingsPage() {
  const [buckets, setBuckets] = useState<Bucket[]>([])
  const [summary, setSummary] = useState({ liquid: 0, reserved: 0, locked: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [addAmount, setAddAmount] = useState('')
  const [addNote, setAddNote] = useState('')
  const [expandedEntries, setExpandedEntries] = useState<string | null>(null)
  const [deletingEntry, setDeletingEntry] = useState<string | null>(null)
  const [deletingBucket, setDeletingBucket] = useState<string | null>(null)
  const [confirmDeleteBucket, setConfirmDeleteBucket] = useState<string | null>(null)
  // New bucket form
  const [showNewBucket, setShowNewBucket] = useState(false)
  const [newBucketName, setNewBucketName] = useState('')
  const [newBucketLiquidity, setNewBucketLiquidity] = useState('liquid')
  const [newBucketIcon, setNewBucketIcon] = useState('💰')

  const fetch_ = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/savings')
      const d = await r.json()
      setBuckets(d.buckets || [])
      setSummary(d.summary || {})
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { fetch_() }, [fetch_])

  const handleAdd = async (bucketId: string) => {
    if (!addAmount) return
    await fetch('/api/savings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucketId, amount: parseFloat(addAmount), note: addNote || null }),
    })
    setAddingTo(null); setAddAmount(''); setAddNote(''); fetch_()
  }

  const deleteEntry = async (entryId: string) => {
    setDeletingEntry(entryId)
    try {
      await fetch(`/api/savings?entryId=${entryId}`, { method: 'DELETE' })
      fetch_()
    } finally { setDeletingEntry(null) }
  }

  const deleteBucket = async (bucketId: string) => {
    setDeletingBucket(bucketId)
    try {
      await fetch(`/api/savings?bucketId=${bucketId}`, { method: 'DELETE' })
      setConfirmDeleteBucket(null)
      fetch_()
    } finally { setDeletingBucket(null) }
  }

  const createBucket = async () => {
    if (!newBucketName.trim()) return
    await fetch('/api/savings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_bucket', name: newBucketName, liquidity: newBucketLiquidity, icon: newBucketIcon }),
    })
    setShowNewBucket(false); setNewBucketName(''); setNewBucketIcon('💰'); setNewBucketLiquidity('liquid'); fetch_()
  }

  const liqIcon = (l: string) => l === 'liquid' ? Droplets : l === 'reserved' ? Bookmark : Lock
  const liqColor = (l: string) => l === 'liquid' ? '#14b8a6' : l === 'reserved' ? '#f43f5e' : '#10b981'

  const ICONS = ['💰', '🏦', '📈', '🎯', '✈️', '🏠', '💊', '🎓', '🚗', '📱', '💎', '🛡️']

  return (
    <>
      <TopBar title="Savings" subtitle="Your savings buckets" />
      <div className="flex-1 p-4 md:p-6 pb-32 md:pb-6 space-y-4 max-w-3xl mx-auto w-full">

        {/* Summary */}
        <div className="bg-[#13131f] border border-green-500/15 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-green-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-green-400" />
            <p className="text-[10px] uppercase tracking-widest text-slate-600">Total Savings</p>
          </div>
          <p className="text-[32px] font-black text-white num mb-4" style={{ letterSpacing: '-0.03em' }}>{formatINR(summary.total)}</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Liquid', val: summary.liquid, color: '#14b8a6' },
              { label: 'Reserved', val: summary.reserved, color: '#f43f5e' },
              { label: 'Locked', val: summary.locked, color: '#10b981' },
            ].map(s => (
              <div key={s.label} className="bg-white/[0.03] rounded-xl p-2.5 text-center">
                <div className="w-2 h-2 rounded-full mx-auto mb-1" style={{ backgroundColor: s.color }} />
                <p className="text-[10px] text-slate-600 mb-1">{s.label}</p>
                <p className="text-[13px] font-bold text-white num">{formatINR(s.val)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Buckets */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{[1,2,3,4].map(i => <div key={i} className="h-36 skeleton rounded-2xl" />)}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {buckets.map(bucket => {
              const LiqIcon = liqIcon(bucket.liquidity)
              const lColor = liqColor(bucket.liquidity)
              const isAdding = addingTo === bucket.id
              const isExpanded = expandedEntries === bucket.id
              const isConfirmingDelete = confirmDeleteBucket === bucket.id

              return (
                <div key={bucket.id} className="bg-[#13131f] border border-white/[0.07] rounded-2xl p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: `${bucket.color}20` }}>
                        {bucket.icon}
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-white">{bucket.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <LiqIcon size={11} style={{ color: lColor }} />
                          <span className="text-[10px] capitalize" style={{ color: lColor }}>{bucket.liquidity}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {/* Delete bucket button */}
                      <button
                        onClick={() => setConfirmDeleteBucket(isConfirmingDelete ? null : bucket.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        title="Delete bucket"
                      >
                        <Trash2 size={13} />
                      </button>
                      {/* Add entry button */}
                      <button
                        onClick={() => { setAddingTo(isAdding ? null : bucket.id); setAddAmount(''); setAddNote('') }}
                        className={clsx('w-8 h-8 rounded-xl flex items-center justify-center transition-colors flex-shrink-0', isAdding ? 'bg-red-500/10 text-red-400' : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20')}
                      >
                        {isAdding ? <X size={14} /> : <Plus size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm delete bucket */}
                  {isConfirmingDelete && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl animate-slide-up">
                      <p className="text-[12px] text-red-400 font-medium mb-2">Delete this bucket and all its history?</p>
                      <div className="flex gap-2">
                        <button onClick={() => deleteBucket(bucket.id)} disabled={deletingBucket === bucket.id}
                          className="flex-1 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-[12px] font-semibold rounded-lg transition-colors disabled:opacity-50">
                          {deletingBucket === bucket.id ? 'Deleting...' : 'Yes, Delete'}
                        </button>
                        <button onClick={() => setConfirmDeleteBucket(null)}
                          className="flex-1 py-1.5 bg-white/[0.05] hover:bg-white/[0.08] text-slate-400 text-[12px] font-semibold rounded-lg transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-[24px] font-bold text-white num" style={{ letterSpacing: '-0.03em' }}>{formatINR(bucket.balance)}</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">current balance</p>
                  </div>

                  {isAdding && (
                    <div className="space-y-2 pt-2 border-t border-white/[0.06] animate-slide-up">
                      <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-xl overflow-hidden focus-within:border-indigo-500/50">
                        <span className="px-3 text-slate-500 text-[13px] border-r border-white/[0.08] py-2">₹</span>
                        <input type="number" value={addAmount} onChange={e => setAddAmount(e.target.value)} placeholder="Amount" autoFocus
                          className="flex-1 bg-transparent px-3 py-2 text-[13px] text-white placeholder:text-slate-600 focus:outline-none" />
                      </div>
                      <input value={addNote} onChange={e => setAddNote(e.target.value)} placeholder="Note (optional)"
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-[13px] text-white placeholder:text-slate-600 focus:outline-none" />
                      <button onClick={() => handleAdd(bucket.id)}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5">
                        <Check size={14} /> Add to {bucket.name}
                      </button>
                    </div>
                  )}

                  {/* Entries history with delete */}
                  {bucket.entries.length > 0 && !isAdding && (
                    <div className="pt-2 border-t border-white/[0.06]">
                      <button
                        onClick={() => setExpandedEntries(isExpanded ? null : bucket.id)}
                        className="flex items-center gap-1.5 w-full text-left mb-2"
                      >
                        <p className="text-[10px] uppercase tracking-widest text-slate-600">History ({bucket.entries.length})</p>
                        {isExpanded ? <ChevronUp size={11} className="text-slate-600" /> : <ChevronDown size={11} className="text-slate-600" />}
                      </button>
                      <div className={clsx('space-y-1.5 overflow-hidden transition-all', isExpanded ? 'max-h-64 overflow-y-auto' : 'max-h-20')}>
                        {bucket.entries.slice(0, isExpanded ? undefined : 3).map(e => (
                          <div key={e.id} className="group flex items-center justify-between gap-2 py-0.5">
                            <span className="text-[11px] text-slate-500 flex-1 min-w-0 truncate">
                              {e.note || new Date(e.month).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                            </span>
                            <span className="text-[11px] text-green-400 font-medium num flex-shrink-0">+{formatINR(e.amount)}</span>
                            <button
                              onClick={() => deleteEntry(e.id)}
                              disabled={deletingEntry === e.id}
                              className="w-5 h-5 rounded flex items-center justify-center text-slate-700 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 flex-shrink-0 disabled:opacity-50"
                              title="Delete this entry"
                            >
                              {deletingEntry === e.id ? (
                                <span className="w-3 h-3 border border-red-400/30 border-t-red-400 rounded-full animate-spin-smooth block" />
                              ) : <Trash2 size={11} />}
                            </button>
                          </div>
                        ))}
                        {!isExpanded && bucket.entries.length > 3 && (
                          <p className="text-[10px] text-slate-600 text-center pt-1">+{bucket.entries.length - 3} more — tap to expand</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* New bucket card */}
            {showNewBucket ? (
              <div className="bg-[#13131f] border border-indigo-500/20 rounded-2xl p-5 space-y-3 animate-scale-in">
                <p className="text-[12px] font-semibold text-indigo-400">New Savings Bucket</p>
                {/* Icon picker */}
                <div>
                  <p className="text-[10px] text-slate-600 mb-1.5">Icon</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ICONS.map(ic => (
                      <button key={ic} onClick={() => setNewBucketIcon(ic)}
                        className={clsx('w-8 h-8 rounded-lg text-base transition-all', ic === newBucketIcon ? 'bg-indigo-500/20 border border-indigo-500/40 scale-110' : 'bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08]')}>
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>
                <input value={newBucketName} onChange={e => setNewBucketName(e.target.value)} placeholder="Bucket name (e.g. Emergency Fund)"
                  autoFocus
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-[13px] text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/40" />
                <div>
                  <p className="text-[10px] text-slate-600 mb-1.5">Liquidity</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['liquid', 'reserved', 'locked'] as const).map(l => (
                      <button key={l} onClick={() => setNewBucketLiquidity(l)}
                        className={clsx('py-2 rounded-lg text-[11px] font-medium capitalize transition-all', l === newBucketLiquidity ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30' : 'bg-white/[0.04] text-slate-500 border border-white/[0.06] hover:bg-white/[0.07]')}>
                        {l}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-600 mt-1.5">
                    {newBucketLiquidity === 'liquid' ? 'Can be withdrawn anytime' : newBucketLiquidity === 'reserved' ? 'Reserved for a specific purpose' : 'Locked — long-term or invested'}
                  </p>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={createBucket} disabled={!newBucketName.trim()}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] font-semibold rounded-xl transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5">
                    <Check size={14} /> Create Bucket
                  </button>
                  <button onClick={() => setShowNewBucket(false)}
                    className="w-10 py-2.5 bg-white/[0.05] hover:bg-white/[0.08] text-slate-400 rounded-xl transition-colors flex items-center justify-center">
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowNewBucket(true)}
                className="h-32 bg-[#13131f] border border-dashed border-white/[0.1] rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-indigo-500/30 hover:bg-indigo-500/[0.03] transition-all">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                  <Plus size={18} className="text-indigo-400" />
                </div>
                <p className="text-[12px] text-slate-600">New bucket</p>
              </button>
            )}
          </div>
        )}
      </div>
    </>
  )
}
