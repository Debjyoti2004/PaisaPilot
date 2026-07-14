'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, MicOff, Check, X, Loader2, ChevronDown } from 'lucide-react'

interface SpeechRecI {
  start(): void; stop(): void
  lang: string; continuous: boolean; interimResults: boolean
  onresult: ((e: { results: SpeechRecognitionResultList }) => void) | null
  onend: (() => void) | null
  onerror?: ((e: Event) => void) | null
}

interface ParsedExpense {
  amount: number
  categoryHint: string
  narration: string
}

interface Category {
  id: string; name: string; kind: string; icon: string
}

const CATEGORY_KEYWORDS: Record<string, string> = {
  food: 'Food', groceries: 'Groceries', grocery: 'Groceries',
  zomato: 'Eating Out', swiggy: 'Eating Out', restaurant: 'Eating Out', 'eating out': 'Eating Out',
  coffee: 'Coffee & Drinks', tea: 'Coffee & Drinks', starbucks: 'Coffee & Drinks',
  petrol: 'Fuel', fuel: 'Fuel', diesel: 'Fuel',
  cab: 'Cab / Auto', uber: 'Cab / Auto', ola: 'Cab / Auto', auto: 'Cab / Auto', rapido: 'Cab / Auto',
  metro: 'Metro / Bus', bus: 'Metro / Bus',
  medicine: 'Medicine', doctor: 'Medicine', pharmacy: 'Medicine', medical: 'Medicine',
  rent: 'Rent', electricity: 'Electricity', internet: 'Internet', wifi: 'Internet',
  gym: 'Gym', workout: 'Gym', fitness: 'Gym',
  shopping: 'Fun / Misc', amazon: 'Fun / Misc', flipkart: 'Fun / Misc', netflix: 'Fun / Misc',
  serum: 'Serum', sunscreen: 'Sunscreen', moisturizer: 'Moisturizer',
  haircut: 'Haircut', salon: 'Grooming', grooming: 'Grooming',
  invest: 'Nifty 50 SIP', sip: 'Nifty 50 SIP', nifty: 'Nifty 50 SIP', mutual: 'Nifty 50 SIP',
  emi: 'EMI', loan: 'EMI',
  salary: 'Salary', income: 'Salary', freelance: 'Salary',
  supplement: 'Gym Supplements', protein: 'Gym Supplements',
}

