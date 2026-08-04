'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, ChevronDown, X, Plus, Trash2, Check, CalendarDays, AlertCircle, Pencil } from 'lucide-react'
import { NEEDS_CATS, WANTS_CATS, INV_CATS, ALL_CATS, INCOME_CATS, GROUP_DEFAULT_CAT, catsForGroup } from '@/config/categories'
import { useViewMode } from '@/contexts/ViewContext'

interface Tx {
  id: string; merchant: string; date: string; actualPaidDate?: string | null; category: string; account: string
  amount: number; type: 'income' | 'expense'; tags: string[]; wealthGroup: string | null
}

type Period = 'all-time' | 'this-month' | 'last-month' | 'last-3-months' | 'last-6-months' | 'this-year'
const PERIODS: { value: Period; label: string }[] = [
  { value: 'all-time',      label: 'All time'      },
  { value: 'this-month',    label: 'This month'    },
  { value: 'last-month',    label: 'Last month'    },
  { value: 'last-3-months', label: 'Last 3 months' },
  { value: 'last-6-months', label: 'Last 6 months' },
  { value: 'this-year',     label: 'This year'     },
]

const CATEGORIES = [...ALL_CATS, ...INCOME_CATS, 'Needs review']

const ACCOUNTS = ['Savings Account','Salary Account','Cash','Credit Card','Debit Card']

const GROUP_TABS = [
  { value: '',            label: 'All',         color: 'var(--text-2)',  bg: 'var(--bg)' },
  { value: 'needs',       label: '🏠 Needs',    color: '#6558D3',        bg: '#ede9fe' },
  { value: 'wants',       label: '🛍️ Wants',    color: '#f97316',        bg: '#fff7ed' },
  { value: 'investments', label: '📈 Invest',   color: '#10b981',        bg: '#f0fdf4' },
  { value: 'income',      label: '💰 Income',   color: '#16a34a',        bg: '#f0fdf4' },
]

const GROUP_BTN_META: Record<string, { emoji: string; color: string; bg: string; label: string }> = {
  needs:       { emoji: '🏠', color: '#6558D3', bg: '#ede9fe',  label: 'Needs' },
  wants:       { emoji: '🛍️', color: '#f97316', bg: '#fff7ed',  label: 'Wants' },
  investments: { emoji: '📈', color: '#10b981', bg: '#f0fdf4',  label: 'Investments' },
  income:      { emoji: '💰', color: '#16a34a', bg: '#f0fdf4',  label: 'Income' },
}

