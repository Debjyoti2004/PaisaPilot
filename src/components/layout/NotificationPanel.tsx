'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Info, CheckCircle, AlertTriangle, AlertCircle, Trash2, CheckCheck, Bell, Zap } from 'lucide-react'

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
  info:    { icon: Info,          color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.25)' },
  success: { icon: CheckCircle,   color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)' },
  warning: { icon: AlertTriangle, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
  error:   { icon: AlertCircle,   color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.25)' },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'yesterday'
  return `${days}d ago`
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [entered, setEntered] = useState(false)
  const prevOpen = useRef(false)

  useEffect(() => {
    if (isOpen && !prevOpen.current) {
      setEntered(false)
      // Trigger enter animation after mount
      requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)))
      fetchNotifications()
    }
    prevOpen.current = isOpen
  }, [isOpen])

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

  const sendTestNotification = async () => {
    const TESTS = [
      { title: 'Monthly budget alert', message: 'You\'ve spent ₹28,450 this month — 82% of your ₹35,000 budget. You have ₹6,550 left for the remaining 9 days.', type: 'warning' },
      { title: 'Investment milestone reached!', message: 'Your ELSS SIP crossed ₹1,00,000 total invested. Keep it up — you\'re on track for your 2028 goal.', type: 'success' },
      { title: 'Statement imported from Drive', message: '34 new transactions synced from HDFC_July2026.csv. 2 duplicates were skipped automatically.', type: 'info' },
      { title: 'Unusual spending detected', message: 'Your "Wants" category is 140% of plan this month (₹14,200 vs plan ₹10,000). Review your recent transactions.', type: 'error' },
    ]
    const t = TESTS[Math.floor(Math.random() * TESTS.length)]!
    await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(t) })
    fetchNotifications()
  }

  const markAllRead = async () => {
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const markRead = async (id: string) => {
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const deleteNotif = async (id: string) => {
    await fetch(`/api/notifications?id=${id}`, { method: 'DELETE' })
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  if (!isOpen) return null

  const sorted = [...notifications].sort((a, b) => {
    if (a.read !== b.read) return a.read ? 1 : -1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <>
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(14px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      {/* Blurred backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 150,
          background: 'rgba(0,0,0,0.25)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          transition: 'opacity 0.2s',
          opacity: entered ? 1 : 0,
        }}
      />

      {/* Glass panel */}
      <div style={{
        position: 'fixed',
        top: 12,
        right: 12,
        bottom: 12,
        width: 380,
        maxWidth: 'calc(100vw - 24px)',
        zIndex: 160,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 22,
        overflow: 'hidden',
        // Apple-style glass
        background: 'rgba(250, 250, 255, 0.82)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.75)',
        boxShadow: '0 32px 80px rgba(101,88,211,0.18), 0 8px 24px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.9)',
        transition: 'transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.22s ease',
        transform: entered ? 'translateX(0) scale(1)' : 'translateX(24px) scale(0.97)',
        opacity: entered ? 1 : 0,
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 20px 14px',
          borderBottom: '1px solid rgba(101,88,211,0.1)',
          background: 'rgba(255,255,255,0.5)',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(101,88,211,0.1)', border: '1px solid rgba(101,88,211,0.15)',
              }}>
                <Bell size={16} style={{ color: 'var(--violet)' }} />
              </div>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.02em' }}>Notifications</h2>
                <p style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 1 }}>
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {unreadCount > 0 && (
                <button onClick={markAllRead} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  background: 'rgba(101,88,211,0.08)', border: '1px solid rgba(101,88,211,0.18)',
                  borderRadius: 9, color: 'var(--violet)', cursor: 'pointer', fontSize: 11.5,
                  fontWeight: 600, padding: '5px 10px',
                }}>
                  <CheckCheck size={12} /> Mark all read
                </button>
              )}
              <button onClick={onClose} style={{
                background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: 9, color: 'var(--text-2)', cursor: 'pointer', padding: '5px 8px', display: 'flex',
              }}>
                <X size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Notification list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {loading && (
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1,2,3].map(i => (
                <div key={i} className="skeleton" style={{ height: 80, borderRadius: 16 }} />
              ))}
            </div>
          )}

          {!loading && sorted.length === 0 && (
            <div style={{ padding: '52px 24px', textAlign: 'center' }}>
              <div style={{
                width: 56, height: 56, borderRadius: 18, margin: '0 auto 14px',
                background: 'rgba(101,88,211,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Bell size={24} style={{ color: 'rgba(101,88,211,0.4)' }} />
              </div>
              <p style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: 14, marginBottom: 4 }}>All caught up!</p>
              <p style={{ color: 'var(--text-3)', fontSize: 13 }}>No new notifications</p>
            </div>
          )}

          {!loading && sorted.map((notif, idx) => {
            const cfg = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.info
            const Icon = cfg.icon
            const isUnread = !notif.read
            return (
              <div
                key={notif.id}
                onClick={() => isUnread && markRead(notif.id)}
                style={{
                  display: 'flex', gap: 11, padding: '12px 13px',
                  borderRadius: 16, marginBottom: 4, cursor: isUnread ? 'pointer' : 'default',
                  background: isUnread ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)',
                  border: isUnread ? `1px solid ${cfg.border}` : '1px solid rgba(0,0,0,0.06)',
                  boxShadow: isUnread ? `0 2px 12px ${cfg.bg}` : 'none',
                  transition: 'all 0.15s',
                  animation: `slideInRight ${0.18 + idx * 0.04}s ease both`,
                }}
              >
                {/* Icon bubble */}
                <div style={{
                  width: 38, height: 38, borderRadius: 12, flexShrink: 0, marginTop: 1,
                  background: cfg.bg, border: `1px solid ${cfg.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={17} color={cfg.color} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <p style={{
                      fontSize: 13, fontWeight: isUnread ? 700 : 500,
                      color: isUnread ? 'var(--text-1)' : 'var(--text-2)', lineHeight: 1.3,
                    }}>
                      {notif.title}
                    </p>
                    <button
                      onClick={e => { e.stopPropagation(); deleteNotif(notif.id) }}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)',
                        flexShrink: 0, padding: '2px', display: 'flex', borderRadius: 6,
                        opacity: 0.5, transition: 'opacity 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2, lineHeight: 1.45 }}>
                    {notif.message}
                  </p>
                  <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)', marginTop: 5, fontWeight: 500 }}>
                    {timeAgo(notif.createdAt)} · {fmtDate(notif.createdAt)}
                  </p>
                </div>

                {/* Unread dot */}
                {isUnread && (
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', background: 'var(--violet)',
                    flexShrink: 0, marginTop: 5,
                    boxShadow: '0 0 6px rgba(101,88,211,0.6)',
                  }} />
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 12px', borderTop: '1px solid rgba(0,0,0,0.06)',
          background: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <p style={{ fontSize: 11, color: 'var(--text-3)' }}>
            {sorted.length > 0 ? `${sorted.length} notification${sorted.length !== 1 ? 's' : ''} · tap to mark read` : 'No notifications'}
          </p>
          <button onClick={sendTestNotification} style={{
            display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
            cursor: 'pointer', color: 'var(--text-3)', fontSize: 11, fontWeight: 500, padding: '3px 6px',
            borderRadius: 6, transition: 'color 0.1s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--violet)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)' }}>
            <Zap size={10} /> Test
          </button>
        </div>
      </div>
    </>
  )
}
