'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed',
          {
            'bg-primary hover:bg-primary-light text-white shadow-glow-indigo focus:ring-primary':
              variant === 'primary',
            'bg-white/10 hover:bg-white/15 text-text-primary border border-white/10 focus:ring-white/20':
              variant === 'secondary',
            'hover:bg-white/5 text-text-secondary hover:text-text-primary focus:ring-white/10':
              variant === 'ghost',
            'bg-danger/20 hover:bg-danger/30 text-danger border border-danger/20 focus:ring-danger':
              variant === 'danger',
            'bg-success/20 hover:bg-success/30 text-success border border-success/20 focus:ring-success':
              variant === 'success',
          },
          {
            'px-3 py-1.5 text-xs gap-1.5': size === 'sm',
            'px-4 py-2 text-sm gap-2': size === 'md',
            'px-6 py-3 text-base gap-2.5': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {loading ? (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : null}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
