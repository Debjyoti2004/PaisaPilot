'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import {
  Bell, Mail, IndianRupee, LogOut, Check,
  ShieldCheck, FileDown, Loader2, ChevronRight,
} from 'lucide-react'

interface AppSettings {
  expectedSalary: number
  savingsFloor: number
  emailReports: boolean
  reportEmail: string
  salaryCarryover: boolean
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <div className="mb-5">
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>{title}</h3>
        {desc && <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 3 }}>{desc}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 26, borderRadius: 99, border: 'none', cursor: 'pointer',
        background: checked ? 'var(--violet)' : 'var(--border)',
        padding: 3, display: 'flex', alignItems: 'center',
        justifyContent: checked ? 'flex-end' : 'flex-start',
        transition: 'background 0.15s, justify-content 0.15s',
        flexShrink: 0,
      }}
    >
      <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
    </button>
  )
}

function SettingRow({ label, note, action }: { label: string; note?: string; action: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)' }}>{label}</p>
        {note && <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{note}</p>}
      </div>
      {action}
    </div>
  )
}

export default function ProfilePage() {
  const { data: session } = useSession()
  const [settings, setSettings] = useState<AppSettings>({
    expectedSalary: 0, savingsFloor: 0,
    emailReports: false, reportEmail: '', salaryCarryover: false,
  })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportMsg, setReportMsg] = useState('')

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        if (d?.settings) {
          setSettings(s => ({
            ...s,
            expectedSalary:  d.settings.expectedSalary  ?? s.expectedSalary,
            savingsFloor:    d.settings.savingsFloor    ?? s.savingsFloor,
            emailReports:    d.settings.emailReports    ?? s.emailReports,
            reportEmail:     d.settings.reportEmail     ?? s.reportEmail,
            salaryCarryover: d.settings.salaryCarryover ?? s.salaryCarryover,
          }))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const save = async (patch?: Partial<AppSettings>) => {
    const body = patch ?? settings
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {})
    if (!patch) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
  }

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const updated = { ...settings, [key]: value }
    setSettings(updated)
    save({ [key]: value })
  }

  const downloadReport = async () => {
    setReportLoading(true); setReportMsg('')
    try {
      const res = await fetch('/api/reports/monthly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: settings.emailReports ? settings.reportEmail : undefined }),
      })
      if (res.headers.get('content-type')?.includes('application/pdf')) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = 'PaisaPilot-report.pdf'; a.click()
        URL.revokeObjectURL(url)
        setReportMsg('PDF downloaded!')
      } else {
        const d = await res.json()
        setReportMsg(d.message ?? 'Report sent!')
      }
    } catch { setReportMsg('Failed to generate report') }
    finally { setReportLoading(false); setTimeout(() => setReportMsg(''), 4000) }
  }

  const user = session?.user as { name?: string | null; email?: string | null; image?: string | null } | undefined
  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.[0] ?? 'U').toUpperCase()
  const isGoogle = !!(session as { user?: { provider?: string } } | null)?.user

  if (loading) return (
    <div className="p-6 space-y-4">
      {[140, 200, 180, 160].map((h, i) => <div key={i} className="card skeleton" style={{ height: h }} />)}
    </div>
  )

  return (
    <div className="p-6 space-y-5">

      <div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)' }}>Profile</h2>
        <p style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 4 }}>Manage your account, preferences, and notifications.</p>
      </div>

      {/* User card */}
      <div className="card p-6" style={{ background: 'linear-gradient(135deg, var(--violet-bg) 0%, #fff 100%)' }}>
        <div className="flex items-center gap-4">
          {user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt={user.name ?? 'User'} className="w-14 h-14 rounded-2xl object-cover" style={{ border: '2px solid var(--violet-border)' }} />
          ) : (
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--violet)', color: '#fff', fontSize: 22, fontWeight: 800 }}>
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-1)' }} className="truncate">{user?.name ?? 'User'}</p>
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }} className="truncate">{user?.email ?? ''}</p>
            <span style={{
              display: 'inline-block', marginTop: 6, fontSize: 11, fontWeight: 600,
              padding: '2px 10px', borderRadius: 99,
              background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid var(--green-border)',
            }}>
              {isGoogle ? 'Google Account' : 'Email Account'}
            </span>
          </div>
        </div>
      </div>

      {/* Financial settings */}
      <Section title="Financial Settings" desc="Used for savings alerts and dashboard calculations.">
        <div>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Expected monthly income (₹)</label>
          <div className="flex items-center form-input p-0 overflow-hidden" style={{ padding: 0 }}>
            <span style={{ padding: '10px 12px', fontSize: 14, color: 'var(--text-3)', borderRight: '1px solid var(--border)' }}>₹</span>
            <input
              type="number"
              value={settings.expectedSalary}
              onChange={e => setSettings(s => ({ ...s, expectedSalary: parseFloat(e.target.value) || 0 }))}
              onBlur={() => save({ expectedSalary: settings.expectedSalary })}
              style={{ flex: 1, border: 'none', background: 'transparent', padding: '10px 12px', fontSize: 14, color: 'var(--text-1)', outline: 'none' }}
            />
          </div>
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Minimum savings floor (₹)</label>
          <div className="flex items-center form-input p-0 overflow-hidden" style={{ padding: 0 }}>
            <span style={{ padding: '10px 12px', fontSize: 14, color: 'var(--text-3)', borderRight: '1px solid var(--border)' }}>₹</span>
            <input
              type="number"
              value={settings.savingsFloor}
              onChange={e => setSettings(s => ({ ...s, savingsFloor: parseFloat(e.target.value) || 0 }))}
              onBlur={() => save({ savingsFloor: settings.savingsFloor })}
              style={{ flex: 1, border: 'none', background: 'transparent', padding: '10px 12px', fontSize: 14, color: 'var(--text-1)', outline: 'none' }}
            />
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 5 }}>You will be alerted if savings drop below this amount.</p>
        </div>
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        <SettingRow
          label="Salary carryover"
          note="Income on days 25–31 counts as next month's salary"
          action={<Toggle checked={settings.salaryCarryover} onChange={v => updateSetting('salaryCarryover', v)} />}
        />
        <SettingRow
          label="Monthly report reminder"
          note="Send a monthly email summary of your transactions"
          action={<Toggle checked={settings.emailReports} onChange={v => updateSetting('emailReports', v)} />}
        />
        {settings.emailReports && (
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Report email</label>
            <input
              type="email"
              className="form-input"
              value={settings.reportEmail}
              onChange={e => setSettings(s => ({ ...s, reportEmail: e.target.value }))}
              onBlur={() => save({ reportEmail: settings.reportEmail })}
              placeholder="you@example.com"
            />
          </div>
        )}
      </Section>

      {/* Account security */}
      <Section title="Account" desc="Your sign-in method and data privacy.">
        <SettingRow
          label="Sign-in method"
          note="Your account is authenticated with Google OAuth"
          action={<span style={{ fontSize: 12, fontWeight: 600, color: 'var(--green)' }}>Google</span>}
        />
        <SettingRow
          label="Data isolation"
          note="Your data is private and never shared with other users"
          action={<span style={{ fontSize: 12, fontWeight: 600, color: 'var(--green)' }}>Active</span>}
        />
        <div style={{ paddingTop: 8, borderTop: '1px solid var(--border)' }}>
          <a href="/settings" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--violet)', fontWeight: 500, textDecoration: 'none' }}>
            All settings <ChevronRight size={14} />
          </a>
        </div>
      </Section>

      {/* Save button — only needed if you change salary/floor without blurring */}
      <div className="flex gap-3">
        <button
          onClick={() => save()}
          className="btn-primary flex-1"
          style={{ justifyContent: 'center', padding: '12px 20px', fontSize: 14 }}
        >
          {saved ? (
            <span className="flex items-center gap-2"><Check size={15} /> Saved!</span>
          ) : (
            <span className="flex items-center gap-2"><IndianRupee size={15} /> Save settings</span>
          )}
        </button>

        <button
          onClick={downloadReport}
          disabled={reportLoading}
          className="btn-secondary flex-1"
          style={{ justifyContent: 'center', padding: '12px 20px', fontSize: 14, gap: 6 }}
        >
          {reportLoading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <FileDown size={15} />}
          {reportLoading ? 'Generating…' : 'Monthly report'}
        </button>
      </div>

      {reportMsg && (
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--green)' }}>{reportMsg}</p>
      )}

      {/* Email reports */}
      <div className="card p-5" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Mail size={14} style={{ color: 'var(--text-3)' }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>Email Reports</p>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>
          Monthly PDF summaries are sent at month-end when email reports are enabled above.
          Your report includes transaction totals, category breakdown, and savings rate.
        </p>
      </div>

      {/* Security note */}
      <div className="card p-5" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck size={14} style={{ color: 'var(--green)' }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>Private by design</p>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>
          PaisaPilot never syncs your data to third-party analytics. All records are stored in your own account and are only visible to you.
        </p>
      </div>

      {/* Sign out */}
      <button
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="w-full btn-ghost"
        style={{
          justifyContent: 'center', padding: '12px 20px', fontSize: 14,
          color: 'var(--red)', border: '1px solid #fecaca', background: 'var(--red-bg)',
        }}
      >
        <LogOut size={15} style={{ color: 'var(--red)' }} />
        Sign out
      </button>

      <div style={{ height: 24 }} />
    </div>
  )
}
