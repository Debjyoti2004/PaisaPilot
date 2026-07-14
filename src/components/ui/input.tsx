import { InputHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  prefix?: string
  suffix?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, prefix, suffix, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {prefix && (
            <span className="absolute left-3 text-text-secondary text-sm font-medium pointer-events-none">
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            className={clsx(
              'w-full bg-white/5 border border-white/10 rounded-xl text-text-primary placeholder:text-text-secondary/50',
              'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50',
              'transition-all duration-200',
              'py-2.5 text-sm',
              prefix ? 'pl-8 pr-3' : 'px-3',
              suffix ? 'pr-10' : '',
              error && 'border-danger/50 focus:ring-danger/30',
              className
            )}
            {...props}
          />
          {suffix && (
            <span className="absolute right-3 text-text-secondary text-sm pointer-events-none">
              {suffix}
            </span>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
