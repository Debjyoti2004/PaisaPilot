'use client'

import { useState, useEffect, useCallback } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { Plus, X, Check, Target, TrendingUp, Trash2 } from 'lucide-react'
import { formatINR, requiredMonthly } from '@/lib/finance'
import { clsx } from 'clsx'

interface Goal {
  id: string; name: string; icon: string; color: string
  targetAmount: number; savedAmount: number; percentComplete: number
  deadline: string | null; monthsLeft: number | null; monthlyNeeded: number | null; status: string
}

const ICONS = ['🎯','🏖️','💻','🏠','🚗','✈️','📱','👶','🎓','💒','🏋️','🎸']
const COLORS = ['#6366f1','#10b981','#f43f5e','#f59e0b','#3b82f6','#8b5cf6','#ec4899','#14b8a6']

// suppress unused import warning
const _unused = requiredMonthly

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [addAmount, setAddAmount] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', icon: '🎯', color: '#6366f1', targetAmount: '', deadline: '' })

  const fetch_ = useCallback(async () => {
    setLoading(true)
    try { const r = await fetch('/api/goals'); const d = await r.json(); setGoals(d.goals || []) }
    catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { fetch_() }, [fetch_])

  const handleCreate = async () => {
    if (!form.name || !form.targetAmount) return
    await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, targetAmount: parseFloat(form.targetAmount) }),
    })
    setShowAdd(false)
    setForm({ name: '', icon: '🎯', color: '#6366f1', targetAmount: '', deadline: '' })
    fetch_()
  }

  const handleAddSavings = async (id: string) => {
    if (!addAmount) return
    await fetch('/api/goals', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, amount: parseFloat(addAmount) }) })
    setAddingTo(null); setAddAmount(''); fetch_()
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try {
      await fetch(`/api/goals?id=${id}`, { method: 'DELETE' })
      setConfirmDelete(null)
      fetch_()
    } finally { setDeleting(null) }
  }

  const statusBadge = (s: string) => {
    if (s === 'achieved') return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400">🎉 Achieved</span>
    if (s === 'overdue') return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">Overdue</span>
    return null
  }

  const totalSaved = goals.reduce((s, g) => s + g.savedAmount, 0)
  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0)

  return (
    <>
      <TopBar title="Goals" subtitle="Financial goals tracker" />
      <div className="flex-1 p-4 md:p-6 pb-32 md:pb-6 space-y-4 max-w-3xl mx-auto w-full">

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#13131f] border border-white/[0.07] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2"><TrendingUp size={13} className="text-indigo-400" /><p className="text-[10px] uppercase tracking-widest text-slate-600">Total Saved</p></div>
            <p className="text-[22px] font-bold text-white num">{formatINR(totalSaved)}</p>
          </div>
          <div className="bg-[#13131f] border border-white/[0.07] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2"><Target size={13} className="text-pink-400" /><p className="text-[10px] uppercase tracking-widest text-slate-600">Total Target</p></div>
            <p className="text-[22px] font-bold text-white num">{formatINR(totalTarget)}</p>
          </div>
        </div>

        {/* Add goal button */}
        <button
          onClick={() => setShowAdd(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/[0.05] transition-colors text-[13px] font-medium"
        >
          <Plus size={16} /> Add New Goal
        </button>

        {/* Add goal form */}
        {showAdd && (
          <div className="bg-[#13131f] border border-white/[0.1] rounded-2xl p-5 space-y-4 animate-slide-up">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-white">New Goal</p>
              <button onClick={() => setShowAdd(false)} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-2">Icon</p>
              <div className="flex flex-wrap gap-2">{ICONS.map(ic => (
                <button key={ic} onClick={() => setForm(f => ({ ...f, icon: ic }))}
                  className={clsx('w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all', form.icon === ic ? 'bg-indigo-500/20 border border-indigo-500/40' : 'bg-white/[0.05] hover:bg-white/[0.09]')}>
                  {ic}
                </button>
              ))}</div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-2">Color</p>
              <div className="flex flex-wrap gap-2">{COLORS.map(col => (
                <button key={col} onClick={() => setForm(f => ({ ...f, color: col }))}
                  className={clsx('w-7 h-7 rounded-full transition-all', form.color === col ? 'ring-2 ring-offset-2 ring-offset-[#13131f] ring-white/30 scale-110' : 'hover:scale-105')}
                  style={{ backgroundColor: col }} />
              ))}</div>
            </div>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Goal name (e.g. Goa Trip)"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-[13px] text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-1.5">Target Amount</p>
                <input type="number" value={form.targetAmount} onChange={e => setForm(f => ({ ...f, targetAmount: e.target.value }))} placeholder="50000"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-[13px] text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-1.5">Deadline</p>
                <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-[13px] text-white focus:outline-none focus:border-indigo-500/50" />
              </div>
            </div>
            <button onClick={handleCreate} className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[13px] font-semibold transition-colors">
              Create Goal
            </button>
          </div>
        )}

        {/* Goals list */}
        {loading ? (
          <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-28 skeleton rounded-2xl" />)}</div>
        ) : goals.length === 0 ? (
          <div className="bg-[#13131f] border border-white/[0.07] rounded-2xl py-12 text-center">
            <span className="text-4xl mb-3 block">🎯</span>
            <p className="text-slate-400 text-[13px]">No goals yet. Add your first financial goal!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map(goal => {
              const isAdding = addingTo === goal.id
              const isConfirming = confirmDelete === goal.id
              return (
                <div key={goal.id} className={clsx('bg-[#13131f] border rounded-2xl overflow-hidden transition-all', goal.status === 'achieved' ? 'border-green-500/20' : goal.status === 'overdue' ? 'border-red-500/20' : 'border-white/[0.07]')}>

                  {/* Confirm delete bar */}
                  {isConfirming && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-red-500/[0.08] border-b border-red-500/20 animate-slide-up">
                      <p className="flex-1 text-[12px] text-red-400 font-medium">Delete goal &quot;{goal.name}&quot;? This cannot be undone.</p>
                      <button
                        onClick={() => handleDelete(goal.id)}
                        disabled={deleting === goal.id}
                        className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-[11px] font-bold rounded-lg transition-colors disabled:opacity-50"
                      >
                        {deleting === goal.id ? '...' : 'Delete'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="w-6 h-6 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-slate-400 flex items-center justify-center transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}

                  <div className="p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: `${goal.color}20` }}>
                        {goal.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[14px] font-semibold text-white">{goal.name}</p>
                          {statusBadge(goal.status)}
                        </div>
                        {goal.deadline && (
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {goal.monthsLeft !== null ? `${goal.monthsLeft} months left` : 'No deadline'} · {goal.monthlyNeeded ? `${formatINR(goal.monthlyNeeded)}/mo needed` : ''}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Delete button */}
                        <button
                          onClick={() => setConfirmDelete(isConfirming ? null : goal.id)}
                          className={clsx('w-7 h-7 rounded-lg flex items-center justify-center transition-all', isConfirming ? 'bg-red-500/20 text-red-400' : 'text-slate-600 hover:text-red-400 hover:bg-red-500/10')}
                          title="Delete goal"
                        >
                          <Trash2 size={13} />
                        </button>
                        {/* Add savings button */}
                        <button onClick={() => setAddingTo(isAdding ? null : goal.id)}
                          className={clsx('w-8 h-8 rounded-xl flex items-center justify-center text-[12px] transition-all', isAdding ? 'bg-red-500/10 text-red-400' : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20')}>
                          {isAdding ? <X size={14} /> : <Plus size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="mb-1.5">
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-400 num">{formatINR(goal.savedAmount)}</span>
                        <span className="text-slate-600 num">{formatINR(goal.targetAmount)}</span>
                      </div>
                      <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${goal.percentComplete}%`, backgroundColor: goal.color }} />
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 text-right">{goal.percentComplete}% complete</p>
                    </div>

                    {/* Add savings form */}
                    {isAdding && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-white/[0.06] animate-slide-up">
                        <input
                          type="number"
                          value={addAmount}
                          onChange={e => setAddAmount(e.target.value)}
                          placeholder="Amount to add..."
                          autoFocus
                          className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-[13px] text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50"
                        />
                        <button onClick={() => handleAddSavings(goal.id)}
                          className="w-10 h-10 bg-indigo-600 hover:bg-indigo-500 rounded-xl flex items-center justify-center transition-colors flex-shrink-0">
                          <Check size={16} className="text-white" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