function parseVoice(text: string): ParsedExpense {
  const t = text.toLowerCase().trim()

  // Amount: "5k" → 5000, "5.5k" → 5500, bare number ≥100
  let amount = 0
  const kMatch = t.match(/(\d+(?:\.\d+)?)\s*k\b/)
  if (kMatch) amount = parseFloat(kMatch[1]) * 1000
  else {
    const nMatch = t.match(/\b(\d{2,})\b/)
    if (nMatch) amount = parseInt(nMatch[1])
  }

  // Category hint
  let categoryHint = 'Food'
  for (const [kw, cat] of Object.entries(CATEGORY_KEYWORDS)) {
    if (t.includes(kw)) { categoryHint = cat; break }
  }

  // Narration: strip filler words + amount
  const narration = t
    .replace(/\b\d+(?:\.\d+)?k?\b/g, '')
    .replace(/\b(on|for|spent|spend|paid|bought|added|i|the|a|an|in|at|from|to|of|and|with|rupees?|rs)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  return {
    amount: Math.round(amount),
    categoryHint,
    narration: narration.length > 2
      ? narration.charAt(0).toUpperCase() + narration.slice(1)
      : categoryHint,
  }
}

interface Props { onSuccess?: () => void; triggerStart?: boolean; onTriggerConsumed?: () => void }

export function VoiceQuickAdd({ onSuccess, triggerStart, onTriggerConsumed }: Props) {
  const [state, setState] = useState<'idle' | 'listening' | 'edit' | 'saving' | 'done' | 'error'>('idle')
  const [transcript, setTranscript] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  // Editable fields
  const [amount, setAmount] = useState('')
  const [narration, setNarration] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [note, setNote] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const recRef = useRef<SpeechRecI | null>(null)

  // Allow parent (TopBar) to trigger voice start
  useEffect(() => {
    if (triggerStart && state === 'idle') {
      startListening()
      onTriggerConsumed?.()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerStart])

  const loadCategories = useCallback(async () => {
    if (categories.length > 0) return
    try {
      const r = await fetch('/api/categories')
      const d = await r.json()
      const all: Category[] = []
      for (const cat of (d.categories || [])) {
        all.push(cat)
        for (const sub of (cat.children || [])) all.push(sub)
      }
      setCategories(all)
    } catch {}
  }, [categories.length])

  // When transcript is ready, parse and populate edit fields
  useEffect(() => {
    if (state !== 'edit' || !transcript) return
    const p = parseVoice(transcript)
    setAmount(String(p.amount || ''))
    setNarration(p.narration)
    // Match category
    const match = categories.find(c => c.name.toLowerCase() === p.categoryHint.toLowerCase())
      || categories.find(c => c.name.toLowerCase().includes(p.categoryHint.toLowerCase().split(' ')[0]))
      || categories[0]
    if (match) setCategoryId(match.id)
  }, [state, transcript, categories])

  const startListening = useCallback(async () => {
    await loadCategories()
    type WinSR = { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown }
    const win = window as Window & WinSR
    const SRClass = win.SpeechRecognition ?? win.webkitSpeechRecognition
    if (!SRClass) { setErrorMsg('Voice input not supported in this browser'); setState('error'); return }

    setState('listening')
    setTranscript('')

    const rec = new SRClass() as SpeechRecI
    rec.lang = 'en-IN'
    rec.continuous = false
    rec.interimResults = true
    recRef.current = rec

    rec.onresult = (e) => {
      setTranscript(e.results[e.results.length - 1][0].transcript)
    }
    rec.onend = () => {
      setState(prev => prev === 'listening' ? 'edit' : prev)
    }
    rec.onerror = (e: Event) => {
      const errType = (e as Event & { error?: string }).error || ''
      if (errType === 'no-speech') {
        // No speech detected — drop into edit mode so user can type
        setState('edit')
      } else if (errType === 'not-allowed' || errType === 'audio-capture') {
        setState('error')
        setErrorMsg('Microphone blocked. On iPhone: Settings → Safari → Microphone → Allow. Also needs HTTPS — use localhost or enable HTTPS.')
      } else {
        setState('error')
        setErrorMsg('Voice failed. Type the amount below instead.')
      }
    }
    rec.start()
  }, [loadCategories])

  const stopListening = useCallback(() => {
    recRef.current?.stop()
  }, [])

  const save = useCallback(async () => {
    const amt = parseFloat(amount)
    if (!amt || !categoryId) return
    setState('saving')
    try {
      const r = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amt, narration: narration || 'Voice entry', categoryId,
          type: 'debit', occurredAt: new Date().toISOString(),
          note: note || null,
        }),
      })
      if (!r.ok) throw new Error('failed')
      setState('done')
      onSuccess?.()
      setTimeout(() => { setState('idle'); setTranscript(''); setAmount(''); setNarration(''); setNote('') }, 2000)
    } catch { setState('error'); setErrorMsg('Failed to save. Try again.') }
  }, [amount, categoryId, narration, note, onSuccess])

  const reset = () => {
    recRef.current?.stop()
    setState('idle')
    setTranscript(''); setAmount(''); setNarration(''); setNote(''); setErrorMsg('')
  }

  const selectedCat = categories.find(c => c.id === categoryId)
  const amtNum = parseFloat(amount) || 0

  if (state === 'idle') {
    return (
      // On mobile: hidden (triggered via TopBar mic button). On desktop: floating FAB.
      <button
        onClick={startListening}
        className="hidden md:flex fixed bottom-6 right-24 w-14 h-14 bg-[#13131f] border-2 border-white/[0.1] hover:border-indigo-500/50 rounded-full items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95 z-40 group"
        title="Voice add — say '5k on food'"
      >
        <Mic size={20} className="text-slate-400 group-hover:text-indigo-400 transition-colors" />
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pb-20 md:pb-6 px-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={reset} />
      <div className="relative w-full max-w-sm bg-[#13131f] border border-white/[0.12] rounded-2xl shadow-2xl animate-slide-up overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            {state === 'listening'
              ? <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              : <div className="w-2 h-2 rounded-full bg-indigo-400" />}
            <p className="text-[13px] font-semibold text-white">
              {state === 'listening' ? 'Listening…' : state === 'edit' ? 'Review & Edit' : state === 'saving' ? 'Saving…' : state === 'done' ? 'Added!' : 'Error'}
            </p>
          </div>
          <button onClick={reset} className="text-slate-500 hover:text-slate-300 transition-colors"><X size={16} /></button>
        </div>

        {/* Transcript display — always visible when available */}
        {(state === 'listening' || state === 'edit') && (
          <div className="mx-5 mb-4 px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl min-h-[40px]">
            {transcript
              ? <p className="text-[12px] text-slate-300 italic leading-snug">&ldquo;{transcript}&rdquo;</p>
              : <p className="text-[12px] text-slate-600 italic">Say something like &quot;5k on food&quot; or &quot;petrol 500&quot;…</p>}
          </div>
        )}

        {/* Listening state */}
        {state === 'listening' && (
          <div className="px-5 pb-5 space-y-3">
            <div className="flex justify-center py-3">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-red-500/10 border-2 border-red-500/40 flex items-center justify-center">
                  <Mic size={24} className="text-red-400" />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-red-500/20 animate-ping" />
              </div>
            </div>
            <button onClick={stopListening}
              className="w-full py-3 rounded-xl bg-red-500/10 hover:bg-red-500/15 text-red-400 text-[13px] font-semibold transition-colors flex items-center justify-center gap-2 border border-red-500/20">
              <MicOff size={15} /> Done, show result
            </button>
          </div>
        )}

        {/* Edit state — fully editable fields */}
        {state === 'edit' && (
          <div className="px-5 pb-5 space-y-3">
            {/* Amount */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-1.5">Amount</p>
              <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-xl overflow-hidden focus-within:border-indigo-500/50 transition-colors">
                <span className="px-3 text-slate-500 text-[14px] border-r border-white/[0.08] py-3">₹</span>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0"
                  autoFocus
                  className="flex-1 bg-transparent px-3 py-3 text-[18px] font-bold text-white placeholder:text-slate-700 focus:outline-none num"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-1.5">Category</p>
              <div className="relative">
                <select
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-3 text-[13px] text-white focus:outline-none focus:border-indigo-500/50 appearance-none cursor-pointer pr-9"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id} style={{ background: '#13131f' }}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
              {selectedCat && (
                <p className="text-[10px] text-slate-600 mt-1 ml-1 capitalize">{selectedCat.kind.replace('_', '-')}</p>
              )}
            </div>

            {/* Narration */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-1.5">What did you spend on?</p>
              <input
                value={narration}
                onChange={e => setNarration(e.target.value)}
                placeholder="e.g. Zomato dinner"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-[13px] text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            {/* Note (optional) */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-1.5">Note <span className="normal-case text-slate-700">(optional)</span></p>
              <input
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Add a note…"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-[13px] text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            {/* Action row */}
            <div className="flex gap-2 pt-1">
              <button onClick={startListening}
                className="w-10 h-11 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-slate-400 flex items-center justify-center transition-colors flex-shrink-0" title="Re-record">
                <Mic size={15} />
              </button>
              <button onClick={reset}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-slate-400 text-[12px] font-semibold transition-colors">
                Cancel
              </button>
              <button onClick={save} disabled={!amount || !categoryId}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] font-bold transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5">
                <Check size={14} />
                {amtNum > 0 ? `Add ₹${amtNum.toLocaleString('en-IN')}` : 'Add'}
              </button>
            </div>
          </div>
        )}

        {/* Saving */}
        {state === 'saving' && (
          <div className="flex items-center justify-center gap-3 px-5 pb-5 py-4">
            <Loader2 size={20} className="text-indigo-400 animate-spin" />
            <p className="text-[13px] text-slate-300">Saving…</p>
          </div>
        )}

        {/* Done */}
        {state === 'done' && (
          <div className="flex items-center gap-3 px-5 pb-5">
            <div className="w-10 h-10 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
              <Check size={18} className="text-green-400" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-green-400">Saved!</p>
              <p className="text-[11px] text-slate-500">
                {selectedCat?.icon} ₹{amtNum.toLocaleString('en-IN')} · {selectedCat?.name || 'Transaction recorded'}
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {state === 'error' && (
          <div className="px-5 pb-5 space-y-3">
            <p className="text-[12px] text-red-400 leading-snug">{errorMsg}</p>
            <div className="flex gap-2">
              <button onClick={startListening}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 text-[12px] font-semibold transition-colors flex items-center justify-center gap-2 hover:bg-indigo-600/30">
                <Mic size={14} /> Try Again
              </button>
              <button onClick={() => { setErrorMsg(''); setState('edit') }}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.08] text-slate-200 text-[12px] font-semibold">
                Type Instead
              </button>
            </div>
            <button onClick={reset} className="w-full text-[11px] text-slate-600 hover:text-slate-400 transition-colors">
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
