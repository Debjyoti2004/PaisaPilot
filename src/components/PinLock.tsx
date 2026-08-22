'use client'
import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

const VERIFIED_KEY = 'pp_pin_verified'
const PROMPTED_KEY = 'pp_pin_prompted'

type Screen = 'idle' | 'lock' | 'setup-prompt' | 'setup-enter' | 'forgot'

export function PinLock() {
  const [screen, setScreen] = useState<Screen>('idle')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    fetch('/api/settings/pin')
      .then(r => r.json())
      .then(d => {
        if (d.enabled) {
          // PIN is on — show lock if not verified this session
          if (sessionStorage.getItem(VERIFIED_KEY) !== '1') setScreen('lock')
        } else if (!d.promptSeen && sessionStorage.getItem(PROMPTED_KEY) !== '1') {
          // New user — show setup prompt
          setScreen('setup-prompt')
        }
      })
      .catch(() => {})
  }, [])

  function onVerified() { sessionStorage.setItem(VERIFIED_KEY, '1'); setScreen('idle') }
  function onPinSet()   { sessionStorage.setItem(VERIFIED_KEY, '1'); sessionStorage.setItem(PROMPTED_KEY, '1'); setScreen('idle') }
  function onSkip()     { sessionStorage.setItem(PROMPTED_KEY, '1'); setScreen('idle') }

  if (!mounted || screen === 'idle') return null

  if (screen === 'lock') return createPortal(<LockScreen onVerified={onVerified} onForgot={() => setScreen('forgot')} />, document.body)
  if (screen === 'setup-prompt') return createPortal(<SetupPrompt onSetup={() => setScreen('setup-enter')} onSkip={onSkip} />, document.body)
  if (screen === 'setup-enter') return createPortal(<SetupEnter onDone={onPinSet} onSkip={onSkip} />, document.body)
  if (screen === 'forgot') return createPortal(<ForgotPin onBack={() => setScreen('lock')} onSuccess={onVerified} />, document.body)
  return null
}

/* ── Shared dark background ─────────────────────────────────────────────── */
function DarkBg({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'linear-gradient(135deg, #0f0e1a 0%, #1a1730 40%, #0f1624 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      userSelect: 'none', padding: '0 24px',
    }}>
      {children}
    </div>
  )
}

