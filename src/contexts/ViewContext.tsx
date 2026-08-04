'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

interface ViewingUser { id: string; name: string; image?: string | null }

interface ViewContextValue {
  viewingUser: ViewingUser | null
  isViewing: boolean
  revokedMsg: string | null
  startViewing: (user: ViewingUser) => void
  stopViewing: () => void
  accessRevoked: (ownerName: string) => void
}

const ViewContext = createContext<ViewContextValue>({
  viewingUser: null,
  isViewing: false,
  revokedMsg: null,
  startViewing: () => {},
  stopViewing: () => {},
  accessRevoked: () => {},
})

const LS_KEY = 'pp_viewing_user'

export function ViewProvider({ children }: { children: ReactNode }) {
  const [viewingUser, setViewingUser] = useState<ViewingUser | null>(null)
  const [revokedMsg, setRevokedMsg] = useState<string | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_KEY)
      if (stored) setViewingUser(JSON.parse(stored))
    } catch {}
  }, [])

  function startViewing(user: ViewingUser) {
    setViewingUser(user)
    setRevokedMsg(null)
    localStorage.setItem(LS_KEY, JSON.stringify(user))
  }

  function stopViewing() {
    setViewingUser(null)
    localStorage.removeItem(LS_KEY)
  }

  const accessRevoked = useCallback((ownerName: string) => {
    setViewingUser(null)
    localStorage.removeItem(LS_KEY)
    setRevokedMsg(`Your access to ${ownerName}'s data has been removed`)
    setTimeout(() => setRevokedMsg(null), 6000)
  }, [])

  return (
    <ViewContext.Provider value={{ viewingUser, isViewing: !!viewingUser, revokedMsg, startViewing, stopViewing, accessRevoked }}>
      {children}
    </ViewContext.Provider>
  )
}

export function useViewMode() {
  return useContext(ViewContext)
}

// Appends ?viewAs=userId to a URL when in view mode
export function useViewUrl(base: string) {
  const { viewingUser } = useContext(ViewContext)
  if (!viewingUser) return base
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}viewAs=${viewingUser.id}`
}
