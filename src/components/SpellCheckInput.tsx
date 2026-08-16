'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'

const cache = new Map<string, string[]>()

export interface SpellCheckInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  style?: React.CSSProperties
  autoFocus?: boolean
  disabled?: boolean
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
}

export function SpellCheckInput({
  value, onChange, placeholder, className, style, autoFocus, disabled, inputMode,
}: SpellCheckInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [wordRange, setWordRange] = useState({ start: 0, end: 0 })
  const [highlighted, setHighlighted] = useState(-1)
  const [open, setOpen] = useState(false)
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 })
  const [mounted, setMounted] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => () => clearTimeout(timerRef.current), [])
  useEffect(() => { setHighlighted(-1) }, [suggestions])

  useEffect(() => {
    if (!open) return
    const rect = inputRef.current?.getBoundingClientRect()
    if (!rect) return
    const w = Math.max(rect.width, 220)
    const left = rect.left + w > window.innerWidth - 8 ? Math.max(8, rect.right - w) : rect.left
    setDropPos({ top: rect.bottom + 4, left, width: w })
  }, [open])

  const checkSpelling = useCallback(async (text: string, cursor: number) => {
    // Extract ALL words ≥ 3 alpha characters
    const wordMatches: { word: string; start: number; end: number }[] = []
    const regex = /[a-zA-Z']{3,}/g
    let m: RegExpExecArray | null
    while ((m = regex.exec(text)) !== null) {
      wordMatches.push({ word: m[0], start: m.index, end: m.index + m[0].length })
    }

    if (wordMatches.length === 0) { setSuggestions([]); setOpen(false); return }

    // Sort by proximity to cursor — check the word the user is nearest to first
    wordMatches.sort((a, b) => {
      const da = Math.min(Math.abs(a.start - cursor), Math.abs(a.end - cursor))
      const db = Math.min(Math.abs(b.start - cursor), Math.abs(b.end - cursor))
      return da - db
    })

    abortRef.current?.abort()
    abortRef.current = new AbortController()

    for (const { word, start, end } of wordMatches) {
      const lower = word.toLowerCase().replace(/^'+|'+$/g, '')
      if (lower.length < 3) continue

      let suggs: string[]

      if (cache.has(lower)) {
        suggs = cache.get(lower)!
      } else {
        try {
          const res = await fetch(`/api/spellcheck?word=${encodeURIComponent(lower)}`, {
            signal: abortRef.current.signal,
          })
          if (!res.ok) continue
          const data = await res.json()
          suggs = data.suggestions ?? []
          cache.set(lower, suggs)
        } catch {
          continue
        }
      }

      if (suggs.length > 0) {
        setWordRange({ start, end })
        setSuggestions(suggs)
        setOpen(true)
        return
      }
    }

    setSuggestions([])
    setOpen(false)
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const text = e.target.value
    onChange(text)
    const cursor = e.target.selectionStart ?? text.length
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => checkSpelling(text, cursor), 400)
  }

  function applySuggestion(suggestion: string) {
    const newValue = value.slice(0, wordRange.start) + suggestion + value.slice(wordRange.end)
    onChange(newValue)
    setSuggestions([]); setOpen(false); setHighlighted(-1)
    setTimeout(() => {
      const pos = wordRange.start + suggestion.length
      inputRef.current?.setSelectionRange(pos, pos)
      inputRef.current?.focus()
    }, 0)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => Math.min(h + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted(h => Math.max(h - 1, -1)) }
    else if (e.key === 'Enter' && highlighted >= 0) { e.preventDefault(); applySuggestion(suggestions[highlighted]) }
    else if (e.key === 'Escape') { setOpen(false) }
  }

  const dropdown = open && suggestions.length > 0 && mounted
    ? createPortal(
        <div style={{
          position: 'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width,
          zIndex: 99999,
          background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid var(--border)', borderRadius: 12,
          boxShadow: '0 8px 32px rgba(101,88,211,0.15), 0 2px 8px rgba(0,0,0,0.08)',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px 5px',
            borderBottom: '1px solid var(--border)', background: 'var(--violet-bg)',
          }}>
            <span style={{ fontSize: 15 }}>✏️</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--violet)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Did you mean?
            </span>
          </div>
          {suggestions.map((s, i) => (
            <div
              key={s}
              onMouseDown={() => applySuggestion(s)}
              onMouseEnter={() => setHighlighted(i)}
              style={{
                padding: '9px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                background: i === highlighted ? 'var(--violet)' : 'transparent',
                color: i === highlighted ? '#fff' : 'var(--text-1)',
                borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none',
                transition: 'background 0.1s',
              }}
            >
              <span style={{ opacity: 0.45, fontSize: 11 }}>→</span>
              {s}
            </div>
          ))}
        </div>,
        document.body
      )
    : null

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        placeholder={placeholder}
        className={className}
        style={style}
        autoFocus={autoFocus}
        disabled={disabled}
        inputMode={inputMode}
        spellCheck={true}
        autoComplete="off"
      />
      {dropdown}
    </>
  )
}