function fmtFull(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

function PeriodSelector({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const label = PERIODS.find(p => p.value === value)?.label ?? 'All time'

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('scroll', close, true)
    return () => window.removeEventListener('scroll', close, true)
  }, [open])

  function handleOpen() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 6, left: r.right - 180 })
    }
    setOpen(o => !o)
  }

  return (
    <div style={{ flexShrink: 0 }}>
      <button ref={btnRef} className="period-badge" onClick={handleOpen}>
        <CalendarDays size={14} style={{ color: 'var(--text-3)' }} />
        <span>{label}</span>
        <ChevronDown size={13} style={{ color: 'var(--text-3)' }} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="z-50 animate-slide-down" style={{ position: 'fixed', top: pos.top, left: Math.max(8, pos.left), width: 180, background: '#fff', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
            {PERIODS.map(p => (
              <button key={p.value} onClick={() => { onChange(p.value); setOpen(false) }}
                className="w-full text-left flex items-center gap-2 px-4 py-2.5 transition-colors"
                style={{ fontSize: 13, fontWeight: p.value === value ? 700 : 400, color: p.value === value ? 'var(--violet)' : 'var(--text-1)', background: p.value === value ? 'var(--violet-bg)' : 'transparent', border: 'none', cursor: 'pointer' }}>
                {p.value === value && <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--violet)' }} />}
                {p.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function InlineCategory({ txId, current, wealthGroup, txType, onSave, readOnly }: { txId: string; current: string; wealthGroup?: string | null; txType?: string; onSave: (cat: string) => void; readOnly?: boolean }) {
  const [saving, setSaving] = useState(false)
  const cats = txType === 'income' ? INCOME_CATS : catsForGroup(wealthGroup)
  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value; setSaving(true)
    try {
      await fetch('/api/transactions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: txId, category: val }) })
      onSave(val)
    } catch {}
    setSaving(false)
  }
  if (readOnly) return <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{current}</span>
  return (
    <select value={cats.includes(current) ? current : cats[0]} onChange={handleChange} disabled={saving} className="inline-select" style={{ opacity: saving ? 0.5 : 1 }}>
      {cats.map(c => <option key={c}>{c}</option>)}
    </select>
  )
}

function TagPills({ txId, tags, onUpdate, readOnly }: { txId: string; tags: string[]; onUpdate: (tags: string[]) => void; readOnly?: boolean }) {
  const [modalOpen, setModalOpen] = useState(false)
  async function removeTag(tag: string) {
    const next = tags.filter(t => t !== tag)
    try {
      await fetch('/api/transactions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: txId, tags: next }) })
      onUpdate(next)
    } catch {}
  }
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {tags.map(tag => (
        <span key={tag} className="tag-pill" style={{ fontSize: 11 }}>
          {tag}
          {!readOnly && <button onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--violet)', display: 'flex', alignItems: 'center' }}><X size={10} /></button>}
        </span>
      ))}
      {!readOnly && (
        <button onClick={() => setModalOpen(true)}
          className="flex items-center justify-center rounded-full"
          style={{ width: 22, height: 22, background: 'var(--bg-3)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-3)' }}>
          <Plus size={11} />
        </button>
      )}
      {!readOnly && modalOpen && <AddTagModal txId={txId} currentTags={tags} onSave={updated => { onUpdate(updated); setModalOpen(false) }} onClose={() => setModalOpen(false)} />}
    </div>
  )
}

function AddTagModal({ txId, currentTags, onSave, onClose }: { txId: string; currentTags: string[]; onSave: (tags: string[]) => void; onClose: () => void }) {
  const [allTags, setAllTags] = useState<string[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set(currentTags))
  const [newTag, setNewTag] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    fetch('/api/tags').then(r => r.json()).then(d => setAllTags(d.tags?.map((t: { name: string }) => t.name) ?? []))
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])
  async function handleSave() {
    setSaving(true)
    try {
      await fetch('/api/transactions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: txId, tags: Array.from(selected) }) })
      onSave(Array.from(selected))
    } catch {}
    setSaving(false)
  }
  const toggle = (tag: string) => { setSelected(s => { const n = new Set(s); n.has(tag) ? n.delete(tag) : n.add(tag); return n }) }
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 440 }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>Add tags</h3>
          <button className="btn-ghost" style={{ padding: 6 }} onClick={onClose}><X size={16} /></button>
        </div>
        <div className="px-5 py-4">
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {allTags.map(tag => (
                <button key={tag} onClick={() => toggle(tag)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all"
                  style={{ fontSize: 13, fontWeight: 500, border: '1px solid', borderColor: selected.has(tag) ? 'var(--violet)' : 'var(--border)', background: selected.has(tag) ? 'var(--violet-bg)' : '#fff', color: selected.has(tag) ? 'var(--violet)' : 'var(--text-1)', cursor: 'pointer' }}>
                  {selected.has(tag) && <Check size={12} />}{tag}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input type="text" placeholder="New tag name" value={newTag} onChange={e => setNewTag(e.target.value)} className="form-input flex-1"
              onKeyDown={e => { if (e.key === 'Enter' && newTag.trim()) { setSelected(s => new Set(Array.from(s).concat(newTag.trim()))); setAllTags(p => p.includes(newTag.trim()) ? p : [...p, newTag.trim()]); setNewTag('') } }} />
            <button className="btn-secondary" style={{ padding: '10px 14px' }} onClick={() => { if (newTag.trim()) { setSelected(s => new Set(Array.from(s).concat(newTag.trim()))); setAllTags(p => p.includes(newTag.trim()) ? p : [...p, newTag.trim()]); setNewTag('') } }} disabled={!newTag.trim()}>Add</button>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          <button className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save tags'}</button>
        </div>
      </div>
    </div>
  )
}

function DeleteConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-xl" style={{ background: 'var(--red-bg)', border: '1px solid rgba(220,38,38,0.2)' }}>
      <span style={{ fontSize: 12, color: 'var(--red)' }}>Delete?</span>
      <button onClick={onConfirm} className="btn-primary" style={{ padding: '4px 10px', fontSize: 12, minHeight: 28, background: 'var(--red)' }}>Yes</button>
      <button onClick={onCancel} className="btn-ghost" style={{ padding: '4px 8px', fontSize: 12, minHeight: 28 }}>No</button>
    </div>
  )
}

// ── Inline Edit Row ─────────────────────────────────────────────
interface EditState { merchant: string; amount: string; date: string; account: string; wealthGroup: string | null; category: string }

function InlineEditPanel({ tx, onSave, onCancel }: { tx: Tx; onSave: (fields: EditState) => void; onCancel: () => void }) {
  const isIncome = tx.type === 'income'
  const [fields, setFields] = useState<EditState>({
    merchant: tx.merchant, amount: String(tx.amount), date: tx.date,
    account: tx.account, wealthGroup: tx.wealthGroup, category: tx.category,
  })
  const [saving, setSaving] = useState(false)
  const set = (k: keyof EditState, v: string | null) => setFields(f => ({ ...f, [k]: v ?? '' }))

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/,/g, '').replace(/[^0-9.]/g, '')
    const parts = raw.split('.')
    set('amount', parts.length > 1 ? parts[0] + '.' + parts.slice(1).join('') : parts[0])
  }

  function fmtAmountDisplay(val: string) {
    if (!val) return ''
    const [int, dec] = val.split('.')
    const fmt = (parseInt(int, 10) || 0).toLocaleString('en-IN')
    return dec !== undefined ? `${fmt}.${dec}` : fmt
  }

  function setGroup(g: string | null) {
    setFields(f => ({
      ...f,
      wealthGroup: g,
      category: g ? (GROUP_DEFAULT_CAT as Record<string, string>)[g] ?? f.category : f.category,
    }))
  }

  async function save() {
    setSaving(true)
    try {
      await fetch('/api/transactions', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: tx.id, merchant: fields.merchant, amount: parseFloat(fields.amount),
          date: fields.date, account: fields.account, wealthGroup: fields.wealthGroup,
          category: fields.category,
        }),
      })
      onSave(fields)
    } catch {}
    setSaving(false)
  }

  return (
    <div style={{ padding: '12px 16px 16px', background: 'var(--violet-bg)', borderBottom: '1px solid var(--violet-border)' }}>
      <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginBottom: 12 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Merchant</label>
          <input className="form-input" style={{ height: 36, fontSize: 13 }} value={fields.merchant} onChange={e => set('merchant', e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Amount (₹)</label>
          <input type="text" inputMode="decimal" className="form-input" style={{ height: 36, fontSize: 13 }} value={fmtAmountDisplay(fields.amount)} onChange={handleAmountChange} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Date</label>
          <input type="date" className="form-input" style={{ height: 36, fontSize: 13 }} value={fields.date} onChange={e => set('date', e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Account</label>
          <select className="form-select" style={{ height: 36, fontSize: 13 }} value={fields.account} onChange={e => set('account', e.target.value)}>
            {ACCOUNTS.map(a => <option key={a}>{a}</option>)}
          </select>
        </div>
        {!isIncome && (
          <div>
            <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Wealth group</label>
            <div className="flex gap-1.5">
              {(['needs','wants','investments'] as const).map(g => {
                const m = GROUP_BTN_META[g]!
                const active = fields.wealthGroup === g
                return (
                  <button key={g} className="has-tooltip" data-tip={m.label} onClick={() => setGroup(active ? null : g)} style={{
                    display: 'flex', alignItems: 'center', gap: 4, padding: '5px 9px', borderRadius: 8, fontSize: 12,
                    border: `1.5px solid ${active ? m.color : 'var(--border)'}`,
                    background: active ? m.bg : '#ffffff', color: active ? m.color : 'var(--text-2)',
                    cursor: 'pointer', fontWeight: active ? 700 : 500,
                  }}>
                    {m.emoji} {m.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}
        {/* Income category picker */}
        {isIncome && (
          <div style={{ gridColumn: 'span 3' }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>
              Income category
            </label>
            <div className="relative" style={{ maxWidth: 220 }}>
              <select className="form-select" style={{ height: 36, fontSize: 13 }}
                value={INCOME_CATS.includes(fields.category) ? fields.category : INCOME_CATS[0]}
                onChange={e => setFields(f => ({ ...f, category: e.target.value }))}>
                {INCOME_CATS.map(c => <option key={c}>{c}</option>)}
              </select>
              <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
            </div>
          </div>
        )}
        {!isIncome && fields.wealthGroup && (
          <div style={{ gridColumn: 'span 3' }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>
              Subcategory <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>({fields.wealthGroup})</span>
            </label>
            <div className="relative" style={{ maxWidth: 220 }}>
              <select className="form-select" style={{ height: 36, fontSize: 13 }}
                value={catsForGroup(fields.wealthGroup).includes(fields.category) ? fields.category : catsForGroup(fields.wealthGroup)[0]}
                onChange={e => setFields(f => ({ ...f, category: e.target.value }))}>
                {catsForGroup(fields.wealthGroup).map(c => <option key={c}>{c}</option>)}
              </select>
              <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <button className="btn-secondary" style={{ padding: '7px 14px', fontSize: 13 }} onClick={onCancel}>Cancel</button>
        <button className="btn-primary" style={{ padding: '7px 14px', fontSize: 13 }} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
      </div>
    </div>
  )
}

// ── Transactions Page ──────────────────────────────────────────
export default function TransactionsPage() {
  const { isViewing, viewingUser, accessRevoked } = useViewMode()
  const [txns, setTxns] = useState<Tx[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [period, setPeriod] = useState<Period | null>(null)
  const [search, setSearch] = useState('')
  const [accountFilter, setAccountFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [groupTab, setGroupTab] = useState('')
  const [page, setPage] = useState(1)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async (p: Period, s: string, acc: string, cat: string, type: string, gt: string, pg: number, viewAs?: string, ownerName?: string) => {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams({ period: p, page: String(pg) })
      if (s)      params.set('search', s)
      if (acc)    params.set('account', acc)
      if (cat)    params.set('category', cat)
      if (gt === 'income') params.set('type', 'income')
      else if (gt)         params.set('wealthGroup', gt)
      else if (type)       params.set('type', type)
      if (viewAs) params.set('viewAs', viewAs)
      const res = await fetch(`/api/transactions?${params}`)
      if (res.status === 403) { accessRevoked(ownerName ?? 'user'); return }
      if (!res.ok) throw new Error('Failed')
      const d = await res.json()
      setTxns(d.transactions ?? [])
      setTotal(d.total ?? 0)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally { setLoading(false) }
  }, [accessRevoked])

  useEffect(() => { setPeriod('all-time') }, [])

  useEffect(() => {
    if (period === null) return
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(() => load(period, search, accountFilter, categoryFilter, typeFilter, groupTab, page, viewingUser?.id, viewingUser?.name), 300)
    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current) }
  }, [period, search, accountFilter, categoryFilter, typeFilter, groupTab, page, load, viewingUser?.id])

  useEffect(() => {
    const handler = () => load(period ?? 'all-time', search, accountFilter, categoryFilter, typeFilter, groupTab, 1, viewingUser?.id, viewingUser?.name)
    window.addEventListener('paisapilot:refresh', handler)
    return () => window.removeEventListener('paisapilot:refresh', handler)
  }, [period, search, accountFilter, categoryFilter, typeFilter, groupTab, load, viewingUser?.id])

  const handlePeriodChange = (p: Period) => {
    setPeriod(p); setPage(1)
  }

  const updateTx = (id: string, updates: Partial<Tx>) => setTxns(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))

  async function deleteTx(id: string) {
    try {
      await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' })
      setTxns(prev => prev.filter(t => t.id !== id))
      setTotal(n => n - 1)
    } catch {}
    setDeletingId(null)
  }

  const pageSize = 50
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)' }}>Every entry, one clear view.</h2>
        <p style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 4 }}>Search, filter, categorize and tag your durable records.</p>
      </div>

      {/* Wealth group tabs — horizontal scroll on mobile */}
      <div className="tab-scroll">
        {GROUP_TABS.map(tab => {
          const active = groupTab === tab.value
          return (
            <button key={tab.value} onClick={() => { setGroupTab(tab.value); setPage(1) }} style={{
              padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: active ? 700 : 500,
              border: `1.5px solid ${active ? tab.color : 'var(--border)'}`,
              background: active ? tab.bg : '#ffffff',
              color: active ? tab.color : 'var(--text-2)',
              cursor: 'pointer', transition: 'all .15s', flexShrink: 0,
              whiteSpace: 'nowrap',
            }}>
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="relative">
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
          <input type="text" placeholder="Search merchant, category or tag" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }} className="form-input" style={{ paddingLeft: 36, width: '100%' }} />
        </div>
        <div className="tab-scroll" style={{ gap: 8 }}>
          <div className="relative" style={{ flexShrink: 0 }}>
            <select value={accountFilter} onChange={e => { setAccountFilter(e.target.value); setPage(1) }} className="form-select" style={{ minWidth: 140 }}>
              <option value="">All accounts</option>
              {ACCOUNTS.map(a => <option key={a}>{a}</option>)}
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
          </div>
          {!groupTab && (
            <div className="relative" style={{ flexShrink: 0 }}>
              <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }} className="form-select" style={{ minWidth: 130 }}>
                <option value="">All types</option>
                <option value="income">Income only</option>
                <option value="expense">Expenses only</option>
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
            </div>
          )}
          <div className="relative" style={{ flexShrink: 0 }}>
            <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1) }} className="form-select" style={{ minWidth: 150 }}>
              <option value="">All categories</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
          </div>
          <PeriodSelector value={period ?? 'all-time'} onChange={handlePeriodChange} />
        </div>
      </div>

      {/* Table */}
      <div className="card card-table">
        {error && (
          <div className="flex items-center gap-2 p-4" style={{ background: 'var(--red-bg)', borderBottom: '1px solid var(--orange-border)' }}>
            <AlertCircle size={15} style={{ color: 'var(--red)' }} />
            <p style={{ fontSize: 13, color: 'var(--red)' }}>{error}</p>
          </div>
        )}
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '32%' }}>DATE &amp; MERCHANT</th>
                <th className="hidden sm:table-cell" style={{ width: '16%' }}>CATEGORY</th>
                <th className="hidden sm:table-cell" style={{ width: '14%' }}>ACCOUNT</th>
                <th style={{ width: '20%' }}>TAGS</th>
                <th style={{ width: '14%', textAlign: 'right' }}>AMOUNT</th>
                <th style={{ width: '8%' }}></th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>{[1,2,3,4,5,6].map(j => <td key={j}><div className="skeleton" style={{ height: 16, borderRadius: 6, width: j === 6 ? 28 : '80%' }} /></td>)}</tr>
              ))}
              {!loading && txns.length === 0 && (
                <tr><td colSpan={6}>
                  <div className="empty-state">
                    <div className="empty-state-icon">💳</div>
                    <p style={{ fontSize: 14, color: 'var(--text-2)', fontWeight: 500 }}>No transactions yet</p>
                    <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Use the + Add entry button or import a statement.</p>
                  </div>
                </td></tr>
              )}
              {!loading && txns.map(tx => {
                const wgMeta = tx.wealthGroup
                  ? GROUP_BTN_META[tx.wealthGroup]
                  : (tx.type === 'income' ? GROUP_BTN_META['income'] : null)
                return (
                  <>
                    <tr key={tx.id} style={{ background: editingId === tx.id ? 'var(--violet-bg)' : undefined }}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: 'var(--bg-3)', fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>
                            {tx.merchant[0]?.toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.merchant}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2, flexWrap: 'nowrap', overflow: 'hidden' }}>
                              <p style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                {tx.date}
                                {tx.actualPaidDate && (
                                  <span style={{ color: 'var(--text-3)', opacity: 0.7 }}> (paid {tx.actualPaidDate})</span>
                                )}
                              </p>
                              {wgMeta && (
                                <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 99, background: wgMeta.bg, color: wgMeta.color, border: `1px solid ${wgMeta.color}30`, whiteSpace: 'nowrap', flexShrink: 0 }}>
                                  {wgMeta.emoji} {wgMeta.label}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell">
                        <InlineCategory txId={tx.id} current={tx.category} wealthGroup={tx.wealthGroup} txType={tx.type} onSave={cat => updateTx(tx.id, { category: cat })} readOnly={isViewing} />
                      </td>
                      <td className="hidden sm:table-cell"><span style={{ fontSize: 13, color: 'var(--text-2)' }}>{tx.account}</span></td>
                      <td><TagPills txId={tx.id} tags={tx.tags} onUpdate={tags => updateTx(tx.id, { tags })} readOnly={isViewing} /></td>
                      <td style={{ textAlign: 'right' }}>
                        {deletingId === tx.id ? (
                          <DeleteConfirm onConfirm={() => deleteTx(tx.id)} onCancel={() => setDeletingId(null)} />
                        ) : (
                          <span className="num" style={{ fontSize: 14, fontWeight: 700, color: tx.type === 'income' ? 'var(--green)' : 'var(--text-1)' }}>
                            {tx.type === 'income' ? '+' : '–'}{fmtFull(tx.amount)}
                          </span>
                        )}
                      </td>
                      <td>
                        {!isViewing && (
                          <div className="flex items-center gap-1">
                            <button className="btn-ghost" style={{ padding: 5 }} title="Edit"
                              onClick={() => setEditingId(editingId === tx.id ? null : tx.id)}>
                              <Pencil size={13} style={{ color: editingId === tx.id ? 'var(--violet)' : 'var(--text-3)' }} />
                            </button>
                            {deletingId !== tx.id && (
                              <button className="btn-ghost" style={{ padding: 5 }} onClick={() => setDeletingId(tx.id)}>
                                <Trash2 size={13} style={{ color: 'var(--text-3)' }} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                    {!isViewing && editingId === tx.id && (
                      <tr key={`${tx.id}-edit`}>
                        <td colSpan={6} style={{ padding: 0 }}>
                          <InlineEditPanel
                            tx={tx}
                            onSave={fields => {
                              updateTx(tx.id, {
                                merchant: fields.merchant, amount: parseFloat(fields.amount),
                                date: fields.date, account: fields.account,
                                wealthGroup: fields.wealthGroup,
                                category: fields.category,
                              })
                              setEditingId(null)
                            }}
                            onCancel={() => setEditingId(null)}
                          />
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
              Showing {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button className="btn-secondary" style={{ padding: '7px 14px', fontSize: 13 }} disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
              <button className="btn-secondary" style={{ padding: '7px 14px', fontSize: 13 }} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
