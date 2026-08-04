'use client'

import { usePathname } from 'next/navigation'
import { useViewMode } from '@/contexts/ViewContext'
import { Eye, X } from 'lucide-react'

const HIDE_BANNER_ON = ['/settings', '/profile']

export function ViewBanner() {
  const pathname = usePathname()
  const { isViewing, viewingUser, stopViewing } = useViewMode()
  if (!isViewing || !viewingUser) return null
  if (HIDE_BANNER_ON.includes(pathname)) return null

  return (
    <div
      className="flex items-center justify-between gap-3 px-5 py-2.5"
      style={{
        background: 'var(--violet)',
        color: '#fff',
        fontSize: 13,
        fontWeight: 500,
        flexShrink: 0,
      }}
    >
      <div className="flex items-center gap-2">
        <Eye size={14} />
        <span>
          Viewing <strong>{viewingUser.name}</strong>'s data — read only
        </span>
      </div>
      <button
        onClick={stopViewing}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1"
        style={{ background: 'rgba(255,255,255,0.2)', fontSize: 12, fontWeight: 600, color: '#fff', border: 'none', cursor: 'pointer' }}
      >
        <X size={13} />
        Exit view
      </button>
    </div>
  )
}
