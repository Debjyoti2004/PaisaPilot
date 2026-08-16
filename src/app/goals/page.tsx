'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, X, Target, TrendingUp, Trash2 } from 'lucide-react'
import { useViewMode } from '@/contexts/ViewContext'
import { DatePicker } from '@/components/DatePicker'

interface Goal {
  id: string; name: string; icon: string; color: string
  targetAmount: number; savedAmount: number; percentComplete: number
  deadline: string | null; monthsLeft: number | null; monthlyNeeded: number | null; status: string
}

const ICONS  = ['🎯','🏖️','💻','🏠','🚗','✈️','📱','👶','🎓','💒','🏋️','🎸']
const COLORS = ['#6558D3','#10b981','#f43f5e','#f59e0b','#3b82f6','#8b5cf6','#ec4899','#14b8a6']

function fmtINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

// ── Add Goal Form ────────────────────────────────────────────────────
function AddGoalModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: '', icon: '🎯', color: '#6558D3', targetAmount: '', deadline: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  async function save() {
    if (!form.name.trim() || !form.targetAmount) { setErr('Name and target amount are required'); return }
    const amt = parseFloat(form.targetAmount)
    if (!isFinite(amt) || amt <= 0) { setErr('Enter a valid target amount'); return }
    setSaving(true); setErr('')
    try {
      const res = await fetch('/api/goals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, targetAmount: amt }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed')
      onSaved(); onClose()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed')
    } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 440 }}>
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-1)' }}>New goal</h3>
          <button className="btn-ghost" style={{ padding: 8 }} onClick={onClose}><X size={16} /></button>
        </div>
        <div className="px-6 py-4 space-y-4">
          {/* Icon */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 8 }}>Icon</label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map(ic => (
                <button key={ic} onClick={() => setForm(f => ({ ...f, icon: ic }))}
                  className="w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all"
                  style={{ background: form.icon === ic ? 'var(--violet-bg)' : 'var(--bg)', border: `1px solid ${form.icon === ic ? 'var(--violet-border)' : 'var(--border)'}` }}>
                  {ic}
                </button>
              ))}
            </div>
          </div>
          {/* Color */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 8 }}>Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(col => (
                <button key={col} onClick={() => setForm(f => ({ ...f, color: col }))}
                  className="w-7 h-7 rounded-full transition-all"
                  style={{ backgroundColor: col, outline: form.color === col ? `3px solid ${col}` : 'none', outlineOffset: 2 }} />
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Goal name</label>
            <input type="text" className="form-input" placeholder="e.g. Goa trip, Emergency fund…"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Target amount (₹)</label>
              <input type="number" className="form-input" placeholder="0"
                value={form.targetAmount} onChange={e => setForm(f => ({ ...f, targetAmount: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Deadline (optional)</label>
              <DatePicker value={form.deadline} onChange={v => setForm(f => ({ ...f, deadline: v }))} />
            </div>
          </div>
          {err && <p style={{ fontSize: 13, color: 'var(--red)', background: 'var(--red-bg)', padding: '10px 14px', borderRadius: 8 }}>{err}</p>}
        </div>
        <div className="flex gap-3 px-6 py-4 justify-end" style={{ borderTop: '1px solid var(--border)' }}>
          <button className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Create goal'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Add savings modal ────────────────────────────────────────────────
function AddSavingsModal({ goal, onClose, onSaved }: { goal: Goal; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  async function save() {
    const amt = parseFloat(amount)
    if (!isFinite(amt) || amt <= 0) { setErr('Enter a valid amount'); return }
    setSaving(true); setErr('')
    try {
      const res = await fetch('/api/goals', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: goal.id, amount: amt }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed')
      onSaved(); onClose()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed')
    } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 340 }}>
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-1)' }}>Add to {goal.name}</h3>
          <button className="btn-ghost" style={{ padding: 8 }} onClick={onClose}><X size={16} /></button>
        </div>
        <div className="px-6 py-4">
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Amount (₹)</label>
          <input type="number" className="form-input" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} />
          {err && <p style={{ fontSize: 13, color: 'var(--red)', marginTop: 8 }}>{err}</p>}
        </div>
        <div className="flex gap-3 px-6 py-4 justify-end" style={{ borderTop: '1px solid var(--border)' }}>
          <button className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Add savings'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Goal Card ────────────────────────────────────────────────────────
function GoalCard({ goal, onAddSavings, onDelete, readOnly }: {
  goal: Goal; onAddSavings: (g: Goal) => void; onDelete: (id: string) => void; readOnly?: boolean
}) {
  const [delConfirm, setDelConfirm] = useState(false)
  const pct = Math.min(100, goal.percentComplete)
  const achieved = goal.status === 'achieved'
  const overdue  = goal.status === 'overdue'

  return (
    <div className="card p-5" style={{ borderTop: `3px solid ${achieved ? 'var(--green)' : overdue ? 'var(--red)' : goal.color}` }}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
            style={{ background: `${goal.color}18`, border: `1px solid ${goal.color}30` }}>
            {goal.icon}
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>{goal.name}</p>
            {achieved && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 99, background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid var(--green-border)' }}>🎉 Achieved!</span>}
            {overdue  && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 99, background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid #fecaca' }}>Overdue</span>}
          </div>
        </div>
        {!readOnly && (
          <div className="flex gap-1">
            <button className="btn-ghost" style={{ padding: 7 }} onClick={() => onAddSavings(goal)}>
              <Plus size={14} />
            </button>
            {delConfirm ? (
              <div className="flex gap-1">
                <button className="btn-ghost" style={{ padding: '5px 8px', fontSize: 11, color: 'var(--red)' }} onClick={() => onDelete(goal.id)}>Delete</button>
                <button className="btn-ghost" style={{ padding: '5px 8px', fontSize: 11 }} onClick={() => setDelConfirm(false)}>Cancel</button>
              </div>
            ) : (
              <button className="btn-ghost" style={{ padding: 7 }} onClick={() => setDelConfirm(true)}><Trash2 size={14} /></button>
            )}
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="flex items-end justify-between mb-2">
        <div>
          <span className="num" style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)' }}>{fmtINR(goal.savedAmount)}</span>
          <span style={{ fontSize: 13, color: 'var(--text-3)', marginLeft: 4 }}>of {fmtINR(goal.targetAmount)}</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: achieved ? 'var(--green)' : goal.color }}>{pct.toFixed(0)}%</span>
      </div>
      <div className="progress-track" style={{ height: 8, borderRadius: 4 }}>
        <div className="progress-fill" style={{ width: `${pct}%`, background: achieved ? 'var(--green)' : goal.color, borderRadius: 4 }} />
      </div>

      {/* Deadline info */}
      {goal.deadline && (
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>
          {goal.monthsLeft !== null && `${goal.monthsLeft} months left`}
          {goal.monthlyNeeded && goal.monthsLeft && goal.monthsLeft > 0 && ` · ${fmtINR(goal.monthlyNeeded)}/mo needed`}
          {!goal.monthsLeft && overdue && 'Deadline passed'}
        </p>
      )}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────
export default function GoalsPage() {
  const { isViewing, viewingUser, accessRevoked } = useViewMode()
  const [goals, setGoals]         = useState<Goal[]>([])
  const [loading, setLoading]     = useState(true)
  const [addOpen, setAddOpen]     = useState(false)
  const [addingTo, setAddingTo]   = useState<Goal | null>(null)

  const load = useCallback(async (viewAs?: string, ownerName?: string) => {
    setLoading(true)
    try {
      const params = viewAs ? `?viewAs=${viewAs}` : ''
      const r = await fetch(`/api/goals${params}`)
      if (r.status === 403) { accessRevoked(ownerName ?? 'user'); return }
      const d = await r.json()
      setGoals(d.goals ?? [])
    } catch {} finally { setLoading(false) }
  }, [accessRevoked])

  useEffect(() => { load(viewingUser?.id, viewingUser?.name) }, [load, viewingUser?.id])

  async function deleteGoal(id: string) {
    await fetch(`/api/goals?id=${id}`, { method: 'DELETE' })
    load()
  }

  const totalSaved  = goals.reduce((s, g) => s + g.savedAmount, 0)
  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0)
  const achieved    = goals.filter(g => g.status === 'achieved').length

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)' }}>Goals</h2>
          <p style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 4 }}>Track your financial milestones — travel, emergency fund, gadgets, and more.</p>
        </div>
        {!isViewing && (
          <button className="btn-primary" style={{ gap: 6, fontSize: 13, padding: '9px 16px', flexShrink: 0 }} onClick={() => setAddOpen(true)}>
            <Plus size={15} />New goal
          </button>
        )}
      </div>

      {/* Summary row */}
      {goals.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-2">
              <TrendingUp size={14} style={{ color: 'var(--green)' }} />
              <p style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total saved</p>
            </div>
            <p className="num" style={{ fontSize: 20, fontWeight: 800, color: 'var(--green)' }}>{fmtINR(totalSaved)}</p>
          </div>
          <div className="card p-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-2">
              <Target size={14} style={{ color: 'var(--violet)' }} />
              <p style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total target</p>
            </div>
            <p className="num" style={{ fontSize: 20, fontWeight: 800, color: 'var(--violet)' }}>{fmtINR(totalTarget)}</p>
          </div>
          <div className="card p-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-2">
              <span style={{ fontSize: 14 }}>🎉</span>
              <p style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Achieved</p>
            </div>
            <p className="num" style={{ fontSize: 20, fontWeight: 800, color: achieved > 0 ? 'var(--green)' : 'var(--text-2)' }}>{achieved}</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="grid sm:grid-cols-2 gap-4">
          {[1,2].map(i => <div key={i} className="card skeleton" style={{ height: 160 }} />)}
        </div>
      )}

      {!loading && goals.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4">
          {goals.map(g => (
            <GoalCard key={g.id} goal={g} onAddSavings={setAddingTo} onDelete={deleteGoal} readOnly={isViewing} />
          ))}
        </div>
      )}

      {!loading && goals.length === 0 && (
        <div className="card empty-state" style={{ padding: '48px 24px' }}>
          <span style={{ fontSize: 36 }}>🎯</span>
          <p style={{ fontWeight: 600, color: 'var(--text-1)', marginTop: 12 }}>No goals yet</p>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4, textAlign: 'center', maxWidth: 300 }}>
            Set a target for your next vacation, emergency fund, or gadget — and watch your progress.
          </p>
          {!isViewing && (
            <button className="btn-primary" style={{ marginTop: 16, gap: 6 }} onClick={() => setAddOpen(true)}>
              <Plus size={15} />Create first goal
            </button>
          )}
        </div>
      )}

      {!isViewing && addOpen    && <AddGoalModal onClose={() => setAddOpen(false)} onSaved={load} />}
      {!isViewing && addingTo   && <AddSavingsModal goal={addingTo} onClose={() => setAddingTo(null)} onSaved={load} />}
    </div>
  )
}
