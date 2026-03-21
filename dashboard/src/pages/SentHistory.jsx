import { useState, useEffect, Fragment } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatDistanceToNow, format } from 'date-fns'

const TEMPLATE_LABELS = {
  initial_outreach:  'Initial Outreach',
  follow_up:         'Follow Up',
  interview_invite:  'Interview Invite',
  rejection:         'Rejection',
  offer:             'Offer',
}

export default function SentHistory() {
  const [history, setHistory]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from('email_history')
          .select('*, candidates(id, name, email)')
          .order('sent_at', { ascending: false })
          .limit(200)
        if (error) throw error
        setHistory(data ?? [])
      } catch (err) {
        setLoadError(err?.message ?? 'Failed to load email history')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <div className="spinner spinner-lg" />
    </div>
  )

  if (loadError) return (
    <div className="page">
      <div className="error-banner">{loadError}</div>
    </div>
  )

  return (
    <div className="page">
      <div style={{ marginBottom: 28 }}>
        <h1 className="page-title">Sent History</h1>
        <p className="page-subtitle">{history.length} email{history.length !== 1 ? 's' : ''} sent</p>
      </div>

      {history.length === 0 ? (
        <div className="empty-state">
          <Mail size={40} />
          <h3>No emails sent yet</h3>
          <p>Emails you send through Compose will appear here.</p>
          <Link to="/outreach/compose" className="btn btn-primary" style={{ marginTop: 8 }}>
            Compose Email
          </Link>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Subject</th>
                <th>Template</th>
                <th>Sent</th>
                <th style={{ width: 32 }} />
              </tr>
            </thead>
            <tbody>
              {history.map(row => (
                <Fragment key={row.id}>
                  <tr onClick={() => setExpanded(e => e === row.id ? null : row.id)} style={{ cursor: 'pointer' }}>
                    <td>
                      {row.candidates ? (
                        <Link
                          to={`/candidates/${row.candidates.id}`}
                          onClick={e => e.stopPropagation()}
                          style={{ fontWeight: 500, color: 'var(--color-text-primary)', textDecoration: 'none' }}
                        >
                          {row.candidates.name}
                        </Link>
                      ) : (
                        <span style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>Deleted candidate</span>
                      )}
                      {row.candidates?.email && (
                        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>{row.candidates.email}</div>
                      )}
                    </td>
                    <td style={{ maxWidth: 280 }}>
                      <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                        {row.subject ?? '—'}
                      </span>
                    </td>
                    <td>
                      {row.template_id
                        ? <span className="badge badge-source">{TEMPLATE_LABELS[row.template_id] ?? row.template_id}</span>
                        : <span style={{ color: 'var(--color-text-tertiary)', fontSize: 12 }}>Custom</span>
                      }
                    </td>
                    <td style={{ color: 'var(--color-text-tertiary)', fontSize: 12, whiteSpace: 'nowrap' }}>
                      <div>{formatDistanceToNow(new Date(row.sent_at), { addSuffix: true })}</div>
                      <div style={{ fontSize: 11 }}>{format(new Date(row.sent_at), 'MMM d, yyyy · h:mm a')}</div>
                    </td>
                    <td>
                      {expanded === row.id
                        ? <ChevronUp size={14} color="var(--color-text-tertiary)" />
                        : <ChevronDown size={14} color="var(--color-text-tertiary)" />
                      }
                    </td>
                  </tr>

                  {expanded === row.id && (
                    <tr key={`${row.id}-body`}>
                      <td colSpan={5} style={{ background: 'var(--gray-800)', padding: 20, cursor: 'default' }}>
                        <div style={{
                          fontFamily: 'inherit', fontSize: 13, lineHeight: 1.7,
                          color: 'var(--color-text-secondary)',
                          whiteSpace: 'pre-wrap',
                          maxHeight: 300, overflowY: 'auto',
                        }}>
                          {row.body ?? '—'}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
