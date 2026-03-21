import { useState, useEffect, Fragment } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Save, ChevronDown, ChevronUp, Plus, Trash2, Copy, Send, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { format } from 'date-fns'

/* ── Constants ────────────────────────────────────────────────────────────── */

const CATEGORIES = ['general', 'outreach', 'interview', 'offer', 'rejection', 'follow-up']

const CATEGORY_STYLE = {
  general:    { bg: 'rgba(255,255,255,0.06)',  color: 'var(--color-text-tertiary)' },
  outreach:   { bg: 'rgba(96,165,250,0.12)',   color: '#60a5fa' },
  interview:  { bg: 'rgba(251,191,36,0.12)',   color: '#fbbf24' },
  offer:      { bg: 'rgba(110,231,183,0.12)',  color: '#6ee7b7' },
  rejection:  { bg: 'rgba(248,113,113,0.12)',  color: '#f87171' },
  'follow-up':{ bg: 'rgba(192,132,252,0.12)',  color: '#c084fc' },
}

const BLANK = { name: '', category: 'general', subject: '', body: '' }

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function detectVars(text = '') {
  return [...new Set([...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]))]
}

const SAMPLE_VARS = {
  name: 'Jane Smith', company: 'Acme Corp', position: 'Software Engineer',
  date: 'Monday, Mar 10', time: '2:00 PM', location: 'Zoom', format: 'Video call',
  duration: '45 min', scheduling_link: 'https://calendly.com/you',
  salary: '$120,000', benefits: 'Health, dental, 401k', start_date: 'Apr 1, 2025',
}

function previewText(text = '') {
  return text.replace(/\{(\w+)\}/g, (_, k) => SAMPLE_VARS[k] ?? `{${k}}`)
}

/* ── CategoryBadge ────────────────────────────────────────────────────────── */

function CategoryBadge({ category }) {
  const s = CATEGORY_STYLE[category] ?? CATEGORY_STYLE.general
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '2px 9px', borderRadius: 100,
      fontSize: 11, fontWeight: 600, textTransform: 'capitalize',
      flexShrink: 0,
    }}>
      {category ?? 'general'}
    </span>
  )
}

/* ── TemplateEditorForm (shared by create + edit) ─────────────────────────── */

