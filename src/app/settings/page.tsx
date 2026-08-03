'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { Save, Cloud, Trash2, AlertCircle, Check, FolderOpen, Search, X } from 'lucide-react'
import { DownloadMenu } from '@/components/DownloadMenu'

interface Settings {
  expectedSalary: number; savingsFloor: number; emailReports: boolean; reportEmail: string
  assetsTotal: number; liabilitiesTotal: number; netWorthConfigured: boolean
  driveFolder: string | null; driveEnabled: boolean; driveLastSync: string | null
  salaryCarryover: boolean
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
          <input type="date" className="form-input" value={from}
            onChange={e => { setFrom(e.target.value); setFetched(false) }} style={{ maxWidth: 170 }} />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>To</label>
          <input type="date" className="form-input" value={to}
            onChange={e => { setTo(e.target.value); setFetched(false) }} style={{ maxWidth: 170 }} />
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
