import { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Home, Users, UserPlus, Upload, LogOut, Menu } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext.jsx'
import AIPanel from './AIPanel.jsx'

export default function Dashboard() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [panelOpen, setPanelOpen] = useState(false)
  const isMounted = useRef(false)

  useEffect(() => {
    if (!isMounted.current) { isMounted.current = true; return }
    setPanelOpen(false)
  }, [location.pathname])

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
          <div className="sidebar-logo-avatar">TW</div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {[
            { to: '/', icon: Home, label: 'Home', end: true },
            { to: '/candidates', icon: Users, label: 'All Candidates' },
            { to: '/candidates/new', icon: UserPlus, label: 'Add Candidate' },
            { to: '/candidates/import', icon: Upload, label: 'Import CSV' },
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

    </div>
  )
}
