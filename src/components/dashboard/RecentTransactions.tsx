'use client'

import { formatINR } from '@/lib/finance'
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import Link from 'next/link'
import { clsx } from 'clsx'

interface Transaction {
  id: string
  narration: string
  amount: number
  type: string
  occurredAt: string
  category: {
    name: string
    icon: string
    color: string
  }
}

interface RecentTransactionsProps {
  transactions: Transaction[]
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  return (
    <div className="bg-card border border-card-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-text-secondary text-xs font-medium uppercase tracking-wider">Recent Transactions</p>
        <Link href="/transactions" className="text-primary-light text-xs hover:underline">
          View all →
        </Link>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-text-secondary text-sm">No transactions yet</p>
          <p className="text-text-secondary/60 text-xs mt-1">Add your first transaction to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map(tx => {
            const date = new Date(tx.occurredAt)
            const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
            const isCredit = tx.type === 'credit'

            return (
              <div
                key={tx.id}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/3 transition-colors group"
              >
                {/* Category icon */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                  style={{ backgroundColor: `${tx.category.color}20` }}
                >
                  {tx.category.icon}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary text-sm font-medium truncate">{tx.narration}</p>
                  <p className="text-text-secondary text-xs">{tx.category.name} · {dateStr}</p>
                </div>

                {/* Amount */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <div className={clsx(
                    'w-5 h-5 rounded-full flex items-center justify-center',
                    isCredit ? 'bg-success/20' : 'bg-danger/20'
                  )}>
                    {isCredit
                      ? <ArrowDownLeft size={11} className="text-success" />
                      : <ArrowUpRight size={11} className="text-danger" />
                    }
                  </div>
                  <span className={clsx(
                    'text-sm font-bold',
                    isCredit ? 'text-success' : 'text-text-primary'
                  )}>
                    {isCredit ? '+' : '-'}{formatINR(tx.amount)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
