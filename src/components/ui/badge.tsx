import { HTMLAttributes } from 'react'
import { clsx } from 'clsx'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
  size?: 'sm' | 'md'
}

export function Badge({ className, variant = 'default', size = 'md', children, ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium rounded-full',
        {
          'bg-white/10 text-text-secondary': variant === 'default',
          'bg-success/15 text-success': variant === 'success',
          'bg-warning/15 text-warning': variant === 'warning',
          'bg-danger/15 text-danger': variant === 'danger',
          'bg-primary/15 text-primary-light': variant === 'info',
          'bg-purple-500/15 text-purple-400': variant === 'purple',
        },
        {
          'px-2 py-0.5 text-xs': size === 'sm',
          'px-2.5 py-1 text-xs': size === 'md',
        },
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
