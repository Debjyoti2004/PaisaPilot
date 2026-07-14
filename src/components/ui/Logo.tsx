interface LogoIconProps {
  size?: number
  className?: string
}

export function LogoIcon({ size = 36, className }: LogoIconProps) {
  const id = `logo-${size}`
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="rgba(255,255,255,0.18)" />
          <stop offset="1" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      {/* Background */}
      <rect width="48" height="48" rx="12" fill={`url(#${id}-bg)`} />
      {/* Top shine */}
      <rect width="48" height="24" rx="12" fill={`url(#${id}-shine)`} />
      {/* ₹ symbol as crisp paths */}
      <line x1="13" y1="13" x2="35" y2="13" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <line x1="13" y1="20" x2="30" y2="20" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <line x1="15" y1="13" x2="15" y2="36" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <line x1="30" y1="20" x2="15" y2="36" stroke="white" strokeWidth="3" strokeLinecap="round" />
      {/* Pilot dot */}
      <circle cx="37" cy="11" r="2.5" fill="rgba(255,255,255,0.5)" />
    </svg>
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
