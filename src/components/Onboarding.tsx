'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Trash2, ChevronRight, ChevronLeft, Check, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface AccountRow { type: string; name: string; id: number }

const TYPE_OPTIONS = [
  { value: 'savings',     label: '🏦 Savings'     },
  { value: 'salary',      label: '💰 Salary'      },
  { value: 'cash',        label: '💵 Cash'         },
  { value: 'credit_card', label: '💳 Credit Card'  },
  { value: 'debit_card',  label: '🏧 Debit Card'  },
  { value: 'investment',  label: '📈 Investment'  },
]

const DEFAULT_ACCOUNTS: Omit<AccountRow, 'id'>[] = [
  { type: 'salary',      name: 'Salary Account' },
  { type: 'savings',     name: 'Savings Account' },
  { type: 'cash',        name: 'Cash' },
  { type: 'credit_card', name: 'Credit Card' },
  { type: 'debit_card',  name: 'Debit Card' },
]

function typeIcon(type: string) {
  return TYPE_OPTIONS.find(t => t.value === type)?.label.split(' ')[0] ?? '🏦'
}

// Aurora orbs — no emojis, just glowing gradient spheres matching the app palette
const ORBS = [
  { w: 520, h: 420, top: '-12%', left: '-8%',  bg: 'radial-gradient(ellipse, rgba(101,88,211,0.55) 0%, transparent 70%)', anim: 'ob-orb1', dur: 18 },
  { w: 440, h: 380, top: '55%',  left: '62%',  bg: 'radial-gradient(ellipse, rgba(139,82,232,0.45) 0%, transparent 70%)', anim: 'ob-orb2', dur: 22 },
  { w: 360, h: 320, top: '-5%',  left: '68%',  bg: 'radial-gradient(ellipse, rgba(67,56,202,0.38) 0%, transparent 70%)', anim: 'ob-orb3', dur: 16 },
  { w: 300, h: 280, top: '68%',  left: '-4%',  bg: 'radial-gradient(ellipse, rgba(168,85,247,0.32) 0%, transparent 70%)', anim: 'ob-orb4', dur: 20 },
]

let _id = 0
function nextId() { return ++_id }

