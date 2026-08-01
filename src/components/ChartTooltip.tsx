'use client'

interface RechartsPayloadItem {
  name: string
  value: number
  color?: string
  stroke?: string
  fill?: string
  payload?: Record<string, unknown>
}

interface ChartTooltipProps {
  active?: boolean
  payload?: RechartsPayloadItem[]
  label?: unknown
  formatValue?: (v: number, name: string) => string
  formatLabel?: (label: unknown) => string
}

const fmtINR = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

// Resolve color: try series-level props first, then the data row's own color field
function resolveColor(p: RechartsPayloadItem): string {
  // For Line/Area charts — stroke is the series color
  if (p.stroke && p.stroke !== 'none') return p.stroke
  // Direct color prop (set by Recharts for most chart types)
  if (p.color) return p.color
  // For Bar charts — fill on the series
  if (p.fill) return p.fill
  // For Bar charts with <Cell> coloring — grab from the data row
  if (p.payload?.color && typeof p.payload.color === 'string') return p.payload.color
  return '#6b7280'
}

// "Planned" bars are the target — show them muted grey so "Actual" stands out
const MUTED_NAMES = new Set(['Planned', 'Plan'])

export function ChartTooltip({
  active, payload, label,
  formatValue,
  formatLabel,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null

  const displayLabel = formatLabel
    ? formatLabel(label)
    : label != null ? String(label) : null

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.94)',
      backdropFilter: 'blur(18px)',
      WebkitBackdropFilter: 'blur(18px)',
      border: '1px solid rgba(255, 255, 255, 0.8)',
      borderRadius: 14,
      padding: '10px 14px',
      boxShadow: '0 8px 32px rgba(101, 88, 211, 0.14), 0 2px 8px rgba(0, 0, 0, 0.07)',
      minWidth: 148,
      pointerEvents: 'none',
    }}>
      {displayLabel && (
        <p style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 7 }}>
          {displayLabel}
        </p>
      )}
      {payload.map((p, i) => {
        const isMuted = MUTED_NAMES.has(p.name)
        const color   = isMuted ? '#9ca3af' : resolveColor(p)
        return (
          <p key={i} style={{
            fontSize: 13,
            fontWeight: isMuted ? 500 : 700,
            color,
            marginBottom: i < payload.length - 1 ? 3 : 0,
          }}>
            {p.name}: {formatValue ? formatValue(p.value, p.name) : fmtINR(p.value)}
          </p>
        )
      })}
    </div>
  )
}
