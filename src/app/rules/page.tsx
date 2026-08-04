'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Plus, X, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { useViewMode } from '@/contexts/ViewContext'

interface Rule { id: string; whenText: string; thenText: string; enabled: boolean; createdAt: string }
type WealthGroup = 'needs' | 'wants' | 'investments'
const BASE_GROUP_CATS: Record<WealthGroup, string[]> = {
  needs:       ['Housing','Groceries','Utilities','Transportation','Insurance','Health','Subscriptions'],
  wants:       ['Dining','Shopping','Entertainment','Travel','Other'],
  investments: ['Mutual Funds','Stocks','EPF/NPS','Gold','Fixed Deposits','Debt Funds'],
}
const GROUP_META: Record<WealthGroup, { label: string; emoji: string; color: string }> = {
  needs:       { label: 'Needs',       emoji: '🏠', color: '#6558D3' },
  wants:       { label: 'Wants',       emoji: '🛍️', color: '#f97316' },
  investments: { label: 'Investments', emoji: '📈', color: '#10b981' },
}
const LS_KEY = 'pp_custom_cats'
const CUSTOM_SENTINEL = '__custom__'

function loadCustomCats(): Record<WealthGroup, string[]> {
  try { const r = localStorage.getItem(LS_KEY); if (r) return JSON.parse(r) } catch {}
  return { needs: [], wants: [], investments: [] }
}
function saveCustomCat(group: WealthGroup, name: string) {
  const stored = loadCustomCats()
  if (!stored[group].includes(name)) {
    stored[group] = [...stored[group], name]
    localStorage.setItem(LS_KEY, JSON.stringify(stored))
  }
}

