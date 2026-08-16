'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { Save, Cloud, Trash2, AlertCircle, Check, FolderOpen, Search, X, Users, Link, Eye, LogOut, UserMinus } from 'lucide-react'
import { DownloadMenu } from '@/components/DownloadMenu'
import { useViewMode } from '@/contexts/ViewContext'
import { DatePicker } from '@/components/DatePicker'
import { createPortal } from 'react-dom'

interface Settings {
  expectedSalary: number; savingsFloor: number; emailReports: boolean; reportEmail: string
  assetsTotal: number; liabilitiesTotal: number; netWorthConfigured: boolean
  driveFolder: string | null; driveEnabled: boolean; driveLastSync: string | null
  salaryCarryover: boolean
  dashboardWidgets: string // JSON array of account names
  customAccounts: string  // JSON array of { name, type }
}

function Section({ id, title, desc, children }: { id?: string; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="card p-6" id={id}>
      <div className="mb-5">
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>{title}</h3>
        {desc && <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 3 }}>{desc}</p>}
      </div>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const [settings, setSettings]       = useState<Settings | null>(null)
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [loading, setLoading]         = useState(true)
  const [clearConfirm, setClearConfirm] = useState(false)
  const [clearing, setClearing]       = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/settings')
      const d = await res.json()
      if (d.settings) setSettings(d.settings)
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function save(updates: Partial<Settings>) {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const d = await res.json()
      if (d.settings) setSettings(d.settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {} finally { setSaving(false) }
  }

  async function saveNetWorth(assets: number, liabilities: number) {
    await save({ assetsTotal: assets, liabilitiesTotal: liabilities, netWorthConfigured: true })
  }

  if (loading || !settings) return (
    <div className="p-6 space-y-4">
      {[1,2,3].map(i => <div key={i} className="card skeleton" style={{ height: 160 }} />)}
    </div>
  )

  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)' }}>Settings</h2>
        <p style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 4 }}>Manage your account, notifications, and integrations.</p>
      </div>

      {/* Save feedback */}
      {saved && (
        <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'var(--green-bg)', border: '1px solid var(--green-border)' }}>
          <Check size={14} style={{ color: 'var(--green)' }} />
          <p style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>Settings saved!</p>
        </div>
      )}

      {/* Profile */}
      <Section title="Account" desc="Your Google account linked to PaisaPilot.">
        <div className="flex items-center gap-4">
          {session?.user?.image && (
            <img src={session.user.image} alt="avatar" className="w-14 h-14 rounded-full" />
          )}
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>{session?.user?.name ?? '—'}</p>
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>{session?.user?.email ?? '—'}</p>
          </div>
          <button className="btn-secondary ml-auto" style={{ fontSize: 13 }} onClick={() => signOut({ callbackUrl: '/login' })}>
            Sign out
          </button>
        </div>
      </Section>

      {/* Net Worth */}
      <Section title="Net Worth" desc="Set your total assets and liabilities to see your net worth on the dashboard.">
        <NetWorthForm settings={settings} onSave={saveNetWorth} saving={saving} />
      </Section>

      {/* Income & reports */}
      <Section title="Income & notifications">
        <div className="space-y-4">
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Expected monthly income (₹)</label>
            <input type="number" className="form-input" style={{ maxWidth: 240 }}
              defaultValue={settings.expectedSalary}
              onBlur={e => save({ expectedSalary: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Monthly savings floor (₹)</label>
            <input type="number" className="form-input" style={{ maxWidth: 240 }}
              defaultValue={settings.savingsFloor}
              onBlur={e => save({ savingsFloor: parseFloat(e.target.value) || 0 })} />
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 5 }}>You&apos;ll be alerted if savings fall below this amount.</p>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="email-reports" defaultChecked={settings.emailReports}
              onChange={e => save({ emailReports: e.target.checked })}
              style={{ accentColor: 'var(--violet)', width: 16, height: 16 }} />
            <label htmlFor="email-reports" style={{ fontSize: 14, color: 'var(--text-1)', cursor: 'pointer' }}>
              Send me monthly email reports
            </label>
          </div>
          {settings.emailReports && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Report email address</label>
              <input type="email" className="form-input" style={{ maxWidth: 300 }}
                defaultValue={settings.reportEmail}
                onBlur={e => save({ reportEmail: e.target.value })} />
            </div>
          )}
          {/* Salary carryover */}
          <div className="pt-2" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex items-start gap-3">
              <input type="checkbox" id="salary-carryover" defaultChecked={settings.salaryCarryover}
                onChange={e => save({ salaryCarryover: e.target.checked })}
                style={{ accentColor: 'var(--violet)', width: 16, height: 16, marginTop: 2 }} />
              <div>
                <label htmlFor="salary-carryover" style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)', cursor: 'pointer' }}>
                  Salary arrives end of month (28–31)
                </label>
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>
                  When on, income received on days 25–31 of a month counts as the <em>following month&apos;s</em> salary.
                  So your July 31 pay shows under &quot;August&quot; in the dashboard.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Statement export */}
      <Section title="Statement export" desc="Pick a date range and download or save your transactions to Google Drive.">
        <StatementExport />
      </Section>

      {/* Google Drive */}
      <Section id="drive" title="Google Drive sync" desc="Connect a Drive folder. PaisaPilot will pull new CSVs automatically every day at 8 AM.">
        <DriveSection settings={settings} onSave={save} saving={saving} />
      </Section>

      {/* Family & Sharing */}
      <Section id="family" title="Family & Sharing" desc="Invite family members to view your financial data in read-only mode.">
        <FamilySection />
      </Section>

      {/* PIN Lock */}
      <Section title="Security — PIN Lock" desc="Protect your data with a 4-digit PIN. You'll need to enter it every time you open the app.">
        <PinSection />
      </Section>

      {/* Danger zone */}
      <Section title="Danger zone">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 p-4 rounded-xl" style={{ background: 'var(--red-bg)', border: '1px solid #fecaca' }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--red)' }}>Clear all transactions</p>
              <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>This permanently deletes every transaction in your account. Cannot be undone.</p>
            </div>
            {clearConfirm ? (
              <div className="flex gap-2 flex-shrink-0">
                <button className="btn-ghost" style={{ fontSize: 12, color: 'var(--red)' }}
                  disabled={clearing}
                  onClick={async () => {
                    setClearing(true)
                    try {
                      await fetch('/api/transactions/clear', { method: 'DELETE' })
                    } catch {}
                    setClearing(false); setClearConfirm(false)
                    window.dispatchEvent(new Event('paisapilot:refresh'))
                  }}>
                  {clearing ? 'Deleting…' : 'Yes, delete all'}
                </button>
                <button className="btn-secondary" style={{ fontSize: 12 }} onClick={() => setClearConfirm(false)}>Cancel</button>
              </div>
            ) : (
              <button className="btn-ghost" style={{ fontSize: 13, color: 'var(--red)', padding: '8px 14px', flexShrink: 0 }}
                onClick={() => setClearConfirm(true)}>
                <Trash2 size={14} /> Clear data
              </button>
            )}
          </div>
        </div>
      </Section>
    </div>
  )
}