/* ── Lock Screen ─────────────────────────────────────────────────────────── */
function LockScreen({ onVerified, onForgot }: { onVerified: () => void; onForgot: () => void }) {
  const [digits, setDigits] = useState<string[]>([])
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const [loading, setLoading] = useState(false)

  const verify = useCallback(async (pin: string) => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/settings/pin/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      if (res.ok) { onVerified() }
      else {
        const d = await res.json()
        setError(d.error || 'Incorrect PIN')
        setShake(true); setDigits([])
        setTimeout(() => setShake(false), 600)
      }
    } catch { setError('Something went wrong') }
    finally { setLoading(false) }
  }, [onVerified])

  function press(d: string) {
    if (loading) return
    setError('')
    const next = [...digits, d].slice(0, 4)
    setDigits(next)
    if (next.length === 4) setTimeout(() => verify(next.join('')), 80)
  }
  function del() { setDigits(d => d.slice(0, -1)); setError('') }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (loading) return
      if (/^\d$/.test(e.key)) {
        setError('')
        setDigits(prev => {
          const next = [...prev, e.key].slice(0, 4)
          if (next.length === 4) setTimeout(() => verify(next.join('')), 80)
          return next
        })
      } else if (e.key === 'Backspace') {
        setDigits(d => d.slice(0, -1))
        setError('')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [loading, verify])

  return (
    <DarkBg>
      {/* Logo */}
      <div style={{ marginBottom: 36, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ position: 'relative', display: 'inline-flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{ position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)', width: 80, height: 24, borderRadius: '50%', background: 'rgba(101,88,211,0.55)', filter: 'blur(16px)', zIndex: 0 }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="PaisaPilot" style={{ width: 110, height: 110, position: 'relative', zIndex: 1 }} />
        </div>
        <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>PaisaPilot</p>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>Enter your PIN to continue</p>
      </div>

      {/* Dots */}
      <div style={{ width: 248, display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 10 }}
        className={shake ? 'pin-shake' : ''}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            width: 18, height: 18, borderRadius: '50%',
            background: digits.length > i ? '#6558D3' : 'transparent',
            border: '2.5px solid', borderColor: digits.length > i ? '#6558D3' : 'rgba(255,255,255,0.35)',
            transition: 'all 0.15s',
            boxShadow: digits.length > i ? '0 0 14px rgba(101,88,211,0.8)' : 'none',
          }} />
        ))}
      </div>

      <div style={{ height: 26, display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        {error && <p style={{ margin: 0, fontSize: 13, color: '#f87171', fontWeight: 500 }}>{error}</p>}
      </div>

      <Numpad onPress={press} onDelete={del} />

      <button onClick={onForgot} style={{ marginTop: 28, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer', padding: '6px 12px' }}>
        Forgot PIN?
      </button>

      <style>{`
        @keyframes pinShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-10px)} 40%{transform:translateX(10px)} 60%{transform:translateX(-8px)} 80%{transform:translateX(8px)} }
        .pin-shake { animation: pinShake 0.5s ease; }
      `}</style>
    </DarkBg>
  )
}

/* ── Setup Prompt (new user) ─────────────────────────────────────────────── */
function SetupPrompt({ onSetup, onSkip }: { onSetup: () => void; onSkip: () => void }) {
  async function skip() {
    await fetch('/api/settings/pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ skip: true }) }).catch(() => {})
    onSkip()
  }

  return (
    <DarkBg>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', maxWidth: 320 }}>
        <div style={{
          width: 80, height: 80, borderRadius: 24, marginBottom: 24,
          background: 'linear-gradient(135deg, #6558D3, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36,
          boxShadow: '0 12px 40px rgba(101,88,211,0.5)',
        }}>🔒</div>

        <p style={{ margin: '0 0 10px', fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
          Secure your finances
        </p>
        <p style={{ margin: '0 0 32px', fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
          Set a 4-digit PIN so only you can access your PaisaPilot account on this device.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
          <button
            onClick={onSetup}
            style={{
              padding: '15px 24px', borderRadius: 16, border: 'none',
              background: 'linear-gradient(135deg, #6558D3, #8b5cf6)',
              color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(101,88,211,0.4)',
            }}
          >
            Set up PIN
          </button>
          <button
            onClick={skip}
            style={{
              padding: '14px 24px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)',
              color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: 500, cursor: 'pointer',
            }}
          >
            Skip for now
          </button>
        </div>
      </div>
    </DarkBg>
  )
}

/* ── Setup Enter PIN ─────────────────────────────────────────────────────── */
function SetupEnter({ onDone, onSkip }: { onDone: () => void; onSkip: () => void }) {
  const [step, setStep] = useState<'enter' | 'confirm'>('enter')
  const [first, setFirst] = useState('')
  const [digits, setDigits] = useState<string[]>([])
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const [loading, setLoading] = useState(false)

  function press(d: string) {
    if (loading) return
    setError('')
    const next = [...digits, d].slice(0, 4)
    setDigits(next)
    if (next.length === 4) {
      setTimeout(() => {
        if (step === 'enter') {
          setFirst(next.join(''))
          setDigits([])
          setStep('confirm')
        } else {
          const pin = next.join('')
          if (pin !== first) {
            setError("PINs don't match. Try again.")
            setShake(true); setDigits([])
            setTimeout(() => { setShake(false); setStep('enter'); setFirst('') }, 700)
          } else {
            save(pin)
          }
        }
      }, 80)
    }
  }

  function del() { setDigits(d => d.slice(0, -1)); setError('') }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (loading) return
      if (/^\d$/.test(e.key)) press(e.key)
      else if (e.key === 'Backspace') del()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  async function save(pin: string) {
    setLoading(true)
    try {
      await fetch('/api/settings/pin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      onDone()
    } catch { setError('Something went wrong') }
    finally { setLoading(false) }
  }

  async function skip() {
    await fetch('/api/settings/pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ skip: true }) }).catch(() => {})
    onSkip()
  }

  return (
    <DarkBg>
      <div style={{ marginBottom: 36, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ position: 'relative', display: 'inline-flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{ position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)', width: 80, height: 24, borderRadius: '50%', background: 'rgba(101,88,211,0.55)', filter: 'blur(16px)', zIndex: 0 }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="PaisaPilot" style={{ width: 110, height: 110, position: 'relative', zIndex: 1 }} />
        </div>
        <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff' }}>
          {step === 'enter' ? 'Choose a PIN' : 'Confirm your PIN'}
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>
          {step === 'enter' ? 'Enter 4 digits' : 'Enter the same PIN again'}
        </p>
      </div>

      <div style={{ width: 248, display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 10 }}
        className={shake ? 'pin-shake' : ''}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            width: 18, height: 18, borderRadius: '50%',
            background: digits.length > i ? '#6558D3' : 'transparent',
            border: '2.5px solid', borderColor: digits.length > i ? '#6558D3' : 'rgba(255,255,255,0.35)',
            transition: 'all 0.15s',
            boxShadow: digits.length > i ? '0 0 14px rgba(101,88,211,0.8)' : 'none',
          }} />
        ))}
      </div>

      <div style={{ height: 26, display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        {error && <p style={{ margin: 0, fontSize: 13, color: '#f87171', fontWeight: 500 }}>{error}</p>}
      </div>

      <Numpad onPress={press} onDelete={del} />

      <button onClick={skip} style={{ marginTop: 28, background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 13, cursor: 'pointer', padding: '6px 12px' }}>
        Skip for now
      </button>

      <style>{`
        @keyframes pinShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-10px)} 40%{transform:translateX(10px)} 60%{transform:translateX(-8px)} 80%{transform:translateX(8px)} }
        .pin-shake { animation: pinShake 0.5s ease; }
      `}</style>
    </DarkBg>
  )
}

/* ── Forgot PIN flow ─────────────────────────────────────────────────────── */
function ForgotPin({ onBack, onSuccess }: { onBack: () => void; onSuccess: () => void }) {
  const [step, setStep] = useState<'request' | 'verify'>('request')
  const [otp, setOtp] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function sendOtp() {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/settings/pin/reset', { method: 'POST' })
      const d = await res.json()
      if (!res.ok) { setError(d.error || 'Failed to send OTP'); return }
      setMaskedEmail(d.maskedEmail)
      if (d.devOtp) setOtp(d.devOtp) // dev: pre-fill when email delivery unavailable
      setStep('verify')
    } catch { setError('Failed to send OTP') } finally { setLoading(false) }
  }

  async function confirmReset() {
    if (!/^\d{6}$/.test(otp)) { setError('Enter the 6-digit OTP'); return }
    if (!/^\d{4}$/.test(newPin)) { setError('PIN must be 4 digits'); return }
    if (newPin !== confirmPin) { setError('PINs do not match'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/settings/pin/reset', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp, newPin }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error); return }
      onSuccess()
    } catch { setError('Failed to reset PIN') } finally { setLoading(false) }
  }

  return (
    <DarkBg>
      <div style={{ width: '100%', maxWidth: 360, background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: '28px 24px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 18 }}>← Back</button>
        <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: '#fff' }}>Reset PIN</h2>
        <p style={{ margin: '0 0 22px', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
          {step === 'request' ? "We'll send a 6-digit OTP to your registered email." : `OTP sent to ${maskedEmail}`}
        </p>
        {step === 'request' ? (
          <button onClick={sendOtp} disabled={loading} style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#6558D3,#8b5cf6)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Sending…' : 'Send OTP to email'}
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <PinField label="OTP (6 digits)" value={otp} onChange={setOtp} maxLen={6} numeric />
            <PinField label="New PIN (4 digits)" value={newPin} onChange={setNewPin} maxLen={4} numeric secret />
            <PinField label="Confirm new PIN" value={confirmPin} onChange={setConfirmPin} maxLen={4} numeric secret />
            <button onClick={confirmReset} disabled={loading} style={{ padding: 14, borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#6558D3,#8b5cf6)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Setting PIN…' : 'Set new PIN'}
            </button>
            <button onClick={sendOtp} disabled={loading} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer', padding: '4px 0', textAlign: 'center' }}>Resend OTP</button>
          </div>
        )}
        {error && <p style={{ marginTop: 14, fontSize: 13, color: '#f87171', textAlign: 'center' }}>{error}</p>}
      </div>
    </DarkBg>
  )
}

/* ── Shared numpad ───────────────────────────────────────────────────────── */
function Numpad({ onPress, onDelete }: { onPress: (d: string) => void; onDelete: () => void }) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 72px)', gap: 16 }}>
        {['1','2','3','4','5','6','7','8','9'].map(n => (
          <PadBtn key={n} label={n} onClick={() => onPress(n)} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 72px)', gap: 16, marginTop: 16 }}>
        <PadBtn label="⌫" onClick={onDelete} faint />
        <PadBtn label="0" onClick={() => onPress('0')} />
        <div />
      </div>
    </>
  )
}

function PadBtn({ label, onClick, faint }: { label: string; onClick: () => void; faint?: boolean }) {
  const [pressed, setPressed] = useState(false)
  return (
    <button
      onPointerDown={() => { setPressed(true); onClick() }}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        width: 72, height: 72, borderRadius: '50%', border: 'none',
        background: pressed ? 'rgba(101,88,211,0.35)' : 'rgba(255,255,255,0.08)',
        color: faint ? 'rgba(255,255,255,0.5)' : '#fff',
        fontSize: label === '⌫' ? 20 : 24, fontWeight: 600,
        cursor: 'pointer', transition: 'background 0.1s, transform 0.1s',
        transform: pressed ? 'scale(0.92)' : 'scale(1)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {label}
    </button>
  )
}

function PinField({ label, value, onChange, maxLen, numeric, secret }: {
  label: string; value: string; onChange: (v: string) => void
  maxLen: number; numeric?: boolean; secret?: boolean
}) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>{label}</label>
      <input
        type={secret ? 'password' : numeric ? 'tel' : 'text'}
        inputMode={numeric ? 'numeric' : undefined}
        value={value}
        maxLength={maxLen}
        onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, maxLen))}
        style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.07)', color: '#fff', fontSize: 18, fontFamily: 'monospace', letterSpacing: secret ? '0.4em' : '0.2em', outline: 'none' }}
      />
    </div>
  )
}