export default function RulesPage() {
  const { isViewing } = useViewMode()
  const [rules, setRules]   = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [when, setWhen]     = useState('')
  const [group, setGroup]   = useState<WealthGroup | null>(null)
  const [then, setThen]     = useState('')
  const [customInput, setCustomInput] = useState('')
  const [customCats, setCustomCats] = useState<Record<WealthGroup, string[]>>({ needs: [], wants: [], investments: [] })
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')
  const [delId, setDelId]   = useState<string | null>(null)

  useEffect(() => { setCustomCats(loadCustomCats()) }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/rules')
      const d = await res.json()
      setRules(d.rules ?? [])
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  // Reset subcategory when group changes
  useEffect(() => {
    if (group) { setThen(BASE_GROUP_CATS[group][0]); setCustomInput('') }
  }, [group])

  async function addRule() {
    if (!when.trim()) { setErr('Enter a keyword or phrase'); return }
    if (!group) { setErr('Choose a category group'); return }
    const thenText = then === CUSTOM_SENTINEL ? customInput.trim() : then
    if (!thenText) { setErr('Enter a custom category name'); return }
    // Persist custom to localStorage
    if (then === CUSTOM_SENTINEL && thenText) {
      saveCustomCat(group, thenText)
      setCustomCats(loadCustomCats())
    }
    setSaving(true); setErr('')
    try {
      const res = await fetch('/api/rules', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whenText: when.trim(), thenText }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed')
      setWhen(''); setGroup(null); setThen(''); setCustomInput(''); setShowAdd(false); load()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed')
    } finally { setSaving(false) }
  }

  async function toggleRule(id: string, enabled: boolean) {
    await fetch('/api/rules', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, enabled }) })
    load()
  }

  async function deleteRule(id: string) {
    await fetch(`/api/rules?id=${id}`, { method: 'DELETE' })
    setDelId(null); load()
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)' }}>Rules</h2>
          <p style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 4 }}>Auto-categorize transactions based on keywords. Rules run when new transactions are imported.</p>
        </div>
        {!isViewing && (
          <button className="btn-primary" style={{ gap: 6, fontSize: 13, padding: '9px 16px', flexShrink: 0 }} onClick={() => setShowAdd(true)}>
            <Plus size={15} />Add rule
          </button>
        )}
      </div>

      {/* Add rule modal */}
      {!isViewing && showAdd && typeof document !== 'undefined' && createPortal(
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal-box" style={{ maxWidth: 480 }}>
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-1)' }}>New categorization rule</h3>
              <button className="btn-ghost" style={{ padding: 8 }} onClick={() => setShowAdd(false)}><X size={16} /></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {/* When */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>
                  When merchant contains…
                </label>
                <input type="text" className="form-input" placeholder='e.g. "swiggy", "zomato"'
                  value={when} onChange={e => setWhen(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addRule()} autoFocus />
              </div>

              {/* Group picker */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 8 }}>
                  Then categorize as… (choose group)
                </label>
                <div className="flex gap-2">
                  {(Object.keys(GROUP_META) as WealthGroup[]).map(g => {
                    const meta = GROUP_META[g]
                    const active = group === g
                    return (
                      <button key={g} onClick={() => setGroup(g)} style={{
                        flex: 1, padding: '10px 4px', borderRadius: 10, fontSize: 12, fontWeight: active ? 700 : 500,
                        border: `1.5px solid ${active ? meta.color : 'var(--border)'}`,
                        background: active ? `${meta.color}18` : 'transparent',
                        color: active ? meta.color : 'var(--text-2)',
                        cursor: 'pointer', transition: 'all .15s',
                      }}>
                        <div style={{ fontSize: 18, marginBottom: 4 }}>{meta.emoji}</div>
                        {meta.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Subcategory */}
              {group && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>
                    Subcategory
                  </label>
                  <div className="relative">
                    <select className="form-select" value={then} onChange={e => { setThen(e.target.value); setCustomInput('') }}>
                      {[...BASE_GROUP_CATS[group], ...customCats[group]].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value={CUSTOM_SENTINEL}>✏️ New custom…</option>
                    </select>
                  </div>
                  {then === CUSTOM_SENTINEL && (
                    <input type="text" className="form-input" style={{ marginTop: 8 }}
                      placeholder="Type category name (e.g. NT50, ELSS)"
                      value={customInput} onChange={e => setCustomInput(e.target.value)} autoFocus />
                  )}
                </div>
              )}
              {err && <p style={{ fontSize: 13, color: 'var(--red)', background: 'var(--red-bg)', padding: '10px 14px', borderRadius: 8 }}>{err}</p>}
            </div>
            <div className="flex gap-3 px-6 py-4 justify-end" style={{ borderTop: '1px solid var(--border)' }}>
              <button className="btn-secondary" onClick={() => { setShowAdd(false); setWhen(''); setGroup(null); setThen(''); setErr('') }}>Cancel</button>
              <button className="btn-primary" onClick={addRule} disabled={saving}>{saving ? 'Saving…' : 'Add rule'}</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {loading && <div className="card skeleton" style={{ height: 160 }} />}

      {!loading && rules.length === 0 && (
        <div className="card empty-state" style={{ padding: '48px 24px' }}>
          <span style={{ fontSize: 36 }}>⚡</span>
          <p style={{ fontWeight: 600, color: 'var(--text-1)', marginTop: 12 }}>No rules yet</p>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4, textAlign: 'center', maxWidth: 320 }}>
            Rules auto-categorize transactions when they&apos;re imported. For example: if merchant contains &quot;swiggy&quot; → category Dining.
          </p>
          {!isViewing && (
            <button className="btn-primary" style={{ marginTop: 16, gap: 6 }} onClick={() => setShowAdd(true)}>
              <Plus size={15} />Add your first rule
            </button>
          )}
        </div>
      )}

      {!loading && rules.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: 13, color: 'var(--text-3)' }}>{rules.filter(r => r.enabled).length} active rules</p>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {rules.map(r => (
              <div key={r.id} className="flex items-center gap-3 px-5 py-4" style={{ opacity: r.enabled ? 1 : 0.55 }}>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)' }}>
                    If merchant contains <code style={{ background: 'var(--bg)', padding: '2px 6px', borderRadius: 6, fontFamily: 'monospace', fontSize: 13 }}>{r.whenText}</code>
                    {' '}→ <strong style={{ color: 'var(--violet)' }}>{r.thenText}</strong>
                  </p>
                </div>
                {!isViewing && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button className="btn-ghost" style={{ padding: 7 }} onClick={() => toggleRule(r.id, !r.enabled)}>
                      {r.enabled
                        ? <ToggleRight size={28} style={{ color: 'var(--green)' }} />
                        : <ToggleLeft size={28} style={{ color: 'var(--text-3)' }} />
                      }
                    </button>
                    {delId === r.id ? (
                      <div className="flex gap-1">
                        <button className="btn-ghost" style={{ padding: '5px 8px', fontSize: 11, color: 'var(--red)' }} onClick={() => deleteRule(r.id)}>Delete</button>
                        <button className="btn-ghost" style={{ padding: '5px 8px', fontSize: 11 }} onClick={() => setDelId(null)}>Cancel</button>
                      </div>
                    ) : (
                      <button className="btn-ghost" style={{ padding: 7 }} onClick={() => setDelId(r.id)}><Trash2 size={14} /></button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
