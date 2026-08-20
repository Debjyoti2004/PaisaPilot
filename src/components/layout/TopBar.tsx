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

  useEffect(() => {
    const todayKey = new Date().toISOString().slice(0, 10)
    const lastCheck = localStorage.getItem('pp_notif_check')
    if (lastCheck !== todayKey) {
      fetch('/api/notifications/check', { method: 'POST' })
        .then(() => { localStorage.setItem('pp_notif_check', todayKey) })
        .catch(() => {})
        .finally(() => fetchUnread())
    } else {
      fetchUnread()
    }
  }, [fetchUnread])

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
type EntryType = 'expense' | 'income' | 'transfer'
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
const CUSTOM_SENTINEL = '__custom__'

type CustomCats = { needs: string[]; wants: string[]; investments: string[] }

function allCustomNames(cats: CustomCats): string[] {
  return [...cats.needs, ...cats.wants, ...cats.investments]
}

async function apiLoadCustomCats(): Promise<CustomCats> {
  try {
    const res = await fetch('/api/user-categories')
    if (res.ok) return await res.json()
  } catch {}
  return { needs: [], wants: [], investments: [] }
}

async function apiSaveCustomCat(group: string, name: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch('/api/user-categories', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, wealthGroup: group }),
  })
  const d = await res.json()
  if (!res.ok) return { ok: false, error: d.error }
  return { ok: true }
}

