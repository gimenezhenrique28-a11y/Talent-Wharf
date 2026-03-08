import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

export default function ConsentPage() {
  const [searchParams] = useSearchParams()
  const token  = searchParams.get('token')
  const action = searchParams.get('action')

  const [state, setState] = useState('loading') // loading | success-allow | success-deny | already | error
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!token || (action !== 'allow' && action !== 'deny')) {
      setState('error')
      setErrorMsg('This link appears to be invalid or incomplete.')
      return
    }

    async function handleConsent() {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-consent?token=${encodeURIComponent(token)}&action=${action}`,
          { method: 'GET', headers: { Accept: 'application/json' } }
        )

        const data = await res.json().catch(() => ({}))

        if (!res.ok) {
          setState('error')
          if (data.error === 'not_found') {
            setErrorMsg('This link is no longer valid. It may have already been used.')
          } else {
            setErrorMsg('Something went wrong. Please try again.')
          }
          return
        }

        if (data.outcome === 'already_responded') {
          setState('already')
        } else if (data.outcome === 'granted') {
          setState('success-allow')
        } else if (data.outcome === 'denied') {
          setState('success-deny')
        } else {
          setState('error')
          setErrorMsg('Unexpected response from server.')
        }
      } catch {
        setState('error')
        setErrorMsg('A network error occurred. Please check your connection and try again.')
      }
    }

    handleConsent()
  }, [token, action])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg, #0a0a0a)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{
        background: 'var(--color-bg-raised, #111111)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 12,
        padding: '40px 36px',
        maxWidth: 480,
        width: '100%',
        textAlign: 'center',
      }}>
        {state === 'loading' && <LoadingState />}
        {state === 'success-allow' && <AllowState />}
        {state === 'success-deny' && <DenyState />}
        {state === 'already' && <AlreadyState />}
        {state === 'error' && <ErrorState message={errorMsg} />}

        <div style={{ marginTop: 32, fontSize: 12, color: 'rgba(255,255,255,0.20)' }}>
          TalentWharf
        </div>
      </div>
    </div>
  )
}

// ── State components ───────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <>
      <div style={iconStyle('#6b7280')}>
        <div style={{
          width: 20, height: 20, borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.20)',
          borderTopColor: '#ffffff',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
      <h1 style={headingStyle}>Saving your response…</h1>
      <p style={bodyStyle}>Please wait a moment.</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}

function AllowState() {
  return (
    <>
      <div style={iconStyle('#22c55e')}>
        <span style={{ fontSize: 22, color: '#22c55e' }}>✓</span>
      </div>
      <h1 style={headingStyle}>Thanks — access granted!</h1>
      <p style={bodyStyle}>
        We'll now be able to reference your public GitHub and LinkedIn profiles when
        considering you for opportunities. You won't receive any further emails about this.
      </p>
    </>
  )
}

function DenyState() {
  return (
    <>
      <div style={iconStyle('#6b7280')}>
        <span style={{ fontSize: 22, color: '#6b7280' }}>·</span>
      </div>
      <h1 style={headingStyle}>Got it — no problem.</h1>
      <p style={bodyStyle}>
        We've recorded your preference and won't look up your GitHub or LinkedIn profiles.
        You won't receive any further emails about this.
      </p>
    </>
  )
}

function AlreadyState() {
  return (
    <>
      <div style={iconStyle('#f59e0b')}>
        <span style={{ fontSize: 22, color: '#f59e0b' }}>!</span>
      </div>
      <h1 style={headingStyle}>Already responded</h1>
      <p style={bodyStyle}>
        You've already responded to this request. No further action is needed.
      </p>
    </>
  )
}

function ErrorState({ message }) {
  return (
    <>
      <div style={iconStyle('#e57373')}>
        <span style={{ fontSize: 22, color: '#e57373' }}>✕</span>
      </div>
      <h1 style={headingStyle}>Link not found</h1>
      <p style={bodyStyle}>{message || 'This link appears to be invalid or has already expired.'}</p>
    </>
  )
}

// ── Shared styles ──────────────────────────────────────────────────────────────

function iconStyle(color) {
  return {
    width: 52,
    height: 52,
    borderRadius: '50%',
    background: color + '20',
    border: `1px solid ${color}40`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px',
  }
}

const headingStyle = {
  fontSize: 20,
  fontWeight: 700,
  color: '#ffffff',
  letterSpacing: '-0.02em',
  marginBottom: 12,
}

const bodyStyle = {
  fontSize: 14,
  color: 'rgba(255,255,255,0.55)',
  lineHeight: 1.7,
}
