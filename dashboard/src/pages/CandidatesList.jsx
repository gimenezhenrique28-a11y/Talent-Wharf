import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Plus, Mail, Linkedin, ExternalLink, Trash2, ChevronLeft, ChevronRight, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import EmailComposer from '../components/EmailComposer.jsx'

const PAGE_SIZE = 20

const STATUS_OPTIONS = ['', 'new', 'screening', 'interviewing', 'offered', 'hired', 'rejected', 'archived']
const SOURCE_OPTIONS = ['', 'LinkedIn', 'Gmail', 'Manual', 'CSV Import', 'Extension', 'API']

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetch()
  }, [fetch])
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelected(new Set())
  }, [search, statusFilter, sourceFilter])

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
    await supabase.from('candidates').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    fetch()
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const allSelected = selected.size === candidates.length && candidates.length > 0
  const someSelected = selected.size > 0 && !allSelected

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Candidates</h1>
          <p className="page-subtitle">{total} candidates in roster</p>
        </div>
        <Link to="/candidates/new" className="btn btn-primary">
          <Plus size={14} /> Add Candidate
        </Link>
      </div>

      {/* Search & Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 260px' }}>
          <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-500)', pointerEvents: 'none' }} />
          <input
            className="input"
            style={{ paddingLeft: 36, fontSize: 12 }}
            placeholder="Search candidates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input" style={{ flex: '0 1 140px', minWidth: 110, fontSize: 12 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.filter(Boolean).map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select className="input" style={{ flex: '0 1 140px', minWidth: 110, fontSize: 12 }} value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}>
          <option value="">All Sources</option>
          {SOURCE_OPTIONS.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--gray-900)',
          border: '1px solid var(--color-border-strong)',
          borderRadius: 'var(--radius-sm)',
          padding: '8px 14px',
          marginBottom: 14,
        }}>
          <span style={{ color: 'var(--white)', fontWeight: 600, flex: 1, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{selected.size} selected</span>
          <button className="btn btn-primary btn-sm" onClick={() => setEmailOpen(true)}>
            <Mail size={12} /> Send Email
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
          <Users size={40} />
          <h3>No candidates found</h3>
          <p>{search || statusFilter || sourceFilter ? 'Try adjusting your filters.' : 'Add your first candidate to get started.'}</p>
          {!search && !statusFilter && !sourceFilter && (
            <Link to="/candidates/new" className="btn btn-primary" style={{ marginTop: 8 }}>Add First Candidate</Link>
          )}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 40, paddingRight: 0 }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected }}
                    onChange={toggleAll}
                    style={{ width: 13, height: 13, accentColor: 'var(--white)', cursor: 'pointer', display: 'block' }}
                  />
                </th>
                <th>Name</th>
                <th>Status</th>
                <th>Contact</th>
                <th>Source</th>
                <th>Added</th>
                <th style={{ width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {candidates.map(c => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/candidates/${c.id}`)}
                  className={selected.has(c.id) ? 'selected' : ''}
                >
                  <td style={{ paddingRight: 0 }} onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => toggleSelect(c.id)}
                      style={{ width: 13, height: 13, accentColor: 'var(--white)', cursor: 'pointer', display: 'block' }}
                    />
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{c.name}</div>
                    {c.headline && (
                      <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 2, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.headline}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`badge badge-${c.status}`}>{c.status}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {c.email && (
                        <span style={{ fontSize: 12, color: 'var(--gray-300)' }}>{c.email}</span>
                      )}
                      {c.linkedin_url && (
                        <a
                          href={c.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--gray-400)' }}
                        >
                          <Linkedin size={10} /> LinkedIn <ExternalLink size={9} />
                        </a>
                      )}
                    </div>
                  </td>
                  <td>
                    {c.source && <span className="badge badge-source">{c.source}</span>}
                  </td>
                  <td style={{ color: 'var(--gray-400)', fontSize: 11, whiteSpace: 'nowrap', letterSpacing: '0.02em' }}>
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={(e) => handleDelete(c.id, e)}
                      style={{ color: 'var(--color-danger)', padding: '4px 6px' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 20 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: 11, color: 'var(--gray-400)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Page {page} of {totalPages}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            <ChevronRight size={14} />
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