// ── Family Section ────────────────────────────────────────────────────
interface FamilyMemberData {
  id: string; role: string
  user: { id: string; name: string | null; email: string | null; image: string | null }
}
interface InviteData { id: string; token: string; label: string | null; email: string | null; expiresAt: string }
interface FamilyData { id: string; name: string; members: FamilyMemberData[]; invites: InviteData[] }

function MemberAvatar({ user, size = 36, ring = false }: { user: { name: string | null; email: string | null; image: string | null }; size?: number; ring?: boolean }) {
  const initial = (user.name || user.email || '?')[0].toUpperCase()
  const style: React.CSSProperties = {
    width: size, height: size, borderRadius: '50%', flexShrink: 0,
    ...(ring ? { outline: '2.5px solid var(--violet)', outlineOffset: 2 } : {}),
  }
  if (user.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.image} alt="" style={{ ...style, objectFit: 'cover' }} />
  }
  return (
    <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--violet-bg)', border: '1px solid var(--violet-border)' }}>
      <span style={{ fontSize: size * 0.33, fontWeight: 700, color: 'var(--violet)' }}>{initial}</span>
    </div>
  )
}

function FamilySection() {
  const { data: session } = useSession()
  const { startViewing, stopViewing, viewingUser } = useViewMode()
  const [family, setFamily] = useState<FamilyData | null>(null)
  const [myRole, setMyRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [familyName, setFamilyName] = useState('My Family')
  const [leaving, setLeaving] = useState(false)

  const [portalMounted, setPortalMounted] = useState(false)
  useEffect(() => { setPortalMounted(true) }, [])

  // Invite modal state
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteToast, setInviteToast] = useState('')

  const myId = (session?.user as { id?: string })?.id

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/family')
      const d = await r.json()
      setFamily(d.family)
      setMyRole(d.myRole ?? null)
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function createFamily() {
    setCreating(true)
    try {
      await fetch('/api/family', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: familyName }) })
      load()
    } catch {} finally { setCreating(false) }
  }

  async function sendInvite() {
    if (!inviteEmail.trim()) { setInviteError('Enter an email address'); return }
    setInviting(true); setInviteError('')
    try {
      const res = await fetch('/api/family/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      })
      const d = await res.json()
      if (!res.ok) { setInviteError(d.error || 'Failed to send'); return }
      closeInviteModal()
      load()
      setInviteToast(`Invite sent to ${d.email}`)
      setTimeout(() => setInviteToast(''), 5000)
    } catch { setInviteError('Network error') } finally { setInviting(false) }
  }

  function closeInviteModal() {
    setInviteOpen(false); setInviteEmail(''); setInviteError('')
  }

  async function cancelInvite(inviteId: string) {
    await fetch('/api/family/invite', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inviteId }) })
    load()
  }

  async function removeMember(memberId: string) {
    await fetch('/api/family/members', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memberId }) })
    load()
  }

  async function leaveFamily() {
    setLeaving(true)
    try {
      await fetch('/api/family', { method: 'DELETE' })
      stopViewing()
      load()
    } catch {} finally { setLeaving(false) }
  }

  if (loading) return <div className="skeleton rounded-xl" style={{ height: 80 }} />

  if (!family) {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-xl flex items-start gap-3" style={{ background: 'var(--violet-bg)', border: '1px solid var(--violet-border)' }}>
          <Users size={16} style={{ color: 'var(--violet)', marginTop: 2, flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
            Create a family group to let trusted people (spouse, parents, CA) view your data in read-only mode. They can never edit or delete anything.
          </p>
        </div>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Group name</label>
            <input type="text" className="form-input" value={familyName} onChange={e => setFamilyName(e.target.value)} placeholder="My Family" style={{ maxWidth: 260 }} />
          </div>
          <button className="btn-primary" style={{ gap: 7 }} onClick={createFamily} disabled={creating}>
            <Users size={14} />
            {creating ? 'Creating…' : 'Create family'}
          </button>
        </div>
      </div>
    )
  }

  const viewedMember = viewingUser ? family.members.find(m => m.user.id === viewingUser.id) : null

  return (
    <div className="space-y-5">
      {/* Active view mode banner — prominent when viewing someone */}
      {viewingUser && viewedMember && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
          background: 'var(--violet)', borderRadius: 14,
          boxShadow: '0 2px 12px rgba(101,88,211,0.25)',
        }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <MemberAvatar user={viewedMember.user} size={36} />
            <span style={{
              position: 'absolute', bottom: -2, right: -2,
              width: 12, height: 12, borderRadius: '50%',
              background: '#22c55e', border: '2px solid var(--violet)',
            }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
              Viewing {viewedMember.user.name ?? viewedMember.user.email}&apos;s data
            </p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>
              Read-only · you cannot add, edit or delete anything
            </p>
          </div>
          <button
            onClick={stopViewing}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
              borderRadius: 10, background: 'rgba(255,255,255,0.18)', border: 'none',
              color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
            }}
          >
            <X size={12} />Stop viewing
          </button>
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>{family.name}</p>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
            {family.members.length} member{family.members.length !== 1 ? 's' : ''} · You are {myRole === 'owner' ? 'the owner' : 'a viewer'}
          </p>
        </div>
        {myRole === 'owner' && (
          <button className="btn-primary" style={{ gap: 7, fontSize: 12 }} onClick={() => setInviteOpen(true)}>
            <Link size={13} />
            Invite member
          </button>
        )}
      </div>

      {/* Members list */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 8 }}>
          Members
        </p>
        <div className="space-y-2">
          {family.members.map(m => {
            const isMe = m.user.id === myId
            const isActiveView = viewingUser?.id === m.user.id
            const displayName = m.user.name ?? m.user.email ?? 'Member'

            return (
              <div
                key={m.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                  borderRadius: 12, transition: 'all .15s',
                  background: isActiveView ? 'var(--violet-bg)' : 'var(--bg)',
                  border: `1.5px solid ${isActiveView ? 'var(--violet)' : 'var(--border)'}`,
                }}
              >
                {/* Avatar with live ring when viewing */}
                <MemberAvatar user={m.user} size={36} ring={isActiveView} />

                {/* Name + role */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: isActiveView ? 'var(--violet)' : 'var(--text-1)' }}>
                      {displayName}
                    </span>
                    {isMe && (
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 99, background: 'var(--bg-3)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                        you
                      </span>
                    )}
                    {isActiveView && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'var(--violet)', color: '#fff', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                        Viewing now
                      </span>
                    )}
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 99, background: m.role === 'owner' ? '#fef3c7' : '#f0f9ff', color: m.role === 'owner' ? '#92400e' : '#0c4a6e', border: `1px solid ${m.role === 'owner' ? '#fde68a' : '#bae6fd'}` }}>
                      {m.role}
                    </span>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{m.user.email}</p>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                  {/* View data: only a viewer can view the owner's data, not the other way */}
                  {!isMe && myRole === 'viewer' && m.role === 'owner' && (
                    isActiveView ? (
                      <button
                        onClick={stopViewing}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                          borderRadius: 8, background: 'var(--violet)', border: 'none',
                          color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        <X size={12} />Stop viewing
                      </button>
                    ) : (
                      <button
                        onClick={() => startViewing({ id: m.user.id, name: displayName, image: m.user.image })}
                        className="btn-secondary"
                        style={{ fontSize: 12, padding: '6px 12px', gap: 6 }}
                      >
                        <Eye size={13} />View data
                      </button>
                    )
                  )}
                  {myRole === 'owner' && !isMe && (
                    <button className="btn-ghost" style={{ padding: 7 }} onClick={() => removeMember(m.id)} title="Remove member">
                      <UserMinus size={13} style={{ color: 'var(--red)' }} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Pending invites */}
      {myRole === 'owner' && family.invites.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 8 }}>Pending invites</p>
          <div className="space-y-2">
            {family.invites.map(inv => {
              const expired = new Date(inv.expiresAt) < new Date()
              return (
                <div key={inv.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg)', border: '1px solid var(--border)', opacity: expired ? 0.6 : 1 }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--violet-bg)' }}>
                    <span style={{ fontSize: 13 }}>✉️</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {inv.email ?? 'Unknown email'}
                    </p>
                    <p style={{ fontSize: 11, color: expired ? 'var(--red)' : 'var(--text-3)' }}>
                      {expired ? 'Expired' : `OTP expires ${new Date(inv.expiresAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                  </div>
                  <button className="btn-ghost" style={{ padding: 7 }} onClick={() => cancelInvite(inv.id)} title="Cancel invite">
                    <X size={13} style={{ color: 'var(--red)' }} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Invite modal */}
      {inviteOpen && portalMounted && createPortal(
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeInviteModal()}>
          <div className="modal-box" style={{ maxWidth: 420 }}>
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>Invite member</h3>
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>An OTP will be sent to their email</p>
              </div>
              <button className="btn-ghost" style={{ padding: 8 }} onClick={closeInviteModal}><X size={16} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Email address</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="friend@example.com"
                  value={inviteEmail}
                  onChange={e => { setInviteEmail(e.target.value); setInviteError('') }}
                  onKeyDown={e => e.key === 'Enter' && sendInvite()}
                  autoFocus
                />
              </div>
              <div className="p-3 rounded-xl flex items-start gap-2" style={{ background: 'var(--violet-bg)', border: '1px solid var(--violet-border)' }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>🔒</span>
                <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
                  We'll email them a secure link + 6-digit OTP. The OTP expires in <strong>5 minutes</strong> and can only be used once.
                </p>
              </div>
              {inviteError && (
                <p style={{ fontSize: 13, color: 'var(--red)', background: 'var(--red-bg)', padding: '10px 14px', borderRadius: 8 }}>{inviteError}</p>
              )}
            </div>
            <div className="flex gap-3 justify-end px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
              <button className="btn-secondary" onClick={closeInviteModal}>Cancel</button>
              <button className="btn-primary" onClick={sendInvite} disabled={inviting || !inviteEmail.trim()}>
                {inviting ? 'Sending…' : 'Send invite'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {family.members.length === 1 && family.invites.length === 0 && myRole === 'owner' && (
        <div className="p-4 rounded-xl text-center" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, color: 'var(--text-3)' }}>No members yet. Invite someone to share your data with them.</p>
        </div>
      )}

      {/* Success toast */}
      {inviteToast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 300,
          background: '#16a34a', color: '#fff', padding: '12px 20px', borderRadius: 12,
          fontSize: 14, fontWeight: 600, boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
          display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
        }}>
          <Check size={16} /> {inviteToast}
        </div>
      )}

      {/* Leave / delete */}
      <div className="pt-2" style={{ borderTop: '1px solid var(--border)' }}>
        {myRole === 'owner' ? (
          <>
            <button className="btn-ghost" style={{ fontSize: 12, color: 'var(--red)', gap: 6 }} onClick={leaveFamily} disabled={leaving}>
              <Trash2 size={13} />
              {leaving ? 'Deleting…' : 'Delete family group'}
            </button>
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>All members will lose access. Cannot be undone.</p>
          </>
        ) : (
          <button className="btn-ghost" style={{ fontSize: 12, color: 'var(--red)', gap: 6 }} onClick={leaveFamily} disabled={leaving}>
            <LogOut size={13} />
            {leaving ? 'Leaving…' : 'Leave family'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Net Worth Form ────────────────────────────────────────────────────
function NetWorthForm({ settings, onSave, saving }: {
  settings: Settings; onSave: (a: number, l: number) => void; saving: boolean
}) {
  const [assets, setAssets]   = useState(String(settings.assetsTotal || ''))
  const [liab, setLiab]       = useState(String(settings.liabilitiesTotal || ''))
  const net = (parseFloat(assets) || 0) - (parseFloat(liab) || 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Total assets (₹)</label>
          <input type="number" className="form-input" placeholder="0" value={assets} onChange={e => setAssets(e.target.value)} />
          <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>Bank balance, investments, property…</p>
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Total liabilities (₹)</label>
          <input type="number" className="form-input" placeholder="0" value={liab} onChange={e => setLiab(e.target.value)} />
          <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>Loans, credit card balances, EMIs…</p>
        </div>
      </div>
      {(assets || liab) && (
        <div className="p-3 rounded-xl" style={{ background: net >= 0 ? 'var(--green-bg)' : 'var(--red-bg)', border: `1px solid ${net >= 0 ? 'var(--green-border)' : '#fecaca'}` }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: net >= 0 ? 'var(--green)' : 'var(--red)' }}>
            Net worth: ₹{Math.abs(net).toLocaleString('en-IN')} {net < 0 ? '(negative)' : ''}
          </p>
        </div>
      )}
      <button className="btn-primary" style={{ gap: 6, fontSize: 13 }} disabled={saving}
        onClick={() => onSave(parseFloat(assets) || 0, parseFloat(liab) || 0)}>
        <Save size={14} />{saving ? 'Saving…' : 'Save net worth'}
      </button>
    </div>
  )
}

// ── Drive Section ─────────────────────────────────────────────────────
function DriveSection({ settings, onSave, saving }: {
  settings: Settings; onSave: (u: Partial<Settings>) => void; saving: boolean
}) {
  const searchParams = useSearchParams()
  const [folder, setFolder]       = useState(settings.driveFolder ?? '')
  const [syncing, setSyncing]     = useState(false)
  const [syncMsg, setSyncMsg]     = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const [driveFolders, setDriveFolders] = useState<{ id: string; name: string }[]>([])
  const [loadingFolders, setLoadingFolders] = useState(false)
  const [folderSearch, setFolderSearch] = useState('')
  const [pickerErr, setPickerErr] = useState('')
  const [driveLinked, setDriveLinked] = useState<boolean | null>(null)

  // Check if Drive is connected + handle OAuth callback result
  useEffect(() => {
    fetch('/api/drive-upload').then(r => r.json()).then(d => setDriveLinked(d.connected)).catch(() => setDriveLinked(false))
    const connected = searchParams.get('drive_connected')
    const err       = searchParams.get('drive_error')
    if (connected) { setSyncMsg('Google Drive connected!'); setDriveLinked(true) }
    if (err) setSyncMsg(`Drive connection failed: ${err.replace(/_/g, ' ')}`)
  }, [searchParams])

  async function syncNow() {
    setSyncing(true); setSyncMsg('')
    try {
      const res = await fetch('/api/drive-sync', { method: 'POST' })
      const d = await res.json()
      if (!res.ok) { setSyncMsg(`Error: ${d.error}`); return }
      setSyncMsg(`Synced! Imported ${d.imported} new transactions, skipped ${d.skipped} duplicates from ${d.filesProcessed} file(s).`)
      window.dispatchEvent(new Event('paisapilot:refresh'))
    } catch { setSyncMsg('Sync failed. Please try again.') }
    finally { setSyncing(false) }
  }

  async function openPicker() {
    setShowPicker(true); setFolderSearch(''); setPickerErr('')
    if (driveFolders.length > 0) return
    setLoadingFolders(true)
    try {
      const res = await fetch('/api/drive-folders')
      const d = await res.json()
      if (!res.ok) { setPickerErr(d.error ?? 'Could not load folders'); return }
      setDriveFolders(d.folders)
    } catch { setPickerErr('Failed to connect to Drive') }
    finally { setLoadingFolders(false) }
  }

  function pickFolder(name: string) {
    setFolder(name)
    setShowPicker(false)
    onSave({ driveFolder: name })
  }

  const filtered = driveFolders.filter(f =>
    f.name.toLowerCase().includes(folderSearch.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {/* Drive connection status */}
      {driveLinked === false && (
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl" style={{ background: 'var(--violet-bg)', border: '1px solid var(--violet-border)' }}>
          <div className="flex items-center gap-3">
            <Cloud size={18} style={{ color: 'var(--violet)', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--violet)' }}>Google Drive not connected</p>
              <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                Click to authorize PaisaPilot to access your Drive folders.
              </p>
            </div>
          </div>
          <a href="/api/auth/link-drive" className="btn-primary flex items-center gap-2" style={{ fontSize: 13, flexShrink: 0, textDecoration: 'none' }}>
            <Cloud size={14} /> Connect Drive
          </a>
        </div>
      )}
      {driveLinked === true && (
        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--green-bg)', border: '1px solid var(--green-border)' }}>
          <Check size={15} style={{ color: 'var(--green)', flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: 'var(--green)', fontWeight: 500 }}>Google Drive connected</p>
          <a href="/api/auth/link-drive" style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-3)', textDecoration: 'underline' }}>
            Re-authorize
          </a>
        </div>
      )}

      {/* Folder picker — only shown when Drive is connected */}
      <div style={{ opacity: driveLinked ? 1 : 0.45, pointerEvents: driveLinked ? 'auto' : 'none' }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>
          Connected folder
        </label>

        {/* Selected folder display */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 flex-1" style={{
            padding: '9px 12px', borderRadius: 10, border: '1px solid var(--border)',
            background: 'rgba(255,255,255,0.6)', maxWidth: 320,
          }}>
            <FolderOpen size={15} style={{ color: folder ? 'var(--violet)' : 'var(--text-3)', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: folder ? 'var(--text-1)' : 'var(--text-3)', flex: 1 }}>
              {folder || 'No folder selected'}
            </span>
            {folder && (
              <button onClick={() => { setFolder(''); onSave({ driveFolder: null }) }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}>
                <X size={13} style={{ color: 'var(--text-3)' }} />
              </button>
            )}
          </div>
          <button className="btn-secondary flex items-center gap-2" style={{ fontSize: 13 }} onClick={openPicker}>
            <FolderOpen size={14} /> Browse
          </button>
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>
          Pick a folder from your Drive. PaisaPilot will read CSV files from it and save exports there.
        </p>
      </div>

      {/* Folder picker modal */}
      {showPicker && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowPicker(false)}>
          <div className="card" style={{
            width: 420, maxHeight: 480, display: 'flex', flexDirection: 'column',
            padding: 0, overflow: 'hidden', animation: 'slideInRight 0.2s ease',
          }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2">
                <Cloud size={16} style={{ color: '#4285f4' }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Choose a Drive folder</span>
              </div>
              <button onClick={() => setShowPicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={16} style={{ color: 'var(--text-3)' }} />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--border)', border: '1px solid rgba(210,214,230,0.5)' }}>
                <Search size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search folders…"
                  value={folderSearch}
                  onChange={e => setFolderSearch(e.target.value)}
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: 'var(--text-1)', flex: 1 }}
                />
              </div>
            </div>

            {/* Folder list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loadingFolders ? (
                <div className="flex items-center justify-center py-12 gap-3" style={{ color: 'var(--text-3)' }}>
                  <div className="w-4 h-4 rounded-full border-2 border-violet-200 border-t-violet-500 animate-spin" />
                  <span style={{ fontSize: 13 }}>Loading your folders…</span>
                </div>
              ) : pickerErr ? (
                <div className="m-4 p-4 rounded-xl" style={{ background: 'var(--violet-bg)', border: '1px solid var(--violet-border)', textAlign: 'center' }}>
                  <Cloud size={28} style={{ color: 'var(--violet)', margin: '0 auto 10px' }} />
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>Could not load folders</p>
                  <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>{pickerErr}</p>
                  <a href="/api/auth/link-drive" className="btn-primary inline-flex items-center gap-2" style={{ fontSize: 13, textDecoration: 'none' }}>
                    <Cloud size={14} /> Re-authorize Drive
                  </a>
                </div>
              ) : filtered.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: '32px 20px' }}>
                  {folderSearch ? 'No folders match your search' : 'No folders found in Drive'}
                </p>
              ) : (
                filtered.map(f => (
                  <button key={f.id} onClick={() => pickFolder(f.name)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      width: '100%', padding: '10px 20px', border: 'none',
                      background: folder === f.name ? 'var(--violet-bg)' : 'transparent',
                      cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s',
                      borderBottom: '1px solid var(--border)',
                    }}
                    onMouseEnter={e => { if (folder !== f.name) e.currentTarget.style.background = 'rgba(101,88,211,0.05)' }}
                    onMouseLeave={e => { if (folder !== f.name) e.currentTarget.style.background = 'transparent' }}
                  >
                    <FolderOpen size={15} style={{ color: folder === f.name ? 'var(--violet)' : '#f59e0b', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: folder === f.name ? 600 : 400, color: folder === f.name ? 'var(--violet)' : 'var(--text-1)', flex: 1 }}>
                      {f.name}
                    </span>
                    {folder === f.name && <Check size={14} style={{ color: 'var(--violet)', flexShrink: 0 }} />}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <input type="checkbox" id="drive-enabled" checked={settings.driveEnabled}
          onChange={e => onSave({ driveEnabled: e.target.checked })}
          style={{ accentColor: 'var(--violet)', width: 16, height: 16 }} />
        <label htmlFor="drive-enabled" style={{ fontSize: 14, color: 'var(--text-1)', cursor: 'pointer' }}>
          Enable automatic daily sync (8 AM IST)
        </label>
      </div>
      {settings.driveLastSync && (
        <p style={{ fontSize: 12, color: 'var(--text-3)' }}>
          Last sync: {new Date(settings.driveLastSync).toLocaleString('en-IN')}
        </p>
      )}
      {syncMsg && (
        <p style={{ fontSize: 13, color: syncMsg.startsWith('Error') ? 'var(--red)' : 'var(--green)', fontWeight: 500 }}>{syncMsg}</p>
      )}
      {folder && (
        <div className="flex gap-3">
          <button className="btn-secondary" style={{ gap: 6, fontSize: 13 }} disabled={syncing} onClick={syncNow}>
            <Cloud size={14} />{syncing ? 'Syncing…' : 'Sync now'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Statement Export ────────────────────────────────────────────────────
function StatementExport() {
  const now = new Date()
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const today = now.toISOString().slice(0, 10)

  const [from, setFrom]       = useState(firstOfMonth)
  const [to, setTo]           = useState(today)
  const [fetching, setFetching] = useState(false)
  const [rows, setRows]       = useState<Record<string, string | number | null>[]>([])
  const [fetched, setFetched] = useState(false)

  async function fetchData() {
    setFetching(true)
    try {
      const res = await fetch(`/api/transactions?from=${from}&to=${to}&limit=2000`)
      const d = await res.json()
      const txns: Array<{
        occurredAt?: string; narration?: string; category?: { name?: string }
        type?: string; amount?: number; account?: string
      }> = d.transactions ?? d.data ?? []
      setRows(txns.map(t => ({
        Date:     t.occurredAt?.slice(0, 10) ?? '',
        Merchant: t.narration ?? '',
        Category: t.category?.name ?? '',
        Type:     t.type ?? '',
        Amount:   t.amount ?? 0,
        Account:  t.account ?? '',
      })))
      setFetched(true)
    } catch {} finally { setFetching(false) }
  }

  const COLS = [
    { key: 'Date',     header: 'Date' },
    { key: 'Merchant', header: 'Merchant' },
    { key: 'Category', header: 'Category' },
    { key: 'Type',     header: 'Type' },
    { key: 'Amount',   header: 'Amount (₹)' },
    { key: 'Account',  header: 'Account' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>From</label>
          <DatePicker value={from} onChange={v => { setFrom(v); setFetched(false) }} style={{ maxWidth: 170 }} />

        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>To</label>
          <DatePicker value={to} onChange={v => { setTo(v); setFetched(false) }} style={{ maxWidth: 170 }} />
        </div>
        <button className="btn-secondary flex items-center gap-2" disabled={fetching} onClick={fetchData}>
          {fetching
            ? <><div className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />Loading…</>
            : 'Load data'}
        </button>
      </div>

      {fetched && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 10 }}>
            {rows.length} transactions from <strong>{from}</strong> to <strong>{to}</strong>
          </p>
          <DownloadMenu
            filename={`statement-${from}-to-${to}`}
            rows={rows}
            columns={COLS}
            label={`Download statement (${rows.length})`}
          />
        </div>
      )}
    </div>
  )
}

/* ── Dashboard Widgets Section ───────────────────────────────────────────── */
const BUILTIN_ACCOUNTS = [
  { name: 'Savings Account', type: 'savings'     as const },
  { name: 'Salary Account',  type: 'savings'     as const },
  { name: 'Cash',            type: 'checking'    as const },
  { name: 'Credit Card',     type: 'credit_card' as const },
  { name: 'Debit Card',      type: 'credit_card' as const },
]

const TYPE_ICONS: Record<string, string> = { credit_card: '💳', savings: '🏦', checking: '🏧' }
const TYPE_DESC:  Record<string, string> = {
  credit_card: 'Shows total spend from this card',
  savings:     'Shows deposits and withdrawals',
  checking:    'Shows debits and credits',
}

type AccountEntry = { name: string; type: 'credit_card' | 'savings' | 'checking' }

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <div onClick={e => { e.stopPropagation(); onClick() }} style={{
      width: 44, height: 24, borderRadius: 12, padding: 3, flexShrink: 0, cursor: 'pointer',
      background: on ? 'var(--violet)' : 'var(--bg-3)',
      display: 'flex', alignItems: 'center', justifyContent: on ? 'flex-end' : 'flex-start',
      transition: 'background 0.2s',
    }}>
      <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </div>
  )
}

function DashboardWidgetsSection({ settings, onSave }: { settings: Settings; onSave: (u: Partial<Settings>) => void }) {
  const enabled: string[] = (() => {
    try { return JSON.parse(settings.dashboardWidgets ?? '[]') } catch { return [] }
  })()
  const custom: AccountEntry[] = (() => {
    try { return JSON.parse(settings.customAccounts ?? '[]') } catch { return [] }
  })()

  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<AccountEntry['type']>('checking')

  const allAccounts: AccountEntry[] = [
    ...BUILTIN_ACCOUNTS,
    ...custom,
  ]

  function toggle(name: string) {
    const next = enabled.includes(name) ? enabled.filter(a => a !== name) : [...enabled, name]
    onSave({ dashboardWidgets: next as unknown as string })
  }

  function addAccount() {
    const n = newName.trim()
    if (!n || allAccounts.find(a => a.name.toLowerCase() === n.toLowerCase())) return
    const next: AccountEntry[] = [...custom, { name: n, type: newType }]
    const nextEnabled = [...enabled, n]
    onSave({ customAccounts: next as unknown as string, dashboardWidgets: nextEnabled as unknown as string })
    setNewName(''); setAdding(false)
  }

  function removeCustom(name: string) {
    const next = custom.filter(a => a.name !== name)
    const nextEnabled = enabled.filter(a => a !== name)
    onSave({ customAccounts: next as unknown as string, dashboardWidgets: nextEnabled as unknown as string })
  }

  return (
    <div className="space-y-3">
      <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
        Toggle which account cards appear on your dashboard. Add custom accounts for credit cards, savings accounts, or any account you track.
      </p>

      {allAccounts.map(acct => {
        const on = enabled.includes(acct.name)
        const isCustom = !!custom.find(c => c.name === acct.name)
        return (
          <div key={acct.name}
            className="flex items-center justify-between p-3 rounded-xl"
            style={{ border: '1px solid var(--border)', background: on ? 'var(--violet-bg)' : 'var(--surface)', cursor: 'pointer', transition: 'background 0.15s' }}
            onClick={() => toggle(acct.name)}
          >
            <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{TYPE_ICONS[acct.type] ?? '🏧'}</span>
              <div style={{ minWidth: 0 }}>
                <div className="flex items-center gap-2">
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>{acct.name}</p>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                    color: acct.type === 'credit_card' ? '#ea580c' : acct.type === 'savings' ? '#2563eb' : '#7c3aed',
                    background: acct.type === 'credit_card' ? '#fff7ed' : acct.type === 'savings' ? '#eff6ff' : 'var(--violet-bg)',
                    padding: '1px 6px', borderRadius: 6 }}>
                    {acct.type === 'credit_card' ? 'Card' : acct.type === 'savings' ? 'Savings' : 'Checking'}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>{TYPE_DESC[acct.type]}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isCustom && (
                <button onClick={e => { e.stopPropagation(); removeCustom(acct.name) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 16, lineHeight: 1, padding: '2px 4px' }}
                  title="Remove">×</button>
              )}
              <Toggle on={on} onClick={() => toggle(acct.name)} />
            </div>
          </div>
        )
      })}

      {/* Add custom account */}
      {adding ? (
        <div className="p-4 rounded-xl" style={{ border: '1px dashed var(--violet)', background: 'var(--violet-bg)' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 12 }}>Add account</p>
          <div className="flex gap-2 mb-3">
            <input
              autoFocus
              className="form-input"
              placeholder="Account name (e.g. HDFC Credit Card)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addAccount()}
              style={{ flex: 1 }}
            />
            <select className="form-select" value={newType} onChange={e => setNewType(e.target.value as AccountEntry['type'])} style={{ width: 140 }}>
              <option value="credit_card">💳 Credit Card</option>
              <option value="savings">🏦 Savings</option>
              <option value="checking">🏧 Checking</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary" style={{ fontSize: 13, padding: '8px 16px' }} onClick={addAccount} disabled={!newName.trim()}>Add</button>
            <button className="btn-ghost" style={{ fontSize: 13 }} onClick={() => { setAdding(false); setNewName('') }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="btn-ghost" style={{ fontSize: 13, gap: 6, width: '100%', justifyContent: 'center', border: '1px dashed var(--border)', borderRadius: 12, padding: '10px' }}
          onClick={() => setAdding(true)}>
          + Add custom account
        </button>
      )}
    </div>
  )
}

/* ── PIN Section ─────────────────────────────────────────────────────────── */
type PinModal = 'enable' | 'disable' | 'change' | 'reset' | null

function PinSection() {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [modal, setModal] = useState<PinModal>(null)

  useEffect(() => {
    fetch('/api/settings/pin').then(r => r.json()).then(d => setEnabled(d.enabled ?? false))
  }, [])

  function onDone(nowEnabled: boolean) {
    setEnabled(nowEnabled)
    setModal(null)
    // Clear session lock so next open re-checks
    sessionStorage.removeItem('pp_pin_verified')
  }

  if (enabled === null) return <div className="skeleton" style={{ height: 56, borderRadius: 12 }} />

  return (
    <div className="space-y-4">
      {/* Status row */}
      <div className="flex items-center justify-between p-4 rounded-2xl" style={{ background: enabled ? 'var(--violet-bg)' : 'var(--surface)', border: '1px solid', borderColor: enabled ? 'var(--violet-border)' : 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <div style={{
            width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: enabled ? 'var(--violet)' : 'var(--border)', fontSize: 20,
          }}>
            {enabled ? '🔒' : '🔓'}
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{enabled ? 'PIN Lock is ON' : 'PIN Lock is OFF'}</p>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>
              {enabled ? 'Your app is protected with a 4-digit PIN.' : 'Anyone with access to your device can open the app.'}
            </p>
          </div>
        </div>
        <button
          className={enabled ? 'btn-secondary' : 'btn-primary'}
          style={{ fontSize: 13, flexShrink: 0 }}
          onClick={() => setModal(enabled ? 'disable' : 'enable')}
        >
          {enabled ? 'Disable' : 'Enable PIN'}
        </button>
      </div>

      {/* Actions when enabled */}
      {enabled && (
        <div className="flex gap-3 flex-wrap">
          <button className="btn-secondary" style={{ fontSize: 13 }} onClick={() => setModal('change')}>
            Change PIN
          </button>
          <button className="btn-secondary" style={{ fontSize: 13, color: 'var(--text-3)' }} onClick={() => setModal('reset')}>
            Reset via email
          </button>
        </div>
      )}

      {/* Modals */}
      {modal === 'enable'  && <PinEnableModal  onDone={() => onDone(true)}  onClose={() => setModal(null)} />}
      {modal === 'disable' && <PinDisableModal onDone={() => onDone(false)} onClose={() => setModal(null)} />}
      {modal === 'change'  && <PinChangeModal  onDone={() => onDone(true)}  onClose={() => setModal(null)} />}
      {modal === 'reset'   && <PinResetModal   onDone={() => onDone(true)}  onClose={() => setModal(null)} />}
    </div>
  )
}

/* ── PIN Modals ──────────────────────────────────────────────────────────── */

function PinModalWrap({ title, desc, onClose, children }: { title: string; desc?: string; onClose: () => void; children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null
  return createPortal(
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 400 }}>
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-1)' }}>{title}</h2>
            {desc && <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>{desc}</p>}
          </div>
          <button className="btn-ghost" style={{ padding: 8 }} onClick={onClose}><X size={18} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">{children}</div>
      </div>
    </div>,
    document.body
  )
}

function PinDigitInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>{label}</label>
      <input
        type="password"
        inputMode="numeric"
        maxLength={4}
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
        className="form-input"
        style={{ letterSpacing: '0.5em', fontSize: 20, textAlign: 'center', fontFamily: 'monospace' }}
        placeholder="••••"
        autoComplete="new-password"
      />
    </div>
  )
}

function PinEnableModal({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (pin.length !== 4) { setError('PIN must be exactly 4 digits'); return }
    if (pin !== confirm) { setError('PINs do not match'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/settings/pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) })
      const d = await res.json()
      if (!res.ok) { setError(d.error); return }
      onDone()
    } catch { setError('Something went wrong') } finally { setLoading(false) }
  }

  return (
    <PinModalWrap title="Enable PIN Lock" desc="Choose a 4-digit PIN to protect your app." onClose={onClose}>
      <PinDigitInput label="New PIN" value={pin} onChange={setPin} />
      <PinDigitInput label="Confirm PIN" value={confirm} onChange={setConfirm} />
      {error && <p style={{ fontSize: 13, color: 'var(--red)' }}>{error}</p>}
      <div className="flex gap-3 pt-2">
        <button className="btn-secondary flex-1" onClick={onClose} disabled={loading}>Cancel</button>
        <button className="btn-primary flex-1" onClick={submit} disabled={loading}>{loading ? 'Saving…' : 'Enable PIN'}</button>
      </div>
    </PinModalWrap>
  )
}

function PinDisableModal({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (pin.length !== 4) { setError('Enter your current 4-digit PIN'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/settings/pin', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) })
      const d = await res.json()
      if (!res.ok) { setError(d.error); return }
      onDone()
    } catch { setError('Something went wrong') } finally { setLoading(false) }
  }

  return (
    <PinModalWrap title="Disable PIN Lock" desc="Enter your current PIN to remove the lock." onClose={onClose}>
      <PinDigitInput label="Current PIN" value={pin} onChange={setPin} />
      {error && <p style={{ fontSize: 13, color: 'var(--red)' }}>{error}</p>}
      <div className="flex gap-3 pt-2">
        <button className="btn-secondary flex-1" onClick={onClose} disabled={loading}>Cancel</button>
        <button className="btn-primary flex-1" style={{ background: 'var(--red)' }} onClick={submit} disabled={loading}>{loading ? 'Disabling…' : 'Disable PIN'}</button>
      </div>
    </PinModalWrap>
  )
}

function PinChangeModal({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const [oldPin, setOldPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (oldPin.length !== 4) { setError('Enter your current PIN'); return }
    if (newPin.length !== 4) { setError('New PIN must be 4 digits'); return }
    if (newPin !== confirm) { setError('New PINs do not match'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/settings/pin', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oldPin, newPin }) })
      const d = await res.json()
      if (!res.ok) { setError(d.error); return }
      onDone()
    } catch { setError('Something went wrong') } finally { setLoading(false) }
  }

  return (
    <PinModalWrap title="Change PIN" desc="Enter your current PIN, then set a new one." onClose={onClose}>
      <PinDigitInput label="Current PIN" value={oldPin} onChange={setOldPin} />
      <PinDigitInput label="New PIN" value={newPin} onChange={setNewPin} />
      <PinDigitInput label="Confirm new PIN" value={confirm} onChange={setConfirm} />
      {error && <p style={{ fontSize: 13, color: 'var(--red)' }}>{error}</p>}
      <div className="flex gap-3 pt-2">
        <button className="btn-secondary flex-1" onClick={onClose} disabled={loading}>Cancel</button>
        <button className="btn-primary flex-1" onClick={submit} disabled={loading}>{loading ? 'Saving…' : 'Change PIN'}</button>
      </div>
    </PinModalWrap>
  )
}

function PinResetModal({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const [step, setStep] = useState<'send' | 'verify'>('send')
  const [otp, setOtp] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function sendOtp() {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/settings/pin/reset', { method: 'POST' })
      const d = await res.json()
      if (!res.ok) { setError(d.error); return }
      setMaskedEmail(d.maskedEmail)
      setStep('verify')
    } catch { setError('Failed to send OTP') } finally { setLoading(false) }
  }

  async function confirmReset() {
    if (!/^\d{6}$/.test(otp)) { setError('Enter the 6-digit OTP from email'); return }
    if (newPin.length !== 4) { setError('PIN must be 4 digits'); return }
    if (newPin !== confirm) { setError('PINs do not match'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/settings/pin/reset', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ otp, newPin }) })
      const d = await res.json()
      if (!res.ok) { setError(d.error); return }
      onDone()
    } catch { setError('Failed to reset PIN') } finally { setLoading(false) }
  }

  return (
    <PinModalWrap title="Reset PIN via Email" desc={step === 'send' ? "We'll send an OTP to your registered email." : `OTP sent to ${maskedEmail}`} onClose={onClose}>
      {step === 'send' ? (
        <>
          <p style={{ fontSize: 13, color: 'var(--text-3)', padding: '8px 14px', background: 'var(--violet-bg)', borderRadius: 10, border: '1px solid var(--violet-border)' }}>
            A 6-digit OTP will be sent to your registered email address. Enter it along with your new PIN to reset.
          </p>
          {error && <p style={{ fontSize: 13, color: 'var(--red)' }}>{error}</p>}
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={onClose} disabled={loading}>Cancel</button>
            <button className="btn-primary flex-1" onClick={sendOtp} disabled={loading}>{loading ? 'Sending…' : 'Send OTP'}</button>
          </div>
        </>
      ) : (
        <>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>OTP (6 digits from email)</label>
            <input
              type="tel" inputMode="numeric" maxLength={6} value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="form-input" style={{ letterSpacing: '0.4em', fontSize: 20, textAlign: 'center', fontFamily: 'monospace' }}
              placeholder="• • • • • •"
            />
          </div>
          <PinDigitInput label="New PIN" value={newPin} onChange={setNewPin} />
          <PinDigitInput label="Confirm new PIN" value={confirm} onChange={setConfirm} />
          {error && <p style={{ fontSize: 13, color: 'var(--red)' }}>{error}</p>}
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary" onClick={sendOtp} disabled={loading} style={{ fontSize: 12 }}>Resend OTP</button>
            <button className="btn-primary flex-1" onClick={confirmReset} disabled={loading}>{loading ? 'Setting PIN…' : 'Set new PIN'}</button>
          </div>
        </>
      )}
    </PinModalWrap>
  )
}
