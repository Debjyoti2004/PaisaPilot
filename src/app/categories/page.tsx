'use client'

import { useState, useEffect, useCallback } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { Plus, X, Check, ChevronDown, ChevronRight, Trash2, Edit2 } from 'lucide-react'
import { clsx } from 'clsx'

interface Category {
  id: string
  name: string
  kind: string
  icon: string
  color: string
  parentId: string | null
  children?: Category[]
}

const KIND_OPTIONS = [
  { value: 'need', label: 'Need', color: '#f59e0b', desc: 'Essential expenses' },
  { value: 'want', label: 'Want', color: '#6366f1', desc: 'Discretionary spending' },
  { value: 'save_short', label: 'Short-term Savings', color: '#14b8a6', desc: 'Emergency fund, upcoming expenses' },
  { value: 'invest_long', label: 'Long-term Investment', color: '#10b981', desc: 'SIP, stocks, etc.' },
  { value: 'goal', label: 'Goal', color: '#f43f5e', desc: 'Specific financial goals' },
  { value: 'income', label: 'Income', color: '#22c55e', desc: 'Income sources' },
]

const ICONS = ['🍔', '🛒', '☕', '🚗', '💊', '📱', '👔', '✈️', '🎬', '📚', '💰', '🏠', '⚡', '💧', '🎮', '💄', '🧴', '💈', '🏋️', '🌿', '🎁', '🔧', '📊', '🏦', '💻', '🎓', '🐾', '🍕', '🚌', '⛽']
const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#14b8a6', '#f43f5e', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#f97316', '#64748b', '#06b6d4']

