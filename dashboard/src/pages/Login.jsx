import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'

function WharfWordmark({ height = 36 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      version="1.1"
      viewBox="0 0 160 160"
      height={height}
      style={{ width: 'auto', display: 'block' }}
      aria-label="TalentWharf"
    >
      <path fill="currentColor" d="M61.37,65.52h6.16v9.81c1.58-1.65,4.12-2.89,7.39-2.89,5.27,0,8.85,3.54,8.85,9.16v11.54h-6.16v-9.74c0-3.42-1.65-5.5-4.81-5.5-3.35,0-5.27,2.04-5.27,5.54v9.7h-6.16v-27.63Z"/>
      <path fill="currentColor" d="M86.26,87.3c0-3.96,3.5-5.93,8.27-6.39l8.08-.73v-.12c0-1.54-1.31-2.77-4.58-2.77-2.77,0-4.89,1.15-5.5,2.73l-5.54-1.5c1.27-3.66,5.73-6.08,11.31-6.08,6.46,0,10.27,2.58,10.27,7.66v7.39c0,1.08.46,1.58,2.62,1.12v4.54c-4.5.85-6.97-.31-8-2.23-1.85,1.62-4.77,2.66-8.35,2.66-5,0-8.58-2.27-8.58-6.27ZM102.61,84.3l-7.2.73c-2.12.19-3.19.69-3.19,2.04s1.35,2,3.73,2c3.16,0,6.66-1.35,6.66-3.69v-1.08Z"/>
      <path fill="currentColor" d="M130.28,77.95c-3.8-.09-2.39-.08-3.7-.1-5.21-.09-7.11,2.52-7.11,7.06v8.24h-6.16v-20.28h6.16v3.5c1.77-2.58,2.92-3.51,6.23-3.51.92,0,.15-.01,4.58.01v5.08Z"/>
      <path fill="currentColor" d="M144.4,65.1c1.89,0,3.85.27,5.08.73l-.81,4.81c-1.27-.35-2.46-.54-3.89-.54-2.62,0-3.85.77-3.85,2.58v.19h7.47v5.08h-7.47v15.2h-6.08v-15.2h-4.58v-5.08h4.58v-.31c0-5.04,3.54-7.47,9.54-7.47Z"/>
      <polygon fill="currentColor" points="22.99 93.15 18.01 65.5 9.61 65.5 14.69 93.15 22.99 93.15"/>
      <polygon fill="currentColor" points="35.34 65.5 39.97 93.15 47.25 93.15 42.61 65.5 35.34 65.5"/>
      <polygon fill="currentColor" points="30.36 93.15 35.02 65.5 27.94 65.5 23.3 93.15 30.36 93.15"/>
      <polygon fill="currentColor" points="52.54 65.5 47.56 93.15 55.67 93.15 60.75 65.5 52.54 65.5"/>
    </svg>
  )
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) setError(error.message)
    else navigate('/')
  }

  return (
    <div className="auth-layout">

      {/* Left — branding */}
      <div className="auth-brand">
        <div className="auth-brand-bg" />
        <div style={{ position: 'relative' }}>
          <div style={{ color: 'var(--white)', marginBottom: 48 }}>
            <WharfWordmark height={38} />
          </div>
          <h1 style={{
            fontSize: 28,
            fontWeight: 600,
            color: 'var(--white)',
            lineHeight: 1.25,
            letterSpacing: '-0.02em',
            marginBottom: 12,
          }}>
            Welcome back.
          </h1>
          <p style={{
            fontSize: 14,
            color: 'var(--color-text-secondary)',
            lineHeight: 1.65,
            maxWidth: 300,
          }}>
            Your pipeline, candidates, and outreach are ready and waiting.
          </p>
        </div>
      </div>

      {/* Right — form */}
      <div className="auth-form-panel">
        <div className="auth-form-inner">

          <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--white)', marginBottom: 4, letterSpacing: '-0.01em' }}>
            Sign in
          </h2>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 28, letterSpacing: 'var(--ls-body)' }}>
            Enter your credentials to continue
          </p>

          {error && <div className="error-banner" style={{ marginBottom: 20 }}>{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="input-group">
              <label className="input-label">Email address</label>
              <input
                className="input"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="input-group">
              <label className="input-label">Password</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              className="btn btn-primary btn-full"
              type="submit"
              disabled={loading}
              style={{ marginTop: 8, height: 40 }}
            >
              {loading ? <><div className="spinner" /> Signing in...</> : 'Sign In'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 24, color: 'var(--color-text-secondary)', fontSize: 13 }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--white)', fontWeight: 500 }}>Sign up free</Link>
          </p>
        </div>
      </div>

    </div>
  )
}
