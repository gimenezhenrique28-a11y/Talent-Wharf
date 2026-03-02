import { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Home, Users, UserPlus, Upload, LogOut, BarChart2, Settings, FileText } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext.jsx'
import AIPanel from './AIPanel.jsx'
import CommandPalette from './CommandPalette.jsx'
import ShortcutsModal from './ShortcutsModal.jsx'

/* Official TalentWharf SVG wordmark — tight viewBox crops to just the letterforms */
function WharfWordmark() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="5 60 155 40"
      height={30}
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
  const location = useLocation()
  const [panelOpen, setPanelOpen] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const isMounted = useRef(false)

  useEffect(() => {
    if (!isMounted.current) { isMounted.current = true; return }
    setPanelOpen(false)
  }, [location.pathname])

  // Global keyboard shortcuts
  useEffect(() => {
    let gPending = false
    let gTimer = null

    function handleKeyDown(e) {
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return

      // Cmd+K / Ctrl+K — command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen(o => !o)
        return
      }

      // Cmd+N / Ctrl+N — new candidate
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        navigate('/candidates/new')
        return
      }

      // ? — shortcuts modal
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        setShortcutsOpen(true)
        return
      }

      // G → * navigation
      if (gPending) {
        clearTimeout(gTimer)
        gPending = false
        const dest = { h: '/', c: '/candidates', a: '/analytics', s: '/settings' }[e.key.toLowerCase()]
        if (dest) { e.preventDefault(); navigate(dest) }
        return
      }

      if (e.key === 'g' && !e.metaKey && !e.ctrlKey) {
        gPending = true
        gTimer = setTimeout(() => { gPending = false }, 1000)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      clearTimeout(gTimer)
    }
  }, [navigate])

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const initials = profile?.name
    ? profile.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <div className={`app-shell${panelOpen ? '' : ' panel-collapsed'}`}>

      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div style={{ color: 'var(--white)', lineHeight: 0 }}>
            <WharfWordmark />
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {[
            { to: '/', icon: Home, label: 'Home', end: true },
            { to: '/candidates', icon: Users, label: 'All Candidates' },
            { to: '/candidates/new', icon: UserPlus, label: 'Add Candidate' },
            { to: '/candidates/import', icon: Upload, label: 'Import CSV' },
            { to: '/analytics', icon: BarChart2, label: 'Analytics' },
            { to: '/templates', icon: FileText, label: 'Email Templates' },
            { to: '/settings', icon: Settings, label: 'Settings' },
          ].map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) =>
              `sidebar-nav-item${isActive ? ' active' : ''}`
            }>
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User profile + logout */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{profile?.name}</div>
              <div className="sidebar-user-email">{profile?.email}</div>
            </div>
          </div>
          <button
            className="sidebar-logout-btn"
            onClick={handleSignOut}
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────── */}
      <main className="app-main">
        <Outlet />
      </main>

      {/* ── AI Insights right panel ───────────────────────── */}
      <AIPanel open={panelOpen} onToggle={() => setPanelOpen(o => !o)} />

      {/* ── Command palette ───────────────────────────────── */}
      {cmdOpen && <CommandPalette onClose={() => setCmdOpen(false)} />}

      {/* ── Keyboard shortcuts modal ──────────────────────── */}
      {shortcutsOpen && <ShortcutsModal onClose={() => setShortcutsOpen(false)} />}

    </div>
  )
}
