import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Kanban, UserPlus } from 'lucide-react'
import { supabase } from '../lib/supabase'

const COLUMNS = [
  { status: 'new',          label: 'New',          color: 'var(--color-text-tertiary)' },
  { status: 'screening',    label: 'Screening',    color: '#60a5fa' },
  { status: 'interviewing', label: 'Interviewing', color: '#f59e0b' },
  { status: 'hired',        label: 'Hired',        color: 'var(--color-success)' },
  { status: 'rejected',     label: 'Rejected',     color: 'var(--color-danger)' },
]

// ── Star rating helper (read-only display) ────────────────────────────────────

function KanbanCard({ candidate: c, onDragStart, isDragging }) {
  const initials = c.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?'
  const skills   = Array.isArray(c.skills) ? c.skills.slice(0, 2) : []

  return (
    <Link
      to={`/candidates/${c.id}`}
      className={`kanban-card${isDragging ? ' dragging' : ''}`}
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('candidateId', c.id)
        e.dataTransfer.setData('prevStatus', c.status)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart(c.id)
      }}
      onClick={e => {
        // Let drag cancel link navigation on same column drops
      }}
    >
      {/* Name row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{
          width: 26, height: 26, borderRadius: '50%',
          background: 'var(--gray-700)', border: '1px solid var(--color-border-strong)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, color: 'var(--gray-300)', flexShrink: 0,
        }}>{initials}</div>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {c.name}
        </span>
      </div>

      {/* Headline */}
      {c.headline && (
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {c.headline}
        </div>
      )}

      {/* Skills + source */}
      {(skills.length > 0 || c.source) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
          {skills.map(s => (
            <span key={s} style={{
              background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
              color: 'var(--color-text-tertiary)',
              padding: '2px 7px', borderRadius: 100, fontSize: 10,
            }}>{s}</span>
          ))}
          {c.source && (
            <span style={{
              background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
              color: 'var(--color-text-tertiary)',
              padding: '2px 7px', borderRadius: 100, fontSize: 10,
            }}>{c.source}</span>
          )}
        </div>
      )}
    </Link>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Pipeline() {
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading]       = useState(true)
  const [dragOverCol, setDragOverCol] = useState(null)
  const draggingId = useRef(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('candidates')
        .select('id, name, headline, status, skills, source, created_at')
        .order('created_at', { ascending: false })
      setCandidates(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleMove(candidateId, newStatus) {
    const candidate = candidates.find(c => c.id === candidateId)
    if (!candidate || candidate.status === newStatus) return

    const prevStatus = candidate.status

    // Optimistic update
    setCandidates(prev => prev.map(c =>
      c.id === candidateId ? { ...c, status: newStatus } : c
    ))

    await supabase.from('candidates').update({ status: newStatus }).eq('id', candidateId)

    // Fire webhook (non-fatal)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await supabase.functions.invoke('fire-webhooks', {
        body: {
          event: 'candidate.status_changed',
          payload: {
            candidate_id: candidateId,
            candidate_name: candidate.name,
            old_status: prevStatus,
            new_status: newStatus,
          },
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
    } catch (err) {
      console.warn('Webhook fire failed (non-fatal):', err)
    }
  }

  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.status] = candidates.filter(c => c.status === col.status)
    return acc
  }, {})

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <div className="spinner spinner-lg" />
    </div>
  )

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Pipeline</h1>
          <p className="page-subtitle">{candidates.length} candidate{candidates.length !== 1 ? 's' : ''} — drag to change status</p>
        </div>
        <Link to="/candidates/new" className="btn btn-primary">
          <UserPlus size={15} /> Add Candidate
        </Link>
      </div>

      {/* Kanban board */}
      <div className="kanban-board">
        {COLUMNS.map(col => {
          const cards = grouped[col.status] ?? []
          return (
            <div key={col.status} className="kanban-col">
              {/* Column header */}
              <div className="kanban-col-header">
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{col.label}</span>
                <span style={{
                  background: 'var(--color-bg-elevated)',
                  color: 'var(--color-text-tertiary)',
                  padding: '1px 7px', borderRadius: 100, fontSize: 11,
                }}>{cards.length}</span>
              </div>

              {/* Drop zone */}
              <div
                className={`kanban-col-body${dragOverCol === col.status ? ' drag-over' : ''}`}
                onDragOver={e => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  setDragOverCol(col.status)
                }}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={e => {
                  e.preventDefault()
                  setDragOverCol(null)
                  const candidateId = e.dataTransfer.getData('candidateId')
                  if (candidateId) handleMove(candidateId, col.status)
                  draggingId.current = null
                }}
                onDragEnd={() => {
                  setDragOverCol(null)
                  draggingId.current = null
                }}
              >
                {cards.length === 0 && (
                  <div style={{
                    textAlign: 'center', fontSize: 12,
                    color: 'var(--color-text-tertiary)',
                    padding: '20px 8px',
                    border: '1px dashed var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                  }}>
                    Drop here
                  </div>
                )}
                {cards.map(c => (
                  <KanbanCard
                    key={c.id}
                    candidate={c}
                    isDragging={draggingId.current === c.id}
                    onDragStart={id => { draggingId.current = id }}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
