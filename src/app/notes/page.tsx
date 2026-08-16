'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Search, Pin, Trash2, X, Check, StickyNote, ChevronLeft, ChevronRight, FileText } from 'lucide-react'

interface Note {
  id: string
  title: string
  content: string
  color: string
  pinned: boolean
  createdAt: string
  updatedAt: string
}

const COLORS = [
  { label: 'Default',  hex: '#ffffff', border: '#d1d5db', text: '#374151' },
  { label: 'Yellow',   hex: '#fef08a', border: '#facc15', text: '#713f12' },
  { label: 'Pink',     hex: '#fbcfe8', border: '#f472b6', text: '#831843' },
  { label: 'Mint',     hex: '#bbf7d0', border: '#4ade80', text: '#14532d' },
  { label: 'Blue',     hex: '#bfdbfe', border: '#60a5fa', text: '#1e3a8a' },
  { label: 'Lavender', hex: '#ddd6fe', border: '#a78bfa', text: '#4c1d95' },
  { label: 'Peach',    hex: '#fed7aa', border: '#fb923c', text: '#7c2d12' },
  { label: 'Cyan',     hex: '#a5f3fc', border: '#22d3ee', text: '#164e63' },
  { label: 'Blush',    hex: '#fecaca', border: '#f87171', text: '#7f1d1d' },
]

function getColor(hex: string) {
  return COLORS.find(c => c.hex === hex) ?? COLORS[0]
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// ── Auto-resize textarea ──────────────────────────────────────────
function useAutoResize(ref: React.RefObject<HTMLTextAreaElement | null>, value: string) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 400) + 'px'
  }, [value, ref])
}

// ── Horizontal Note Row Scroller ──────────────────────────────────
function NoteScroller({
  notes,
  onOpen,
  onPinToggle,
  onNew,
  showAddCard,
}: {
  notes: Note[]
  onOpen: (note: Note) => void
  onPinToggle: (note: Note) => void
  onNew?: () => void
  showAddCard?: boolean
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft]   = useState(false)
  const [canRight, setCanRight] = useState(false)

  function check() {
    const el = scrollRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 4)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  useEffect(() => {
    check()
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', check, { passive: true })
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => { el.removeEventListener('scroll', check); ro.disconnect() }
  }, [notes])

  function scroll(dir: 'left' | 'right') {
    scrollRef.current?.scrollBy({ left: dir === 'right' ? 260 : -260, behavior: 'smooth' })
  }

  return (
    <div style={{ position: 'relative', margin: '0 -4px' }}>
      {canLeft && (
        <button onClick={() => scroll('left')} style={{
          position: 'absolute', left: -8, top: '50%', transform: 'translateY(-50%)',
          zIndex: 2, width: 34, height: 34, borderRadius: '50%',
          background: 'var(--surface)', border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--text-2)', padding: 0,
        }}><ChevronLeft size={16} /></button>
      )}

      <div ref={scrollRef} style={{
        display: 'flex', gap: 14, overflowX: 'auto', scrollbarWidth: 'none',
        padding: '4px 4px 8px',
      }}>
        {notes.map(note => <NoteCard key={note.id} note={note} onClick={() => onOpen(note)} onPinToggle={() => onPinToggle(note)} />)}
        {showAddCard && onNew && (
          <button onClick={onNew} style={{
            flexShrink: 0, width: 220, minHeight: 160,
            border: '2px dashed var(--border)', borderRadius: 16,
            background: 'transparent', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
            color: 'var(--text-3)', transition: 'all .15s',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--violet)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--violet)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-3)' }}
          >
            <Plus size={22} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>New note</span>
          </button>
        )}
      </div>

      {canRight && (
        <button onClick={() => scroll('right')} style={{
          position: 'absolute', right: -8, top: '50%', transform: 'translateY(-50%)',
          zIndex: 2, width: 34, height: 34, borderRadius: '50%',
          background: 'var(--surface)', border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--text-2)', padding: 0,
        }}><ChevronRight size={16} /></button>
      )}
    </div>
  )
}