async function apiDeleteCustomCat(name: string): Promise<void> {
  await fetch(`/api/user-categories?name=${encodeURIComponent(name)}`, { method: 'DELETE' })
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
  const [transferFrom, setTransferFrom] = useState('')
  const [transferTo, setTransferTo] = useState('')
  const [balances, setBalances] = useState<{ byName: Record<string, { balance: number; outstanding: number; isCard: boolean; accountId: string | null }>; byId: Record<string, { balance: number; outstanding: number; isCard: boolean; name: string }> }>({ byName: {}, byId: {} })
  const [unpaidBills, setUnpaidBills] = useState<{ id: string; merchant: string; narration: string; amount: number; occurredAt: string }[]>([])
  const [selectedBills, setSelectedBills] = useState<Set<string>>(new Set())
  const [billsLoading, setBillsLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [customCats, setCustomCats] = useState<CustomCats>({ needs: [], wants: [], investments: [] })
  const [catDropOpen, setCatDropOpen] = useState(false)
  const [accounts, setAccounts] = useState<{ id: string; name: string; type: string }[]>([])

  const tagSuggestions = tag.trim()
    ? allTags.filter(t => t.toLowerCase().includes(tag.trim().toLowerCase())).slice(0, 6)
    : []

  useEffect(() => { setTagHighlight(-1) }, [tag])

  useEffect(() => {
    apiLoadCustomCats().then(setCustomCats)
    fetch('/api/tags').then(r => r.json()).then(d => setAllTags(d.tags?.map((t: { name: string }) => t.name) ?? []))
    fetch('/api/merchants').then(r => r.json()).then(d => setOwnMerchants(d.merchants ?? []))
    fetch('/api/fin-accounts').then(r => r.json()).then(d => {
      setAccounts(d.accounts ?? [])
      if (d.accounts?.length > 0) setAccount(d.accounts[0].id)
    })
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Reset category when group changes
  useEffect(() => {
    if (group) { setCategory(BASE_GROUP_CATS[group][0]); setCustomInput(''); setCatDropOpen(false) }
  }, [group])

  useEffect(() => {
    if (!transferTo || !balances.byId[transferTo]?.isCard) {
      setUnpaidBills([]); setSelectedBills(new Set()); return
    }
    setBillsLoading(true)
    fetch(`/api/accounts/unpaid-bills?accountId=${encodeURIComponent(transferTo)}`)
      .then(r => r.json())
      .then(d => { setUnpaidBills(d.bills ?? []); setSelectedBills(new Set()) })
      .catch(() => {})
      .finally(() => setBillsLoading(false))
  }, [transferTo, balances])

  function handleTypeChange(t: EntryType) {
    setType(t); setError('')
    if (t === 'income') { setGroup(null); setCategory('Income') }
    else if (t === 'expense') { setGroup(null); setCategory('') }
    if (t === 'transfer' && Object.keys(balances.byId).length === 0) {
      fetch('/api/accounts/balance').then(r => r.json()).then(setBalances).catch(() => {})
    }
  }

  function handleCatChange(val: string) {
    setCategory(val)
    if (val !== CUSTOM_SENTINEL) setCustomInput('')
  }

  async function handleSave() {
    const amt = parseFloat(amount)

    // Transfer flow
    if (type === 'transfer') {
      if (!transferFrom) { setError('Select a From account.'); return }
      if (!transferTo) { setError('Select a To account.'); return }
      if (transferFrom === transferTo) { setError('From and To accounts must be different.'); return }
      const isCard = balances.byId[transferTo]?.isCard
      const paidBillIds = isCard ? Array.from(selectedBills) : []
      const transferAmt = isCard
        ? unpaidBills.filter(b => selectedBills.has(b.id)).reduce((s, b) => s + b.amount, 0)
        : amt
      if (isCard && paidBillIds.length === 0) { setError('Select at least one bill to pay.'); return }
      if (!isCard && (!isFinite(amt) || amt <= 0)) { setError('Enter a valid positive amount.'); return }
      const fromBalance = Math.max(0, balances.byId[transferFrom]?.balance ?? 0)
      const fromName = balances.byId[transferFrom]?.name ?? accounts.find(a => a.id === transferFrom)?.name ?? transferFrom
      if (transferAmt > fromBalance) {
        setError(`Insufficient balance in ${fromName}. Available: ₹${fromBalance.toLocaleString('en-IN')}`); return
      }
      setSaving(true); setError('')
      try {
        const res = await fetch('/api/transactions', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'transfer', fromAccountId: transferFrom, toAccountId: transferTo, amount: transferAmt, date, paidBillIds }),
        })
        if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Save failed') }
        window.dispatchEvent(new Event('paisapilot:refresh'))
        onClose()
      } catch (e) { setError(e instanceof Error ? e.message : 'Save failed') }
      finally { setSaving(false) }
      return
    }

    if (!amount || !merchant) { setError('Amount and merchant are required.'); return }
    if (!isFinite(amt) || amt <= 0) { setError('Enter a valid positive amount.'); return }
    if (type === 'expense' && !group) { setError('Please choose a category group (Needs, Wants or Investments).'); return }
    const finalCat = type === 'income'
      ? incomeCategory
      : (category === CUSTOM_SENTINEL ? customInput.trim() : category)
    if (!finalCat) { setError('Enter a custom category name.'); return }
    // Persist custom category for this group (block duplicates across all groups)
    if (category === CUSTOM_SENTINEL && group && finalCat) {
      const existing = allCustomNames(customCats).find(n => n.toLowerCase() === finalCat.toLowerCase())
      if (existing) { setError(`"${existing}" already exists as a custom category.`); return }
      const result = await apiSaveCustomCat(group, finalCat)
      if (!result.ok) { setError(result.error ?? 'Failed to save category'); return }
      apiLoadCustomCats().then(setCustomCats)
    }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date, merchant: merchant.trim(), amount: amt, type,
          category: finalCat,
          accountId: account,
          tags: tag.trim() ? [tag.trim()] : [],
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
            {(['expense','income','transfer'] as EntryType[]).map(t => (
              <button
                key={t}
                className={`seg-btn flex-1 ${type === t ? 'active' : ''}`}
                style={{ color: type === t ? (t === 'income' ? 'var(--green)' : t === 'transfer' ? '#3b82f6' : 'var(--violet)') : undefined, fontSize: 13 }}
                onClick={() => handleTypeChange(t)}
              >
                {t === 'expense' ? 'Expense' : t === 'income' ? 'Income' : '⇄ Transfer'}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="px-6 py-4 space-y-4">

          {/* Transfer form */}
          {type === 'transfer' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>From account</label>
                  <select value={transferFrom} onChange={e => { setTransferFrom(e.target.value); setError('') }} className="form-input">
                    <option value="">Select</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  {transferFrom && (
                    <p style={{ fontSize: 11, marginTop: 4, color: (balances.byId[transferFrom]?.balance ?? 0) <= 0 ? 'var(--red,#ef4444)' : 'var(--text-3)' }}>
                      Available: ₹{Math.max(0, balances.byId[transferFrom]?.balance ?? 0).toLocaleString('en-IN')}
                    </p>
                  )}
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>To account</label>
                  <select value={transferTo} onChange={e => { setTransferTo(e.target.value); setError('') }} className="form-input">
                    <option value="">Select</option>
                    {accounts.filter(a => a.id !== transferFrom).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Credit card: bill selector */}
              {transferTo && balances.byId[transferTo]?.isCard ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)' }}>Select bills to pay</label>
                    {unpaidBills.length > 0 && (
                      <button style={{ fontSize: 11, color: 'var(--violet)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                        onClick={() => setSelectedBills(
                          selectedBills.size === unpaidBills.length ? new Set() : new Set(unpaidBills.map(b => b.id))
                        )}>
                        {selectedBills.size === unpaidBills.length ? 'Deselect all' : 'Select all'}
                      </button>
                    )}
                  </div>
                  {billsLoading ? (
                    <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Loading bills…</p>
                  ) : unpaidBills.length === 0 ? (
                    <p style={{ fontSize: 12, color: 'var(--text-3)', padding: '10px 0' }}>No unpaid bills on this card.</p>
                  ) : (
                    <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {unpaidBills.map(bill => {
                        const checked = selectedBills.has(bill.id)
                        return (
                          <label key={bill.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, border: `1px solid ${checked ? 'var(--violet)' : 'var(--border)'}`, background: checked ? 'var(--violet-bg)' : 'var(--surface)', cursor: 'pointer' }}>
                            <input type="checkbox" checked={checked}
                              onChange={() => {
                                const next = new Set(selectedBills)
                                checked ? next.delete(bill.id) : next.add(bill.id)
                                setSelectedBills(next)
                              }} style={{ accentColor: 'var(--violet)', width: 15, height: 15, flexShrink: 0 }} />
                            <span style={{ flex: 1, fontSize: 13, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bill.merchant || bill.narration}</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', flexShrink: 0 }}>₹{bill.amount.toLocaleString('en-IN')}</span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                  {selectedBills.size > 0 && (
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--violet)', marginTop: 8 }}>
                      Total: ₹{unpaidBills.filter(b => selectedBills.has(b.id)).reduce((s, b) => s + b.amount, 0).toLocaleString('en-IN')}
                      {' '}({selectedBills.size} bill{selectedBills.size > 1 ? 's' : ''})
                    </p>
                  )}
                </div>
              ) : (
                /* Normal account: amount input */
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Amount</label>
                  <div className="relative">
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', fontSize: 14, fontWeight: 500 }}>₹</span>
                    <input type="text" inputMode="decimal" placeholder="0" value={fmtAmountDisplay(amount)} onChange={handleAmountChange} className="form-input" style={{ paddingLeft: 28 }} />
                  </div>
                </div>
              )}

              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Date</label>
                <DatePicker value={date} onChange={setDate} />
              </div>
            </div>
          )}

          {/* Amount + Merchant (expense/income only) */}
          {type !== 'transfer' && <div className="grid grid-cols-2 gap-3">
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
          </div>}

          {/* Date + Account (expense/income only) */}
          {type !== 'transfer' && <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Date</label>
              <DatePicker value={date} onChange={setDate} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Account</label>
              <div className="relative">
                <select value={account} onChange={e => setAccount(e.target.value)} className="form-select">
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
              </div>
            </div>
          </div>}

          {/* Category picker (expense/income only) */}
          {type !== 'transfer' && (type === 'income' ? (
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

              {/* Step 2: Subcategory — custom dropdown with delete for custom items */}
              {group && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Subcategory</label>
                  <div className="relative">
                    {/* Trigger */}
                    <button type="button" onClick={() => setCatDropOpen(o => !o)}
                      style={{
                        width: '100%', height: 44, padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
                        fontSize: 14, color: category === CUSTOM_SENTINEL ? 'var(--text-3)' : 'var(--text-1)', cursor: 'pointer',
                      }}>
                      <span>{category === CUSTOM_SENTINEL ? '✏️ New custom…' : category}</span>
                      <ChevronDown size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                    </button>

                    {/* Dropdown */}
                    {catDropOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setCatDropOpen(false)} />
                        <div style={{
                          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
                          background: '#fff', border: '1px solid var(--border)', borderRadius: 10,
                          boxShadow: 'var(--shadow-lg)', overflow: 'hidden', maxHeight: 220, overflowY: 'auto',
                        }}>
                          {/* Built-in cats */}
                          {BASE_GROUP_CATS[group].map(c => (
                            <div key={c} onClick={() => { handleCatChange(c); setCatDropOpen(false) }}
                              style={{ padding: '9px 12px', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                background: c === category ? 'var(--violet-bg)' : 'transparent', color: c === category ? 'var(--violet)' : 'var(--text-1)' }}>
                              <span>{c === category ? '✓ ' : ''}{c}</span>
                            </div>
                          ))}
                          {/* Custom cats with delete */}
                          {customCats[group].map(c => (
                            <div key={c} style={{ padding: '9px 12px', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              background: c === category ? 'var(--violet-bg)' : 'transparent' }}
                              onClick={() => { handleCatChange(c); setCatDropOpen(false) }}>
                              <span style={{ color: c === category ? 'var(--violet)' : 'var(--text-1)' }}>{c === category ? '✓ ' : ''}{c}</span>
                              <button type="button" onClick={e => {
                                e.stopPropagation()
                                apiDeleteCustomCat(c).then(() => apiLoadCustomCats().then(setCustomCats))
                                if (category === c) setCategory(BASE_GROUP_CATS[group][0])
                              }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 16, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
                                title="Delete">×</button>
                            </div>
                          ))}
                          {/* New custom option */}
                          <div onClick={() => { handleCatChange(CUSTOM_SENTINEL); setCatDropOpen(false) }}
                            style={{ padding: '9px 12px', fontSize: 13, cursor: 'pointer', color: 'var(--violet)',
                              borderTop: '1px solid var(--border)', background: category === CUSTOM_SENTINEL ? 'var(--violet-bg)' : 'transparent' }}>
                            ✏️ New custom…
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Custom name input */}
                  {category === CUSTOM_SENTINEL && (
                    <div style={{ marginTop: 8 }}>
                      <input type="text" className="form-input"
                        placeholder={`Name for ${GROUP_LABELS[group].label} subcategory…`}
                        value={customInput} onChange={e => setCustomInput(e.target.value)} autoFocus />
                      <p style={{ fontSize: 11, color: GROUP_LABELS[group].color, marginTop: 4, fontWeight: 500 }}>
                        Will be saved under {GROUP_LABELS[group].emoji} {GROUP_LABELS[group].label}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          ))}

          {type !== 'transfer' && <div>
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
          </div>}

          {type !== 'transfer' && <>
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
          </>}

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
