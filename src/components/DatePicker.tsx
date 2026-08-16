'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { createPortal } from 'react-dom'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS_SHORT = ['Su','Mo','Tu','We','Th','Fr','Sa']

function toYMD(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
}

function parseYMD(s: string) {
  if (!s || s.length < 10) return null
  const [y, m, d] = s.split('-').map(Number)
  if (!y || !m || !d) return null
  return { y, m, d }
}

function formatDisplay(s: string) {
  const p = parseYMD(s)
  if (!p) return ''
  return `${String(p.d).padStart(2,'0')} ${MONTHS[p.m - 1].slice(0, 3)} ${p.y}`
}

function buildCells(year: number, month: number) {
  const firstDow = new Date(year, month - 1, 1).getDay()
  const daysThis = new Date(year, month, 0).getDate()
  const [prevY, prevM] = month === 1 ? [year - 1, 12] : [year, month - 1]
  const [nextY, nextM] = month === 12 ? [year + 1, 1] : [year, month + 1]
  const daysPrev = new Date(prevY, prevM, 0).getDate()

  const cells: { date: string; day: number; current: boolean }[] = []
  for (let i = firstDow - 1; i >= 0; i--)
    cells.push({ date: toYMD(prevY, prevM, daysPrev - i), day: daysPrev - i, current: false })
  for (let d = 1; d <= daysThis; d++)
    cells.push({ date: toYMD(year, month, d), day: d, current: true })
  const trailing = 42 - cells.length
  for (let d = 1; d <= trailing; d++)
    cells.push({ date: toYMD(nextY, nextM, d), day: d, current: false })
  return cells
}

export interface DatePickerProps {
  value: string           // YYYY-MM-DD or ''
  onChange: (v: string) => void
  placeholder?: string
  min?: string
  max?: string
  style?: React.CSSProperties
  inputStyle?: React.CSSProperties
  className?: string
  /** compact mode: height 36px, font 13px */
  compact?: boolean
}

export function DatePicker({
  value, onChange, placeholder = 'Select date',
  min, max, style, inputStyle, className = '', compact,
}: DatePickerProps) {
  const today = toYMD(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate())
  const parsed = parseYMD(value)

  const [open, setOpen] = useState(false)
  const [dispY, setDispY] = useState(parsed?.y ?? new Date().getFullYear())
  const [dispM, setDispM] = useState(parsed?.m ?? new Date().getMonth() + 1)
  const [dropPos, setDropPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 280 })
  const [mounted, setMounted] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const p = parseYMD(value)
    if (p) { setDispY(p.y); setDispM(p.m) }
  }, [value])

  const openCalendar = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    const calW = 280
    const calH = 320
    const spaceBelow = window.innerHeight - rect.bottom
    const top = spaceBelow >= calH ? rect.bottom + 6 : rect.top - calH - 6
    // Prefer left-align with trigger; if that would overflow right edge, right-align instead
    const naturalLeft = rect.left
    const left = naturalLeft + calW > window.innerWidth - 8
      ? Math.max(8, rect.right - calW)
      : naturalLeft
    setDropPos({ top, left, width: Math.max(rect.width, calW) })
    setOpen(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        panelRef.current?.contains(e.target as Node)
      ) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function prevMonth() {
    if (dispM === 1) { setDispM(12); setDispY(y => y - 1) }
    else setDispM(m => m - 1)
  }
  function nextMonth() {
    if (dispM === 12) { setDispM(1); setDispY(y => y + 1) }
    else setDispM(m => m + 1)
  }

  const cells = buildCells(dispY, dispM)

  function select(date: string) {
    if (min && date < min) return
    if (max && date > max) return
    onChange(date)
    setOpen(false)
  }

  const h = compact ? 36 : 44
  const fs = compact ? 13 : 14

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      onClick={() => open ? setOpen(false) : openCalendar()}
      style={{
        width: '100%', height: h, padding: '0 12px',
        display: 'flex', alignItems: 'center', gap: 8,
        border: `1px solid ${open ? 'var(--violet)' : 'var(--border)'}`,
        borderRadius: 10,
        background: 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        boxShadow: open ? '0 0 0 3px rgba(101,88,211,0.12)' : 'none',
        cursor: 'pointer', textAlign: 'left',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        ...inputStyle,
      }}
    >
      <CalendarDays size={compact ? 13 : 14} style={{ color: 'var(--violet)', flexShrink: 0 }} />
      <span style={{ fontSize: fs, color: value ? 'var(--text-1)' : 'var(--text-3)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value ? formatDisplay(value) : placeholder}
      </span>
    </button>
  )

  const panel = open && mounted ? createPortal(
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        top: dropPos.top,
        left: dropPos.left,
        width: 280,
        zIndex: 9999,
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        boxShadow: '0 16px 48px rgba(101,88,211,0.18), 0 4px 16px rgba(0,0,0,0.1)',
        padding: '14px 12px 10px',
        animation: 'scale-in 0.15s cubic-bezier(0.34,1.56,0.64,1) both',
      }}
    >
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button type="button" onClick={prevMonth} style={navBtn}>
          <ChevronLeft size={14} />
        </button>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.01em' }}>
          {MONTHS[dispM - 1]} {dispY}
        </span>
        <button type="button" onClick={nextMonth} style={navBtn}>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
        {DAYS_SHORT.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text-3)', padding: '2px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
        {cells.map(cell => {
          const selected = cell.date === value
          const isToday = cell.date === today
          const disabled = (min && cell.date < min) || (max && cell.date > max)
          const hover = hovered === cell.date && !selected && !disabled

          return (
            <button
              key={cell.date}
              type="button"
              disabled={!!disabled}
              onClick={() => select(cell.date)}
              onMouseEnter={() => setHovered(cell.date)}
              onMouseLeave={() => setHovered(null)}
              style={{
                width: '100%', aspectRatio: '1/1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 8,
                border: isToday && !selected ? '1.5px solid var(--violet)' : '1.5px solid transparent',
                background: selected
                  ? 'var(--violet)'
                  : hover
                  ? 'var(--violet-bg)'
                  : 'transparent',
                color: selected
                  ? '#fff'
                  : cell.current
                  ? isToday ? 'var(--violet)' : 'var(--text-1)'
                  : 'var(--text-3)',
                fontSize: 12,
                fontWeight: selected || isToday ? 700 : cell.current ? 500 : 400,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.3 : 1,
                transition: 'background 0.1s',
              }}
            >
              {cell.day}
            </button>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
        <button
          type="button"
          onClick={() => { onChange(''); setOpen(false) }}
          style={footerBtn}
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => select(today)}
          style={{ ...footerBtn, color: 'var(--violet)', fontWeight: 700 }}
        >
          Today
        </button>
      </div>
    </div>,
    document.body
  ) : null

  return (
    <div className={className} style={{ position: 'relative', ...style }}>
      {trigger}
      {panel}
    </div>
  )
}

const navBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 28, height: 28, borderRadius: 8,
  border: '1px solid var(--border)', background: 'transparent',
  cursor: 'pointer', color: 'var(--text-2)',
  flexShrink: 0,
}

const footerBtn: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'var(--text-2)',
  background: 'none', border: 'none', cursor: 'pointer',
  padding: '4px 10px', borderRadius: 6,
}
