'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, X, Trash2, Edit2, ChevronDown } from 'lucide-react'

interface Budget { id: string; category: string; monthlyLimit: number; active: boolean; spent: number }

const CATEGORIES = [
  'Housing', 'Groceries', 'Utilities', 'Transportation', 'Insurance', 'Health',
  'Subscriptions', 'Dining', 'Shopping', 'Entertainment', 'Travel', 'Other',
]

function fmtINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

// ── Add / Edit Modal ────────────────────────────────────────────────
function BudgetModal({ existing, usedCategories, onClose, onSaved }: {
  existing?: Budget | null; usedCategories: string[]; onClose: () => void; onSaved: () => void
}) {
  const [category, setCategory] = useState(existing?.category ?? '')
  const [limit, setLimit]       = useState(existing ? String(existing.monthlyLimit) : '')
  const [saving, setSaving]     = useState(false)
  const [err, setErr]           = useState('')

  const availableCats = CATEGORIES.filter(c => !usedCategories.includes(c) || c === existing?.category)

  useEffect(() => {
    if (!existing && availableCats.length > 0 && !category) setCategory(availableCats[0])
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!category) { setErr('Select a category'); return }
    const lmt = parseFloat(limit)
    if (!isFinite(lmt) || lmt <= 0) { setErr('Enter a valid limit'); return }
    setSaving(true); setErr('')
    try {
      const method = existing ? 'PATCH' : 'POST'
      const body = existing
        ? { id: existing.id, monthlyLimit: lmt }
        : { category, monthlyLimit: lmt }
      const res = await fetch('/api/budgets', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed')
      onSaved(); onClose()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed')
    } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 380 }}>
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-1)' }}>{existing ? 'Edit budget' : 'Set budget'}</h3>
          <button className="btn-ghost" style={{ padding: 8 }} onClick={onClose}><X size={16} /></button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Category</label>
            {existing ? (
              <div className="form-input" style={{ background: 'var(--bg)', cursor: 'not-allowed', color: 'var(--text-2)' }}>{existing.category}</div>
            ) : (
              <div className="relative">
                <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
                  <option value="">— choose —</option>
                  {availableCats.map(c => <option key={c}>{c}</option>)}
                </select>
                <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
              </div>
            )}
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Monthly limit (₹)</label>
            <input type="number" className="form-input" placeholder="0" value={limit} onChange={e => setLimit(e.target.value)} />
          </div>
          {err && <p style={{ fontSize: 13, color: 'var(--red)', background: 'var(--red-bg)', padding: '10px 14px', borderRadius: 8 }}>{err}</p>}
        </div>
        <div className="flex gap-3 px-6 py-4 justify-end" style={{ borderTop: '1px solid var(--border)' }}>
          <button className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Set budget'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Budget Card ─────────────────────────────────────────────────────
