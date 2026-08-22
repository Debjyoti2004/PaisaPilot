'use client'

import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Eye, EyeOff, Mail, Lock, User, Zap } from 'lucide-react'
import { LogoIcon } from '@/components/ui/Logo'

type Mode = 'signin' | 'register'

export default function LoginPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('signin')

  // Form state
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  // Dev login — only rendered client-side to avoid SSR mismatch
  const [isLocalhost, setIsLocalhost] = useState(false)
  useEffect(() => {
    setIsLocalhost(
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    )
  }, [])

  useEffect(() => {
    if (status === 'authenticated') router.push('/')
  }, [status, router])

  if (status === 'loading' || session) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--violet)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  /* ── Google ──────────────────────────────────────── */
  const handleGoogle = async () => {
    setLoading(true); setError('')
    await signIn('google', { callbackUrl: '/' })
  }

  /* ── Email sign-in ───────────────────────────────── */
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) { setError('Enter your email and password.'); return }
    setLoading(true); setError('')
    const res = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)
    if (res?.error) setError('Incorrect email or password.')
    else router.push('/')
  }

  /* ── Register ────────────────────────────────────── */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) { setError('Email and password are required.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Registration failed.'); setLoading(false); return }
      // Auto sign-in after register
      const signInRes = await signIn('credentials', { email, password, redirect: false })
      setLoading(false)
      if (signInRes?.error) setError('Account created — please sign in.')
      else router.push('/')
    } catch {
      setError('Registration failed. Try again.')
      setLoading(false)
    }
  }

  /* ── Dev login ───────────────────────────────────── */
  const handleDevLogin = async () => {
    setLoading(true); setError('')
    const res = await signIn('dev-login', { token: 'dev-bypass-2024', redirect: false })
    setLoading(false)
    if (res?.error) setError('Dev login failed — check NODE_ENV=development')
    else router.push('/')
  }

  const divider = (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1" style={{ height: 1, background: 'var(--border)' }} />
      <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>or</span>
      <div className="flex-1" style={{ height: 1, background: 'var(--border)' }} />
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-5">
          <div className="mb-2" style={{ position: 'relative', display: 'inline-flex', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)', width: 56, height: 12, borderRadius: '50%', background: 'rgba(101,88,211,0.3)', filter: 'blur(10px)', zIndex: 0 }} />
            <LogoIcon size={90} style={{ position: 'relative', zIndex: 1 }} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.02em' }}>PaisaPilot</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 3 }}>Your money, clearly.</p>
        </div>

        {/* Card */}
        <div className="card p-7">

          {/* Header */}
          <div className="text-center mb-6">
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)' }}>
              {mode === 'signin' ? 'Welcome back' : 'Create account'}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 3 }}>
              {mode === 'signin' ? 'Sign in to manage your finances' : 'Start tracking your money today'}
            </p>
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 transition-all duration-150"
            style={{
              background: '#fff',
              border: '1.5px solid var(--border)',
              borderRadius: 12,
              padding: '12px 20px',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-1)',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <GoogleIcon />
            <span>Continue with Google</span>
          </button>

          {divider}

          {/* Email form */}
          <form onSubmit={mode === 'signin' ? handleEmailSignIn : handleRegister} className="space-y-3">
            {mode === 'register' && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>
                  Name (optional)
                </label>
                <div className="relative">
                  <User size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
                  <input
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: 34 }}
                  />
                </div>
              </div>
            )}

            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Email</label>
              <div className="relative">
                <Mail size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: 34 }}
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Password</label>
              <div className="relative">
                <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder={mode === 'register' ? 'Min. 6 characters' : 'Your password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: 34, paddingRight: 38 }}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                >
                  {showPw ? <EyeOff size={14} style={{ color: 'var(--text-3)' }} /> : <Eye size={14} style={{ color: 'var(--text-3)' }} />}
                </button>
              </div>
            </div>

            {error && (
              <p style={{ fontSize: 13, color: 'var(--red)', background: 'var(--red-bg)', padding: '9px 12px', borderRadius: 8 }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
              style={{ marginTop: 4, fontSize: 14, padding: '12px 20px', justifyContent: 'center', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#fff', borderTopColor: 'transparent' }} />
                  {mode === 'signin' ? 'Signing in…' : 'Creating account…'}
                </span>
              ) : (
                mode === 'signin' ? 'Sign in' : 'Create account'
              )}
            </button>
          </form>

          {/* Toggle mode */}
          <p className="text-center mt-4" style={{ fontSize: 13, color: 'var(--text-3)' }}>
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'signin' ? 'register' : 'signin'); setError('') }}
              style={{ color: 'var(--violet)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {mode === 'signin' ? 'Create one' : 'Sign in'}
            </button>
          </p>

          {/* Dev login — localhost only */}
          {isLocalhost && (
            <>
              {divider}
              <button
                onClick={handleDevLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 transition-all"
                style={{
                  background: 'var(--bg)',
                  border: '1.5px dashed var(--border)',
                  borderRadius: 12,
                  padding: '10px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-2)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                <Zap size={15} style={{ color: '#f59e0b' }} />
                <span>Dev Login</span>
                <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 400 }}>(localhost only)</span>
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center mt-6" style={{ fontSize: 11, color: 'var(--text-3)' }}>
          Your data stays private and only visible to you.
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}
