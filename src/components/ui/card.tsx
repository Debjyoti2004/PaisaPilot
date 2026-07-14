import { HTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: 'indigo' | 'emerald' | 'amber' | 'red' | 'none'
  hover?: boolean
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, glow = 'none', hover = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          'bg-card border border-card-border rounded-2xl shadow-card backdrop-blur-sm',
          {
            'hover:border-primary/30 hover:shadow-glow-indigo transition-all duration-300 cursor-pointer': hover,
            'border-primary/20 shadow-glow-indigo': glow === 'indigo',
            'border-success/20 shadow-glow-emerald': glow === 'emerald',
            'border-warning/20 shadow-glow-amber': glow === 'amber',
            'border-danger/20 animate-pulse-glow': glow === 'red',
          },
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx('p-6 pb-2', className)} {...props} />
  )
)
CardHeader.displayName = 'CardHeader'

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx('p-6 pt-4', className)} {...props} />
  )
)
CardContent.displayName = 'CardContent'

const CardTitle = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={clsx('text-sm font-medium text-text-secondary uppercase tracking-wider', className)}
      {...props}
    />
  )
)
CardTitle.displayName = 'CardTitle'

export { Card, CardHeader, CardContent, CardTitle }
