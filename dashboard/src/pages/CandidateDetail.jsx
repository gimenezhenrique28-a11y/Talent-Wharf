import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Mail, Linkedin, ExternalLink, Tag, Calendar, Briefcase, MessageSquare, Save, Edit2, Trash2, User } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext.jsx'
import { format, formatDistanceToNow } from 'date-fns'
import EmailComposer from '../components/EmailComposer.jsx'

export default function CandidateDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  const [candidate, setCandidate] = useState(null)
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [noteText, setNoteText] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [emailOpen, setEmailOpen] = useState(false)

  useEffect(() => { fetchData() }, [id])

  async function fetchData() {
    setLoading(true)
    const [{ data: c }, { data: n }] = await Promise.all([
      supabase.from('candidates').select('*').eq('id', id).single(),
      supabase.from('candidate_notes').select('*, users(name)').eq('candidate_id', id).order('created_at', { ascending: false }),
    ])
    setCandidate(c)
    setEditForm({
      name: c?.name ?? '',
      headline: c?.headline ?? '',
      email: c?.email ?? '',
      linkedin_url: c?.linkedin_url ?? '',
      about: c?.about ?? '',
      status: c?.status ?? 'new',
      skills: Array.isArray(c?.skills) ? c.skills.join(', ') : '',
    })
    setNotes(n ?? [])
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    const skillsArray = editForm.skills
      ? editForm.skills.split(',').map(s => s.trim()).filter(Boolean)
      : []

    await supabase.from('candidates').update({
      name: editForm.name,
      headline: editForm.headline,
      email: editForm.email || null,
      linkedin_url: editForm.linkedin_url || null,
      about: editForm.about || null,
      status: editForm.status,
      skills: skillsArray,
    }).eq('id', id)

    setSaving(false)
    setEditing(false)
    fetchData()
  }

  async function handleDelete() {
    if (!confirm('Delete this candidate? This cannot be undone.')) return
    await supabase.from('candidates').delete().eq('id', id)
    navigate('/candidates')
  }

  async function handleAddNote() {
    if (!noteText.trim()) return
    setAddingNote(true)
    await supabase.from('candidate_notes').insert({
      candidate_id: id,
      user_id: user.id,
      content: noteText.trim(),
    })
    setNoteText('')
    setAddingNote(false)
    const { data } = await supabase.from('candidate_notes').select('*, users(name)').eq('candidate_id', id).order('created_at', { ascending: false })
    setNotes(data ?? [])
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <div className="spinner spinner-lg" />
    </div>
  )

  if (!candidate) return (
    <div className="page">
      <div className="empty-state"><h3>Candidate not found</h3><Link to="/candidates" className="btn btn-primary">Back to list</Link></div>
    </div>
  )

  const initials = candidate.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?'
  const skills = Array.isArray(candidate.skills) ? candidate.skills : []
  const experience = Array.isArray(candidate.experience) ? candidate.experience : []

  return (
    <div className="page">
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <Link to="/candidates" className="btn btn-ghost" style={{ padding: '8px 0' }}>
          <ArrowLeft size={16} /> Back
        </Link>
        <div style={{ flex: 1 }} />
        <button className="btn btn-secondary btn-sm" onClick={() => setEmailOpen(true)}>
          <Mail size={14} /> Send Email
        </button>
        {editing ? (
          <>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
              {saving ? <><div className="spinner" /> Saving...</> : <><Save size={14} /> Save</>}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>Cancel</button>
          </>
        ) : (
          <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>
            <Edit2 size={14} /> Edit
          </button>
        )}
        <button className="btn btn-danger btn-sm" onClick={handleDelete}>
          <Trash2 size={14} /> Delete
        </button>
      </div>

      {/* Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20, alignItems: 'start' }}>

        {/* LEFT: Profile card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            {/* Avatar */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'var(--color-accent-gradient)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 12,
              }}>{initials}</div>

              {editing ? (
                <input className="input" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} style={{ textAlign: 'center', fontWeight: 700 }} />
              ) : (
                <h2 style={{ fontSize: 22, fontWeight: 700, textAlign: 'center' }}>{candidate.name}</h2>
              )}

              {editing ? (
                <input className="input" value={editForm.headline} onChange={e => setEditForm(p => ({ ...p, headline: e.target.value }))} style={{ textAlign: 'center', marginTop: 8 }} placeholder="Headline" />
              ) : candidate.headline && (
                <p style={{ fontSize: 15, color: 'var(--color-text-secondary)', textAlign: 'center', marginTop: 6 }}>{candidate.headline}</p>
              )}
            </div>

            {/* Status */}
            <div style={{ marginBottom: 16 }}>
              <div className="input-label" style={{ marginBottom: 6 }}>Status</div>
              {editing ? (
                <select className="input" value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}>
                  {['new','contacted','interviewing','hired','rejected'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <span className={`badge badge-${candidate.status}`}>{candidate.status}</span>
              )}
            </div>

            {/* Contact */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {editing ? (
                <>
                  <div className="input-group">
                    <label className="input-label">Email</label>
                    <input className="input" type="email" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">LinkedIn URL</label>
                    <input className="input" value={editForm.linkedin_url} onChange={e => setEditForm(p => ({ ...p, linkedin_url: e.target.value }))} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Skills (comma-separated)</label>
                    <input className="input" value={editForm.skills} onChange={e => setEditForm(p => ({ ...p, skills: e.target.value }))} />
                  </div>
                </>
              ) : (
                <>
                  {candidate.email && (
                    <a href={`mailto:${candidate.email}`} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--color-text-secondary)' }}>
                      <Mail size={14} /> {candidate.email}
                    </a>
                  )}
                  {candidate.linkedin_url && (
                    <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--color-text-secondary)' }}>
                      <Linkedin size={14} /> LinkedIn <ExternalLink size={12} />
                    </a>
                  )}
                  {candidate.source && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--color-text-secondary)' }}>
                      <Tag size={14} /> {candidate.source}
                    </div>
                  )}
                  {candidate.created_at && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--color-text-secondary)' }}>
                      <Calendar size={14} /> {format(new Date(candidate.created_at), 'MMM d, yyyy')}
                    </div>
                  )}
                  {skills.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      {skills.map(s => (
                        <span key={s} style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)', padding: '3px 10px', borderRadius: 100, fontSize: 12, fontWeight: 500 }}>{s}</span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* About */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <User size={18} color="var(--color-accent)" /> <h3 style={{ fontWeight: 600 }}>About</h3>
            </div>
            {editing ? (
              <textarea className="input" rows={6} value={editForm.about} onChange={e => setEditForm(p => ({ ...p, about: e.target.value }))} placeholder="About this candidate..." />
            ) : (
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                {candidate.about || <span style={{ color: 'var(--color-text-tertiary)' }}>No description available.</span>}
              </p>
            )}
          </div>

          {/* Experience */}
          {experience.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <Briefcase size={18} color="var(--color-accent)" /> <h3 style={{ fontWeight: 600 }}>Experience</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {experience.map((exp, i) => (
                  <div key={i} style={{ display: 'flex', gap: 16, paddingBottom: i < experience.length - 1 ? 24 : 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-accent)', boxShadow: '0 0 8px rgba(254,94,0,0.5)', flexShrink: 0, marginTop: 4 }} />
                      {i < experience.length - 1 && <div style={{ width: 2, flex: 1, background: 'var(--color-border)', marginTop: 6 }} />}
                    </div>
                    <div style={{ paddingBottom: 8 }}>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{exp.title}</div>
                      {exp.company && <div style={{ fontSize: 14, color: 'var(--color-accent-light)', marginTop: 2 }}>{exp.company}</div>}
                      {exp.duration && <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>{exp.duration}</div>}
                      {exp.description && <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 6 }}>{exp.description}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <MessageSquare size={18} color="var(--color-accent)" />
              <h3 style={{ fontWeight: 600 }}>Notes ({notes.length})</h3>
            </div>

            <textarea
              className="input"
              rows={3}
              placeholder="Add a note..."
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              style={{ marginBottom: 10 }}
            />
            <button className="btn btn-primary btn-full" onClick={handleAddNote} disabled={addingNote || !noteText.trim()}>
              {addingNote ? <><div className="spinner" /> Adding...</> : 'Add Note'}
            </button>

            {notes.length > 0 && (
              <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {notes.map(note => (
                  <div key={note.id} style={{ background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{note.users?.name ?? 'Unknown'}</span>
                      <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                        {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{note.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {emailOpen && (
        <EmailComposer
          candidateIds={[id]}
          onClose={() => setEmailOpen(false)}
          onSent={() => setEmailOpen(false)}
        />
      )}

      <style>{`
        @media (max-width: 900px) {
          .detail-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
