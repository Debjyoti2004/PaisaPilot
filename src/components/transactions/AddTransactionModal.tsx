'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, IndianRupee, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { clsx } from 'clsx'

// Smart merchant → category mapping
const MERCHANT_HINTS: Record<string, string> = {
  zomato: 'Eating Out',
  swiggy: 'Eating Out',
  dunzo: 'Eating Out',
  blinkit: 'Groceries',
  bigbasket: 'Groceries',
  jiomart: 'Groceries',
  zepto: 'Groceries',
  dmart: 'Groceries',
  hdfc: 'EMI',
  emi: 'EMI',
  loan: 'EMI',
  'emi payment': 'EMI',
  gym: 'Gym',
  'cult.fit': 'Gym',
  curefit: 'Gym',
  amazon: 'Fun / Misc',
  flipkart: 'Fun / Misc',
  netflix: 'Fun / Misc',
  spotify: 'Fun / Misc',
  hotstar: 'Fun / Misc',
  myntra: 'Clothes',
  ajio: 'Clothes',
  zara: 'Clothes',
  'h&m': 'Clothes',
  salon: 'Grooming',
  haircut: 'Grooming',
  nykaa: 'Grooming',
  barbershop: 'Grooming',
  sip: 'Nifty 50 SIP',
  zerodha: 'Nifty 50 SIP',
  groww: 'Nifty 50 SIP',
  mfcentral: 'Nifty 50 SIP',
  supplement: 'Gym Supplements',
  protein: 'Gym Supplements',
  whey: 'Gym Supplements',
  salary: 'Income',
  credit: 'Income',
}

interface Category {
  id: string
  name: string
  icon: string
  color: string
  kind: string
}

interface AddTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function AddTransactionModal({ isOpen, onClose, onSuccess }: AddTransactionModalProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [amount, setAmount] = useState('')
  const [narration, setNarration] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [txType, setTxType] = useState<'debit' | 'credit'>('debit')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null)

  // Fetch categories
  useEffect(() => {
    if (!isOpen) return
    fetch('/api/categories')
      .then(r => r.json())
      .then(data => setCategories(data.categories ?? []))
      .catch(() => {})
  }, [isOpen])

  // Smart suggestion based on merchant name
  useEffect(() => {
    if (!narration) {
      setSuggestedCategory(null)
      return
    }
    const lower = narration.toLowerCase()
    for (const [keyword, catName] of Object.entries(MERCHANT_HINTS)) {
      if (lower.includes(keyword)) {
        setSuggestedCategory(catName)
        // Auto-select if nothing selected yet
        const found = categories.find(c => c.name === catName)
        if (found && !selectedCategoryId) {
          setSelectedCategoryId(found.id)
        }
        return
      }
    }
    setSuggestedCategory(null)
  }, [narration, categories, selectedCategoryId])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount')
      return
    }
    if (!selectedCategoryId) {
      setError('Please select a category')
      return
    }
    if (!narration.trim()) {
      setError('Please enter a description')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          categoryId: selectedCategoryId,
          narration: narration.trim(),
          merchantKey: narration.toLowerCase().replace(/\s+/g, '-'),
          occurredAt: date,
          type: txType,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to add transaction')
      }

      // Reset form
      setAmount('')
      setNarration('')
      setSelectedCategoryId('')
      setTxType('debit')
      setDate(new Date().toISOString().split('T')[0])
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }, [amount, selectedCategoryId, narration, date, txType, onSuccess, onClose])

  // Close on escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const expenseCategories = categories.filter(c => c.kind !== 'income')
  const incomeCategories = categories.filter(c => c.kind === 'income')
  const displayCategories = txType === 'credit' ? incomeCategories : expenseCategories

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-card border border-card-border rounded-2xl shadow-glass animate-slide-in overflow-hidden">
        {/* Decorative gradient */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-purple-500 to-primary-light" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <h2 className="text-text-primary font-bold text-lg">Add Transaction</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4">
          {/* Type toggle */}
          <div className="flex gap-2 p-1 bg-white/5 rounded-xl">
            <button
              type="button"
              onClick={() => { setTxType('debit'); setSelectedCategoryId('') }}
              className={clsx(
                'flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                txType === 'debit'
                  ? 'bg-danger/20 text-danger border border-danger/30'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => { setTxType('credit'); setSelectedCategoryId('') }}
              className={clsx(
                'flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                txType === 'credit'
                  ? 'bg-success/20 text-success border border-success/30'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              Income
            </button>
          </div>

          {/* Amount — large and prominent */}
          <div className="bg-white/3 border border-white/8 rounded-xl p-4">
            <label className="text-text-secondary text-xs font-medium uppercase tracking-wider block mb-2">
              Amount
            </label>
            <div className="flex items-center gap-2">
              <IndianRupee size={24} className="text-primary-light flex-shrink-0" />
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                min="0"
                step="0.01"
                className="flex-1 bg-transparent text-3xl font-black text-text-primary placeholder:text-text-secondary/30 focus:outline-none"
                autoFocus
              />
            </div>
          </div>

          {/* Merchant / narration with smart hint */}
          <div className="relative">
            <Input
              label="Merchant / Description"
              value={narration}
              onChange={e => setNarration(e.target.value)}
              placeholder="e.g. Zomato, Bigbasket, EMI..."
            />
            {suggestedCategory && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-primary-light">
                <Check size={11} />
                <span>Suggested: <strong>{suggestedCategory}</strong></span>
              </div>
            )}
          </div>

          {/* Category chips */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2 uppercase tracking-wider">
              Category
            </label>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
              {displayCategories.map(cat => {
                const isSelected = selectedCategoryId === cat.id
                const isSuggested = cat.name === suggestedCategory
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150',
                      isSelected
                        ? 'border-transparent text-white scale-105'
                        : isSuggested
                        ? 'border-dashed text-text-primary scale-102'
                        : 'border-white/10 text-text-secondary hover:text-text-primary hover:border-white/20'
                    )}
                    style={
                      isSelected
                        ? { backgroundColor: cat.color, borderColor: cat.color }
                        : isSuggested
                        ? { borderColor: cat.color, color: cat.color }
                        : {}
                    }
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                    {isSelected && <Check size={10} />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Date */}
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />

          {/* Error */}
          {error && (
            <p className="text-danger text-xs bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            loading={isSubmitting}
            variant={txType === 'credit' ? 'success' : 'primary'}
          >
            {txType === 'credit' ? '+ Add Income' : '+ Add Expense'}
          </Button>
        </form>
      </div>
    </div>
  )
}
