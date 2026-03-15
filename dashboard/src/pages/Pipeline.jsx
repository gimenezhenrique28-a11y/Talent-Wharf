import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { UserPlus, Rows3, LayoutGrid, ChevronRight, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'

// ── Column definitions ────────────────────────────────────────────────────────

const ACTIVE_COLS = [
  { status: 'new',          label: 'New',          color: 'var(--color-text-tertiary)', width: 200 },
  { status: 'screening',    label: 'Screening',    color: '#60a5fa',                    width: 230 },
  { status: 'interviewing', label: 'Interviewing', color: '#f59e0b',                    width: 260 },
]

const TERMINAL_COLS = [
  { status: 'hired',    label: 'Hired',    color: 'var(--color-success)',       width: 220 },
  { status: 'rejected', label: 'Rejected', color: 'var(--color-danger)',        width: 220 },
  { status: 'archived', label: 'Archive',  color: 'var(--color-text-tertiary)', width: 200 },
]

const ALL_COLS = [...ACTIVE_COLS, ...TERMINAL_COLS]

// ── Age badge ─────────────────────────────────────────────────────────────────

function AgeBadge({ statusChangedAt }) {
  if (!statusChangedAt) return null
  const days = Math.floor((Date.now() - new Date(statusChangedAt)) / 86_400_000)
  if (days < 1) return null

  const color = days >= 14
    ? 'var(--color-danger)'
    : days >= 7
    ? '#f59e0b'
    : 'var(--color-text-tertiary)'

  return (
    <span style={{ fontSize: 10, color, fontWeight: 600, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
      {days}d
    </span>
  )
}

// ── Kanban card ───────────────────────────────────────────────────────────────

function KanbanCard({ candidate: c, compact, isDragging, onDragStart }) {
  const initials = c.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?'
  const skills   = Array.isArray(c.skills) ? c.skills.slice(0, 2) : []

  const dragHandlers = {
    draggable: true,
    onDragStart: e => {
      e.dataTransfer.setData('candidateId', c.id)
      e.dataTransfer.setData('prevStatus', c.status)
      e.dataTransfer.effectAllowed = 'move'
      onDragStart(c.id)
    },
  }

  const avatar = (
    <div style={{
      width: compact ? 20 : 26, height: compact ? 20 : 26,
      borderRadius: '50%', background: 'var(--gray-700)',
      border: '1px solid var(--color-border-strong)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: compact ? 9 : 10, fontWeight: 700,
      color: 'var(--gray-300)', flexShrink: 0,
    }}>
      {initials}
    </div>
  )

  if (compact) {
    return (
      <Link
        to={`/candidates/${c.id}`}
        className={`kanban-card kanban-card-compact${isDragging ? ' dragging' : ''}`}
        {...dragHandlers}
      >
        {avatar}
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {c.name}
        </span>
        <AgeBadge statusChangedAt={c.status_changed_at} />
      </Link>
    )
  }

  return (
    <Link
      to={`/candidates/${c.id}`}
      className={`kanban-card${isDragging ? ' dragging' : ''}`}
      {...dragHandlers}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        {avatar}
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {c.name}
        </span>
        <AgeBadge statusChangedAt={c.status_changed_at} />
      </div>

      {c.headline && (
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {c.headline}
        </div>
      )}

      {(skills.length > 0 || c.source) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
          {skills.map(s => (
            <span key={s} className="kanban-tag">{s}</span>
          ))}
          {c.source && <span className="kanban-tag">{c.source}</span>}
        </div>
      )}
    </Link>
  )
}

// ── Column body (handles drop + optional swimlane grouping) ───────────────────

function ColBody({ col, cards, compact, groupBySwimlane, dragOverCol, setDragOverCol, draggingId, handleMove }) {
  const grouped = groupBySwimlane
    ? cards.reduce((acc, c) => {
        const key = c.position?.trim() || '—'
        ;(acc[key] = acc[key] || []).push(c)
        return acc
      }, {})
    : { '': cards }

  return (
    <div
      className={`kanban-col-body${dragOverCol === col.status ? ' drag-over' : ''}`}
      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverCol(col.status) }}
      onDragLeave={() => setDragOverCol(null)}
      onDrop={e => {
        e.preventDefault()
        setDragOverCol(null)
        const id = e.dataTransfer.getData('candidateId')
        if (id) handleMove(id, col.status)
        draggingId.current = null
      }}
      onDragEnd={() => { setDragOverCol(null); draggingId.current = null }}
    >
      {cards.length === 0 && (
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--color-text-tertiary)', padding: '20px 8px', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)' }}>
          Drop here
        </div>
      )}

      {Object.entries(grouped).map(([lane, laneCards]) => (
        <div key={lane}>
          {groupBySwimlane && (
            <div className="kanban-swimlane-label">{lane}</div>
          )}
          {laneCards.map(c => (
            <KanbanCard
              key={c.id}
              candidate={c}
              compact={compact}
              isDragging={draggingId.current === c.id}
              onDragStart={id => { draggingId.current = id }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Pipeline() {
  const [candidates, setCandidates]           = useState([])
  const [loading, setLoading]                 = useState(true)
  const [dragOverCol, setDragOverCol]         = useState(null)
  const [compact, setCompact]                 = useState(false)
  const [groupBySwimlane, setGroupBySwimlane] = useState(false)
  const [archiveOpen, setArchiveOpen]         = useState(false)
  const draggingId = useRef(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('candidates')
        .select('id, name, headline, status, skills, source, position, status_changed_at, created_at')
        .order('status_changed_at', { ascending: false })
      setCandidates(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleMove(candidateId, newStatus) {
    const candidate = candidates.find(c => c.id === candidateId)
    if (!candidate || candidate.status === newStatus) return

    const prevStatus = candidate.status

    setCandidates(prev => prev.map(c =>
      c.id === candidateId ? { ...c, status: newStatus } : c
    ))

    const { error } = await supabase
      .from('candidates')
      .update({ status: newStatus })
      .eq('id', candidateId)

    if (error) {
      setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, status: prevStatus } : c))
      console.error('Failed to move candidate:', error.message)
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      await supabase.functions.invoke('fire-webhooks', {
        body: {
          event: 'candidate.status_changed',
          payload: { candidate_id: candidateId, candidate_name: candidate.name, old_status: prevStatus, new_status: newStatus },
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
    } catch (err) {
      console.warn('Webhook fire failed (non-fatal):', err)
    }
  }

  const grouped = ALL_COLS.reduce((acc, col) => {
    acc[col.status] = candidates.filter(c => c.status === col.status)
    return acc
  }, {})

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <div className="spinner spinner-lg" />
    </div>
  )

  const activeCount = candidates.filter(c => ACTIVE_COLS.some(col => col.status === c.status)).length

  function renderCol(col) {
    const cards     = grouped[col.status] ?? []
    const isArchive = col.status === 'archived'

    return (
      <div key={col.status} className="kanban-col" style={{ flex: `0 0 ${col.width}px` }}>
        <div
          className="kanban-col-header"
          style={isArchive ? { cursor: 'pointer', userSelect: 'none' } : {}}
          onClick={isArchive ? () => setArchiveOpen(o => !o) : undefined}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{col.label}</span>
          <span style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-tertiary)', padding: '1px 7px', borderRadius: 100, fontSize: 11 }}>
            {cards.length}
          </span>
          {isArchive && (
            <span style={{ color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center' }}>
              {archiveOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </span>
          )}
        </div>

        {(!isArchive || archiveOpen) && (
          <ColBody
            col={col}
            cards={cards}
            compact={compact}
            groupBySwimlane={groupBySwimlane}
            dragOverCol={dragOverCol}
            setDragOverCol={setDragOverCol}
            draggingId={draggingId}
            handleMove={handleMove}
          />
        )}
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pipeline</h1>
          <p className="page-subtitle">
            {activeCount} active · {grouped.archived?.length ?? 0} archived — drag to change status
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setGroupBySwimlane(o => !o)}
            style={groupBySwimlane ? { borderColor: 'var(--color-accent)', color: 'var(--color-accent)' } : {}}
            title="Group by position"
          >
            <Rows3 size={13} /> Swimlane
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setCompact(o => !o)}
            style={compact ? { borderColor: 'var(--color-accent)', color: 'var(--color-accent)' } : {}}
            title="Compact view"
          >
            <LayoutGrid size={13} /> Compact
          </button>
          <Link to="/candidates/new" className="btn btn-primary">
            <UserPlus size={15} /> Add Candidate
          </Link>
        </div>
      </div>

      <div className="kanban-board">
        {/* Active pipeline zone */}
        <div className="kanban-zone">
          <div className="kanban-zone-label">Active pipeline</div>
          <div className="kanban-zone-cols">
            {ACTIVE_COLS.map(renderCol)}
          </div>
        </div>

        <div className="kanban-zone-divider" />

        {/* Decisions zone */}
        <div className="kanban-zone">
          <div className="kanban-zone-label">Decisions</div>
          <div className="kanban-zone-cols">
            {TERMINAL_COLS.map(renderCol)}
          </div>
        </div>
      </div>
    </div>
  )
}
