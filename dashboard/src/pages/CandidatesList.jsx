import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Plus, Mail, Linkedin, ExternalLink, Trash2, ChevronLeft, ChevronRight, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import EmailComposer from '../components/EmailComposer.jsx'

const PAGE_SIZE = 20

const STATUS_OPTIONS = ['', 'new', 'contacted', 'interviewing', 'hired', 'rejected']
const SOURCE_OPTIONS = ['', 'LinkedIn', 'Gmail', 'Manual', 'CSV Import', 'Extension']

export default function CandidatesList() {
  const navigate = useNavigate()
  const [candidates, setCandidates] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [emailOpen, setEmailOpen] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    let query = supabase
      .from('candidates')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (search) query = query.ilike('name', `%${search}%`)
    if (statusFilter) query = query.eq('status', statusFilter)
    if (sourceFilter) query = query.eq('source', sourceFilter)

    const { data, count } = await query
    setCandidates(data ?? [])
    setTotal(count ?? 0)
    setLoading(false)
  }, [page, search, statusFilter, sourceFilter])

  useEffect(() => { fetch() }, [fetch])
  useEffect(() => { setPage(1); setSelected(new Set()) }, [search, statusFilter, sourceFilter])

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === candidates.length) setSelected(new Set())
    else setSelected(new Set(candidates.map(c => c.id)))
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    if (!confirm('Delete this candidate?')) return
    await supabase.from('candidates').delete().eq('id', id)
    fetch()
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Candidates</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: 4 }}>{total} total candidates</p>
        </div>
        <Link to="/candidates/new" className="btn btn-primary">
          <Plus size={16} /> Add Candidate
        </Link>
      </div>

      {/* Search & Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 300px' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
          <input
            className="input"
            style={{ paddingLeft: 38 }}
            placeholder="Search candidates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input" style={{ width: 180 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.filter(Boolean).map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select className="input" style={{ width: 180 }} value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}>
          <option value="">All Sources</option>
          {SOURCE_OPTIONS.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'var(--color-bg-raised)',
          border: '1px solid var(--color-accent)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 16px',
          marginBottom: 16,
          boxShadow: '0 0 20px rgba(254,94,0,0.15)',
        }}>
          <span style={{ color: 'var(--color-accent)', fontWeight: 600, flex: 1 }}>{selected.size} selected</span>
          <button className="btn btn-primary btn-sm" onClick={() => setEmailOpen(true)}>
            <Mail size={14} /> Send Email
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <div className="spinner spinner-lg" />
        </div>
      ) : candidates.length === 0 ? (
        <div className="empty-state">
          <Users size={48} />
          <h3>No candidates found</h3>
          <p>{search || statusFilter || sourceFilter ? 'Try adjusting your filters.' : 'Add your first candidate to get started.'}</p>
          {!search && !statusFilter && !sourceFilter && (
            <Link to="/candidates/new" className="btn btn-primary" style={{ marginTop: 8 }}>Add First Candidate</Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Select all */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px', marginBottom: 4 }}>
            <input type="checkbox" checked={selected.size === candidates.length && candidates.length > 0}
              onChange={toggleAll}
              style={{ width: 16, height: 16, accentColor: 'var(--color-accent)', cursor: 'pointer' }} />
            <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Select all</span>
          </div>

          {candidates.map(c => (
            <CandidateCard
              key={c.id}
              candidate={c}
              selected={selected.has(c.id)}
              onSelect={() => toggleSelect(c.id)}
              onDelete={handleDelete}
              onClick={() => navigate(`/candidates/${c.id}`)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 32 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>Page {page} of {totalPages}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Email Composer */}
      {emailOpen && (
        <EmailComposer
          candidateIds={Array.from(selected)}
          onClose={() => setEmailOpen(false)}
          onSent={() => { setEmailOpen(false); setSelected(new Set()) }}
        />
      )}
    </div>
  )
}

function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>
}

function CandidateCard({ candidate: c, selected, onSelect, onDelete, onClick }) {
  const skills = Array.isArray(c.skills) ? c.skills : []
  const visibleSkills = skills.slice(0, 5)
  const extraSkills = skills.length - 5

  return (
    <div
      className="card"
      style={{
        display: 'flex', gap: 14, alignItems: 'flex-start',
        cursor: 'pointer',
        transition: 'border-color 0.15s',
        borderColor: selected ? 'var(--color-accent)' : 'var(--color-border)',
      }}
      onClick={onClick}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onSelect}
        onClick={e => e.stopPropagation()}
        style={{ width: 18, height: 18, accentColor: 'var(--color-accent)', cursor: 'pointer', marginTop: 2, flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{c.name}</span>
          <StatusBadge status={c.status} />
        </div>

        {/* Details */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
          {c.email && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--color-text-secondary)' }}>
              <Mail size={13} /> {c.email}
            </span>
          )}
          {c.linkedin_url && (
            <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--color-text-secondary)' }}>
              <Linkedin size={13} /> LinkedIn <ExternalLink size={11} />
            </a>
          )}
          {c.source && <span className="badge badge-source">{c.source}</span>}
        </div>

        {/* Skills */}
        {skills.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {visibleSkills.map(s => (
              <span key={s} style={{
                background: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)',
                padding: '3px 10px', borderRadius: 100, fontSize: 12,
              }}>{s}</span>
            ))}
            {extraSkills > 0 && (
              <span style={{
                background: 'var(--color-bg-elevated)', color: 'var(--color-text-tertiary)',
                padding: '3px 10px', borderRadius: 100, fontSize: 12,
              }}>+{extraSkills} more</span>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            Added {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={(e) => onDelete(c.id, e)}
            style={{ color: 'var(--color-danger)', padding: '4px 8px' }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
