'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, LayoutDashboard, ArrowLeftRight, Wallet, PiggyBank, Target, TrendingUp, Scissors, Bot, User, Hash } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface SearchResult {
  id: string
  type: 'page' | 'transaction' | 'category'
  title: string
  subtitle?: string
  href?: string
  icon: LucideIcon
}

const PAGES: SearchResult[] = [
  { id: 'dashboard', type: 'page', title: 'Dashboard', subtitle: 'Overview & summary', href: '/', icon: LayoutDashboard },
  { id: 'transactions', type: 'page', title: 'Transactions', subtitle: 'All your transactions', href: '/transactions', icon: ArrowLeftRight },
  { id: 'envelopes', type: 'page', title: 'Envelopes', subtitle: 'Budget envelopes', href: '/envelopes', icon: Wallet },
  { id: 'savings', type: 'page', title: 'Savings', subtitle: 'Savings buckets', href: '/savings', icon: PiggyBank },
  { id: 'goals', type: 'page', title: 'Goals', subtitle: 'Financial goals', href: '/goals', icon: Target },
  { id: 'investments', type: 'page', title: 'Investments', subtitle: 'SIP & portfolio', href: '/investments', icon: TrendingUp },
  { id: 'split', type: 'page', title: 'Salary Split', subtitle: 'Split your salary', href: '/split', icon: Scissors },
  { id: 'assistant', type: 'page', title: 'AI Assistant', subtitle: 'Chat with AI', href: '/assistant', icon: Bot },
  { id: 'profile', type: 'page', title: 'Profile', subtitle: 'Settings & profile', href: '/profile', icon: User },
]

interface GlobalSearchProps {
  isOpen: boolean
  onClose: () => void
}

export default function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const fetchTransactions = useCallback(async (q: string): Promise<SearchResult[]> => {
    if (q.length < 2) return []
    try {
      const res = await fetch(`/api/transactions?search=${encodeURIComponent(q)}&month=${new Date().toISOString().slice(0, 7)}`)
      if (!res.ok) return []
      const data = await res.json() as { transactions?: Array<{ id: string; narration?: string; category?: { name?: string }; amount?: number }> }
      return (data.transactions ?? []).slice(0, 5).map((t) => ({
        id: t.id,
        type: 'transaction' as const,
        title: t.narration ?? 'Transaction',
        subtitle: `${t.category?.name ?? ''} · ₹${(t.amount ?? 0).toLocaleString('en-IN')}`,
        href: '/transactions',
        icon: Hash,
      }))
    } catch {
      return []
    }
  }, [])

  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setResults([])
      setSelectedIndex(0)
      return
    }
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [isOpen])

  useEffect(() => {
    if (!query.trim()) {
      setResults(PAGES.slice(0, 6))
      setSelectedIndex(0)
      return
    }
    const q = query.toLowerCase()
    const pageResults = PAGES.filter(
      (p) => p.title.toLowerCase().includes(q) || (p.subtitle ?? '').toLowerCase().includes(q)
    )
    fetchTransactions(query).then((txns) => {
      setResults([...pageResults, ...txns])
      setSelectedIndex(0)
    })
  }, [query, fetchTransactions])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, results.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)) }
      if (e.key === 'Enter' && results[selectedIndex]?.href) {
        e.preventDefault()
        router.push(results[selectedIndex].href!)
        onClose()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, results, selectedIndex, router, onClose])

  if (!isOpen) return null

  const pageResults = results.filter((r) => r.type === 'page')
  const txnResults = results.filter((r) => r.type === 'transaction')
  let globalIdx = 0

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '80px',
        paddingLeft: '16px',
        paddingRight: '16px',
      }}
    >
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} />

      <div
        className="animate-scale-in"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '560px',
          background: '#13131f',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
      >
        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <Search size={18} color="#64748b" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, transactions..."
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#f1f5f9', fontSize: '15px' }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}>
              <X size={16} />
            </button>
          )}
          <kbd style={{ fontSize: '11px', color: '#475569', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '2px 6px' }}>Esc</kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {results.length === 0 && query && (
            <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {pageResults.length > 0 && (
            <div>
              <div style={{ padding: '10px 20px 4px', fontSize: '11px', fontWeight: '600', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pages</div>
              {pageResults.map((result) => {
                const idx = globalIdx++
                const Icon = result.icon
                const isSelected = idx === selectedIndex
                return (
                  <button
                    key={result.id}
                    onClick={() => { if (result.href) { router.push(result.href); onClose() } }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 20px', background: isSelected ? 'rgba(99,102,241,0.1)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s' }}
                  >
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: isSelected ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={15} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: isSelected ? '#818cf8' : '#e2e8f0' }}>{result.title}</div>
                      {result.subtitle && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '1px' }}>{result.subtitle}</div>}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {txnResults.length > 0 && (
            <div>
              <div style={{ padding: '10px 20px 4px', fontSize: '11px', fontWeight: '600', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Transactions</div>
              {txnResults.map((result) => {
                const idx = globalIdx++
                const isSelected = idx === selectedIndex
                return (
                  <button
                    key={result.id}
                    onClick={() => { if (result.href) { router.push(result.href); onClose() } }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 20px', background: isSelected ? 'rgba(99,102,241,0.1)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Hash size={14} color="#64748b" />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: isSelected ? '#818cf8' : '#e2e8f0' }}>{result.title}</div>
                      {result.subtitle && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '1px' }}>{result.subtitle}</div>}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {!query && (
            <div style={{ padding: '8px 20px 16px' }}>
              <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>
                Type to search · Use ↑↓ to navigate · Enter to open
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
