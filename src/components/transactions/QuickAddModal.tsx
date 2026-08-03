'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Mic, MicOff, Check, ChevronLeft, IndianRupee, Pencil } from 'lucide-react'
import { formatINR } from '@/lib/finance'

const QUICK_AMOUNTS = [100, 500, 1000, 2000, 5000]
const NUMPAD = ['1','2','3','4','5','6','7','8','9','.','0','⌫']

const MERCHANT_HINTS: Record<string, string> = {
  zomato: 'Eating Out', swiggy: 'Eating Out', dunzo: 'Eating Out', blinkit: 'Groceries',
  bigbasket: 'Groceries', jiomart: 'Groceries', zepto: 'Groceries', dmart: 'Groceries',
  hdfc: 'EMI', emi: 'EMI', loan: 'EMI', gym: 'Gym', curefit: 'Gym', 'cult.fit': 'Gym',
  amazon: 'Fun / Misc', flipkart: 'Fun / Misc', netflix: 'Fun / Misc', spotify: 'Fun / Misc',
  myntra: 'Clothes', ajio: 'Clothes', zara: 'Clothes', salon: 'Grooming', nykaa: 'Face Care',
  serum: 'Serum', facewash: 'Face Wash', sunscreen: 'Sunscreen', moisturizer: 'Moisturizer',
  haircut: 'Haircut', zerodha: 'Nifty 50 SIP', groww: 'Nifty 50 SIP', mfcentral: 'Nifty 50 SIP',
  supplement: 'Gym Supplements', protein: 'Gym Supplements', petrol: 'Fuel', fuel: 'Fuel',
  uber: 'Cab / Auto', ola: 'Cab / Auto', metro: 'Metro / Bus', rapido: 'Cab / Auto',
  salary: 'Income', coffee: 'Coffee & Drinks', starbucks: 'Coffee & Drinks',
}

interface Category {
  id: string; name: string; icon: string; color: string; kind: string; parentId: string | null
}
interface Transaction {
  id: string; amount: number; narration: string; categoryId: string; occurredAt: string; type: string; note?: string | null
}
interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  transaction?: Transaction | null
}

type Step = 'amount' | 'category' | 'details' | 'success'

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition
    webkitSpeechRecognition?: new () => SpeechRecognition
  }
}
interface SpeechRecognition extends EventTarget {
  start(): void; stop(): void; lang: string; continuous: boolean; interimResults: boolean
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onend: (() => void) | null
}
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}
interface SpeechRecognitionResultList { [index: number]: SpeechRecognitionResult; length: number }
interface SpeechRecognitionResult { [index: number]: SpeechRecognitionAlternative; isFinal: boolean }
interface SpeechRecognitionAlternative { transcript: string }