const STEP_ICONS = ['', '👋', '🏦', '💰']
const STEP_TITLES = ['', 'Welcome to PaisaPilot', 'Your accounts', 'Income & plan']

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep]   = useState(1)
  const [mounted, setMounted] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [err, setErr]         = useState('')
  const router = useRouter()

  const [accounts, setAccounts] = useState<AccountRow[]>(() =>
    DEFAULT_ACCOUNTS.map(a => ({ ...a, id: nextId() }))
  )
  const [salary, setSalary] = useState('')
  const [age, setAge]       = useState('')

  useEffect(() => { setMounted(true) }, [])

  function addAccount() {
    setAccounts(p => [...p, { type: 'savings', name: '', id: nextId() }])
  }
  function removeAccount(id: number) {
    setAccounts(p => p.filter(a => a.id !== id))
  }
  function updateAccount(id: number, field: 'type' | 'name', value: string) {
    setAccounts(p => p.map(a => a.id === id ? { ...a, [field]: value } : a))
  }

  const s = parseFloat(salary) || 0
  const bracket = s <= 50000 ? 1 : s <= 100000 ? 2 : 3
  const pcts = bracket === 1 ? { needs: 0.53, wants: 0.27, inv: 0.20 }
             : bracket === 2 ? { needs: 0.50, wants: 0.20, inv: 0.20 }
             :                 { needs: 0.45, wants: 0.20, inv: 0.20 }

  function validate2() {
    if (!accounts.filter(a => a.name.trim()).length) { setErr('Add at least one account'); return false }
    setErr(''); return true
  }
  function validate3() {
    if (!s || s <= 0) { setErr('Enter your monthly income'); return false }
    const a = parseInt(age); if (!a || a < 15 || a > 80) { setErr('Enter a valid age (15–80)'); return false }
    setErr(''); return true
  }

  async function complete() {
    if (!validate3()) return
    setSaving(true); setErr('')
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accounts: accounts.filter(a => a.name.trim()).map(a => ({ name: a.name.trim(), type: a.type })),
          salary: s, age: parseInt(age), bracket,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed')
      setStep(4)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Something went wrong')
    } finally { setSaving(false) }
  }

  function finish() { onDone(); router.refresh() }

  if (!mounted) return null

  const namedAccounts = accounts.filter(a => a.name.trim())

  return createPortal(
    <>
      {/* Injected keyframe animations */}
      <style>{`
        @keyframes ob-orb1 {
          0%,100% { transform: translate(0,0) scale(1); }
          30%     { transform: translate(60px,-50px) scale(1.08); }
          60%     { transform: translate(-40px,70px) scale(0.94); }
          80%     { transform: translate(30px,20px) scale(1.04); }
        }
        @keyframes ob-orb2 {
          0%,100% { transform: translate(0,0) scale(1); }
          25%     { transform: translate(-80px,40px) scale(1.1); }
          55%     { transform: translate(50px,-60px) scale(0.92); }
          80%     { transform: translate(-30px,-20px) scale(1.06); }
        }
        @keyframes ob-orb3 {
          0%,100% { transform: translate(0,0) scale(1); }
          40%     { transform: translate(-60px,80px) scale(0.9); }
          70%     { transform: translate(70px,-40px) scale(1.12); }
        }
        @keyframes ob-orb4 {
          0%,100% { transform: translate(0,0) scale(1); }
          35%     { transform: translate(90px,-30px) scale(1.08); }
          65%     { transform: translate(-50px,50px) scale(0.93); }
        }
        @keyframes ob-modal-in {
          0%   { opacity:0; transform:translateY(24px) scale(0.97); }
          100% { opacity:1; transform:translateY(0)    scale(1); }
        }
        @keyframes ob-in {
          from { opacity:0; transform:translateX(14px); }
          to   { opacity:1; transform:translateX(0); }
        }
        @keyframes ob-pop {
          0%   { opacity:0; transform:scale(.82); }
          60%  { transform:scale(1.05); }
          100% { opacity:1; transform:scale(1); }
        }
        @keyframes ob-spin-in {
          0%   { opacity:0; transform:rotate(-120deg) scale(0); }
          70%  { transform:rotate(10deg) scale(1.1); }
          100% { opacity:1; transform:rotate(0deg) scale(1); }
        }
        @keyframes ob-pulse-ring {
          0%   { transform:scale(1); opacity:.5; }
          100% { transform:scale(1.7); opacity:0; }
        }
        @keyframes ob-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
      `}</style>

      {/* ── Overlay ── */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(6,4,20,0.80)',
        backdropFilter: 'blur(8px) saturate(0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        overflow: 'hidden',
      }}>

        {/* Aurora orbs — smooth, slow, elegant */}
        {ORBS.map((orb, i) => (
          <div key={i} style={{
            position: 'absolute', top: orb.top, left: orb.left,
            width: orb.w, height: orb.h,
            background: orb.bg,
            borderRadius: '50%',
            filter: 'blur(72px)',
            pointerEvents: 'none', userSelect: 'none',
            animation: `${orb.anim} ${orb.dur}s ease-in-out infinite`,
            willChange: 'transform',
          }} />
        ))}

        {/* ── Modal ── */}
        <div style={{
          background: '#fff', borderRadius: 28, width: '100%', maxWidth: 560,
          boxShadow: '0 40px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.15)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          maxHeight: '92vh', position: 'relative',
          animation: 'ob-modal-in 0.45s cubic-bezier(0.16,1,0.3,1) both',
        }}>

          {/* ── Gradient header ── */}
          <div style={{
            background: 'linear-gradient(135deg, #3d30c4 0%, #6558D3 45%, #8b52e8 100%)',
            padding: step === 1 ? '32px 28px 28px' : '20px 28px 20px',
            transition: 'padding 0.3s ease',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Header background orbs */}
            <div style={{ position:'absolute', top:-40, right:-40, width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,0.07)', pointerEvents:'none' }} />
            <div style={{ position:'absolute', bottom:-30, left:-20, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,0.05)', pointerEvents:'none' }} />

            {/* Brand row */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: step === 1 ? 20 : 12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{
                  width:34, height:34, borderRadius:10,
                  background:'rgba(255,255,255,0.18)', border:'1.5px solid rgba(255,255,255,0.3)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:18, fontWeight:900, color:'#fff', letterSpacing:'-1px',
                  backdropFilter:'blur(4px)',
                }}>₹</div>
                <span style={{ fontSize:15, fontWeight:800, color:'#fff', letterSpacing:'-0.3px' }}>PaisaPilot</span>
              </div>

              {/* Step dots */}
              {step < 4 && (
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  {[1,2,3].map(n => (
                    <div key={n} style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <div style={{
                        width: n === step ? 28 : 22, height:22, borderRadius:11,
                        background: n < step ? 'rgba(255,255,255,0.9)' : n === step ? '#fff' : 'rgba(255,255,255,0.25)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:10, fontWeight:800,
                        color: n <= step ? '#6558D3' : 'rgba(255,255,255,0.5)',
                        transition:'all 0.3s ease',
                        boxShadow: n === step ? '0 2px 12px rgba(0,0,0,0.25)' : 'none',
                      }}>
                        {n < step ? <Check size={10} strokeWidth={3} /> : n}
                      </div>
                      {n < 3 && <div style={{ width:16, height:2, borderRadius:2, background: n < step ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)', transition:'background 0.3s' }} />}
                    </div>
                  ))}
                  <span style={{ marginLeft:6, fontSize:11, color:'rgba(255,255,255,0.65)', fontWeight:600 }}>
                    {step}/3
                  </span>
                </div>
              )}
            </div>

            {/* Step 1 hero content in header */}
            {step === 1 && (
              <div style={{ textAlign:'center', paddingTop:4 }}>
                <div style={{ fontSize:52, marginBottom:10, animation:'ob-pop 0.5s ease forwards' }}>👋</div>
                <h1 style={{ fontSize:26, fontWeight:900, color:'#fff', marginBottom:8, letterSpacing:'-0.5px' }}>
                  Welcome to PaisaPilot
                </h1>
                <p style={{ fontSize:14, color:'rgba(255,255,255,0.78)', lineHeight:1.6, maxWidth:380, margin:'0 auto' }}>
                  Your money, clearly. Set up in 3 quick steps.
                </p>
              </div>
            )}

            {/* Steps 2-3: compact step title in header */}
            {step > 1 && step < 4 && (
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ fontSize:28 }}>{STEP_ICONS[step]}</span>
                <div>
                  <p style={{ fontSize:17, fontWeight:800, color:'#fff', letterSpacing:'-0.3px' }}>{STEP_TITLES[step]}</p>
                  <p style={{ fontSize:12, color:'rgba(255,255,255,0.65)', marginTop:2 }}>
                    {step === 2 ? 'Rename to match your real bank account names' : 'Used to calculate your savings targets'}
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: done header */}
            {step === 4 && (
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ position:'relative', width:36, height:36 }}>
                  <div style={{
                    position:'absolute', inset:0, borderRadius:'50%',
                    background:'rgba(255,255,255,0.3)',
                    animation:'ob-pulse-ring 1s ease-out infinite',
                  }} />
                  <div style={{
                    width:36, height:36, borderRadius:'50%', background:'#fff',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    animation:'ob-spin-in 0.5s ease forwards',
                  }}>
                    <Check size={18} style={{ color:'#6558D3' }} strokeWidth={3} />
                  </div>
                </div>
                <div>
                  <p style={{ fontSize:18, fontWeight:800, color:'#fff' }}>You&apos;re all set! 🎉</p>
                  <p style={{ fontSize:12, color:'rgba(255,255,255,0.65)', marginTop:2 }}>
                    {namedAccounts.length} account{namedAccounts.length !== 1 ? 's' : ''} created · Wealth plan ready
                  </p>
                </div>
              </div>
            )}

            {/* Progress bar at bottom of header */}
            {step < 4 && (
              <div style={{ marginTop:16, height:3, background:'rgba(255,255,255,0.2)', borderRadius:99 }}>
                <div style={{
                  height:'100%', borderRadius:99, background:'rgba(255,255,255,0.85)',
                  width:`${((step-1)/3)*100}%`, transition:'width 0.4s ease',
                }} />
              </div>
            )}
          </div>

          {/* ── Body ── */}
          <div style={{ flex:1, overflowY:'auto', padding:'24px 28px' }}>

            {/* Step 1 */}
            {step === 1 && (
              <div style={{ animation:'ob-in 0.3s ease' }}>
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {[
                    { icon:'🏦', title:'Add your accounts', desc:'Banks, cash, credit & debit cards — all in one place' },
                    { icon:'💰', title:'Set your income',   desc:'Unlock smart savings targets for Needs, Wants & Investments' },
                    { icon:'📊', title:'Everything syncs',  desc:'Dashboard, budgets, console — all powered by your data' },
                  ].map(item => (
                    <div key={item.title} style={{
                      display:'flex', alignItems:'flex-start', gap:14,
                      padding:'14px 16px', borderRadius:14,
                      background:'linear-gradient(135deg, #f8f7ff 0%, #f0eeff 100%)',
                      border:'1px solid rgba(101,88,211,0.12)',
                    }}>
                      <div style={{
                        width:40, height:40, borderRadius:12, flexShrink:0,
                        background:'rgba(101,88,211,0.1)', border:'1px solid rgba(101,88,211,0.15)',
                        display:'flex', alignItems:'center', justifyContent:'center', fontSize:20,
                      }}>{item.icon}</div>
                      <div>
                        <p style={{ fontSize:14, fontWeight:700, color:'var(--text-1)', marginBottom:2 }}>{item.title}</p>
                        <p style={{ fontSize:12, color:'var(--text-3)', lineHeight:1.5 }}>{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div style={{ animation:'ob-in 0.3s ease' }}>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {accounts.map((a, idx) => (
                    <div key={a.id} style={{
                      display:'flex', alignItems:'center', gap:8,
                      background: idx % 2 === 0 ? '#fafafa' : '#f5f4ff',
                      borderRadius:12, padding:'10px 12px',
                      border:'1px solid',
                      borderColor: idx % 2 === 0 ? 'var(--border)' : 'rgba(101,88,211,0.15)',
                      transition:'all 0.15s',
                    }}>
                      <span style={{ fontSize:22, flexShrink:0, width:30, textAlign:'center' }}>{typeIcon(a.type)}</span>
                      <select
                        value={a.type}
                        onChange={e => updateAccount(a.id, 'type', e.target.value)}
                        className="form-select"
                        style={{ fontSize:12, height:34, width:128, flexShrink:0 }}
                      >
                        {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      <input
                        type="text"
                        className="form-input"
                        style={{ fontSize:13, height:34, flex:1, minWidth:0 }}
                        placeholder="e.g. SBI Savings Account"
                        value={a.name}
                        onChange={e => updateAccount(a.id, 'name', e.target.value)}
                      />
                      {accounts.length > 1 && (
                        <button type="button"
                          onClick={() => removeAccount(a.id)}
                          style={{ padding:6, background:'none', border:'none', cursor:'pointer', color:'#dc2626', borderRadius:6, flexShrink:0, opacity:0.7 }}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addAccount}
                  style={{
                    marginTop:12, display:'flex', alignItems:'center', gap:6,
                    fontSize:13, fontWeight:600, color:'var(--violet)', background:'none',
                    border:'1.5px dashed rgba(101,88,211,0.4)', borderRadius:10,
                    padding:'8px 14px', cursor:'pointer', width:'100%', justifyContent:'center',
                    transition:'all 0.15s',
                  }}>
                  <Plus size={14} /> Add another account
                </button>
              </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <div style={{ animation:'ob-in 0.3s ease' }}>
                {/* Two-col input row */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
                  <div>
                    <label style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', display:'block', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.07em' }}>
                      Monthly salary
                    </label>
                    <div style={{
                      display:'flex', alignItems:'center',
                      border:'2px solid var(--border)', borderRadius:14, overflow:'hidden',
                      background:'#fff', transition:'border-color 0.15s',
                    }}>
                      <span style={{
                        padding:'0 14px', fontSize:18, fontWeight:800,
                        color:'var(--violet)', background:'rgba(101,88,211,0.06)',
                        borderRight:'2px solid var(--border)', height:'100%',
                        display:'flex', alignItems:'center', flexShrink:0,
                      }}>₹</span>
                      <input type="number"
                        style={{
                          flex:1, border:'none', outline:'none', background:'transparent',
                          padding:'13px 14px', fontSize:16, fontWeight:800,
                          color:'var(--text-1)', letterSpacing:'-0.5px',
                        }}
                        placeholder="75,000"
                        value={salary} onChange={e => { setSalary(e.target.value); setErr('') }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', display:'block', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.07em' }}>
                      Your age
                    </label>
                    <input type="number"
                      style={{
                        width:'100%', border:'2px solid var(--border)', borderRadius:14,
                        padding:'13px 16px', fontSize:16, fontWeight:800,
                        color:'var(--text-1)', background:'#fff', outline:'none',
                        letterSpacing:'-0.3px', boxSizing:'border-box',
                      }}
                      placeholder="28" value={age}
                      onChange={e => { setAge(e.target.value); setErr('') }}
                      min={15} max={80}
                    />
                  </div>
                </div>

                {/* Wealth plan preview cards */}
                {s > 0 ? (
                  <div style={{ animation:'ob-pop 0.3s ease' }}>
                    <p style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>
                      Your monthly plan
                    </p>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                      {[
                        { label:'Needs',      pct:pcts.needs, amt:Math.round(s*pcts.needs), color:'#6558D3', light:'#ede9fe', border:'rgba(101,88,211,0.2)', bar:'#6558D3' },
                        { label:'Wants',      pct:pcts.wants, amt:Math.round(s*pcts.wants), color:'#ea580c', light:'#fff7ed', border:'rgba(234,88,12,0.2)',   bar:'#f97316' },
                        { label:'Invest',     pct:pcts.inv,   amt:Math.round(s*pcts.inv),   color:'#059669', light:'#f0fdf4', border:'rgba(5,150,105,0.2)',   bar:'#10b981' },
                      ].map(g => (
                        <div key={g.label} style={{
                          borderRadius:16, padding:'16px 14px',
                          background:g.light, border:`1.5px solid ${g.border}`,
                          display:'flex', flexDirection:'column', gap:8,
                        }}>
                          {/* Progress bar */}
                          <div style={{ height:3, borderRadius:99, background:'rgba(0,0,0,0.08)' }}>
                            <div style={{ height:'100%', borderRadius:99, background:g.bar, width:`${Math.round(g.pct*100)}%` }} />
                          </div>
                          <p style={{ fontSize:11, fontWeight:700, color:g.color, textTransform:'uppercase', letterSpacing:'0.07em' }}>
                            {g.label}
                          </p>
                          <p style={{ fontSize:20, fontWeight:900, color:g.color, letterSpacing:'-0.8px', lineHeight:1 }}>
                            ₹{g.amt.toLocaleString('en-IN')}
                          </p>
                          <p style={{ fontSize:11, color:g.color, opacity:0.65, fontWeight:600 }}>
                            {Math.round(g.pct*100)}% of salary
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{
                    borderRadius:16, padding:'20px', textAlign:'center',
                    background:'rgba(101,88,211,0.04)', border:'1.5px dashed rgba(101,88,211,0.2)',
                  }}>
                    <p style={{ fontSize:13, color:'var(--text-3)' }}>Enter your salary to see your wealth plan ↑</p>
                  </div>
                )}
              </div>
            )}

            {/* Step 4 — Done */}
            {step === 4 && (
              <div style={{ animation:'ob-in 0.3s ease' }}>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:20 }}>
                  {namedAccounts.map((a, i) => (
                    <div key={a.id} style={{
                      display:'flex', alignItems:'center', gap:8, padding:'8px 14px',
                      borderRadius:12, background:'linear-gradient(135deg,#f0eeff,#e8e4ff)',
                      border:'1px solid rgba(101,88,211,0.2)',
                      animation:`ob-pop ${0.2 + i * 0.06}s ease both`,
                    }}>
                      <span style={{ fontSize:18 }}>{typeIcon(a.type)}</span>
                      <span style={{ fontSize:13, fontWeight:600, color:'#6558D3' }}>{a.name}</span>
                    </div>
                  ))}
                </div>
                <div style={{
                  padding:'14px 16px', borderRadius:14,
                  background:'linear-gradient(135deg,#f0fdf4,#dcfce7)',
                  border:'1px solid #bbf7d0',
                  display:'flex', alignItems:'center', gap:12,
                }}>
                  <span style={{ fontSize:24 }}>🚀</span>
                  <div>
                    <p style={{ fontSize:14, fontWeight:700, color:'#15803d' }}>Ready to track your money!</p>
                    <p style={{ fontSize:12, color:'#166534', marginTop:2 }}>Your dashboard, budgets & console are all set up.</p>
                  </div>
                </div>
              </div>
            )}

            {err && (
              <div style={{
                marginTop:14, padding:'10px 14px', borderRadius:10,
                background:'#fef2f2', border:'1px solid #fecaca',
                fontSize:13, color:'#dc2626', fontWeight:500,
              }}>{err}</div>
            )}
          </div>

          {/* ── Footer ── */}
          <div style={{
            padding:'16px 28px', borderTop:'1px solid var(--border)',
            display:'flex', justifyContent:'space-between', alignItems:'center',
            background:'#fafafa', flexShrink:0,
          }}>
            {step > 1 && step < 4 ? (
              <button onClick={() => { setErr(''); setStep(s => s - 1) }} disabled={saving}
                style={{ display:'flex', alignItems:'center', gap:5, fontSize:14, fontWeight:600,
                  color:'var(--text-3)', background:'none', border:'none', cursor:'pointer', padding:'8px 4px' }}>
                <ChevronLeft size={16} />Back
              </button>
            ) : <div />}

            {step === 1 && (
              <button onClick={() => setStep(2)}
                style={{
                  display:'flex', alignItems:'center', gap:8, fontSize:15, fontWeight:700,
                  padding:'12px 28px', borderRadius:14, cursor:'pointer', border:'none',
                  background:'linear-gradient(135deg,#6558D3,#8b52e8)',
                  color:'#fff', boxShadow:'0 4px 16px rgba(101,88,211,0.45)',
                  transition:'all 0.2s',
                }}>
                Get started <ArrowRight size={16} />
              </button>
            )}
            {step === 2 && (
              <button onClick={() => { if (validate2()) setStep(3) }}
                style={{
                  display:'flex', alignItems:'center', gap:8, fontSize:14, fontWeight:700,
                  padding:'11px 24px', borderRadius:12, cursor:'pointer', border:'none',
                  background:'linear-gradient(135deg,#6558D3,#8b52e8)', color:'#fff',
                  boxShadow:'0 4px 14px rgba(101,88,211,0.4)',
                }}>
                Next <ChevronRight size={15} />
              </button>
            )}
            {step === 3 && (
              <button onClick={complete} disabled={saving}
                style={{
                  display:'flex', alignItems:'center', gap:8, fontSize:14, fontWeight:700,
                  padding:'11px 24px', borderRadius:12, cursor:saving?'not-allowed':'pointer', border:'none',
                  background:'linear-gradient(135deg,#6558D3,#8b52e8)', color:'#fff',
                  boxShadow:'0 4px 14px rgba(101,88,211,0.4)', opacity:saving?0.7:1,
                }}>
                {saving ? 'Setting up…' : <>Finish setup <Check size={15} /></>}
              </button>
            )}
            {step === 4 && (
              <button onClick={finish}
                style={{
                  display:'flex', alignItems:'center', gap:8, fontSize:14, fontWeight:700,
                  padding:'11px 24px', borderRadius:12, cursor:'pointer', border:'none',
                  background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff',
                  boxShadow:'0 4px 14px rgba(16,185,129,0.4)',
                }}>
                Go to Dashboard <ArrowRight size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}

export function OnboardingGate() {
  const [show, setShow]     = useState(false)
  const [checked, setChecked] = useState(false)

  const check = useCallback(async () => {
    try {
      const res = await fetch('/api/onboarding/status')
      const d = await res.json()
      setShow(d.needsOnboarding === true)
    } catch {}
    setChecked(true)
  }, [])

  useEffect(() => { check() }, [check])

  if (!checked || !show) return null
  return <Onboarding onDone={() => setShow(false)} />
}
