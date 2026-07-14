'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { TopBar } from '@/components/layout/TopBar'
import { Bell, Mail, IndianRupee, LogOut, Check, ShieldCheck } from 'lucide-react'

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-[#13131f] border border-white/[0.07] rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/[0.06]">
        <Icon size={14} className="text-slate-400" />
        <p className="text-[12px] font-semibold text-slate-300">{title}</p>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  )
}

function FieldRow({ label, value, note }: { label: string; value: React.ReactNode; note?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-white">{label}</p>
        {note && <p className="text-[11px] text-slate-500 mt-0.5">{note}</p>}
      </div>
      <div className="flex-shrink-0">{value}</div>
    </div>
  )
}

export default function ProfilePage() {
  const { data: session } = useSession()
  const [settings, setSettings] = useState({ expectedSalary: 37000, savingsFloor: 3000, emailReports: false, reportEmail: '' })
  const [saved, setSaved] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        if (d?.settings) {
          setSettings(s => ({
            ...s,
            expectedSalary: d.settings.expectedSalary ?? s.expectedSalary,
            savingsFloor: d.settings.savingsFloor ?? s.savingsFloor,
            emailReports: d.settings.emailReports ?? s.emailReports,
            reportEmail: d.settings.reportEmail ?? s.reportEmail,
          }))
        }
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  const save = async () => {
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    }).catch(() => {})
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const user = session?.user as { id?: string; name?: string | null; email?: string | null; image?: string | null } | undefined

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.[0] ?? 'U').toUpperCase()

  if (!loaded) {
    return (
      <>
        <TopBar title="Profile" subtitle="Settings & preferences" />
        <div className="flex-1 p-4 md:p-6 pb-32 md:pb-6 space-y-4 max-w-2xl mx-auto w-full">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 skeleton rounded-2xl" />)}
        </div>
      </>
    )
  }

  return (
    <>
      <TopBar title="Profile" subtitle="Settings & preferences" />
      <div className="flex-1 p-4 md:p-6 pb-32 md:pb-6 space-y-4 max-w-2xl mx-auto w-full">

        {/* User card */}
        <div className="bg-gradient-to-r from-indigo-600/10 to-violet-600/10 border border-indigo-500/20 rounded-2xl p-5 flex items-center gap-4">
          {user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt={user.name ?? 'User'} className="w-14 h-14 rounded-2xl object-cover border border-indigo-500/30" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <span className="text-xl font-bold text-indigo-400">{initials}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[16px] font-bold text-white truncate">{user?.name ?? 'User'}</p>
            <p className="text-[12px] text-slate-500 mt-0.5 truncate">{user?.email ?? ''}</p>
            <span className="inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
              Google Account
            </span>
          </div>
        </div>

        {/* Financial settings */}
        <Section title="Financial Settings" icon={IndianRupee}>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-1.5">Expected Monthly Salary</p>
            <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-xl overflow-hidden focus-within:border-indigo-500/50 transition-colors">
              <span className="px-3 text-slate-500 text-[13px] border-r border-white/[0.08] py-2.5">₹</span>
              <input
                type="number"
                value={settings.expectedSalary}
                onChange={e => setSettings(s => ({ ...s, expectedSalary: parseFloat(e.target.value) || 0 }))}
                className="flex-1 bg-transparent px-3 py-2.5 text-[13px] text-white focus:outline-none"
              />
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-1.5">Minimum Savings Floor</p>
            <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-xl overflow-hidden focus-within:border-indigo-500/50 transition-colors">
              <span className="px-3 text-slate-500 text-[13px] border-r border-white/[0.08] py-2.5">₹</span>
              <input
                type="number"
                value={settings.savingsFloor}
                onChange={e => setSettings(s => ({ ...s, savingsFloor: parseFloat(e.target.value) || 0 }))}
                className="flex-1 bg-transparent px-3 py-2.5 text-[13px] text-white focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-600 mt-1">Always keep at least this amount in savings</p>
          </div>
        </Section>

        {/* Notifications */}
        <Section title="Notifications" icon={Bell}>
          <FieldRow label="Duplicate transaction alert" note="Warn when adding similar expense" value={
            <div className="w-10 h-6 bg-indigo-600 rounded-full flex items-center justify-end px-0.5">
              <div className="w-5 h-5 rounded-full bg-white" />
            </div>
          } />
          <FieldRow label="Budget overrun alert" note="Notify when envelope is 90% full" value={
            <div className="w-10 h-6 bg-indigo-600 rounded-full flex items-center justify-end px-0.5">
              <div className="w-5 h-5 rounded-full bg-white" />
            </div>
          } />
          <FieldRow label="Monthly report reminder" note="Remind to record salary each month" value={
            <div className="w-10 h-6 bg-white/[0.1] rounded-full flex items-center justify-start px-0.5">
              <div className="w-5 h-5 rounded-full bg-slate-400" />
            </div>
          } />
        </Section>

        {/* Email reports */}
        <Section title="Email Reports" icon={Mail}>
          <FieldRow
            label="Monthly PDF Report"
            note="Send transaction summary PDF at month-end"
            value={
              <button
                onClick={() => setSettings(s => ({ ...s, emailReports: !s.emailReports }))}
                className={`w-10 h-6 rounded-full flex items-center px-0.5 transition-all ${settings.emailReports ? 'bg-indigo-600 justify-end' : 'bg-white/[0.1] justify-start'}`}
              >
                <div className={`w-5 h-5 rounded-full ${settings.emailReports ? 'bg-white' : 'bg-slate-400'}`} />
              </button>
            }
          />
          {settings.emailReports && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-1.5">Report Email</p>
              <input
                type="email"
                value={settings.reportEmail}
                onChange={e => setSettings(s => ({ ...s, reportEmail: e.target.value }))}
                placeholder="your@email.com"
                autoComplete="email"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-[13px] text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          )}
        </Section>

        {/* Auth */}
        <Section title="Account Security" icon={ShieldCheck}>
          <FieldRow
            label="Sign-in method"
            note="Your account is secured with Google OAuth"
            value={<span className="text-[11px] text-emerald-400 font-semibold">Google</span>}
          />
          <FieldRow
            label="Data isolation"
            note="Your data is private — never shared with other users"
            value={<span className="text-[11px] text-emerald-400 font-semibold">Active</span>}
          />
        </Section>

        {/* Save button */}
        <button
          onClick={save}
          className="w-full py-3.5 rounded-xl font-semibold text-[14px] bg-indigo-600 hover:bg-indigo-500 text-white transition-all active:scale-[0.99]"
        >
          {saved ? (
            <span className="flex items-center justify-center gap-2"><Check size={16} /> Saved!</span>
          ) : 'Save Settings'}
        </button>

        {/* Sign out */}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full py-3.5 rounded-xl font-semibold text-[14px] bg-white/[0.04] hover:bg-red-500/10 border border-white/[0.08] hover:border-red-500/30 text-slate-400 hover:text-red-400 transition-all flex items-center justify-center gap-2"
        >
          <LogOut size={15} />
          Sign Out
        </button>

        <div className="h-6" />
      </div>
    </>
  )
}
