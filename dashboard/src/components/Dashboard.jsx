import { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Home, Users, UserPlus, Upload, LogOut, BarChart2, FileText, Menu, Kanban, ChevronDown } from 'lucide-react'
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
  const [navOpen, setNavOpen] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [candidatesOpen, setCandidatesOpen] = useState(() =>
    location.pathname.startsWith('/candidates')
  )
  const isMounted = useRef(false)

  // Close mobile nav on route change; auto-expand candidates group
  useEffect(() => {
    if (!isMounted.current) { isMounted.current = true; return }
    setPanelOpen(false)
    setNavOpen(false)
    if (location.pathname.startsWith('/candidates')) {
      setCandidatesOpen(true)
    }
  }, [location.pathname])

  // Global keyboard shortcuts
  useEffect(() => {
    let gPending = false
    let gTimer = null

    function handleKeyDown(e) {
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen(o => !o)
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        navigate('/candidates/new')
        return
      }

      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        setShortcutsOpen(true)
        return
      }

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

  const isCandidatesActive = location.pathname.startsWith('/candidates')

  const navLinkClass = ({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`

  return (
    <div className={`app-shell${panelOpen ? '' : ' panel-collapsed'}`}>

      {/* ── Mobile: nav overlay ────────────────────────────────────── */}
      {navOpen && <div className="mobile-nav-overlay" onClick={() => setNavOpen(false)} />}

      {/* ── Mobile: topbar with hamburger + logo ───────────────────── */}
      <div className="mobile-topbar">
        <button
          className="btn btn-ghost"
          style={{ padding: 8 }}
          onClick={() => setNavOpen(o => !o)}
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>
        <div style={{ color: 'var(--white)', flex: 1, display: 'flex', justifyContent: 'center', lineHeight: 0 }}>
          <WharfWordmark />
        </div>
        <div style={{ width: 36 }} />
      </div>

      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <aside className={`sidebar${navOpen ? ' nav-open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div style={{ color: 'var(--white)', lineHeight: 0 }}>
            <WharfWordmark />
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">

          {/* Home */}
          <NavLink to="/" end className={navLinkClass} onClick={() => setNavOpen(false)}>
            <Home size={16} /><span>Home</span>
          </NavLink>

          {/* Candidates group */}
          <div>
            <button
              className={`sidebar-nav-group${isCandidatesActive ? ' group-active' : ''}`}
              onClick={() => setCandidatesOpen(o => !o)}
            >
              <div className="sidebar-nav-group-left">
                <Users size={16} />
                <span>Candidates</span>
              </div>
              <ChevronDown size={13} className={`sidebar-nav-chevron${candidatesOpen ? ' open' : ''}`} />
            </button>

            {candidatesOpen && (
              <div className="sidebar-nav-sub">
                <NavLink
                  to="/candidates"
                  end
                  className={({ isActive }) => `sidebar-nav-sub-item${isActive ? ' active' : ''}`}
                  onClick={() => setNavOpen(false)}
                >
                  All Candidates
                </NavLink>
                <NavLink
                  to="/candidates/new"
                  className={({ isActive }) => `sidebar-nav-sub-item${isActive ? ' active' : ''}`}
                  onClick={() => setNavOpen(false)}
                >
                  <UserPlus size={13} /> Add Candidate
                </NavLink>
                <NavLink
                  to="/candidates/import"
                  className={({ isActive }) => `sidebar-nav-sub-item${isActive ? ' active' : ''}`}
                  onClick={() => setNavOpen(false)}
                >
                  <Upload size={13} /> Import CSV
                </NavLink>
              </div>
            )}
          </div>

          {/* Pipeline */}
          <NavLink to="/pipeline" className={navLinkClass} onClick={() => setNavOpen(false)}>
            <Kanban size={16} /><span>Pipeline</span>
          </NavLink>

          {/* Analytics */}
          <NavLink to="/analytics" className={navLinkClass} onClick={() => setNavOpen(false)}>
            <BarChart2 size={16} /><span>Analytics</span>
          </NavLink>

          {/* Email Templates */}
          <NavLink to="/templates" className={navLinkClass} onClick={() => setNavOpen(false)}>
            <FileText size={16} /><span>Email Templates</span>
          </NavLink>

        </nav>

        {/* User profile — click to open Settings */}
        <div className="sidebar-footer">
          <NavLink
            to="/settings"
            className={({ isActive }) => `sidebar-user-link${isActive ? ' active' : ''}`}
            title="Settings"
            onClick={() => setNavOpen(false)}
          >
            <div className="sidebar-user-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{profile?.name}</div>
              <div className="sidebar-user-email">{profile?.email}</div>
            </div>
          </NavLink>
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
