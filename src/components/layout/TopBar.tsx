'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Cloud, Upload, Plus, X, Tag, ChevronDown, Bell } from 'lucide-react'
import NotificationPanel from './NotificationPanel'
import { INCOME_CATS } from '@/config/categories'
import { useViewMode } from '@/contexts/ViewContext'
import { DatePicker } from '@/components/DatePicker'

interface TopBarProps {
  title: string
  subtitle?: string
  onAdd?: () => void
  onVoice?: () => void
}

export function TopBar({ title, subtitle }: TopBarProps) {
  const { isViewing, revokedMsg } = useViewMode()
  const [addOpen, setAddOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [unread, setUnread] = useState(0)

  const fetchUnread = useCallback(async () => {
    try {
      const r = await fetch('/api/notifications')
      const d = await r.json()
      const count = (d.notifications || []).filter((n: { read: boolean }) => !n.read).length
      setUnread(count)
    } catch {}
  }, [])

  useEffect(() => { fetchUnread() }, [fetchUnread])

  return (
    <>
      <div
        className="sticky top-0 z-30 flex items-center justify-between topbar-inner"
        style={{ height: 64, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)' }}
      >
        {/* Page title */}
        <div className="topbar-title" style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          {/* Logo — mobile only */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon.svg" alt="PaisaPilot" className="topbar-logo" style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            {subtitle && (
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-3)', marginBottom: 1 }}>
                {subtitle}
              </p>
            )}
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.2 }}>{title}</h1>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center topbar-actions">
          {/* Notifications */}
          <button
            className="relative btn-ghost topbar-btn"
            onClick={() => { setNotifOpen(o => !o); setUnread(0) }}
            aria-label="Notifications"
          >
            <Bell size={16} style={{ color: 'var(--text-2)' }} />
            {unread > 0 && (
              <span
                className="absolute rounded-full flex items-center justify-center"
                style={{ top: 4, right: 4, width: 14, height: 14, background: 'var(--violet)', fontSize: 8, fontWeight: 700, color: '#fff' }}
              >
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {!isViewing && (
            <>
              {/* Drive sync — desktop only */}
              <button
                className="btn-secondary topbar-desktop-btn"
                onClick={() => window.location.href = '/settings#drive'}
              >
                <Cloud size={15} style={{ color: 'var(--text-2)' }} />
                <span className="top-bar-label">Drive sync</span>
              </button>

              {/* Import — desktop only */}
              <button
                className="btn-secondary topbar-desktop-btn"
                onClick={() => window.location.href = '/documents?import=1'}
              >
                <Upload size={15} style={{ color: 'var(--text-2)' }} />
                <span className="top-bar-label">Import</span>
              </button>

              {/* Add entry */}
              <button
                className="btn-primary topbar-add-btn"
                onClick={() => setAddOpen(true)}
              >
                <Plus size={16} />
                <span className="top-bar-label">Add entry</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Apple glass notification panel */}
      <NotificationPanel isOpen={notifOpen} onClose={() => setNotifOpen(false)} />

      {addOpen && <AddEntryModal onClose={() => setAddOpen(false)} />}

      {revokedMsg && (
        <div
          style={{
            position: 'fixed', top: 72, left: '50%', transform: 'translateX(-50%)', zIndex: 200,
            background: '#1e1e2e', color: '#fff', padding: '12px 20px', borderRadius: 12,
            fontSize: 14, fontWeight: 500, boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
            display: 'flex', alignItems: 'center', gap: 10, maxWidth: 'calc(100vw - 32px)',
            whiteSpace: 'nowrap',
          }}
        >
          <span>⚠️</span>
          <span>{revokedMsg}</span>
        </div>
      )}
    </>
  )
}

/* ── Add Entry Modal ─────────────────────────────────────── */
type EntryType = 'expense' | 'income'
type WealthGroup = 'needs' | 'wants' | 'investments'

const BASE_GROUP_CATS: Record<WealthGroup, string[]> = {
  needs:       ['Housing','Groceries','Utilities','Transportation','Insurance','Health','Subscriptions'],
  wants:       ['Dining','Shopping','Entertainment','Travel','Other'],
  investments: ['Mutual Funds','Stocks','EPF/NPS','Gold','Fixed Deposits','Debt Funds'],
}
const GROUP_LABELS: Record<WealthGroup, { label: string; emoji: string; color: string }> = {
  needs:       { label: 'Needs',       emoji: '🏠', color: '#6558D3' },
  wants:       { label: 'Wants',       emoji: '🛍️', color: '#f97316' },
  investments: { label: 'Investments', emoji: '📈', color: '#10b981' },
}
const ACCOUNTS = ['Savings Account','Salary Account','Cash','Credit Card','Debit Card']
const LS_KEY = 'pp_custom_cats'
const CUSTOM_SENTINEL = '__custom__'

type CustomCats = Record<WealthGroup, string[]>

function loadCustomCats(): CustomCats {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw) as CustomCats
  } catch {}
  return { needs: [], wants: [], investments: [] }
}
function saveCustomCat(group: WealthGroup, name: string) {
  const stored = loadCustomCats()
  if (!stored[group].includes(name)) {
    stored[group] = [...stored[group], name]
    localStorage.setItem(LS_KEY, JSON.stringify(stored))
  }
}

