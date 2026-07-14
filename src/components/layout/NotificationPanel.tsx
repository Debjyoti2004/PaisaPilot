'use client'

import { useState, useEffect } from 'react'
import { X, Info, CheckCircle, AlertTriangle, AlertCircle, Trash2, CheckCheck } from 'lucide-react'

interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  read: boolean
  createdAt: string
}

interface NotificationPanelProps {
  isOpen: boolean
  onClose: () => void
}

const TYPE_CONFIG = {
  info: { icon: Info, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  success: { icon: CheckCircle, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  warning: { icon: AlertTriangle, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  error: { icon: AlertCircle, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications')
      const data = await res.json()
      setNotifications(data.notifications ?? [])
    } catch {
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) fetchNotifications()
  }, [isOpen])

  const markAllRead = async () => {
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const markRead = async (id: string) => {
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const deleteNotif = async (id: string) => {
    await fetch(`/api/notifications?id=${id}`, { method: 'DELETE' })
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  if (!isOpen) return null

  const sorted = [...notifications].sort((a, b) => {
    if (a.read !== b.read) return a.read ? 1 : -1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 150, background: 'rgba(0,0,0,0.4)' }}
      />

      {/* Panel */}
      <div
        className="animate-slide-up"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '360px',
          maxWidth: '100vw',
          background: '#13131f',
          borderLeft: '1px solid rgba(255,255,255,0.07)',
          zIndex: 160,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-20px 0 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 20px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#f1f5f9' }}>Notifications</h2>
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
              {notifications.filter((n) => !n.read).length} unread
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {notifications.some((n) => !n.read) && (
              <button
                onClick={markAllRead}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(99,102,241,0.1)',
                  border: '1px solid rgba(99,102,241,0.2)',
                  borderRadius: '8px',
                  color: '#818cf8',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '500',
                  padding: '6px 10px',
                }}
              >
                <CheckCheck size={13} />
                All read
              </button>
            )}
            <button
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '8px', color: '#94a3b8', cursor: 'pointer', padding: '6px 8px', display: 'flex' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && (
            <div style={{ padding: '20px' }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton" style={{ height: '72px', borderRadius: '12px', marginBottom: '8px' }} />
              ))}
            </div>
          )}

          {!loading && sorted.length === 0 && (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <CheckCircle size={40} color="#1e293b" style={{ margin: '0 auto 12px' }} />
              <p style={{ color: '#64748b', fontSize: '14px' }}>All caught up!</p>
            </div>
          )}

          {!loading && sorted.map((notif) => {
            const cfg = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.info
            const Icon = cfg.icon
            return (
              <div
                key={notif.id}
                onClick={() => !notif.read && markRead(notif.id)}
                style={{
                  display: 'flex',
                  gap: '12px',
                  padding: '14px 20px',
                  background: notif.read ? 'transparent' : 'rgba(99,102,241,0.04)',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  cursor: notif.read ? 'default' : 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: cfg.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  <Icon size={16} color={cfg.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <p
                      style={{
                        fontSize: '13.5px',
                        fontWeight: notif.read ? '500' : '700',
                        color: notif.read ? '#94a3b8' : '#f1f5f9',
                        lineHeight: 1.3,
                      }}
                    >
                      {notif.title}
                    </p>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNotif(notif.id) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#334155', flexShrink: 0, padding: '2px', display: 'flex' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748b', marginTop: '3px', lineHeight: 1.4 }}>{notif.message}</p>
                  <p style={{ fontSize: '11px', color: '#334155', marginTop: '5px' }}>{timeAgo(notif.createdAt)}</p>
                </div>
                {!notif.read && (
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#6366f1', flexShrink: 0, marginTop: '6px' }} />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