function EmptyForm({ parentId, parentName, onSave, onCancel }: {
  parentId?: string | null
  parentName?: string
  onSave: (data: { name: string; kind: string; icon: string; color: string; parentId?: string }) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [kind, setKind] = useState('need')
  const [icon, setIcon] = useState('📦')
  const [color, setColor] = useState('#6366f1')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    await onSave({ name: name.trim(), kind, icon, color, ...(parentId ? { parentId } : {}) })
    setSaving(false)
  }

  return (
    <div className="bg-[#13131f] border border-indigo-500/20 rounded-2xl p-5 space-y-4 animate-scale-in">
      <p className="text-[12px] font-semibold text-indigo-400">
        {parentId ? `New subcategory under ${parentName}` : 'New Category'}
      </p>

      {/* Icon */}
      <div>
        <p className="text-[10px] text-slate-600 mb-2">Icon</p>
        <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
          {ICONS.map(ic => (
            <button key={ic} onClick={() => setIcon(ic)}
              className={clsx('w-8 h-8 rounded-lg text-base transition-all', ic === icon ? 'bg-indigo-500/20 border border-indigo-500/40 scale-110' : 'bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08]')}>
              {ic}
            </button>
          ))}
        </div>
      </div>

      {/* Color */}
      <div>
        <p className="text-[10px] text-slate-600 mb-2">Color</p>
        <div className="flex flex-wrap gap-1.5">
          {COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)}
              className={clsx('w-6 h-6 rounded-full transition-all', c === color ? 'ring-2 ring-white/40 ring-offset-1 ring-offset-[#13131f] scale-110' : 'hover:scale-110')}
              style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>

      {/* Name */}
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Category name"
        autoFocus
        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-[13px] text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/40"
        onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
      />

      {/* Kind (only for parent categories) */}
      {!parentId && (
        <div>
          <p className="text-[10px] text-slate-600 mb-2">Type</p>
          <div className="grid grid-cols-2 gap-1.5">
            {KIND_OPTIONS.map(k => (
              <button key={k.value} onClick={() => setKind(k.value)}
                className={clsx('px-3 py-2 rounded-xl text-left transition-all', k.value === kind ? 'border' : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05]')}
                style={k.value === kind ? { backgroundColor: `${k.color}15`, borderColor: `${k.color}40`, color: k.color } : {}}>
                <p className={clsx('text-[11px] font-semibold', k.value !== kind && 'text-slate-400')}>{k.label}</p>
                <p className="text-[9px] text-slate-600 mt-0.5">{k.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button onClick={handleSave} disabled={!name.trim() || saving}
          className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] font-semibold rounded-xl transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5">
          {saving ? <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin-smooth block" /> : <Check size={14} />}
          Save
        </button>
        <button onClick={onCancel}
          className="w-10 py-2.5 bg-white/[0.05] hover:bg-white/[0.08] text-slate-400 rounded-xl transition-colors flex items-center justify-center">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewParent, setShowNewParent] = useState(false)
  const [addingSubTo, setAddingSubTo] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<Record<string, string>>({})

  const fetch_ = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/categories')
      const d = await r.json()
      setCategories(d.categories || [])
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { fetch_() }, [fetch_])

  const createCategory = async (data: { name: string; kind: string; icon: string; color: string; parentId?: string }) => {
    await fetch('/api/categories', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setShowNewParent(false)
    setAddingSubTo(null)
    fetch_()
  }

  const deleteCategory = async (id: string) => {
    setDeletingId(id)
    setDeleteError(e => ({ ...e, [id]: '' }))
    try {
      const r = await fetch(`/api/categories?id=${id}`, { method: 'DELETE' })
      const d = await r.json()
      if (!r.ok) {
        setDeleteError(e => ({ ...e, [id]: d.error }))
      } else {
        setConfirmDelete(null)
        fetch_()
      }
    } finally { setDeletingId(null) }
  }

  const kindOf = (kind: string) => KIND_OPTIONS.find(k => k.value === kind)

  // Group by kind
  const grouped = KIND_OPTIONS.map(k => ({
    ...k,
    cats: categories.filter(c => c.kind === k.value),
  })).filter(g => g.cats.length > 0 || (showNewParent && false))

  return (
    <>
      <TopBar title="Categories" subtitle="Manage your spending categories" />
      <div className="flex-1 p-4 md:p-6 space-y-5 max-w-3xl mx-auto w-full">

        {/* Add new parent category */}
        {showNewParent ? (
          <EmptyForm onSave={createCategory} onCancel={() => setShowNewParent(false)} />
        ) : (
          <button onClick={() => setShowNewParent(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-white/[0.1] text-slate-500 hover:text-indigo-400 hover:border-indigo-500/30 hover:bg-indigo-500/[0.03] transition-all text-[13px]">
            <Plus size={16} />
            Add new category
          </button>
        )}

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 skeleton rounded-2xl" />)}</div>
        ) : (
          grouped.map(group => (
            <div key={group.value}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: group.color }} />
                <p className="text-[10px] uppercase tracking-widest" style={{ color: group.color }}>{group.label}</p>
                <span className="text-[10px] text-slate-700">({group.cats.length})</span>
              </div>
              <div className="space-y-1.5">
                {group.cats.map(cat => {
                  const isExpanded = expanded === cat.id
                  const isConfirmingDel = confirmDelete === cat.id
                  const subCount = cat.children?.length || 0
                  const kInfo = kindOf(cat.kind)

                  return (
                    <div key={cat.id}>
                      <div className={clsx('bg-[#13131f] border rounded-2xl overflow-hidden transition-all', isExpanded ? 'border-white/[0.12]' : 'border-white/[0.07]')}>
                        {/* Main row */}
                        <div className="flex items-center gap-3 px-4 py-3.5">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ backgroundColor: `${cat.color}20` }}>
                            {cat.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-[14px] font-semibold text-white">{cat.name}</p>
                              {subCount > 0 && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.05] text-slate-600">{subCount} sub</span>
                              )}
                            </div>
                            <span className="text-[10px] font-medium" style={{ color: kInfo?.color }}>{kInfo?.label}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {/* Add subcategory */}
                            <button onClick={() => { setAddingSubTo(addingSubTo === cat.id ? null : cat.id); setExpanded(cat.id) }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all" title="Add subcategory">
                              <Plus size={13} />
                            </button>
                            {/* Delete */}
                            <button onClick={() => { setConfirmDelete(isConfirmingDel ? null : cat.id); setDeleteError(e => ({ ...e, [cat.id]: '' })) }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Delete category">
                              <Trash2 size={13} />
                            </button>
                            {/* Expand */}
                            {(subCount > 0 || addingSubTo === cat.id) && (
                              <button onClick={() => setExpanded(isExpanded ? null : cat.id)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-300 transition-colors">
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Confirm delete */}
                        {isConfirmingDel && (
                          <div className="px-4 py-3 border-t border-white/[0.06] bg-red-500/[0.03]">
                            {deleteError[cat.id] ? (
                              <p className="text-[11px] text-red-400 mb-2">{deleteError[cat.id]}</p>
                            ) : (
                              <p className="text-[11px] text-red-400 mb-2">Delete &quot;{cat.name}&quot; and all its subcategories?</p>
                            )}
                            {!deleteError[cat.id] && (
                              <div className="flex gap-2">
                                <button onClick={() => deleteCategory(cat.id)} disabled={deletingId === cat.id}
                                  className="flex-1 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-[11px] font-semibold rounded-lg transition-colors disabled:opacity-50">
                                  {deletingId === cat.id ? 'Deleting...' : 'Delete'}
                                </button>
                                <button onClick={() => setConfirmDelete(null)}
                                  className="flex-1 py-1.5 bg-white/[0.05] text-slate-400 text-[11px] font-semibold rounded-lg hover:bg-white/[0.08] transition-colors">
                                  Cancel
                                </button>
                              </div>
                            )}
                            {deleteError[cat.id] && (
                              <button onClick={() => setConfirmDelete(null)} className="w-full py-1.5 bg-white/[0.05] text-slate-400 text-[11px] font-semibold rounded-lg hover:bg-white/[0.08] transition-colors">
                                OK
                              </button>
                            )}
                          </div>
                        )}

                        {/* Subcategories + add sub form */}
                        {isExpanded && (
                          <div className="border-t border-white/[0.06]">
                            {/* Add sub form */}
                            {addingSubTo === cat.id && (
                              <div className="p-3 bg-indigo-500/[0.02]">
                                <EmptyForm
                                  parentId={cat.id}
                                  parentName={cat.name}
                                  onSave={createCategory}
                                  onCancel={() => setAddingSubTo(null)}
                                />
                              </div>
                            )}

                            {/* Existing subcategories */}
                            {(cat.children || []).map(sub => {
                              const isConfirmingSubDel = confirmDelete === sub.id
                              return (
                                <div key={sub.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] transition-colors group">
                                  <div className="w-1 h-5 rounded-full bg-white/[0.08] flex-shrink-0" />
                                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0" style={{ backgroundColor: `${sub.color}15` }}>
                                    {sub.icon}
                                  </div>
                                  <p className="flex-1 text-[13px] text-slate-300">{sub.name}</p>
                                  {isConfirmingSubDel ? (
                                    <div className="flex items-center gap-1.5">
                                      {deleteError[sub.id] && <span className="text-[10px] text-red-400">{deleteError[sub.id]}</span>}
                                      <button onClick={() => deleteCategory(sub.id)} disabled={deletingId === sub.id}
                                        className="px-2 py-1 text-[10px] bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50">
                                        {deletingId === sub.id ? '...' : 'Delete'}
                                      </button>
                                      <button onClick={() => setConfirmDelete(null)}
                                        className="px-2 py-1 text-[10px] bg-white/[0.05] text-slate-400 rounded-lg hover:bg-white/[0.08] transition-colors">
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <button onClick={() => { setConfirmDelete(sub.id); setDeleteError(e => ({ ...e, [sub.id]: '' })) }}
                                      className="w-6 h-6 rounded flex items-center justify-center text-slate-700 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100">
                                      <Trash2 size={11} />
                                    </button>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}

        {/* Empty state */}
        {!loading && categories.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📂</p>
            <p className="text-[15px] font-semibold text-white mb-1">No categories yet</p>
            <p className="text-[12px] text-slate-500">Add your first category to start organizing expenses</p>
          </div>
        )}
      </div>
    </>
  )
}
