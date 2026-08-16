'use client'

import { useState, useEffect, useCallback, useRef, Suspense, Fragment } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, ChevronDown, X, Plus, Trash2, Check, CalendarDays, AlertCircle, Pencil, ArrowLeftRight } from 'lucide-react'
import { NEEDS_CATS, WANTS_CATS, INV_CATS, ALL_CATS, INCOME_CATS, GROUP_DEFAULT_CAT, catsForGroup } from '@/config/categories'
import { useViewMode } from '@/contexts/ViewContext'
import { Portal } from '@/components/Portal'
import { DatePicker } from '@/components/DatePicker'

interface Tx {
  id: string; merchant: string; date: string; actualPaidDate?: string | null; category: string; account: string
  amount: number; type: 'income' | 'expense'; tags: string[]; wealthGroup: string | null
  isTransfer?: boolean; cardPaid?: boolean
}

type Period = 'all-time' | 'this-month' | 'last-month' | 'last-3-months' | 'last-6-months' | 'this-year' | 'custom'
const PERIODS: { value: Period; label: string }[] = [
  { value: 'all-time',      label: 'All time'      },
  { value: 'this-month',    label: 'This month'    },
  { value: 'last-month',    label: 'Last month'    },
  { value: 'last-3-months', label: 'Last 3 months' },
  { value: 'last-6-months', label: 'Last 6 months' },
  { value: 'this-year',     label: 'This year'     },
  { value: 'custom',        label: 'Custom range'  },
]

const CATEGORIES = [...ALL_CATS, ...INCOME_CATS, 'Needs review']


type CustomCats = { needs: string[]; wants: string[]; investments: string[] }
const EMPTY_CUSTOM_CATS: CustomCats = { needs: [], wants: [], investments: [] }
async function fetchCustomCats(): Promise<CustomCats> {
  try {
    const res = await fetch('/api/user-categories')
    if (res.ok) return await res.json()
  } catch {}
  return EMPTY_CUSTOM_CATS
}

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

function PeriodSelector({
  value, onChange, customRange, onCustomRange,
}: {
  value: Period; onChange: (p: Period) => void
  customRange: { start: string; end: string }
  onCustomRange: (r: { start: string; end: string }) => void
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const [tempRange, setTempRange] = useState(customRange)
  const btnRef = useRef<HTMLButtonElement>(null)

  const label = value === 'custom' && customRange.start && customRange.end
    ? `${customRange.start} → ${customRange.end}`
    : (PERIODS.find(p => p.value === value)?.label ?? 'All time')

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('scroll', close, true)
    return () => window.removeEventListener('scroll', close, true)
  }, [open])

  function handleOpen() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 6, left: r.right - 220 })
    }
    setTempRange(customRange)
    setOpen(o => !o)
  }

  return (
    <div style={{ flexShrink: 0 }}>
      <button ref={btnRef} className="period-badge" onClick={handleOpen}>
        <CalendarDays size={14} style={{ color: 'var(--text-3)' }} />
        <span style={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        <ChevronDown size={13} style={{ color: 'var(--text-3)' }} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="z-50 animate-slide-down" style={{ position: 'fixed', top: pos.top, left: Math.max(8, pos.left), width: 220, background: '#fff', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
            {PERIODS.map(p => (
              <button key={p.value} onClick={() => { onChange(p.value); if (p.value !== 'custom') setOpen(false) }}
                className="w-full text-left flex items-center gap-2 px-4 py-2.5 transition-colors"
                style={{ fontSize: 13, fontWeight: p.value === value ? 700 : 400, color: p.value === value ? 'var(--violet)' : 'var(--text-1)', background: p.value === value ? 'var(--violet-bg)' : 'transparent', border: 'none', cursor: 'pointer' }}>
                {p.value === value && <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--violet)' }} />}
                {p.label}
              </button>
            ))}
            {value === 'custom' && (
              <div style={{ padding: '10px 12px 12px', borderTop: '1px solid var(--border)', background: 'var(--violet-bg)' }}>
                <div style={{ marginBottom: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 3 }}>From</label>
                  <DatePicker compact value={tempRange.start} max={tempRange.end || undefined}
                    onChange={v => setTempRange(r => ({ ...r, start: v }))} placeholder="Start date" />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 3 }}>To</label>
                  <DatePicker compact value={tempRange.end} min={tempRange.start || undefined}
                    onChange={v => setTempRange(r => ({ ...r, end: v }))} placeholder="End date" />
                </div>
                <button className="btn-primary" style={{ width: '100%', padding: '7px', fontSize: 12 }}
                  disabled={!tempRange.start || !tempRange.end}
                  onClick={() => { onCustomRange(tempRange); setOpen(false) }}>
                  Apply range
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function InlineCategory({ txId, current, wealthGroup, txType, onSave, readOnly, customCats }: { txId: string; current: string; wealthGroup?: string | null; txType?: string; onSave: (cat: string) => void; readOnly?: boolean; customCats?: CustomCats }) {
  const [saving, setSaving] = useState(false)
  const builtinCats = txType === 'income' ? INCOME_CATS : catsForGroup(wealthGroup)
  const groupKey = wealthGroup as keyof CustomCats | null
  const extraCats = groupKey && customCats?.[groupKey] ? customCats[groupKey] : []
  const cats = [...builtinCats, ...extraCats]
  const allCats = cats.includes(current) ? cats : [...cats, current]
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
    <select value={current} onChange={handleChange} disabled={saving} className="inline-select" style={{ opacity: saving ? 0.5 : 1 }}>
      {allCats.map(c => <option key={c}>{c}</option>)}
    </select>
  )
}

function TagPills({ txId, tags, onUpdate, readOnly, onOpenModal }: { txId: string; tags: string[]; onUpdate: (tags: string[]) => void; readOnly?: boolean; onOpenModal?: () => void }) {
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
        <button onClick={onOpenModal}
          className="flex items-center justify-center rounded-full"
          style={{ width: 22, height: 22, background: 'var(--bg-3)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-3)' }}>
          <Plus size={11} />
        </button>
      )}
    </div>
  )
}