function BudgetCard({ b, onEdit, onDelete, onToggle }: {
  b: Budget; onEdit: (b: Budget) => void; onDelete: (id: string) => void; onToggle: (id: string, active: boolean) => void
}) {
  const [delConfirm, setDelConfirm] = useState(false)
  const pct   = b.monthlyLimit > 0 ? Math.min(100, (b.spent / b.monthlyLimit) * 100) : 0
  const over  = b.spent > b.monthlyLimit
  const near  = !over && pct >= 80
  const rem   = b.monthlyLimit - b.spent

  const barColor = over ? 'var(--red)' : near ? 'var(--orange)' : 'var(--green)'

  return (
    <div className="card p-5" style={{ opacity: b.active ? 1 : 0.6 }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{b.category}</p>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
            {b.active ? 'Active' : 'Paused'} · monthly
          </p>
        </div>
        <div className="flex gap-1">
          <button className="btn-ghost" style={{ padding: 7 }} onClick={() => onEdit(b)}><Edit2 size={13} /></button>
          {delConfirm ? (
            <div className="flex gap-1">
              <button className="btn-ghost" style={{ padding: '5px 8px', fontSize: 11, color: 'var(--red)' }} onClick={() => onDelete(b.id)}>Delete</button>
              <button className="btn-ghost" style={{ padding: '5px 8px', fontSize: 11 }} onClick={() => setDelConfirm(false)}>Cancel</button>
            </div>
          ) : (
            <button className="btn-ghost" style={{ padding: 7 }} onClick={() => setDelConfirm(true)}><Trash2 size={13} /></button>
          )}
        </div>
      </div>

      <div className="flex items-end justify-between mb-2">
        <div>
          <span className="num" style={{ fontSize: 22, fontWeight: 800, color: over ? 'var(--red)' : 'var(--text-1)' }}>{fmtINR(b.spent)}</span>
          <span style={{ fontSize: 13, color: 'var(--text-3)', marginLeft: 4 }}>of {fmtINR(b.monthlyLimit)}</span>
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: barColor }}>
          {pct.toFixed(0)}%
        </span>
      </div>

      <div className="progress-track" style={{ height: 8, borderRadius: 4 }}>
        <div className="progress-fill" style={{ width: `${pct}%`, background: barColor, borderRadius: 4 }} />
      </div>

      <div className="flex items-center justify-between mt-3">
        <p style={{ fontSize: 12, color: over ? 'var(--red)' : 'var(--text-3)', fontWeight: over ? 600 : 400 }}>
          {over
            ? `₹${Math.abs(rem).toLocaleString('en-IN')} over budget`
            : near
            ? `Only ₹${rem.toLocaleString('en-IN')} left`
            : `₹${rem.toLocaleString('en-IN')} remaining`
          }
        </p>
        <button
          className="btn-ghost" style={{ padding: '4px 10px', fontSize: 11, color: b.active ? 'var(--text-3)' : 'var(--violet)' }}
          onClick={() => onToggle(b.id, !b.active)}
        >
          {b.active ? 'Pause' : 'Resume'}
        </button>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────
export default function BudgetsPage() {
  const [budgets, setBudgets]   = useState<Budget[]>([])
  const [loading, setLoading]   = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]   = useState<Budget | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/budgets')
      const d = await res.json()
      setBudgets(d.budgets ?? [])
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function deleteBudget(id: string) {
    await fetch(`/api/budgets?id=${id}`, { method: 'DELETE' })
    load()
  }

  async function toggleBudget(id: string, active: boolean) {
    await fetch('/api/budgets', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, active }) })
    load()
  }

  const active   = budgets.filter(b => b.active)
  const overBudget = active.filter(b => b.spent > b.monthlyLimit)
  const usedCats = budgets.map(b => b.category)
  const totalBudgeted = active.reduce((s, b) => s + b.monthlyLimit, 0)
  const totalSpent    = active.reduce((s, b) => s + b.spent, 0)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)' }}>Budgets</h2>
          <p style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 4 }}>Set monthly limits per category and track how you&apos;re doing.</p>
        </div>
        <button className="btn-primary" style={{ gap: 6, fontSize: 13, padding: '9px 16px', flexShrink: 0 }} onClick={() => { setEditing(null); setModalOpen(true) }}>
          <Plus size={15} />Set budget
        </button>
      </div>

      {/* Over-budget alert */}
      {overBudget.length > 0 && (
        <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: 'var(--red-bg)', border: '1px solid #fecaca' }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <p style={{ fontSize: 14, color: 'var(--red)', fontWeight: 600 }}>
            {overBudget.map(b => b.category).join(', ')} {overBudget.length === 1 ? 'is' : 'are'} over budget this month.
          </p>
        </div>
      )}

      {/* Summary */}
      {active.length > 0 && (
        <div className="card p-5">
          <div className="flex items-end justify-between mb-2">
            <div>
              <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Total spent vs budgeted</p>
              <p style={{ marginTop: 4 }}>
                <span className="num" style={{ fontSize: 22, fontWeight: 800, color: totalSpent > totalBudgeted ? 'var(--red)' : 'var(--text-1)' }}>{fmtINR(totalSpent)}</span>
                <span style={{ fontSize: 13, color: 'var(--text-3)', marginLeft: 4 }}>of {fmtINR(totalBudgeted)}</span>
              </p>
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: totalSpent > totalBudgeted ? 'var(--red)' : 'var(--green)' }}>
              {totalBudgeted > 0 ? `${((totalSpent / totalBudgeted) * 100).toFixed(0)}%` : '0%'}
            </span>
          </div>
          <div className="progress-track" style={{ height: 10, borderRadius: 5 }}>
            <div className="progress-fill" style={{
              width: `${Math.min(100, totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0)}%`,
              background: totalSpent > totalBudgeted ? 'var(--red)' : 'var(--violet)',
              borderRadius: 5,
            }} />
          </div>
        </div>
      )}

      {loading && <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="card skeleton" style={{ height: 160 }} />)}</div>}

      {/* Budget grid */}
      {!loading && budgets.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {active.map(b => (
            <BudgetCard key={b.id} b={b} onEdit={b => { setEditing(b); setModalOpen(true) }} onDelete={deleteBudget} onToggle={toggleBudget} />
          ))}
          {budgets.filter(b => !b.active).map(b => (
            <BudgetCard key={b.id} b={b} onEdit={b => { setEditing(b); setModalOpen(true) }} onDelete={deleteBudget} onToggle={toggleBudget} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && budgets.length === 0 && (
        <div className="card empty-state" style={{ padding: '48px 24px' }}>
          <span style={{ fontSize: 36 }}>🎯</span>
          <p style={{ fontWeight: 600, color: 'var(--text-1)', marginTop: 12 }}>No budgets set</p>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4, textAlign: 'center', maxWidth: 300 }}>
            Set monthly limits for Groceries, Dining, Shopping and more. You&apos;ll get alerts when you approach the limit.
          </p>
          <button className="btn-primary" style={{ marginTop: 16, gap: 6 }} onClick={() => { setEditing(null); setModalOpen(true) }}>
            <Plus size={15} />Set your first budget
          </button>
        </div>
      )}

      {modalOpen && (
        <BudgetModal
          existing={editing}
          usedCategories={usedCats}
          onClose={() => { setModalOpen(false); setEditing(null) }}
          onSaved={load}
        />
      )}
    </div>
  )
}