export function QuickAddModal({ isOpen, onClose, onSuccess, transaction }: Props) {
  const isEdit = !!transaction
  const [step, setStep] = useState<Step>('amount')
  const [amount, setAmount] = useState('')
  const [txType, setTxType] = useState<'debit' | 'credit'>('debit')
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [narration, setNarration] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [categories, setCategories] = useState<Category[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [suggestedName, setSuggestedName] = useState<string | null>(null)
  const amountRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // Fetch categories
  useEffect(() => {
    if (!isOpen) return
    fetch('/api/categories').then(r => r.json()).then(d => setCategories(d.categories || [])).catch(() => {})
  }, [isOpen])

  // Pre-fill for edit mode
  useEffect(() => {
    if (isOpen && transaction) {
      setAmount(String(transaction.amount))
      setNarration(transaction.narration)
      setNote(transaction.note || '')
      setDate(new Date(transaction.occurredAt).toISOString().split('T')[0])
      setTxType(transaction.type as 'debit' | 'credit')
      setSelectedCategoryId(transaction.categoryId)
      setStep('details')
    } else if (isOpen && !transaction) {
      setStep('amount')
      setAmount('')
      setNarration('')
      setNote('')
      setSelectedCategoryId('')
      setSelectedParentId(null)
      setTxType('debit')
      setDate(new Date().toISOString().split('T')[0])
      setError('')
    }
  }, [isOpen, transaction])

  // Focus amount on open
  useEffect(() => {
    if (isOpen && step === 'amount') setTimeout(() => amountRef.current?.focus(), 100)
  }, [isOpen, step])

  // Smart category suggestion from narration
  useEffect(() => {
    if (!narration) { setSuggestedName(null); return }
    const lower = narration.toLowerCase()
    for (const [kw, catName] of Object.entries(MERCHANT_HINTS)) {
      if (lower.includes(kw)) {
        setSuggestedName(catName)
        if (!selectedCategoryId) {
          const found = categories.find(c => c.name === catName)
          if (found) setSelectedCategoryId(found.id)
        }
        return
      }
    }
    setSuggestedName(null)
  }, [narration, categories, selectedCategoryId])

  // Escape to close
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (isOpen) window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [isOpen, onClose])

  const startVoice = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Voice input not supported in this browser'); return }
    const rec = new SR()
    rec.lang = 'en-IN'
    rec.continuous = false
    rec.interimResults = false
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0][0].transcript
      setNarration(transcript)
    }
    rec.onend = () => setIsListening(false)
    recognitionRef.current = rec
    rec.start()
    setIsListening(true)
  }, [])

  const stopVoice = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  const handleSubmit = useCallback(async () => {
    setError('')
    const parsedAmt = parseFloat(amount)
    if (!parsedAmt || parsedAmt <= 0) { setError('Enter a valid amount'); return }
    if (!selectedCategoryId) { setError('Select a category'); return }
    if (!narration.trim()) { setError('Enter a description'); return }

    setIsSubmitting(true)
    try {
      const url = isEdit ? `/api/transactions/${transaction!.id}` : '/api/transactions'
      const method = isEdit ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parsedAmt, categoryId: selectedCategoryId, narration: narration.trim(), note: note || null, occurredAt: date, type: txType }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed') }

      // Create notification for duplicate check (same narration same day)
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: isEdit ? 'Transaction Updated' : 'Transaction Added',
          message: `${narration} — ${formatINR(parsedAmt)}`,
          type: 'success',
        }),
      }).catch(() => {})

      setStep('success')
      setTimeout(() => { onSuccess?.(); onClose() }, 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }, [amount, selectedCategoryId, narration, note, date, txType, isEdit, transaction, onSuccess, onClose])

  if (!isOpen) return null

  const parentCats = categories.filter(c => !c.parentId && c.kind !== 'income')
  const incomeCats = categories.filter(c => c.kind === 'income')
  const subCats = selectedParentId ? categories.filter(c => c.parentId === selectedParentId) : []
  const selectedCat = categories.find(c => c.id === selectedCategoryId)
  const selectedParentCat = categories.find(c => c.id === selectedParentId)

  const canProceed = parseFloat(amount) > 0

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-[#13131f] border border-white/[0.08] rounded-t-3xl sm:rounded-2xl shadow-2xl animate-slide-up overflow-hidden">
        {/* Top accent line */}
        <div className="h-0.5 w-full bg-gradient-to-r from-indigo-600 via-violet-500 to-indigo-600" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            {step !== 'amount' && step !== 'success' && !isEdit && (
              <button onClick={() => setStep(step === 'details' ? 'category' : 'amount')} className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center text-slate-400 hover:text-slate-200 -ml-1 mr-1">
                <ChevronLeft size={15} />
              </button>
            )}
            <h2 className="text-[15px] font-semibold text-white">
              {step === 'success' ? '✅ Done!' : isEdit ? 'Edit Transaction' : 'Add Transaction'}
            </h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/[0.05] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="px-5 pb-5">
          {/* SUCCESS */}
          {step === 'success' && (
            <div className="py-8 text-center animate-scale-in">
              <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
                <Check size={28} className="text-green-400" />
              </div>
              <p className="text-white font-semibold text-[15px]">{isEdit ? 'Updated!' : 'Transaction Added!'}</p>
              <p className="text-slate-500 text-[13px] mt-1">{narration} · {formatINR(parseFloat(amount))}</p>
            </div>
          )}

          {/* STEP: AMOUNT — Premium numpad */}
          {step === 'amount' && (
            <div className="pt-3">
              {/* Type toggle */}
              <div className="flex gap-1.5 p-1 bg-white/[0.04] rounded-xl border border-white/[0.06] mb-4">
                <button
                  onClick={() => setTxType('debit')}
                  className={`flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all ${txType === 'debit' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Expense
                </button>
                <button
                  onClick={() => setTxType('credit')}
                  className={`flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all ${txType === 'credit' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Income
                </button>
              </div>

              {/* Amount display */}
              <div className="text-center mb-4 py-3">
                <p className="text-[11px] uppercase tracking-widest text-slate-600 mb-2">Amount</p>
                <div className="flex items-center justify-center gap-2">
                  <IndianRupee size={30} className={`${txType === 'debit' ? 'text-red-400' : 'text-green-400'} flex-shrink-0`} />
                  <span
                    className="text-[48px] font-black text-white num leading-none"
                    style={{ letterSpacing: '-0.04em', minWidth: '2ch' }}
                  >
                    {amount
                      ? (() => {
                          const [int, dec] = amount.split('.')
                          const fmt = (parseInt(int, 10) || 0).toLocaleString('en-IN')
                          return dec !== undefined ? `${fmt}.${dec}` : fmt
                        })()
                      : '0'}
                  </span>
                  <span className="w-0.5 h-10 bg-indigo-400 rounded-full animate-pulse" />
                </div>
              </div>

              {/* Quick amounts */}
              <div className="flex gap-2 justify-center mb-4 flex-wrap">
                {QUICK_AMOUNTS.map(a => (
                  <button
                    key={a}
                    onClick={() => setAmount(String(a))}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-all ${
                      amount === String(a)
                        ? 'bg-indigo-500 text-white border-indigo-500'
                        : 'bg-white/[0.05] text-slate-300 border-white/[0.08] hover:bg-white/[0.1]'
                    }`}
                  >
                    ₹{a.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>

              {/* Numpad grid */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {NUMPAD.map(key => (
                  <button
                    key={key}
                    onClick={() => {
                      if (key === '⌫') {
                        setAmount(prev => prev.slice(0, -1))
                      } else if (key === '.') {
                        if (!amount.includes('.')) setAmount(prev => (prev || '0') + '.')
                      } else {
                        if (amount === '0') setAmount(key)
                        else if (amount.length < 8) setAmount(prev => prev + key)
                      }
                    }}
                    className={`h-12 rounded-2xl text-[18px] font-semibold transition-all active:scale-95 ${
                      key === '⌫'
                        ? 'bg-white/[0.08] text-slate-300 hover:bg-white/[0.12]'
                        : 'bg-white/[0.05] text-white hover:bg-white/[0.1]'
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>

              <button
                onClick={() => { if (canProceed) setStep(txType === 'credit' ? 'details' : 'category') }}
                disabled={!canProceed}
                className={`w-full py-3.5 rounded-2xl font-bold text-[15px] transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                  txType === 'debit'
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                    : 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-500/20'
                }`}
              >
                Continue →
              </button>
            </div>
          )}

          {/* STEP: CATEGORY */}
          {step === 'category' && (
            <div className="pt-4 space-y-4">
              <p className="text-[11px] uppercase tracking-widest text-slate-600">Select Category</p>

              {/* Parent categories grid */}
              {!selectedParentId && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {(txType === 'credit' ? incomeCats : parentCats).map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        const hasSubs = categories.some(c => c.parentId === cat.id)
                        if (hasSubs) {
                          setSelectedParentId(cat.id)
                        } else {
                          setSelectedCategoryId(cat.id)
                          setSelectedParentId(null)
                          setStep('details')
                        }
                      }}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                        selectedCategoryId === cat.id && !categories.some(c => c.parentId === cat.id)
                          ? 'border-indigo-500/50 bg-indigo-500/10'
                          : 'border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/[0.12]'
                      }`}
                    >
                      <span className="text-2xl">{cat.icon}</span>
                      <span className="text-[10px] font-medium text-slate-300 text-center leading-tight">{cat.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Sub-categories */}
              {selectedParentId && (
                <div>
                  <button onClick={() => setSelectedParentId(null)} className="flex items-center gap-1.5 text-[12px] text-slate-400 hover:text-slate-200 mb-3 transition-colors">
                    <ChevronLeft size={14} />
                    Back · <span className="text-white font-medium">{selectedParentCat?.icon} {selectedParentCat?.name}</span>
                  </button>

                  {/* Parent itself as an option */}
                  <button
                    onClick={() => { setSelectedCategoryId(selectedParentId); setStep('details') }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border mb-2 transition-all ${
                      selectedCategoryId === selectedParentId
                        ? 'border-indigo-500/50 bg-indigo-500/10'
                        : 'border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.07]'
                    }`}
                  >
                    <span className="text-xl">{selectedParentCat?.icon}</span>
                    <div className="flex-1 text-left">
                      <p className="text-[13px] font-medium text-white">{selectedParentCat?.name}</p>
                      <p className="text-[11px] text-slate-500">General {selectedParentCat?.name.toLowerCase()}</p>
                    </div>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    {subCats.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => { setSelectedCategoryId(cat.id); setStep('details') }}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all text-left ${
                          selectedCategoryId === cat.id
                            ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300'
                            : 'border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.07] text-slate-300'
                        }`}
                      >
                        <span className="text-lg">{cat.icon}</span>
                        <span className="text-[12px] font-medium">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP: DETAILS */}
          {step === 'details' && (
            <div className="pt-4 space-y-4">
              {/* Summary so far */}
              {!isEdit && (
                <div className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0`} style={{ backgroundColor: `${selectedCat?.color || '#6366f1'}20` }}>
                    {selectedCat?.icon || '💳'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-[18px] num" style={{ letterSpacing: '-0.03em' }}>{formatINR(parseFloat(amount) || 0)}</p>
                    <p className="text-slate-500 text-[11px]">{selectedCat?.name || 'No category'}</p>
                  </div>
                  <button onClick={() => setStep('category')} className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center text-slate-400 hover:text-slate-200">
                    <Pencil size={12} />
                  </button>
                </div>
              )}

              {/* Suggestion hint */}
              {suggestedName && !isEdit && (
                <div className="flex items-center gap-2 text-[11px] text-indigo-400 bg-indigo-500/[0.08] border border-indigo-500/20 rounded-lg px-3 py-2">
                  <Check size={12} />
                  <span>Matched category: <strong>{suggestedName}</strong></span>
                </div>
              )}

              {/* Narration */}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-600 block mb-1.5">Description</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={narration}
                    onChange={e => setNarration(e.target.value)}
                    placeholder="What did you spend on?"
                    autoFocus={!isEdit}
                    className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-[13px] text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={isListening ? stopVoice : startVoice}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                      isListening ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse-red' : 'bg-white/[0.05] text-slate-400 border border-white/[0.08] hover:text-slate-200'
                    }`}
                  >
                    {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-600 block mb-1.5">Note (optional)</label>
                <input
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Any additional note..."
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-[13px] text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
              </div>

              {/* Date */}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-600 block mb-1.5">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-[13px] text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
              </div>

              {/* Category selector (for edit mode) */}
              {isEdit && (
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-600 block mb-1.5">Category</label>
                  <select
                    value={selectedCategoryId}
                    onChange={e => setSelectedCategoryId(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-[13px] text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id} className="bg-[#13131f]">{c.icon} {c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {error && (
                <p className="text-red-400 text-[12px] bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}

              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !narration.trim()}
                className="w-full py-3.5 rounded-xl font-semibold text-[14px] transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-smooth" />
                    {isEdit ? 'Updating...' : 'Adding...'}
                  </span>
                ) : (
                  isEdit ? '✓ Update Transaction' : `+ Add ${txType === 'credit' ? 'Income' : 'Expense'}`
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
