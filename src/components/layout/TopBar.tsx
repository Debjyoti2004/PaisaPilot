'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Bell, X, Command, Plus, Mic } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatINR } from '@/lib/finance'

interface SearchResult {
  pages: Array<{ name: string; href: string; icon: string; description: string }>
  transactions: Array<{ id: string; narration: string; amount: number; type: string; category: { name: string; icon: string } }>
  categories: Array<{ id: string; name: string; icon: string }>
}

interface Notification {
  id: string; title: string; message: string; type: string; read: boolean; createdAt: string
}

interface TopBarProps {
  title: string
  subtitle?: string
  onAdd?: () => void          // show + button in topbar on mobile
  onVoice?: () => void        // show mic button in topbar on mobile
}

export function TopBar({ title, subtitle, onAdd, onVoice }: TopBarProps) {
  const router = useRouter()
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult | null>(null)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true) }
      if (e.key === 'Escape') { setSearchOpen(false); setNotifOpen(false) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchRef.current?.focus(), 50)
  }, [searchOpen])

  useEffect(() => {
    if (!query || query.length < 2) { setResults(null); return }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data.results)
        setSelectedIdx(0)
      } catch {}
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    if (!notifOpen) return
    fetch('/api/notifications')
      .then(r => r.json())
      .then(d => { setNotifs(d.notifications || []); setUnread(d.unreadCount || 0) })
      .catch(() => {})
  }, [notifOpen])

  useEffect(() => {
    fetch('/api/notifications')
      .then(r => r.json())
      .then(d => setUnread(d.unreadCount || 0))
      .catch(() => {})
  }, [])

  const allResults = results ? [
    ...results.pages.map(p => ({ type: 'page' as const, name: p.name, href: p.href, description: p.description, icon: p.icon })),
    ...results.transactions.map(t => ({ type: 'tx' as const, name: t.narration, href: '/transactions', description: `${t.category.icon} ${t.category.name} · ${formatINR(t.amount)}`, icon: t.category.icon })),
    ...results.categories.map(c => ({ type: 'cat' as const, name: c.name, href: '/transactions', description: 'Category', icon: c.icon })),
  ] : []

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, allResults.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && allResults[selectedIdx]) {
      router.push(allResults[selectedIdx].href)
      setSearchOpen(false); setQuery('')
    }
  }

  const markAllRead = async () => {
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    setUnread(0); setNotifs(n => n.map(x => ({ ...x, read: true })))
  }

  const typeIcon: Record<string, string> = { info: '💡', success: '✅', warning: '⚠️', error: '🚨' }

  return (
    <>
      <header className="sticky top-0 z-30 h-[60px] flex items-center px-4 md:px-6 gap-4 bg-[rgba(13,13,20,0.92)] backdrop-blur-md border-b border-white/[0.07]">
        <div className="flex-1 min-w-0">
          <h1 className="text-[15px] font-semibold text-white leading-none truncate">{title}</h1>
          {subtitle && <p className="text-[11px] text-slate-500 mt-0.5 leading-none">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1.5 md:gap-2">
          {/* Mobile-only: voice + add buttons in topbar */}
          {onVoice && (
            <button onClick={onVoice}
              className="md:hidden w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-indigo-400 transition-colors">
              <Mic size={16} />
            </button>
          )}
          {onAdd && (
            <button onClick={onAdd}
              className="md:hidden w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white hover:bg-indigo-500 transition-colors">
              <Plus size={18} strokeWidth={2.5} />
            </button>
          )}
          {/* Search */}
          <button onClick={() => setSearchOpen(true)}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.08] transition-all text-[12px]">
            <Search size={13} />
            <span>Search...</span>
            <span className="flex items-center gap-0.5 text-[10px] text-slate-600 ml-1 bg-white/[0.05] px-1.5 py-0.5 rounded-md">
              <Command size={9} />K
            </span>
          </button>
          <button onClick={() => setSearchOpen(true)}
            className="md:hidden w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors">
            <Search size={16} />
          </button>
          <button onClick={() => setNotifOpen(o => !o)}
            className="relative w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors">
            <Bell size={16} />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-indigo-500 text-[9px] font-bold text-white flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Search overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex flex-col items-center pt-16 px-4 animate-fade-in">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setSearchOpen(false); setQuery('') }} />
          <div className="relative w-full max-w-xl animate-scale-in">
            <div className="bg-[#13131f] border border-white/[0.1] rounded-2xl overflow-hidden shadow-2xl">
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.07]">
                <Search size={16} className="text-slate-500 flex-shrink-0" />
                <input ref={searchRef} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKeyDown}
                  placeholder="Search transactions, categories, pages..." className="flex-1 bg-transparent text-[14px] text-white placeholder:text-slate-600 focus:outline-none" />
                {query && <button onClick={() => setQuery('')} className="text-slate-500 hover:text-slate-300"><X size={14} /></button>}
                <kbd className="hidden md:block text-[10px] text-slate-600 border border-white/[0.08] rounded px-1.5 py-0.5">Esc</kbd>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {allResults.length === 0 && query.length >= 2 && (
                  <div className="py-8 text-center text-slate-500 text-[13px]">No results for &quot;{query}&quot;</div>
                )}
                {allResults.length === 0 && query.length < 2 && (
                  <div className="p-4 space-y-1">
                    <p className="text-[10px] uppercase tracking-widest text-slate-600 px-2 mb-2">Quick Links</p>
                    {[
                      { name: 'Salary Split', href: '/split', icon: '✂️' },
                      { name: 'View Goals', href: '/goals', icon: '🎯' },
                      { name: 'AI Assistant', href: '/assistant', icon: '🤖' },
                      { name: 'Investments', href: '/investments', icon: '📈' },
                    ].map(item => (
                      <Link key={item.href} href={item.href} onClick={() => { setSearchOpen(false); setQuery('') }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.05] transition-colors text-[13px] text-slate-300">
                        <span>{item.icon}</span><span>{item.name}</span>
                      </Link>
                    ))}
                  </div>
                )}
                {allResults.length > 0 && (
                  <div className="p-2">
                    {allResults.map((r, i) => (
                      <Link key={i} href={r.href} onClick={() => { setSearchOpen(false); setQuery('') }}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-[13px] ${i === selectedIdx ? 'bg-indigo-500/10 text-indigo-300' : 'text-slate-300 hover:bg-white/[0.05]'}`}>
                        <span className="text-base w-6 text-center flex-shrink-0">{r.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{r.name}</p>
                          {r.description && <p className="text-[11px] text-slate-500 truncate mt-0.5">{r.description}</p>}
                        </div>
                        <span className="text-[10px] text-slate-600 flex-shrink-0 capitalize">{r.type}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {notifOpen && (
        <div className="fixed inset-0 z-50 animate-fade-in" onClick={() => setNotifOpen(false)}>
          <div className="absolute top-[60px] right-4 w-80 bg-[#13131f] border border-white/[0.1] rounded-2xl shadow-2xl animate-scale-in overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
              <p className="text-[13px] font-semibold text-white">Notifications</p>
              {unread > 0 && <button onClick={markAllRead} className="text-[11px] text-indigo-400 hover:text-indigo-300">Mark all read</button>}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifs.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-[13px]">No notifications</div>
              ) : notifs.map(n => (
                <div key={n.id} className={`px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors ${!n.read ? 'bg-indigo-500/[0.04]' : ''}`}>
                  <div className="flex items-start gap-2.5">
                    <span className="text-base flex-shrink-0 mt-0.5">{typeIcon[n.type] || '💡'}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[12px] leading-snug ${!n.read ? 'font-semibold text-white' : 'text-slate-300'}`}>{n.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{n.message}</p>
                      <p className="text-[10px] text-slate-600 mt-1">{new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                    </div>
                    {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0 mt-1.5" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