function AddEntryModal({ onClose }: { onClose: () => void }) {
  const receiptRef = useRef<HTMLInputElement>(null)
  const [type, setType] = useState<EntryType>('expense')
  const [group, setGroup] = useState<WealthGroup | null>(null)
  const [amount, setAmount] = useState('')

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

  const [merchant, setMerchant] = useState('')
  const [ownMerchants, setOwnMerchants] = useState<string[]>([])
  const [merchantSuggestions, setMerchantSuggestions] = useState<string[]>([])
  const [merchantHighlight, setMerchantHighlight] = useState(-1)
  const [merchantOpen, setMerchantOpen] = useState(false)
  const merchantTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [category, setCategory] = useState('')
  const [incomeCategory, setIncomeCategory] = useState('Salary')
  const [customInput, setCustomInput] = useState('')
  const [account, setAccount] = useState('Savings Account')
  const [tag, setTag] = useState('')
  const [allTags, setAllTags] = useState<string[]>([])
  const [tagHighlight, setTagHighlight] = useState(-1)
  const [tagOpen, setTagOpen] = useState(false)
  const [hasReceipt, setHasReceipt] = useState(false)
  const [receiptName, setReceiptName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [customCats, setCustomCats] = useState<CustomCats>({ needs: [], wants: [], investments: [] })

  const tagSuggestions = tag.trim()
    ? allTags.filter(t => t.toLowerCase().includes(tag.trim().toLowerCase())).slice(0, 6)
    : []

  useEffect(() => { setTagHighlight(-1) }, [tag])

  useEffect(() => {
    setCustomCats(loadCustomCats())
    fetch('/api/tags').then(r => r.json()).then(d => setAllTags(d.tags?.map((t: { name: string }) => t.name) ?? []))
    fetch('/api/merchants').then(r => r.json()).then(d => setOwnMerchants(d.merchants ?? []))
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Reset category when group changes
  useEffect(() => {
    if (group) { setCategory(BASE_GROUP_CATS[group][0]); setCustomInput('') }
  }, [group])

  function handleTypeChange(t: EntryType) {
    setType(t)
    if (t === 'income') { setGroup(null); setCategory('Income') }
    else { setGroup(null); setCategory('') }
  }

  function handleCatChange(val: string) {
    setCategory(val)
    if (val !== CUSTOM_SENTINEL) setCustomInput('')
  }

  async function handleSave() {
    if (!amount || !merchant) { setError('Amount and merchant are required.'); return }
    const amt = parseFloat(amount)
    if (!isFinite(amt) || amt <= 0) { setError('Enter a valid positive amount.'); return }
    if (type === 'expense' && !group) { setError('Please choose a category group (Needs, Wants or Investments).'); return }
    const finalCat = type === 'income'
      ? incomeCategory
      : (category === CUSTOM_SENTINEL ? customInput.trim() : category)
    if (!finalCat) { setError('Enter a custom category name.'); return }
    // Persist custom category for this group
    if (category === CUSTOM_SENTINEL && group && finalCat) {
      saveCustomCat(group, finalCat)
      setCustomCats(loadCustomCats())
    }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date, merchant: merchant.trim(), amount: amt, type,
          category: finalCat,
          account, tags: tag.trim() ? [tag.trim()] : [],
          source: 'manual',
          wealthGroup: type === 'income' ? null : group,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Save failed')
      }
      window.dispatchEvent(new Event('paisapilot:refresh'))
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const cats = group ? [...BASE_GROUP_CATS[group], ...customCats[group]] : []

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 480 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)' }}>Add entry</h2>
          <button className="btn-ghost" style={{ padding: 8 }} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Type toggle */}
        <div className="px-6 pt-5">
          <div className="seg-track" style={{ width: '100%', borderRadius: 12 }}>
            {(['expense','income'] as EntryType[]).map(t => (
              <button
                key={t}
                className={`seg-btn flex-1 ${type === t ? 'active' : ''}`}
                style={{ color: type === t ? (t === 'income' ? 'var(--green)' : 'var(--violet)') : undefined }}
                onClick={() => handleTypeChange(t)}
              >
                {t === 'expense' ? 'Expense' : 'Income'}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="px-6 py-4 space-y-4">
          {/* Amount + Merchant */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Amount</label>
              <div className="relative">
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', fontSize: 14, fontWeight: 500 }}>₹</span>
                <input type="text" inputMode="decimal" placeholder="0" value={fmtAmountDisplay(amount)}
                  onChange={handleAmountChange} className="form-input" style={{ paddingLeft: 28 }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
                {type === 'income' ? 'Source / employer' : 'Merchant or source'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Name"
                  value={merchant}
                  onChange={e => {
                    const val = e.target.value
                    setMerchant(val)
                    setMerchantOpen(true)
                    setMerchantHighlight(-1)
                    // Immediate: filter own merchants + learned
                    const q = val.trim().toLowerCase()
                    const localMatches = q
                      ? ownMerchants.filter(m => m.toLowerCase().includes(q)).slice(0, 6)
                      : []
                    setMerchantSuggestions(localMatches)
                    // Debounce: search 10k list on server
                    clearTimeout(merchantTimerRef.current)
                    if (q.length >= 2) {
                      merchantTimerRef.current = setTimeout(() => {
                        fetch(`/api/merchants?q=${encodeURIComponent(q)}`)
                          .then(r => r.json())
                          .then(d => {
                            const server: string[] = d.merchants ?? []
                            const seen = new Set(localMatches.map(m => m.toLowerCase()))
                            const extras = server.filter(m => !seen.has(m.toLowerCase()))
                            setMerchantSuggestions([...localMatches, ...extras].slice(0, 8))
                          })
                          .catch(() => {})
                      }, 280)
                    }
                  }}
                  onFocus={() => { setMerchantOpen(true) }}
                  onBlur={() => setTimeout(() => setMerchantOpen(false), 150)}
                  onKeyDown={e => {
                    if (!merchantOpen || merchantSuggestions.length === 0) return
                    if (e.key === 'ArrowDown') { e.preventDefault(); setMerchantHighlight(h => Math.min(h + 1, merchantSuggestions.length - 1)) }
                    else if (e.key === 'ArrowUp') { e.preventDefault(); setMerchantHighlight(h => Math.max(h - 1, -1)) }
                    else if (e.key === 'Enter' && merchantHighlight >= 0) { e.preventDefault(); setMerchant(merchantSuggestions[merchantHighlight]); setMerchantOpen(false); setMerchantHighlight(-1) }
                    else if (e.key === 'Escape') setMerchantOpen(false)
                  }}
                  className="form-input"
                  autoComplete="off"
                  spellCheck={true}
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
                        onMouseDown={() => { setMerchant(m); setMerchantOpen(false); setMerchantHighlight(-1) }}
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
          </div>

          {/* Date + Account */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Date</label>
              <DatePicker value={date} onChange={setDate} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Account</label>
              <div className="relative">
                <select value={account} onChange={e => setAccount(e.target.value)} className="form-select">
                  {ACCOUNTS.map(a => <option key={a}>{a}</option>)}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
              </div>
            </div>
          </div>

          {/* Category picker */}
          {type === 'income' ? (
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Income type</label>
              <div className="relative">
                <select value={incomeCategory} onChange={e => setIncomeCategory(e.target.value)} className="form-select">
                  {INCOME_CATS.map(c => <option key={c}>{c}</option>)}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
              </div>
              <p style={{ fontSize: 11, color: '#16a34a', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>💰</span> Goes to your savings balance
              </p>
            </div>
          ) : (
            <>
              {/* Step 1: Group picker */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 8 }}>Category group</label>
                <div className="flex gap-2">
                  {(Object.keys(GROUP_LABELS) as WealthGroup[]).map(g => {
                    const meta = GROUP_LABELS[g]
                    const active = group === g
                    return (
                      <button
                        key={g}
                        onClick={() => setGroup(g)}
                        style={{
                          flex: 1, padding: '8px 4px', borderRadius: 10, fontSize: 12, fontWeight: active ? 700 : 500,
                          border: `1.5px solid ${active ? meta.color : 'var(--border)'}`,
                          background: active ? `${meta.color}18` : 'transparent',
                          color: active ? meta.color : 'var(--text-2)',
                          cursor: 'pointer', transition: 'all .15s',
                        }}
                      >
                        <div style={{ fontSize: 16, marginBottom: 2 }}>{meta.emoji}</div>
                        {meta.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Step 2: Subcategory */}
              {group && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Subcategory</label>
                  <div className="relative">
                    <select value={category} onChange={e => handleCatChange(e.target.value)} className="form-select">
                      {cats.map(c => <option key={c} value={c}>{c}</option>)}
                      <option value={CUSTOM_SENTINEL}>✏️ New custom…</option>
                    </select>
                    <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
                  </div>
                  {category === CUSTOM_SENTINEL && (
                    <input
                      type="text"
                      className="form-input"
                      style={{ marginTop: 8 }}
                      placeholder="Type category name (e.g. NT50, ELSS)"
                      value={customInput}
                      onChange={e => setCustomInput(e.target.value)}
                      autoFocus
                    />
                  )}
                </div>
              )}
            </>
          )}

          {/* Tag */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Tag (optional)</label>
            <div className="relative">
              <Tag size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', zIndex: 1, pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Tag name only"
                value={tag}
                onChange={e => { setTag(e.target.value); setTagOpen(true) }}
                onFocus={() => setTagOpen(true)}
                onBlur={() => setTimeout(() => setTagOpen(false), 150)}
                onKeyDown={e => {
                  if (!tagOpen || tagSuggestions.length === 0) return
                  if (e.key === 'ArrowDown') { e.preventDefault(); setTagHighlight(h => Math.min(h + 1, tagSuggestions.length - 1)) }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); setTagHighlight(h => Math.max(h - 1, -1)) }
                  else if (e.key === 'Enter' && tagHighlight >= 0) { e.preventDefault(); setTag(tagSuggestions[tagHighlight]); setTagOpen(false); setTagHighlight(-1) }
                }}
                className="form-input"
                style={{ paddingLeft: 32 }}
                autoComplete="off"
              />
              {tagOpen && tagSuggestions.length > 0 && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                  background: '#fff', border: '1px solid var(--border)', borderRadius: 10,
                  boxShadow: 'var(--shadow-lg)', zIndex: 50, overflow: 'hidden',
                }}>
                  {tagSuggestions.map((s, i) => (
                    <div
                      key={s}
                      onMouseDown={() => { setTag(s); setTagOpen(false); setTagHighlight(-1) }}
                      onMouseEnter={() => setTagHighlight(i)}
                      style={{
                        padding: '8px 12px', fontSize: 13, cursor: 'pointer',
                        background: i === tagHighlight ? 'var(--violet)' : 'transparent',
                        color: i === tagHighlight ? '#fff' : 'var(--text-1)',
                      }}
                    >
                      {s}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer" style={{ fontSize: 14, color: 'var(--text-2)' }}>
            <input type="checkbox" checked={hasReceipt} onChange={e => setHasReceipt(e.target.checked)}
              style={{ accentColor: 'var(--violet)', width: 16, height: 16 }} />
            I have a receipt to attach
          </label>
          {hasReceipt && (
            <div className="flex items-center justify-center gap-2 rounded-xl cursor-pointer"
              style={{ border: `2px dashed ${receiptName ? 'var(--violet)' : 'var(--border)'}`, padding: '14px 20px', color: receiptName ? 'var(--violet)' : 'var(--text-3)', fontSize: 13, background: receiptName ? 'var(--violet-bg)' : 'transparent', transition: 'all 0.15s' }}
              onClick={() => receiptRef.current?.click()}>
              <Upload size={15} />
              <span style={{ fontWeight: receiptName ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                {receiptName || 'Choose receipt file'}
              </span>
              <input ref={receiptRef} type="file" className="hidden" accept="image/*,.pdf"
                onChange={e => setReceiptName(e.target.files?.[0]?.name ?? '')} />
            </div>
          )}

          {error && (
            <p style={{ fontSize: 13, color: 'var(--red)', background: 'var(--red-bg)', padding: '10px 14px', borderRadius: 8 }}>
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          <button className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save entry'}
          </button>
        </div>
      </div>
    </div>
  )
}