// ── Note Card ─────────────────────────────────────────────────────
function NoteCard({ note, onClick, onPinToggle }: { note: Note; onClick: () => void; onPinToggle: () => void }) {
  const [hovered, setHovered] = useState(false)
  const c = getColor(note.color)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flexShrink: 0, width: 220, minHeight: 160,
        background: note.color, borderRadius: 16,
        border: `1.5px solid ${c.border}`,
        cursor: 'pointer', position: 'relative',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hovered ? `0 12px 32px ${c.border}66` : '0 2px 8px rgba(0,0,0,0.06)',
        transition: 'transform .2s, box-shadow .2s',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Gradient top accent */}
      <div style={{ height: 5, background: `linear-gradient(90deg, ${c.border}, ${c.border}88)`, flexShrink: 0 }} />

      {/* Body */}
      <div style={{ padding: '12px 14px 10px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Pin button */}
        <button
          onClick={e => { e.stopPropagation(); onPinToggle() }}
          title={note.pinned ? 'Unpin' : 'Pin'}
          style={{
            position: 'absolute', top: 10, right: 10,
            background: 'none', border: 'none', cursor: 'pointer',
            color: note.pinned ? '#f97316' : '#9ca3af',
            padding: 3, borderRadius: 6, transition: 'opacity .15s',
            opacity: note.pinned || hovered ? 1 : 0,
          }}
        >
          <Pin size={13} style={{ fill: note.pinned ? 'currentColor' : 'none' }} />
        </button>

        {/* Color dot + title */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, paddingRight: 20 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.border, flexShrink: 0, marginTop: 5 }} />
          <p style={{
            fontSize: 14, fontWeight: 700, color: c.text,
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            lineHeight: 1.35,
          }}>
            {note.title || <span style={{ fontWeight: 400, fontStyle: 'italic', color: '#9ca3af' }}>Untitled</span>}
          </p>
        </div>

        {/* Content */}
        {note.content && (
          <p style={{
            fontSize: 12.5, color: c.text, opacity: 0.75, lineHeight: 1.55,
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 4, WebkitBoxOrient: 'vertical',
            whiteSpace: 'pre-wrap', flex: 1,
          }}>
            {note.content}
          </p>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '7px 14px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderTop: `1px solid ${c.border}44`, flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, color: c.text, opacity: 0.55, fontWeight: 500 }}>
          {timeAgo(note.updatedAt)}
        </span>
        {note.content.length > 120 && (
          <span style={{ fontSize: 10, color: c.text, opacity: 0.4, fontWeight: 600, letterSpacing: '0.05em' }}>
            READ MORE
          </span>
        )}
      </div>
    </div>
  )
}

// ── Note Modal ────────────────────────────────────────────────────
function NoteModal({
  note, onClose, onSave, onDelete, isNew,
}: {
  note: Partial<Note>; onClose: () => void
  onSave: (f: Partial<Note>) => Promise<void>
  onDelete?: () => Promise<void>; isNew?: boolean
}) {
  const [title, setTitle]     = useState(note.title ?? '')
  const [content, setContent] = useState(note.content ?? '')
  const [color, setColor]     = useState(note.color ?? '#fef08a')
  const [pinned, setPinned]   = useState(note.pinned ?? false)
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [showColors, setShowColors] = useState(false)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  useAutoResize(contentRef, content)

  const c = getColor(color)

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const save = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); handleSave() } }
    window.addEventListener('keydown', esc)
    window.addEventListener('keydown', save)
    return () => { window.removeEventListener('keydown', esc); window.removeEventListener('keydown', save) }
  })

  async function handleSave() {
    if (!title.trim() && !content.trim()) { onClose(); return }
    setSaving(true)
    await onSave({ title: title.trim(), content, color, pinned })
    setSaving(false); onClose()
  }

  async function handleDelete() {
    if (!onDelete) return
    setDeleting(true); await onDelete(); setDeleting(false); onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && handleSave()} style={{ zIndex: 1000 }}>
      <div className="modal-box" style={{
        maxWidth: 560, width: '100%', padding: 0, overflow: 'hidden',
        background: color,
        border: `2px solid ${c.border}`,
        borderRadius: 20, boxShadow: `0 32px 80px rgba(0,0,0,0.2), 0 0 0 1px ${c.border}44`,
      }}>
        {/* Top gradient bar */}
        <div style={{ height: 6, background: `linear-gradient(90deg, ${c.border}, ${c.border}66)` }} />

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px 0' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.border, flexShrink: 0 }} />
          <input
            autoFocus
            type="text" placeholder="Note title…" value={title}
            onChange={e => setTitle(e.target.value)}
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 19, fontWeight: 700, color: c.text, fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: `${c.border}55`, margin: '12px 20px 0' }} />

        {/* Content */}
        <div style={{ padding: '10px 20px' }}>
          <textarea
            ref={contentRef} placeholder="Write your note…" value={content}
            onChange={e => setContent(e.target.value)}
            style={{
              width: '100%', border: 'none', outline: 'none', background: 'transparent',
              fontSize: 14.5, color: c.text, lineHeight: 1.7, resize: 'none',
              fontFamily: 'inherit', minHeight: 130, maxHeight: 420, overflowY: 'auto',
            }}
          />
        </div>

        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 16px 14px', borderTop: `1px solid ${c.border}44`, flexWrap: 'wrap',
        }}>
          {/* Pin */}
          <button onClick={() => setPinned(p => !p)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
            borderRadius: 20, border: `1.5px solid ${pinned ? c.border : 'var(--border)'}`,
            background: pinned ? `${c.border}33` : 'transparent',
            color: pinned ? c.text : 'var(--text-3)', cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
          }}>
            <Pin size={13} style={{ fill: pinned ? 'currentColor' : 'none' }} />
            {pinned ? 'Pinned' : 'Pin'}
          </button>

          {/* Color picker */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowColors(p => !p)} style={{
              width: 30, height: 30, borderRadius: '50%', background: color,
              border: `2.5px solid ${c.border}`, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: c.border }} />
            </button>
            {showColors && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setShowColors(false)} />
                <div style={{
                  position: 'absolute', bottom: 38, left: 0, zIndex: 20,
                  background: '#fff', border: '1px solid var(--border)', borderRadius: 14,
                  padding: 10, display: 'flex', gap: 8, flexWrap: 'wrap', width: 214,
                  boxShadow: 'var(--shadow-lg)',
                }}>
                  {COLORS.map(cl => (
                    <button key={cl.hex} onClick={() => { setColor(cl.hex); setShowColors(false) }} title={cl.label}
                      style={{
                        width: 32, height: 32, borderRadius: '50%', background: cl.hex,
                        border: `2.5px solid ${color === cl.hex ? cl.border : '#e5e7eb'}`,
                        cursor: 'pointer', position: 'relative',
                        boxShadow: color === cl.hex ? `0 0 0 2px ${cl.border}` : 'none',
                        transition: 'all .15s',
                      }}>
                      {color === cl.hex && <Check size={13} style={{ position: 'absolute', inset: 0, margin: 'auto', color: cl.text }} />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div style={{ flex: 1 }} />

          {/* Delete */}
          {!isNew && onDelete && (
            confirmDel ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--red)' }}>Delete?</span>
                <button onClick={handleDelete} disabled={deleting}
                  style={{ fontSize: 12, padding: '4px 10px', borderRadius: 8, border: 'none', background: 'var(--red)', color: '#fff', cursor: 'pointer' }}>
                  {deleting ? '…' : 'Yes'}
                </button>
                <button onClick={() => setConfirmDel(false)}
                  style={{ fontSize: 12, padding: '4px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>
                  No
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmDel(true)} title="Delete"
                style={{ padding: '6px 10px', borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', alignItems: 'center' }}>
                <Trash2 size={14} />
              </button>
            )
          )}

          <button onClick={onClose}
            style={{ padding: '6px 12px', borderRadius: 10, border: `1px solid ${c.border}`, background: 'transparent', cursor: 'pointer', color: c.text, fontSize: 13 }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary"
            style={{ padding: '6px 18px', fontSize: 13, minHeight: 34 }}>
            {saving ? 'Saving…' : isNew ? 'Add note' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Section Header ────────────────────────────────────────────────
function SectionHeader({ icon, label, count, color }: { icon: React.ReactNode; label: string; count: number; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      {icon}
      <span style={{ fontSize: 11, fontWeight: 800, color: color ?? 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{
        fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 99,
        background: color ? `${color}22` : 'var(--bg-3)', color: color ?? 'var(--text-3)',
        border: `1px solid ${color ? `${color}44` : 'var(--border)'}`,
      }}>
        {count}
      </span>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────
export default function NotesPage() {
  const [notes, setNotes]     = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [modal, setModal]     = useState<{ note: Partial<Note>; isNew: boolean } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notes')
      const d   = await res.json()
      setNotes((d.notes ?? []).filter(Boolean))
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const safeNotes = notes.filter((n): n is Note => n != null)
  const filtered  = safeNotes.filter(n => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
  })

  const pinned   = filtered.filter(n => n.pinned)
  const unpinned = filtered.filter(n => !n.pinned)

  async function handleSave(id: string | undefined, fields: Partial<Note>) {
    if (id) {
      const res = await fetch('/api/notes', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...fields }) })
      const d = await res.json()
      if (d.note) setNotes(prev => prev.map(n => n?.id === id ? d.note : n).filter(Boolean) as Note[])
    } else {
      const res = await fetch('/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) })
      const d = await res.json()
      if (d.note) setNotes(prev => [d.note, ...prev])
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/notes?id=${id}`, { method: 'DELETE' })
    setNotes(prev => prev.filter(n => n?.id !== id))
  }

  async function handlePinToggle(note: Note) {
    const res = await fetch('/api/notes', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: note.id, pinned: !note.pinned }) })
    const d = await res.json()
    if (!d.note) return
    setNotes(prev => prev
      .map(n => n?.id === note.id ? d.note : n)
      .filter((n): n is Note => n != null)
      .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      })
    )
  }

  function openNew() {
    setModal({ note: { color: '#fef08a', pinned: false }, isNew: true })
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto' }}>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12, background: 'var(--violet-bg)',
              border: '1px solid var(--violet-border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <StickyNote size={20} style={{ color: 'var(--violet)' }} />
            </div>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1 }}>Quick Notes</h2>
              <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 3 }}>
                {loading ? 'Loading…' : notes.length === 0 ? 'Capture your thoughts and ideas' : `${notes.length} note${notes.length !== 1 ? 's' : ''} · ${pinned.length} pinned`}
              </p>
            </div>
          </div>
        </div>
        <button onClick={openNew} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', fontSize: 14 }}>
          <Plus size={16} /> New note
        </button>
      </div>

      {/* ── Search ── */}
      {notes.length > 0 && (
        <div style={{ position: 'relative', marginBottom: 28, maxWidth: 360 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
          <input type="text" placeholder="Search notes…" value={search} onChange={e => setSearch(e.target.value)}
            className="form-input" style={{ paddingLeft: 34, width: '100%', height: 38, fontSize: 13 }} />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex' }}>
              <X size={13} />
            </button>
          )}
        </div>
      )}

      {/* ── Loading skeletons ── */}
      {loading && (
        <div style={{ display: 'flex', gap: 14, paddingBottom: 8 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ flexShrink: 0, width: 220, height: 160, borderRadius: 16 }} />
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && notes.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '64px 24px' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20, background: 'var(--violet-bg)',
            border: '1px solid var(--violet-border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <FileText size={28} style={{ color: 'var(--violet)' }} />
          </div>
          <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>No notes yet</p>
          <p style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 24 }}>Create your first note to capture ideas, reminders or anything.</p>
          <button onClick={openNew} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Plus size={16} /> Create first note
          </button>
        </div>
      )}

      {/* ── No search results ── */}
      {!loading && notes.length > 0 && filtered.length === 0 && (
        <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-3)' }}>
          <p style={{ fontSize: 15, fontWeight: 600 }}>No notes match "{search}"</p>
        </div>
      )}

      {/* ── Pinned section ── */}
      {!loading && pinned.length > 0 && (
        <div className="card" style={{ padding: '20px 24px', marginBottom: 20 }}>
          <SectionHeader
            icon={<Pin size={13} style={{ color: '#f97316', fill: '#f97316' }} />}
            label="Pinned"
            count={pinned.length}
            color="#f97316"
          />
          <NoteScroller notes={pinned} onOpen={n => setModal({ note: n, isNew: false })} onPinToggle={handlePinToggle} />
        </div>
      )}

      {/* ── All / Other notes section ── */}
      {!loading && unpinned.length > 0 && (
        <div className="card" style={{ padding: '20px 24px' }}>
          <SectionHeader
            icon={<StickyNote size={13} style={{ color: 'var(--violet)' }} />}
            label={pinned.length > 0 ? 'Others' : 'All Notes'}
            count={unpinned.length}
            color="var(--violet)"
          />
          <NoteScroller
            notes={unpinned}
            onOpen={n => setModal({ note: n, isNew: false })}
            onPinToggle={handlePinToggle}
            onNew={openNew}
            showAddCard
          />
        </div>
      )}

      {/* ── Modal ── */}
      {modal && (
        <NoteModal
          note={modal.note} isNew={modal.isNew}
          onClose={() => setModal(null)}
          onSave={fields => handleSave(modal.note.id, fields)}
          onDelete={modal.note.id ? () => handleDelete(modal.note.id!) : undefined}
        />
      )}
    </div>
  )
}
