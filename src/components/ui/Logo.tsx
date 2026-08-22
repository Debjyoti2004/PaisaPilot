import type { CSSProperties } from 'react'

interface LogoIconProps {
  size?: number
  className?: string
  style?: CSSProperties
}

export function LogoIcon({ size = 36, className, style }: LogoIconProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      width={size}
      height={size}
      alt="PaisaPilot"
      className={className}
      style={{ flexShrink: 0, display: 'block', background: 'transparent', ...style }}
    />
  )
}

interface LogoFullProps {
  iconSize?: number
  className?: string
}

export function LogoFull({ iconSize = 36, className }: LogoFullProps) {
  const fontSize = iconSize * 0.38
  const subSize = iconSize * 0.29

  return (
    <div className={`flex items-center gap-2.5 ${className ?? ''}`}>
      <LogoIcon size={iconSize} />
      <div className="leading-none">
        <div style={{ fontSize, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 }}>
          <span className="text-white">Paisa</span>
          <span className="text-indigo-300">Pilot</span>
        </div>
        <div
          style={{ fontSize: subSize, lineHeight: 1, marginTop: 3 }}
          className="text-slate-500 font-medium tracking-wide"
        >
          Personal Finance
        </div>
      </div>
    </div>
  )
}