function TemplateEditorForm({ form, onChange, onSubmit, onCancel, saving, isEdit = false }) {
  const [tab, setTab] = useState('edit')

  const set = field => val =>
    onChange({ ...form, [field]: typeof val === 'string' ? val : val.target.value })

  const vars = detectVars(form.subject + ' ' + form.body)

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Row: Name + Category */}
      <div className="grid-2">
        <div className="input-group">
          <label className="input-label">Name <span className="required">*</span></label>
          <input
            className="input"
            placeholder="e.g. Initial Outreach"
            value={form.name}
            onChange={set('name')}
            required
          />
        </div>
        <div className="input-group">
          <label className="input-label">Category</label>
          <select className="input" value={form.category} onChange={set('category')}>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Subject */}
      <div className="input-group">
        <label className="input-label">Subject <span className="required">*</span></label>
        <input
          className="input"
          placeholder="Subject line — use {variables} for dynamic content"
          value={form.subject}
          onChange={set('subject')}
          required
        />
      </div>

      {/* Body with Edit / Preview tabs */}
      <div className="input-group">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <label className="input-label" style={{ margin: 0 }}>Body <span className="required">*</span></label>
          {/* Tab switcher */}
          <div style={{
            display: 'flex', gap: 2,
            background: 'var(--color-bg-elevated)',
            borderRadius: 6, padding: 2,
          }}>
            {['edit', 'preview'].map(t => (
              <button
                key={t} type="button"
                onClick={() => setTab(t)}
                style={{
                  padding: '3px 12px', borderRadius: 4,
                  fontSize: 11, fontWeight: 600,
                  border: 'none', cursor: 'pointer',
                  background: tab === t ? 'var(--color-bg-raised)' : 'transparent',
                  color: tab === t ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                  transition: 'all 0.12s',
                }}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {tab === 'edit' ? (
          <textarea
            className="input"
            rows={11}
            value={form.body}
            onChange={set('body')}
            placeholder={`Hi {name},\n\nWrite your email here. Use {company}, {position}, {scheduling_link}, etc.`}
            style={{ fontFamily: 'inherit', fontSize: 13, lineHeight: 1.75, resize: 'vertical' }}
            required
          />
        ) : (
          <div style={{
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            minHeight: 220,
            fontSize: 13, lineHeight: 1.75,
            color: 'var(--color-text-secondary)',
            whiteSpace: 'pre-wrap',
          }}>
            {form.subject && (
              <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 14, fontSize: 14, paddingBottom: 12, borderBottom: '1px solid var(--color-border)' }}>
                {previewText(form.subject)}
              </div>
            )}
            {form.body
              ? previewText(form.body)
              : <span style={{ color: 'var(--color-text-tertiary)' }}>Nothing to preview yet…</span>
            }
            {Object.keys(SAMPLE_VARS).some(k => (form.subject + form.body).includes(`{${k}}`)) && (
              <div style={{ marginTop: 14, fontSize: 11, color: 'var(--color-text-tertiary)', borderTop: '1px solid var(--color-border)', paddingTop: 10 }}>
                Preview uses sample values for variables
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detected variables */}
      {vars.length > 0 && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(129,140,248,0.07)',
          border: '1px solid rgba(129,140,248,0.15)',
          borderRadius: 'var(--radius-md)',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#818cf8', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Detected Variables
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {vars.map(v => (
              <code key={v} style={{
                fontSize: 11,
                background: 'rgba(129,140,248,0.13)',
                color: '#a5b4fc',
                padding: '2px 8px', borderRadius: 4,
              }}>
                {'{' + v + '}'}
              </code>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
          {saving
            ? <><div className="spinner" /> Saving…</>
            : <><Save size={13} /> {isEdit ? 'Save Changes' : 'Create Template'}</>
          }
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>
          Cancel
        </button>
        {isEdit && (
          <Link
            to="/outreach/compose"
            className="btn btn-ghost btn-sm"
            style={{ marginLeft: 'auto' }}
          >
            <Send size={13} /> Use in Compose
          </Link>
        )}
      </div>
    </form>
  )
}

/* ── Main page ────────────────────────────────────────────────────────────── */

export default function EmailTemplates() {
  const { toast } = useToast()
  const { profile } = useAuth()

  const [templates, setTemplates] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [catFilter, setCatFilter] = useState('')

  /* create */
  const [creating, setCreating]         = useState(false)
  const [createForm, setCreateForm]     = useState(BLANK)
  const [createSaving, setCreateSaving] = useState(false)

  /* edit */
  const [expanded, setExpanded]   = useState(null)
  const [editForm, setEditForm]   = useState(BLANK)
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const { data, error } = await supabase.from('email_templates').select('*').order('name')
      if (error) throw error
      setTemplates(data ?? [])
    } catch (err) {
      toast(err?.message ?? 'Failed to load templates', 'error')
    } finally {
      setLoading(false)
    }
  }

  /* ── Filtered list ── */
  const filtered = templates.filter(t => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) &&
        !(t.subject ?? '').toLowerCase().includes(search.toLowerCase())) return false
    if (catFilter && t.category !== catFilter) return false
    return true
  })

  /* ── Expand / edit ── */
  function handleExpand(tpl) {
    if (expanded === tpl.id) { setExpanded(null); return }
    setExpanded(tpl.id)
    setEditForm({ name: tpl.name ?? '', category: tpl.category ?? 'general', subject: tpl.subject ?? '', body: tpl.body ?? '' })
    setCreating(false)
  }

  async function handleSave(tpl) {
    setEditSaving(true)
    const { error } = await supabase
      .from('email_templates')
      .update({ name: editForm.name, category: editForm.category, subject: editForm.subject, body: editForm.body, updated_at: new Date().toISOString() })
      .eq('id', tpl.id)
    setEditSaving(false)
    if (error) { toast(error.message, 'error'); return }
    setTemplates(prev => prev.map(t =>
      t.id === tpl.id ? { ...t, ...editForm, updated_at: new Date().toISOString() } : t
    ))
    toast('Template saved')
    setExpanded(null)
  }

  /* ── Create ── */
  async function handleCreate(e) {
    e.preventDefault()
    setCreateSaving(true)
    const { data, error } = await supabase
      .from('email_templates')
      .insert({ org_id: profile?.org_id, ...createForm })
      .select()
      .single()
    setCreateSaving(false)
    if (error) { toast(error.message, 'error'); return }
    setTemplates(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    setCreating(false)
    setCreateForm(BLANK)
    toast('Template created')
  }

  /* ── Delete ── */
  async function handleDelete(id, e) {
    e.stopPropagation()
    if (!confirm('Delete this template? This cannot be undone.')) return
    const { error } = await supabase.from('email_templates').delete().eq('id', id)
    if (error) { toast(error.message, 'error'); return }
    setTemplates(prev => prev.filter(t => t.id !== id))
    if (expanded === id) setExpanded(null)
    toast('Template deleted')
  }

  /* ── Duplicate ── */
  async function handleDuplicate(tpl, e) {
    e.stopPropagation()
    const { data, error } = await supabase
      .from('email_templates')
      .insert({ org_id: profile?.org_id, name: `${tpl.name} (copy)`, category: tpl.category, subject: tpl.subject, body: tpl.body })
      .select()
      .single()
    if (error) { toast(error.message, 'error'); return }
    setTemplates(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    toast('Template duplicated')
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <div className="spinner spinner-lg" />
    </div>
  )

  return (
    <div className="page">

      {/* ── Header ── */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Email Templates</h1>
          <p className="page-subtitle">{templates.length} template{templates.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => { setCreating(c => !c); setExpanded(null) }}
        >
          <Plus size={15} /> New Template
        </button>
      </div>

      {/* ── Create form ── */}
      {creating && (
        <div className="card" style={{ padding: 28, marginBottom: 24 }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 20, color: 'var(--color-text-primary)' }}>
            Create New Template
          </div>
          <TemplateEditorForm
            form={createForm}
            onChange={setCreateForm}
            onSubmit={handleCreate}
            onCancel={() => { setCreating(false); setCreateForm(BLANK) }}
            saving={createSaving}
            isEdit={false}
          />
        </div>
      )}

      {/* ── Search + filter ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)', pointerEvents: 'none' }} />
          <input
            className="input"
            style={{ paddingLeft: 34 }}
            placeholder="Search templates…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input"
          style={{ flex: '0 1 160px', minWidth: 130 }}
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(c => (
            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* ── Table / Empty state ── */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <FileText size={36} />
          <h3>{templates.length === 0 ? 'No templates yet' : 'No templates match'}</h3>
          <p>
            {templates.length === 0
              ? 'Create your first template to use across the pipeline.'
              : 'Try adjusting your search or filter.'}
          </p>
          {templates.length === 0 && (
            <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => setCreating(true)}>
              <Plus size={14} /> Create Template
            </button>
          )}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Variables</th>
                <th>Subject</th>
                <th>Updated</th>
                <th style={{ width: 110 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map(tpl => {
                const vars    = detectVars((tpl.subject ?? '') + ' ' + (tpl.body ?? ''))
                const isOpen  = expanded === tpl.id

                return (
                  <Fragment key={tpl.id}>
                    {/* ── Row ── */}
                    <tr onClick={() => handleExpand(tpl)} style={{ cursor: 'pointer' }}>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <FileText size={13} color="var(--color-text-tertiary)" flexShrink={0} />
                          <span style={{ fontWeight: 500 }}>{tpl.name}</span>
                        </div>
                      </td>

                      <td>
                        <CategoryBadge category={tpl.category} />
                      </td>

                      <td>
                        {vars.length === 0 ? (
                          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>—</span>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {vars.slice(0, 3).map(v => (
                              <code key={v} style={{
                                fontSize: 10,
                                background: 'var(--color-bg-elevated)',
                                color: 'var(--color-text-tertiary)',
                                padding: '1px 6px', borderRadius: 4,
                              }}>
                                {'{' + v + '}'}
                              </code>
                            ))}
                            {vars.length > 3 && (
                              <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>+{vars.length - 3}</span>
                            )}
                          </div>
                        )}
                      </td>

                      <td style={{ maxWidth: 240, color: 'var(--color-text-secondary)', fontSize: 13 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                          {tpl.subject ?? '—'}
                        </span>
                      </td>

                      <td style={{ color: 'var(--color-text-tertiary)', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {tpl.updated_at ? format(new Date(tpl.updated_at), 'MMM d, yyyy') : '—'}
                      </td>

                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            title="Duplicate"
                            onClick={e => handleDuplicate(tpl, e)}
                            style={{ padding: '4px 7px' }}
                          >
                            <Copy size={13} />
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            title="Delete"
                            onClick={e => handleDelete(tpl.id, e)}
                            style={{ color: 'var(--color-danger)', padding: '4px 7px' }}
                          >
                            <Trash2 size={13} />
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            title={isOpen ? 'Close' : 'Edit'}
                            style={{ padding: '4px 7px' }}
                            onClick={() => handleExpand(tpl)}
                          >
                            {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* ── Expanded editor ── */}
                    {isOpen && (
                      <tr>
                        <td
                          colSpan={6}
                          style={{ background: 'var(--gray-800)', padding: 28, cursor: 'default' }}
                          onClick={e => e.stopPropagation()}
                        >
                          <TemplateEditorForm
                            form={editForm}
                            onChange={setEditForm}
                            onSubmit={e => { e.preventDefault(); handleSave(tpl) }}
                            onCancel={() => setExpanded(null)}
                            saving={editSaving}
                            isEdit
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
