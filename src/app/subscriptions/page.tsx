'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Plus, X, Check, Edit2, Trash2, ChevronDown, RotateCcw } from 'lucide-react'
import { useViewMode } from '@/contexts/ViewContext'
import { DatePicker } from '@/components/DatePicker'

interface Sub {
  id: string; name: string; amount: number; cadence: string
  category: string; nextDate: string; active: boolean
}
interface Suggestion {
  patternKey: string; name: string; amount: number; cadence: string
  category: string; confidence: number; occurrences: number; nextDate: string
}

const CADENCE_LABELS: Record<string, string> = {
  weekly: 'Weekly', biweekly: 'Bi-weekly', monthly: 'Monthly', quarterly: 'Quarterly', annual: 'Annual',
}
const CADENCE_MONTHLY: Record<string, number> = {
  weekly: 4.33, biweekly: 2.17, monthly: 1, quarterly: 1/3, annual: 1/12,
}

function fmtINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}
function toMonthly(p: { amount: number; cadence: string }) {
  return p.amount * (CADENCE_MONTHLY[p.cadence] ?? 1)
}
function confidenceLabel(c: number) {
  if (c >= 0.8) return 'High confidence'
  if (c >= 0.65) return 'Medium confidence'
  return 'Low confidence'
}

// ── Add/Edit Modal ──────────────────────────────────────────────────
function SubModal({ existing, onClose, onSaved }: {
  existing?: Sub | null; onClose: () => void; onSaved: () => void
}) {
  const [mounted, setMounted]   = useState(false)
  const [name, setName]         = useState(existing?.name ?? '')
  const [amount, setAmount]     = useState(existing ? String(existing.amount) : '')
  const [cadence, setCadence]   = useState(existing?.cadence ?? 'monthly')
  const [category, setCategory] = useState(existing?.category ?? 'Subscriptions')
  const [nextDate, setNextDate] = useState(existing?.nextDate ?? new Date().toISOString().slice(0, 10))
  const [saving, setSaving]     = useState(false)
  const [err, setErr]           = useState('')

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/,/g, '').replace(/[^0-9.]/g, '')
    const parts = raw.split('.')
    setAmount(parts.length > 1 ? parts[0] + '.' + parts.slice(1).join('') : parts[0])
  }
  function fmtAmountDisplay(val: string) {
    if (!val) return ''
    const [int, dec] = val.split('.')
    const fmt = (parseInt(int, 10) || 0).toLocaleString('en-IN')
    return dec !== undefined ? `${fmt}.${dec}` : fmt
  }

  async function save() {
    if (!name.trim()) { setErr('Name is required'); return }
    const amt = parseFloat(amount)
    if (!isFinite(amt) || amt <= 0) { setErr('Enter a valid amount'); return }
    setSaving(true); setErr('')
    try {
      const method = existing ? 'PATCH' : 'POST'
      const body = existing
        ? { id: existing.id, name: name.trim(), amount: amt, cadence, category, nextDate, isSubType: true }
        : { name: name.trim(), amount: amt, cadence, category, nextDate, isSubType: true }
      const res = await fetch('/api/recurring', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed')
      onSaved(); onClose()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed')
    } finally { setSaving(false) }
  }

  const CATS = ['Subscriptions', 'Entertainment', 'Utilities', 'Health', 'Shopping', 'Other']

  if (!mounted) return null
  return createPortal(
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 400 }}>
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-1)' }}>{existing ? 'Edit subscription' : 'Add subscription'}</h3>
          <button className="btn-ghost" style={{ padding: 8 }} onClick={onClose}><X size={16} /></button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Service name</label>
            <input type="text" className="form-input" placeholder="Netflix, Spotify, Hotstar…" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Amount (₹)</label>
              <input type="text" inputMode="decimal" className="form-input" placeholder="0" value={fmtAmountDisplay(amount)} onChange={handleAmountChange} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Billing cycle</label>
              <div className="relative">
                <select className="form-select" value={cadence} onChange={e => setCadence(e.target.value)}>
                  {Object.entries(CADENCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Category</label>
              <div className="relative">
                <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
                  {CATS.map(c => <option key={c}>{c}</option>)}
                </select>
                <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Next billing</label>
              <DatePicker value={nextDate} onChange={setNextDate} />
            </div>
          </div>
          {err && <p style={{ fontSize: 13, color: 'var(--red)', background: 'var(--red-bg)', padding: '10px 14px', borderRadius: 8 }}>{err}</p>}
        </div>
        <div className="flex gap-3 px-6 py-4 justify-end" style={{ borderTop: '1px solid var(--border)' }}>
          <button className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : existing ? 'Save' : 'Add subscription'}</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function SubscriptionsPage() {
  const { isViewing, viewingUser, accessRevoked } = useViewMode()
  const [subs, setSubs]             = useState<Sub[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading]       = useState(true)
  const [modalOpen, setModalOpen]   = useState(false)
  const [editing, setEditing]       = useState<Sub | null>(null)
  const [deleteId, setDeleteId]     = useState<string | null>(null)
  const [acting, setActing]         = useState<string | null>(null)
  const [paying, setPaying]         = useState<Set<string>>(new Set())
  const [confirmingPay, setConfirmingPay] = useState<string | null>(null)
  const [useNextMonth, setUseNextMonth]   = useState(false)
  const [payAccount, setPayAccount]       = useState('')
  const [accounts, setAccounts]           = useState<string[]>(['Savings Account','Salary Account','Cash','Credit Card','Debit Card'])

  const load = useCallback(async (viewAs?: string, ownerName?: string) => {
    setLoading(true)
    try {
      const params = viewAs ? `&viewAs=${viewAs}` : ''
      const res = await fetch(`/api/recurring?type=subs${params}`)
      if (res.status === 403) { accessRevoked(ownerName ?? 'user'); return }
      const d = await res.json()
      setSubs(d.payments ?? [])
      setSuggestions((d.suggestions ?? []).filter((s: Suggestion) => s.category === 'Subscriptions' || s.category === 'Entertainment'))
    } catch {} finally { setLoading(false) }
  }, [accessRevoked])

  useEffect(() => {
    load(viewingUser?.id, viewingUser?.name)
    fetch('/api/settings').then(r => r.json()).then(d => {
      try {
        const custom: { name: string }[] = JSON.parse(d.settings?.customAccounts ?? '[]')
        const names = custom.map((c: { name: string }) => c.name)
        const base = ['Savings Account','Salary Account','Cash','Credit Card','Debit Card']
        setAccounts([...base, ...names.filter((n: string) => !base.includes(n))])
      } catch {}
    }).catch(() => {})
  }, [load, viewingUser?.id])

  const active      = subs.filter(s => s.active)
  const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0)
  const dayOfMonth  = new Date().getDate()
  const monthly     = active.reduce((sum, s) => sum + toMonthly(s), 0)
  const yearly   = monthly * 12
  const nearest  = [...active].sort((a, b) => new Date(a.nextDate).getTime() - new Date(b.nextDate).getTime())[0]

  async function deleteSub(id: string) {
    await fetch(`/api/recurring?id=${id}`, { method: 'DELETE' })
    setDeleteId(null); load()
  }

  async function markPaid(id: string, useNextMonthDate: boolean) {
    if (paying.has(id)) return
    setConfirmingPay(null)
    setPaying(prev => new Set(prev).add(id))
    try {
      await fetch('/api/recurring', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'mark-paid', useNextMonthDate, account: payAccount || undefined }),
      })
      await load()
      window.dispatchEvent(new Event('paisapilot:refresh'))
    } finally {
      setPaying(prev => { const s = new Set(prev); s.delete(id); return s })
    }
  }

  async function confirmSuggestion(s: Suggestion) {
    setActing(s.patternKey)
    await fetch('/api/recurring', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: s.name, amount: s.amount, cadence: s.cadence, category: s.category, nextDate: s.nextDate, isSubType: true, patternKey: s.patternKey }),
    })
    await load(); setActing(null)
  }

  async function dismissSuggestion(key: string) {
    setActing(key)
    await fetch(`/api/recurring?patternKey=${encodeURIComponent(key)}`, { method: 'DELETE' })
    setSuggestions(prev => prev.filter(s => s.patternKey !== key))
    setActing(null)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)' }}>Subscriptions</h2>
          <p style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 4 }}>
            Detected from real transaction timing and stable amounts—not names alone.
          </p>
        </div>
        {!isViewing && (
          <button className="btn-primary" style={{ gap: 6, flexShrink: 0 }}
            onClick={() => { setEditing(null); setModalOpen(true) }}>
            <Plus size={15} />Add subscription
          </button>
        )}
      </div>

      {/* Active detection banner */}
      <div style={{
        background: '#1a2035', borderRadius: 14,
        padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <RotateCcw size={16} style={{ color: '#fff' }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Active detection</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
            Weekly, biweekly, monthly, quarterly and annual patterns are checked with amount-variation safeguards.
          </p>
        </div>
        {suggestions.length > 0 && (
          <span style={{
            fontSize: 13, fontWeight: 700, padding: '8px 16px', borderRadius: 99,
            background: 'var(--violet)', color: '#fff', flexShrink: 0,
          }}>
            {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* 3 stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-5" style={{ borderTop: '3px solid #6366f1' }}>
          <p style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>Estimated monthly</p>
          <p className="num" style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-1)', margin: '10px 0 6px' }}>{fmtINR(monthly)}</p>
          <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Confirmed and visible suggestions</p>
          {active.length === 0 && <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8 }}>No trend yet</p>}
        </div>
        <div className="card p-5" style={{ borderTop: '3px solid #10b981' }}>
          <p style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>Estimated annual</p>
          <p className="num" style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-1)', margin: '10px 0 6px' }}>{fmtINR(yearly)}</p>
          <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Monthly equivalent × 12</p>
          {active.length === 0 && <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8 }}>No trend yet</p>}
        </div>
        <div className="card p-5" style={{ borderTop: '3px solid #f59e0b' }}>
          <p style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>Next renewal</p>
          <p className="num" style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', margin: '10px 0 6px' }}>
            {nearest ? nearest.nextDate : '—'}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Nearest confirmed date</p>
          {!nearest && <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8 }}>No trend yet</p>}
        </div>
      </div>

      {loading && <div className="card skeleton" style={{ height: 160 }} />}

      {/* Confirmed subscriptions list */}
      {!loading && active.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Active — {active.length}</h3>
          </div>
          <div>
            {active.map(s => {
              const mo = toMonthly(s)
              const nextDateObj = new Date(s.nextDate + 'T00:00:00')
              const isAlreadyPaid = nextDateObj > todayMidnight
              const buttonDisabled = isAlreadyPaid && dayOfMonth < 25
              const isConfirming = confirmingPay === s.id
              const nextMonthLabel = (() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toLocaleString('en-IN', { month: 'long' }) })()
              return (
                <div key={s.id}>
                <div className="flex items-center gap-4 px-5 py-4" style={{ borderBottom: isConfirming ? 'none' : '1px solid var(--border)' }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                    style={{ background: 'var(--violet-bg)', color: 'var(--violet)', border: '1px solid var(--violet-border)' }}>
                    {s.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>{s.name}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                      {s.category} · {CADENCE_LABELS[s.cadence] ?? s.cadence}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="num" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>{fmtINR(s.amount)}</p>
                    <p style={{ fontSize: 11, color: isAlreadyPaid ? 'var(--green)' : 'var(--text-3)', marginTop: 2 }}>
                      {fmtINR(mo)}/month · {isAlreadyPaid ? `Paid ✓ · next ${s.nextDate}` : `next ${s.nextDate}`}
                    </p>
                  </div>
                  {!isViewing && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        className="btn-ghost"
                        title={
                          paying.has(s.id) ? 'Processing…'
                          : isAlreadyPaid && dayOfMonth < 25 ? 'Paid — available again from 25th'
                          : 'Mark paid'
                        }
                        disabled={buttonDisabled || paying.has(s.id)}
                        onClick={() => { if (!buttonDisabled && !paying.has(s.id)) { setUseNextMonth(false); setConfirmingPay(isConfirming ? null : s.id) } }}
                        style={{
                          padding: 8,
                          color: isAlreadyPaid ? 'var(--green)' : paying.has(s.id) ? 'var(--green)' : buttonDisabled ? 'var(--border)' : isConfirming ? 'var(--violet)' : undefined,
                          cursor: buttonDisabled ? 'not-allowed' : undefined,
                        }}
                      >
                        <Check size={14} />
                      </button>
                      <button className="btn-ghost" style={{ padding: 8 }} onClick={() => { setEditing(s); setModalOpen(true) }}><Edit2 size={14} /></button>
                      {deleteId === s.id ? (
                        <>
                          <button className="btn-ghost" style={{ padding: '6px 10px', fontSize: 12, color: 'var(--red)' }} onClick={() => deleteSub(s.id)}>Delete</button>
                          <button className="btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => setDeleteId(null)}>Cancel</button>
                        </>
                      ) : (
                        <button className="btn-ghost" style={{ padding: 8, color: 'var(--red)' }} onClick={() => setDeleteId(s.id)}><Trash2 size={14} /></button>
                      )}
                    </div>
                  )}
                </div>
                {!isViewing && isConfirming && (
                  <div style={{
                    padding: '12px 20px 14px', background: 'var(--violet-bg)',
                    borderTop: '1px solid var(--violet-border)', borderBottom: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
                  }}>
                    {/* Account selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>Paid from</label>
                      <div className="relative">
                        <select
                          className="form-select"
                          style={{ height: 32, fontSize: 12, paddingRight: 28, minWidth: 150 }}
                          value={payAccount}
                          onChange={e => setPayAccount(e.target.value)}
                        >
                          <option value="">Select account…</option>
                          {accounts.map(a => <option key={a}>{a}</option>)}
                        </select>
                        <ChevronDown size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
                      </div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-1)', flex: 1 }}>
                      <input
                        type="checkbox"
                        checked={useNextMonth}
                        onChange={e => setUseNextMonth(e.target.checked)}
                        style={{ accentColor: 'var(--violet)', width: 15, height: 15 }}
                      />
                      Apply as <strong style={{ color: 'var(--violet)', marginLeft: 4, marginRight: 4 }}>{nextMonthLabel} 1</strong>
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>(actual date saved for bank compare)</span>
                    </label>
                    <div className="flex gap-2 flex-shrink-0">
                      <button className="btn-ghost" style={{ fontSize: 13, padding: '6px 12px' }} onClick={() => setConfirmingPay(null)}>Cancel</button>
                      <button className="btn-primary" style={{ fontSize: 13, padding: '6px 14px', gap: 5 }}
                        onClick={() => markPaid(s.id, useNextMonth)}>
                        <Check size={12} />Confirm paid
                      </button>
                    </div>
                  </div>
                )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {!loading && suggestions.length > 0 && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>Suggestions</h3>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>
            You stay in control—nothing is confirmed automatically
          </p>
          <div className="card overflow-hidden">
            {suggestions.map(s => {
              const mo = toMonthly(s)
              const isActing = acting === s.patternKey
              return (
                <div key={s.patternKey} className="flex items-center gap-4 px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>{s.name}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                      {s.category} · {CADENCE_LABELS[s.cadence] ?? s.cadence} · {s.occurrences} occurrences · {confidenceLabel(s.confidence)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="num" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>{fmtINR(s.amount)}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{fmtINR(mo)}/month · next {s.nextDate}</p>
                  </div>
                  {!isViewing && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button className="btn-ghost" style={{ fontSize: 13, padding: '8px 14px' }}
                        disabled={isActing} onClick={() => dismissSuggestion(s.patternKey)}>
                        Ignore
                      </button>
                      <button className="btn-primary" style={{ fontSize: 13, gap: 5, padding: '8px 16px' }}
                        disabled={isActing} onClick={() => confirmSuggestion(s)}>
                        <Check size={13} />Keep
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && subs.length === 0 && suggestions.length === 0 && (
        <div className="card empty-state" style={{ padding: '48px 24px' }}>
          <p style={{ fontSize: 32 }}>📺</p>
          <p style={{ fontWeight: 600, color: 'var(--text-1)', marginTop: 12 }}>No subscriptions tracked</p>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>Add Netflix, Spotify, gym memberships, and more.</p>
          {!isViewing && (
            <button className="btn-primary" style={{ marginTop: 16, gap: 6 }} onClick={() => { setEditing(null); setModalOpen(true) }}>
              <Plus size={15} />Add subscription
            </button>
          )}
        </div>
      )}

      {!isViewing && modalOpen && (
        <SubModal existing={editing} onClose={() => { setModalOpen(false); setEditing(null) }} onSaved={load} />
      )}
    </div>
  )
}
