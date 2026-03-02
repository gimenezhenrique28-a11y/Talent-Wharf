import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, Users, UserPlus, Upload, BarChart2, Settings, FileText, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'

const PAGES = [
  { id: 'p-home',       label: 'Home',            sub: 'Page',   icon: Home,     path: '/' },
  { id: 'p-candidates', label: 'All Candidates',   sub: 'Page',   icon: Users,    path: '/candidates' },
  { id: 'p-analytics',  label: 'Analytics',        sub: 'Page',   icon: BarChart2,path: '/analytics' },
  { id: 'p-settings',   label: 'Settings',         sub: 'Page',   icon: Settings, path: '/settings' },
  { id: 'p-templates',  label: 'Email Templates',  sub: 'Page',   icon: FileText, path: '/templates' },
]

const ACTIONS = [
  { id: 'a-new',    label: 'Add New Candidate', sub: 'Action', icon: UserPlus, path: '/candidates/new' },
  { id: 'a-import', label: 'Import CSV',         sub: 'Action', icon: Upload,   path: '/candidates/import' },
]

export default function CommandPalette({ onClose }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [candidates, setCandidates] = useState([])
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const filteredPages = useMemo(() =>
    PAGES.filter(p => !query || p.label.toLowerCase().includes(query.toLowerCase())),
    [query])

  const filteredActions = useMemo(() =>
    ACTIONS.filter(a => !query || a.label.toLowerCase().includes(query.toLowerCase())),
    [query])

  const searchCandidates = useCallback(async (q) => {
    if (!q.trim()) { setCandidates([]); return }
    const { data } = await supabase
      .from('candidates')
      .select('id, name, status')
      .ilike('name', `%${q}%`)
      .limit(6)
    setCandidates(data ?? [])
  }, [])

  useEffect(() => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => searchCandidates(query), 250)
    return () => clearTimeout(timerRef.current)
  }, [query, searchCandidates])

  const allItems = useMemo(() => [
    ...filteredPages.map(p => ({ ...p, type: 'page' })),
    ...filteredActions.map(a => ({ ...a, type: 'action' })),
    ...candidates.map(c => ({
      id: c.id, label: c.name, sub: c.status, icon: Users,
      path: `/candidates/${c.id}`, type: 'candidate', status: c.status,
    })),
  ], [filteredPages, filteredActions, candidates])

  useEffect(() => { setActiveIdx(0) }, [query])

  function goTo(item) { navigate(item.path); onClose() }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown')  { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, allItems.length - 1)) }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && allItems[activeIdx]) { goTo(allItems[activeIdx]) }
    else if (e.key === 'Escape') { onClose() }
  }

  const pStart = 0
  const aStart = filteredPages.length
  const cStart = filteredPages.length + filteredActions.length

  const renderItem = (item, idx) => (
    <div
      key={item.id}
      className={`cmd-item${idx === activeIdx ? ' active' : ''}`}
      onClick={() => goTo(item)}
      onMouseEnter={() => setActiveIdx(idx)}
    >
      <item.icon size={14} />
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.type === 'candidate' && item.status
        ? <span className={`badge badge-${item.status} cmd-badge`}>{item.status}</span>
        : <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{item.sub}</span>
      }
    </div>
  )

  const hasResults = allItems.length > 0

  return (
    <div className="cmd-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="cmd-box" onKeyDown={handleKeyDown}>

        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
          <Search size={15} color="var(--color-text-tertiary)" />
          <input
            ref={inputRef}
            className="cmd-input"
            placeholder="Search pages, candidates, actions…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <kbd className="cmd-esc-key">esc</kbd>
        </div>

        {/* Results */}
        <div style={{ overflowY: 'auto', maxHeight: 380, padding: '4px 0' }}>
          {!hasResults && query ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <>
              {filteredPages.length > 0 && (
                <div>
                  <div className="cmd-section-label">Pages</div>
                  {filteredPages.map((p, i) => renderItem({ ...p, type: 'page' }, pStart + i))}
                </div>
              )}
              {filteredActions.length > 0 && (
                <div>
                  <div className="cmd-section-label">Actions</div>
                  {filteredActions.map((a, i) => renderItem({ ...a, type: 'action' }, aStart + i))}
                </div>
              )}
              {candidates.length > 0 && (
                <div>
                  <div className="cmd-section-label">Candidates</div>
                  {candidates.map((c, i) => renderItem({
                    id: c.id, label: c.name, sub: c.status, icon: Users,
                    path: `/candidates/${c.id}`, type: 'candidate', status: c.status,
                  }, cStart + i))}
                </div>
              )}
              {!query && (
                <div style={{ padding: '12px 16px', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
                  Type to search candidates…
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer hints */}
        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 16, fontSize: 11, color: 'var(--color-text-tertiary)' }}>
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  )
}
