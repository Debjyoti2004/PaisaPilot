'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { CheckCircle, XCircle, Loader, Shield, Mail } from 'lucide-react'

interface InviteMeta {
  familyName: string
  ownerName: string
  emailHint: string | null
  otpExpired: boolean
}

export default function AcceptInvitePage() {
  const params = useSearchParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const token = params.get('token')

  const [stage, setStage] = useState<'loading' | 'otp' | 'submitting' | 'success' | 'error'>('loading')
  const [meta, setMeta] = useState<InviteMeta | null>(null)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [errorMsg, setErrorMsg] = useState('')
  const [familyName, setFamilyName] = useState('')
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/login?callbackUrl=/invite/accept?token=${token}`)
    }
  }, [status, token, router])

  // Fetch invite metadata once authenticated
  useEffect(() => {
    if (status !== 'authenticated' || !token) return
    fetch(`/api/family/accept?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) {
          setErrorMsg(d.error)
          setStage('error')
        } else {
          setMeta(d)
          setStage('otp')
          setTimeout(() => inputRefs.current[0]?.focus(), 100)
        }
      })
      .catch(() => { setErrorMsg('Network error'); setStage('error') })
  }, [status, token])

  function handleOtpChange(idx: number, val: string) {
    const digit = val.replace(/\D/g, '').slice(-1)
    const next = [...otp]
    next[idx] = digit
    setOtp(next)
    setErrorMsg('')
    if (digit && idx < 5) {
      inputRefs.current[idx + 1]?.focus()
    }
  }

  function handleOtpKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && idx > 0) inputRefs.current[idx - 1]?.focus()
    if (e.key === 'ArrowRight' && idx < 5) inputRefs.current[idx + 1]?.focus()
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setOtp(pasted.split(''))
      inputRefs.current[5]?.focus()
    }
  }

  async function handleSubmit() {
    const otpStr = otp.join('')
    if (otpStr.length !== 6) { setErrorMsg('Please enter all 6 digits'); return }
    setStage('submitting')
    try {
      const res = await fetch('/api/family/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, otp: otpStr }),
      })
      const d = await res.json()
      if (d.ok) {
        setFamilyName(d.familyName || 'the family')
        setStage('success')
      } else {
        setErrorMsg(d.error || 'Something went wrong')
        setStage('otp')
        // Clear OTP on wrong attempt
        setOtp(['', '', '', '', '', ''])
        setTimeout(() => inputRefs.current[0]?.focus(), 50)
      }
    } catch {
      setErrorMsg('Network error')
      setStage('otp')
    }
  }

  // Loading / redirecting
  if (status === 'loading' || stage === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="card p-10 flex flex-col items-center gap-4" style={{ maxWidth: 400, width: '100%' }}>
          <Loader size={32} style={{ color: 'var(--violet)', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: 15, color: 'var(--text-2)' }}>Loading invite…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <div className="card p-8 flex flex-col items-center gap-6 text-center" style={{ maxWidth: 420, width: '100%' }}>

        {/* Success */}
        {stage === 'success' && (
          <>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--violet-bg)' }}>
              <CheckCircle size={28} style={{ color: 'var(--violet)' }} />
            </div>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)' }}>You&apos;re in!</h2>
              <p style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 8, lineHeight: 1.6 }}>
                You joined <strong style={{ color: 'var(--text-1)' }}>{familyName}</strong>.<br />
                You can now view their financial data in read-only mode.
              </p>
            </div>
            <button className="btn-primary w-full" style={{ justifyContent: 'center' }} onClick={() => router.push('/settings#family')}>
              Go to Family Settings
            </button>
          </>
        )}

        {/* Error state */}
        {stage === 'error' && (
          <>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--red-bg)' }}>
              <XCircle size={28} style={{ color: 'var(--red)' }} />
            </div>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)' }}>Invite failed</h2>
              <p style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 6, lineHeight: 1.5 }}>{errorMsg}</p>
            </div>
            <button className="btn-secondary w-full" style={{ justifyContent: 'center' }} onClick={() => router.push('/')}>
              Back to home
            </button>
          </>
        )}

        {/* OTP entry */}
        {(stage === 'otp' || stage === 'submitting') && meta && (
          <>
            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--violet-bg)' }}>
              <Shield size={28} style={{ color: 'var(--violet)' }} />
            </div>

            {/* Heading */}
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)' }}>
                Enter your OTP
              </h2>
              <p style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 8, lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--text-1)' }}>{meta.ownerName}</strong> invited you to view their finances.<br />
                Enter the 6-digit code from the email.
              </p>
            </div>

            {/* Email hint */}
            {meta.emailHint && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl w-full" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <Mail size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--text-2)' }}>OTP sent to <strong>{meta.emailHint}</strong></span>
              </div>
            )}

            {/* OTP boxes */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }} onPaste={handleOtpPaste}>
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={el => { inputRefs.current[idx] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(idx, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(idx, e)}
                  disabled={stage === 'submitting'}
                  style={{
                    width: 48, height: 56, textAlign: 'center', fontSize: 22, fontWeight: 700,
                    border: `2px solid ${digit ? 'var(--violet)' : 'var(--border)'}`,
                    borderRadius: 10, background: digit ? 'var(--violet-bg)' : '#fff',
                    color: 'var(--text-1)', outline: 'none', transition: 'all .15s',
                    caretColor: 'transparent',
                  }}
                />
              ))}
            </div>

            {/* Error */}
            {errorMsg && (
              <p style={{ fontSize: 13, color: 'var(--red)', background: 'var(--red-bg)', padding: '10px 14px', borderRadius: 8, width: '100%', textAlign: 'left' }}>
                {errorMsg}
              </p>
            )}

            {/* Expired warning */}
            {meta.otpExpired && (
              <p style={{ fontSize: 13, color: '#92400e', background: '#fef3c7', padding: '10px 14px', borderRadius: 8, width: '100%', textAlign: 'left' }}>
                ⏱ OTP has expired. Ask the owner to send a new invite.
              </p>
            )}

            {/* Submit */}
            <button
              className="btn-primary w-full"
              style={{ justifyContent: 'center', fontSize: 15 }}
              onClick={handleSubmit}
              disabled={stage === 'submitting' || otp.join('').length !== 6 || meta.otpExpired}
            >
              {stage === 'submitting' ? (
                <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Verifying…</>
              ) : 'Verify & Join'}
            </button>

            <p style={{ fontSize: 12, color: 'var(--text-3)' }}>
              OTP expires in 5 minutes · one-time use only
            </p>
          </>
        )}
      </div>
    </div>
  )
}
