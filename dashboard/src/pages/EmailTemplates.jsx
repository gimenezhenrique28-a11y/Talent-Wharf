import { useState, useEffect, Fragment } from 'react'
import { FileText, Save, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext.jsx'
import { format } from 'date-fns'

export default function EmailTemplates() {
  const { toast } = useToast()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [editSubject, setEditSubject] = useState('')
  const [editBody, setEditBody] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('email_templates')
        .select('*')
        .order('name')
      setTemplates(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  function handleExpand(tpl) {
    if (expanded === tpl.id) { setExpanded(null); return }
    setExpanded(tpl.id)
    setEditSubject(tpl.subject ?? '')
    setEditBody(tpl.body ?? '')
  }

  async function handleSave(tpl) {
    setSaving(true)
    const { error } = await supabase
      .from('email_templates')
      .update({
        subject: editSubject,
        body: editBody,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tpl.id)
    setSaving(false)
    if (error) { toast(error.message, 'error'); return }
    setTemplates(prev => prev.map(t =>
      t.id === tpl.id ? { ...t, subject: editSubject, body: editBody, updated_at: new Date().toISOString() } : t
    ))
    toast('Template saved')
    setExpanded(null)
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <div className="spinner spinner-lg" />
    </div>
  )

  return (
    <div className="page">
      <div style={{ marginBottom: 32 }}>
        <h1 className="page-title">Email Templates</h1>
        <p className="page-subtitle">Edit the email templates used across your pipeline</p>
      </div>

      {templates.length === 0 ? (
        <div className="empty-state">
          <FileText size={32} />
          <h3>No templates found</h3>
          <p>Email templates will appear here once created.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Subject</th>
                <th>Last Updated</th>
                <th style={{ width: 32 }} />
              </tr>
            </thead>
            <tbody>
              {templates.map(tpl => (
                <Fragment key={tpl.id}>
                  <tr onClick={() => handleExpand(tpl)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <FileText size={14} color="var(--color-text-tertiary)" />
                        <span style={{ fontWeight: 500 }}>{tpl.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-source">{tpl.category ?? 'general'}</span>
                    </td>
                    <td style={{ color: 'var(--color-text-secondary)', fontSize: 13, maxWidth: 280 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                        {tpl.subject ?? '—'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>
                      {tpl.updated_at ? format(new Date(tpl.updated_at), 'MMM d, yyyy') : '—'}
                    </td>
                    <td>
                      {expanded === tpl.id
                        ? <ChevronUp size={14} color="var(--color-text-tertiary)" />
                        : <ChevronDown size={14} color="var(--color-text-tertiary)" />
                      }
                    </td>
                  </tr>

                  {expanded === tpl.id && (
                    <tr>
                      <td colSpan={5} style={{ background: 'var(--gray-800)', padding: 20, cursor: 'default' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          <div className="input-group">
                            <label className="input-label">Subject</label>
                            <input
                              className="input"
                              value={editSubject}
                              onChange={e => setEditSubject(e.target.value)}
                            />
                          </div>
                          <div className="input-group">
                            <label className="input-label">Body</label>
                            <textarea
                              className="input"
                              rows={10}
                              value={editBody}
                              onChange={e => setEditBody(e.target.value)}
                              style={{ fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6 }}
                            />
                          </div>
                          <div style={{ display: 'flex', gap: 10 }}>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleSave(tpl)}
                              disabled={saving}
                            >
                              {saving ? <><div className="spinner" /> Saving…</> : <><Save size={14} /> Save Template</>}
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => setExpanded(null)}
                            >
                              Cancel
                            </button>
                          </div>
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