function AddTagModal({ txId, currentTags, onSave, onClose }: { txId: string; currentTags: string[]; onSave: (tags: string[]) => void; onClose: () => void }) {
  const [allTags, setAllTags] = useState<string[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set(currentTags))
  const [newTag, setNewTag] = useState('')
  const [saving, setSaving] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

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

  async function deleteTag(tag: string, e: React.MouseEvent) {
    e.stopPropagation()
    try {
      await fetch(`/api/tags?name=${encodeURIComponent(tag)}`, { method: 'DELETE' })
      setAllTags(p => p.filter(t => t !== tag))
      setSelected(s => { const n = new Set(s); n.delete(tag); return n })
    } catch {}
  }

  function addNewTag(name: string) {
    const t = name.trim()
    if (!t) return
    setSelected(s => new Set(Array.from(s).concat(t)))
    setAllTags(p => p.includes(t) ? p : [...p, t])
    setNewTag('')
  }

  // Autocomplete: tags that match input
  const suggestions = newTag.trim()
    ? allTags.filter(t => t.toLowerCase().includes(newTag.trim().toLowerCase())).slice(0, 6)
    : []

  // Reset highlight when suggestions change
  useEffect(() => { setHighlightedIndex(-1) }, [newTag])

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 480, width: '100%' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>Add tags</h3>
          <button className="btn-ghost" style={{ padding: 6 }} onClick={onClose}><X size={16} /></button>
        </div>
        <div className="px-5 py-4">
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {allTags.map(tag => (
                <button key={tag} onClick={() => toggle(tag)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all"
                  style={{
                    fontSize: 13, fontWeight: 500, border: '1px solid',
                    borderColor: selected.has(tag) ? 'var(--violet)' : 'var(--border)',
                    background: selected.has(tag) ? 'var(--violet-bg)' : '#fff',
                    color: selected.has(tag) ? 'var(--violet)' : 'var(--text-1)',
                    cursor: 'pointer',
                  }}>
                  {selected.has(tag) && <Check size={12} />}
                  <span>{tag}</span>
                  <span onClick={e => deleteTag(tag, e)} title="Delete tag"
                    style={{ display: 'flex', alignItems: 'center', marginLeft: 1, padding: '1px 2px', borderRadius: 4, color: 'var(--text-3)', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}>
                    <X size={11} />
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Input with autocomplete */}
          <div style={{ position: 'relative' }}>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type to search or create tag…"
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                className="form-input flex-1"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    setHighlightedIndex(i => Math.min(i + 1, suggestions.length - 1))
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    setHighlightedIndex(i => Math.max(i - 1, -1))
                  } else if (e.key === 'Enter') {
                    e.preventDefault()
                    if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
                      toggle(suggestions[highlightedIndex]); setNewTag('')
                    } else if (suggestions.length > 0 && allTags.find(t => t.toLowerCase() === newTag.trim().toLowerCase())) {
                      toggle(suggestions[0]); setNewTag('')
                    } else {
                      addNewTag(newTag)
                    }
                  } else if (e.key === 'Escape') {
                    setNewTag('')
                  }
                }}
              />
              <button className="btn-secondary" style={{ padding: '10px 14px' }}
                onClick={() => addNewTag(newTag)} disabled={!newTag.trim()}>
                Add
              </button>
            </div>
            {suggestions.length > 0 && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 56,
                background: '#fff', border: '1px solid var(--border)', borderRadius: 10,
                boxShadow: 'var(--shadow-lg)', zIndex: 10, overflow: 'hidden',
              }}>
                {suggestions.map((s, idx) => (
                  <button key={s} onClick={() => { toggle(s); setNewTag('') }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className="w-full text-left"
                    style={{
                      padding: '9px 14px', fontSize: 13, border: 'none', cursor: 'pointer',
                      background: idx === highlightedIndex ? 'var(--violet)' : selected.has(s) ? 'var(--violet-bg)' : '#fff',
                      color: idx === highlightedIndex ? '#fff' : selected.has(s) ? 'var(--violet)' : 'var(--text-1)',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                    {selected.has(s) ? <Check size={12} style={{ flexShrink: 0 }} /> : <span style={{ width: 12, flexShrink: 0 }} />}
                    {s}
                  </button>
                ))}
              </div>
            )}
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
  const [ownMerchants, setOwnMerchants] = useState<string[]>([])
  const [merchantSuggestions, setMerchantSuggestions] = useState<string[]>([])
  const [merchantOpen, setMerchantOpen] = useState(false)
  const [merchantHighlight, setMerchantHighlight] = useState(-1)
  const merchantTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const [customCats, setCustomCats] = useState<CustomCats>(EMPTY_CUSTOM_CATS)
  useEffect(() => { fetchCustomCats().then(setCustomCats) }, [])

  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([])
  useEffect(() => {
    fetch('/api/merchants').then(r => r.json()).then(d => setOwnMerchants(d.merchants ?? []))
    fetch('/api/fin-accounts').then(r => r.json()).then(d => setAccounts(d.accounts ?? []))
  }, [])
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
          date: fields.date, account: fields.account,
          accountId: accounts.find(a => a.name === fields.account)?.id ?? undefined,
          wealthGroup: fields.wealthGroup,
          category: fields.category,
        }),
      })
      onSave(fields)
      window.dispatchEvent(new Event('paisapilot:refresh'))
    } catch {}
    setSaving(false)
  }

  return (
    <div style={{ padding: '12px 16px 16px', background: 'var(--violet-bg)', borderBottom: '1px solid var(--violet-border)' }}>
      <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginBottom: 12 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Merchant</label>
          <div className="relative">
            <input
              type="text"
              className="form-input"
              style={{ height: 36, fontSize: 13 }}
              value={fields.merchant}
              onChange={e => {
                const val = e.target.value
                set('merchant', val)
                setMerchantOpen(true)
                setMerchantHighlight(-1)
                const q = val.trim().toLowerCase()
                const localMatches = q ? ownMerchants.filter(m => m.toLowerCase().includes(q)).slice(0, 6) : []
                setMerchantSuggestions(localMatches)
                clearTimeout(merchantTimerRef.current)
                if (q.length >= 2) {
                  merchantTimerRef.current = setTimeout(() => {
                    fetch(`/api/merchants?q=${encodeURIComponent(q)}`)
                      .then(r => r.json())
                      .then(d => {
                        const server: string[] = d.merchants ?? []
                        const seen = new Set(localMatches.map(m => m.toLowerCase()))
                        setMerchantSuggestions([...localMatches, ...server.filter(m => !seen.has(m.toLowerCase()))].slice(0, 8))
                      })
                      .catch(() => {})
                  }, 280)
                }
              }}
              onFocus={() => setMerchantOpen(true)}
              onBlur={() => setTimeout(() => setMerchantOpen(false), 150)}
              onKeyDown={e => {
                if (!merchantOpen || merchantSuggestions.length === 0) return
                if (e.key === 'ArrowDown') { e.preventDefault(); setMerchantHighlight(h => Math.min(h + 1, merchantSuggestions.length - 1)) }
                else if (e.key === 'ArrowUp') { e.preventDefault(); setMerchantHighlight(h => Math.max(h - 1, -1)) }
                else if (e.key === 'Enter' && merchantHighlight >= 0) { e.preventDefault(); set('merchant', merchantSuggestions[merchantHighlight]); setMerchantOpen(false); setMerchantHighlight(-1) }
                else if (e.key === 'Escape') setMerchantOpen(false)
              }}
              autoComplete="off"
              spellCheck={true}
              placeholder="Merchant"
            />
            {merchantOpen && merchantSuggestions.length > 0 && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                background: '#fff', border: '1px solid var(--border)', borderRadius: 10,
                boxShadow: 'var(--shadow-lg)', zIndex: 50, overflow: 'hidden',
              }}>
                {merchantSuggestions.map((m, i) => (
                  <div
                    key={m}
                    onMouseDown={() => { set('merchant', m); setMerchantOpen(false); setMerchantHighlight(-1) }}
                    onMouseEnter={() => setMerchantHighlight(i)}
                    style={{
                      padding: '8px 12px', fontSize: 13, cursor: 'pointer',
                      background: i === merchantHighlight ? 'var(--violet)' : 'transparent',
                      color: i === merchantHighlight ? '#fff' : 'var(--text-1)',
                    }}
                  >
                    {m}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Amount (₹)</label>
          <input type="text" inputMode="decimal" className="form-input" style={{ height: 36, fontSize: 13 }} value={fmtAmountDisplay(fields.amount)} onChange={handleAmountChange} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Date</label>
          <DatePicker compact value={fields.date} onChange={v => set('date', v)} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Account</label>
          <select className="form-select" style={{ height: 36, fontSize: 13 }} value={fields.account} onChange={e => set('account', e.target.value)}>
            {accounts.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
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
              {(() => {
                const groupKey = fields.wealthGroup as keyof CustomCats
                const builtins = catsForGroup(fields.wealthGroup)
                const customs = customCats[groupKey] ?? []
                const allGroupCats = [...builtins, ...customs]
                const opts = allGroupCats.includes(fields.category) ? allGroupCats : [...allGroupCats, fields.category]
                return (
                  <select className="form-select" style={{ height: 36, fontSize: 13 }}
                    value={fields.category}
                    onChange={e => setFields(f => ({ ...f, category: e.target.value }))}>
                    {opts.map(c => <option key={c}>{c}</option>)}
                  </select>
                )
              })()}
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
function TransactionsPage() {
  const { isViewing, viewingUser, accessRevoked } = useViewMode()
  const searchParams = useSearchParams()
  const [txns, setTxns] = useState<Tx[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [period, setPeriod] = useState<Period | null>(null)
  const [customRange, setCustomRange] = useState({ start: '', end: '' })
  const [search, setSearch] = useState('')
  const [accountFilter, setAccountFilter] = useState(() => searchParams.get('accountId') ?? searchParams.get('account') ?? '')
  const [categoryFilter, setCategoryFilter] = useState(() => searchParams.get('category') ?? '')
  const [typeFilter, setTypeFilter] = useState(() => searchParams.get('type') ?? '')
  const [groupTab, setGroupTab] = useState('')
  const [page, setPage] = useState(1)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [tagModal, setTagModal] = useState<{ txId: string; tags: string[] } | null>(null)
  const [finAccounts, setFinAccounts] = useState<{ id: string; name: string }[]>([])
  const [customCats, setCustomCats] = useState<CustomCats>(EMPTY_CUSTOM_CATS)
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetchCustomCats().then(setCustomCats)
    fetch('/api/fin-accounts')
      .then(r => r.ok ? r.json() : Promise.resolve({ accounts: [] }))
      .then(d => { if (d.accounts?.length) setFinAccounts(d.accounts) })
      .catch(() => {})
  }, [])

  const load = useCallback(async (p: Period, s: string, acc: string, cat: string, type: string, gt: string, pg: number, viewAs?: string, ownerName?: string, cr?: { start: string; end: string }) => {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams({ period: p, page: String(pg) })
      if (s)      params.set('search', s)
      // accountFilter can be an accountId (cuid) or legacy account name
      if (acc) {
        // If it looks like a cuid (starts with 'c' and is long), use accountId
        if (/^c[a-z0-9]{20,}$/i.test(acc)) params.set('accountId', acc)
        else params.set('account', acc)
      }
      if (cat)    params.set('category', cat)
      if (gt === 'income') params.set('type', 'income')
      else if (gt)         params.set('wealthGroup', gt)
      else if (type)       params.set('type', type)
      if (viewAs) params.set('viewAs', viewAs)
      if (p === 'custom' && cr?.start && cr?.end) {
        params.set('startDate', cr.start)
        params.set('endDate', cr.end)
      }
      const res = await fetch(`/api/transactions?${params}`)
      if (res.status === 403) { accessRevoked(ownerName ?? 'user'); return }
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? 'Failed') }
      const d = await res.json()
      const txList = d.transactions ?? []
      setTxns(txList)
      setTotal(d.total ?? 0)
      // Build filter account list from loaded transactions as fallback
      setFinAccounts(prev => {
        if (prev.length > 0) return prev // fin-accounts already loaded
        const seen = new Map<string, string>()
        for (const t of txList) {
          const key = t.accountId ?? t.account
          if (key && !seen.has(key)) seen.set(key, t.account)
        }
        return Array.from(seen.entries()).map(([id, name]) => ({ id, name }))
      })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally { setLoading(false) }
  }, [accessRevoked])

  useEffect(() => { setPeriod('this-month') }, [])

  useEffect(() => {
    if (period === null) return
    if (period === 'custom' && (!customRange.start || !customRange.end)) return
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(() => load(period, search, accountFilter, categoryFilter, typeFilter, groupTab, page, viewingUser?.id, viewingUser?.name, customRange), 300)
    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current) }
  }, [period, search, accountFilter, categoryFilter, typeFilter, groupTab, page, load, viewingUser?.id, customRange])

  useEffect(() => {
    const handler = () => load(period ?? 'this-month', search, accountFilter, categoryFilter, typeFilter, groupTab, 1, viewingUser?.id, viewingUser?.name, customRange)
    window.addEventListener('paisapilot:refresh', handler)
    return () => window.removeEventListener('paisapilot:refresh', handler)
  }, [period, search, accountFilter, categoryFilter, typeFilter, groupTab, load, viewingUser?.id, customRange])

  // Clear selections when filters change
  useEffect(() => {
    setSelectedIds(new Set())
  }, [period, accountFilter, categoryFilter, typeFilter, groupTab, search])

  const handlePeriodChange = (p: Period) => {
    setPeriod(p); setPage(1)
    setSelectedIds(new Set())
  }

  const handleCustomRange = (range: { start: string; end: string }) => {
    setCustomRange(range)
    setPage(1)
    setSelectedIds(new Set())
  }

  const updateTx = (id: string, updates: Partial<Tx>) => setTxns(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))

  async function deleteTx(id: string) {
    try {
      await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' })
      setTxns(prev => prev.filter(t => t.id !== id))
      setTotal(n => n - 1)
      setSelectedIds(s => { const n = new Set(s); n.delete(id); return n })
      window.dispatchEvent(new Event('paisapilot:refresh'))
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
            <button key={tab.value} onClick={() => { setGroupTab(tab.value); setCategoryFilter(''); setPage(1) }} style={{
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
              {finAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
          </div>
          {!groupTab && (
            <div className="relative" style={{ flexShrink: 0 }}>
              <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }} className="form-select" style={{ minWidth: 130 }}>
                <option value="">All types</option>
                <option value="income">Income only</option>
                <option value="expense">Expenses only</option>
                <option value="transfer">Transfers only</option>
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
            </div>
          )}
          <div className="relative" style={{ flexShrink: 0 }}>
            {(() => {
              let baseCats: string[]
              if (groupTab === 'needs')       baseCats = [...NEEDS_CATS, ...customCats.needs]
              else if (groupTab === 'wants')  baseCats = [...WANTS_CATS, ...customCats.wants]
              else if (groupTab === 'investments') baseCats = [...INV_CATS, ...customCats.investments]
              else if (groupTab === 'income') baseCats = [...INCOME_CATS]
              else baseCats = [...CATEGORIES, ...customCats.needs, ...customCats.wants, ...customCats.investments]
              // Also include any unique categories from loaded transactions (covers DB cats not in localStorage)
              const txCats = txns.map(t => t.category).filter(Boolean)
              const extraFromTxns = txCats.filter(c => !baseCats.includes(c))
              const filterCats = [...baseCats, ...Array.from(new Set(extraFromTxns))]
              return (
                <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1) }} className="form-select" style={{ minWidth: 150 }}>
                  <option value="">All categories</option>
                  {filterCats.map(c => <option key={c}>{c}</option>)}
                </select>
              )
            })()}
            <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
          </div>
          <PeriodSelector value={period ?? 'this-month'} onChange={handlePeriodChange} customRange={customRange} onCustomRange={handleCustomRange} />
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
                <th style={{ width: '4%', paddingRight: 0, textAlign: 'center' }}>
                  <input type="checkbox" style={{ cursor: 'pointer', accentColor: 'var(--violet)', width: 15, height: 15 }}
                    checked={txns.length > 0 && txns.every(t => selectedIds.has(t.id))}
                    ref={el => { if (el) el.indeterminate = selectedIds.size > 0 && !txns.every(t => selectedIds.has(t.id)) }}
                    onChange={e => {
                      if (e.target.checked) setSelectedIds(new Set(txns.map(t => t.id)))
                      else setSelectedIds(new Set())
                    }}
                  />
                </th>
                <th style={{ width: '29%' }}>DATE &amp; MERCHANT</th>
                <th className="hidden sm:table-cell" style={{ width: '16%' }}>CATEGORY</th>
                <th className="hidden sm:table-cell" style={{ width: '13%' }}>ACCOUNT</th>
                <th style={{ width: '18%' }}>TAGS</th>
                <th style={{ width: '14%', textAlign: 'right' }}>AMOUNT</th>
                <th style={{ width: '6%' }}></th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>{[1,2,3,4,5,6,7].map(j => <td key={j}><div className="skeleton" style={{ height: 16, borderRadius: 6, width: j === 7 ? 28 : '80%' }} /></td>)}</tr>
              ))}
              {!loading && txns.length === 0 && (
                <tr><td colSpan={7}>
                  <div className="empty-state">
                    <div className="empty-state-icon">💳</div>
                    <p style={{ fontSize: 14, color: 'var(--text-2)', fontWeight: 500 }}>No transactions yet</p>
                    <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Use the + Add entry button or import a statement.</p>
                  </div>
                </td></tr>
              )}
              {!loading && txns.map((tx, idx) => {
                const wgMeta = tx.wealthGroup
                  ? GROUP_BTN_META[tx.wealthGroup]
                  : (tx.type === 'income' ? GROUP_BTN_META['income'] : null)
                const monthKey = tx.date.slice(0, 7)
                const showMonthHeader = period === 'all-time' && (idx === 0 || monthKey !== txns[idx - 1].date.slice(0, 7))
                return (
                  <Fragment key={tx.id}>
                    {showMonthHeader && (
                      <tr>
                        <td colSpan={7} style={{ padding: '12px 16px 8px', background: 'var(--bg-2)', borderBottom: '1px solid var(--border)', borderTop: idx > 0 ? '2px solid var(--border)' : undefined }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            {new Date(monthKey + '-15').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                          </span>
                        </td>
                      </tr>
                    )}
                    <tr style={{ background: editingId === tx.id ? 'var(--violet-bg)' : selectedIds.has(tx.id) ? 'var(--violet-bg)' : undefined }}>
                      <td style={{ paddingRight: 0, textAlign: 'center' }}>
                        <input type="checkbox" style={{ cursor: 'pointer', accentColor: 'var(--violet)', width: 15, height: 15 }}
                          checked={selectedIds.has(tx.id)}
                          onChange={e => setSelectedIds(s => {
                            const n = new Set(s)
                            e.target.checked ? n.add(tx.id) : n.delete(tx.id)
                            return n
                          })}
                        />
                      </td>
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
                              {tx.isTransfer && (
                                <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 99, background: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.25)', whiteSpace: 'nowrap', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                  <ArrowLeftRight size={9} />Transfer
                                </span>
                              )}
                              {!tx.isTransfer && wgMeta && (
                                <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 99, background: wgMeta.bg, color: wgMeta.color, border: `1px solid ${wgMeta.color}30`, whiteSpace: 'nowrap', flexShrink: 0 }}>
                                  {wgMeta.emoji} {wgMeta.label}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell">
                        <InlineCategory txId={tx.id} current={tx.category} wealthGroup={tx.wealthGroup} txType={tx.type} onSave={cat => updateTx(tx.id, { category: cat })} readOnly={isViewing} customCats={customCats} />
                      </td>
                      <td className="hidden sm:table-cell"><span style={{ fontSize: 13, color: 'var(--text-2)' }}>{tx.account}</span></td>
                      <td><TagPills txId={tx.id} tags={tx.tags} onUpdate={tags => updateTx(tx.id, { tags })} readOnly={isViewing} onOpenModal={() => setTagModal({ txId: tx.id, tags: tx.tags })} /></td>
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
                            {/* Card Paid toggle — only for credit card expense transactions */}
                            {!tx.isTransfer && tx.type === 'expense' && tx.account?.toLowerCase().includes('card') && (
                              <button
                                className="btn-ghost"
                                style={{ padding: '3px 6px', borderRadius: 6, fontSize: 10, fontWeight: 700, border: `1px solid ${tx.cardPaid ? '#16a34a40' : 'var(--border)'}`, background: tx.cardPaid ? '#16a34a15' : 'transparent', color: tx.cardPaid ? '#16a34a' : 'var(--text-3)', whiteSpace: 'nowrap' }}
                                title={tx.cardPaid ? 'Mark as unpaid' : 'Mark card bill as paid'}
                                onClick={async () => {
                                  const next = !tx.cardPaid
                                  updateTx(tx.id, { cardPaid: next })
                                  await fetch('/api/transactions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: tx.id, cardPaid: next }) })
                                }}
                              >
                                {tx.cardPaid ? '✓ Paid' : 'Mark Paid'}
                              </button>
                            )}
                            {!tx.isTransfer && (
                              <button className="btn-ghost" style={{ padding: 5 }} title="Edit"
                                onClick={() => setEditingId(editingId === tx.id ? null : tx.id)}>
                                <Pencil size={13} style={{ color: editingId === tx.id ? 'var(--violet)' : 'var(--text-3)' }} />
                              </button>
                            )}
                            {deletingId !== tx.id && (
                              <button className="btn-ghost" style={{ padding: 5 }} title={tx.isTransfer ? 'Delete both legs' : 'Delete'} onClick={() => setDeletingId(tx.id)}>
                                <Trash2 size={13} style={{ color: 'var(--text-3)' }} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                    {!isViewing && editingId === tx.id && (
                      <tr key={`${tx.id}-edit`}>
                        <td colSpan={7} style={{ padding: 0 }}>
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
                  </Fragment>
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

      {/* Tag modal — portalled to document.body so it paints above sidebar/topbar */}
      {tagModal && (
        <Portal>
          <AddTagModal
            txId={tagModal.txId}
            currentTags={tagModal.tags}
            onSave={updated => { updateTx(tagModal.txId, { tags: updated }); setTagModal(null) }}
            onClose={() => setTagModal(null)}
          />
        </Portal>
      )}

      {/* Selection total bar */}
      {selectedIds.size > 0 && (() => {
        const sel = txns.filter(t => selectedIds.has(t.id))
        const selIncome = sel.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
        const selExpenses = sel.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
        const selNet = selIncome - selExpenses
        return (
          <div style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            background: '#1e1b4b', borderRadius: 16, padding: '12px 20px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center',
            gap: 14, zIndex: 50, maxWidth: 'calc(100vw - 40px)', flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', whiteSpace: 'nowrap' }}>
              {selectedIds.size} selected
            </span>
            <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
            {selIncome > 0 && (
              <span style={{ fontSize: 13, fontWeight: 600, color: '#4ade80', whiteSpace: 'nowrap' }}>
                +{fmtFull(selIncome)}
              </span>
            )}
            {selExpenses > 0 && (
              <span style={{ fontSize: 13, fontWeight: 600, color: '#fb923c', whiteSpace: 'nowrap' }}>
                −{fmtFull(selExpenses)}
              </span>
            )}
            {(selIncome > 0 || selExpenses > 0) && (
              <>
                <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 800, color: selNet >= 0 ? '#4ade80' : '#f87171', whiteSpace: 'nowrap' }}>
                  Net {selNet >= 0 ? '+' : '−'}{fmtFull(Math.abs(selNet))}
                </span>
              </>
            )}
            <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
            <button onClick={() => setSelectedIds(new Set())} style={{
              background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8,
              padding: '4px 10px', cursor: 'pointer', color: '#94a3b8', fontSize: 12,
              display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500,
            }}>
              <X size={12} /> Clear
            </button>
          </div>
        )
      })()}
    </div>
  )
}

export default function TransactionsPageWrapper() {
  return (
    <Suspense>
      <TransactionsPage />
    </Suspense>
  )
}
