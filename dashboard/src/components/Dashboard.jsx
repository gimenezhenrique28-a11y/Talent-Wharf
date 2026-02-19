import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Home, Users, UserPlus, Upload, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext.jsx'

/* Official TalentWharf SVG wordmark — white version for dark bg */
function WharfWordmark({ height = 28 }) {
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

export default function Dashboard() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const initials = profile?.name
    ? profile.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        height: 64,
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(10,10,10,0.90)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 32px',
        gap: 40,
      }}>

        {/* Logo wordmark */}
        <div style={{ flexShrink: 0, color: 'var(--white)', lineHeight: 0, width: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <WharfWordmark height={78} />
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, justifyContent: 'center' }}>
          {[
            { to: '/', icon: Home, label: 'Home', end: true },
            { to: '/candidates', icon: Users, label: 'All Candidates' },
            { to: '/candidates/new', icon: UserPlus, label: 'Add Candidate' },
            { to: '/candidates/import', icon: Upload, label: 'Import CSV' },
          ].map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end} style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '7px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: 'var(--ls-body)',
              color: isActive ? 'var(--white)' : 'var(--color-text-secondary)',
              background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
              transition: 'all 0.15s ease',
              textDecoration: 'none',
            })}>
              <Icon size={15} />
              <span className="nav-label">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, width: 180, justifyContent: 'center' }}>
          <div style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: 'var(--gray-800)',
            border: '1px solid var(--color-border-strong)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--gray-300)',
            letterSpacing: '0.02em',
          }}>{initials}</div>
          <span style={{ fontSize: 14, color: 'var(--color-text-secondary)', letterSpacing: 'var(--ls-body)' }}>{profile?.name}</span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleSignOut}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </header>

      {/* Content */}
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      <style>{`
        @media (max-width: 768px) { .nav-label { display: none; } }
        header nav a:hover:not([style*="rgba(255,255,255,0.08)"]) {
          color: var(--white) !important;
          background: rgba(255,255,255,0.04) !important;
        }
      `}</style>
    </div>
  )
}
