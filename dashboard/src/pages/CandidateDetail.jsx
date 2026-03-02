import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Mail, Linkedin, ExternalLink, Tag, Calendar, Briefcase, MessageSquare, Save, Edit2, Trash2, User, Github, Star, Upload, CheckCircle, MapPin, Building2, Globe, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext.jsx'
import { format, formatDistanceToNow } from 'date-fns'
import EmailComposer from '../components/EmailComposer.jsx'

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, type, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: type === 'error' ? '#2d1515' : 'var(--color-bg-elevated)',
      border: `1px solid ${type === 'error' ? '#7d2020' : 'var(--color-border-strong)'}`,
      borderRadius: 'var(--radius-md)',
      padding: '12px 18px',
      display: 'flex', alignItems: 'center', gap: 10,
      fontSize: 14, fontWeight: 500,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      maxWidth: 420,
    }}>
      <CheckCircle size={16} color={type === 'error' ? '#e57373' : 'var(--color-accent)'} />
      <span style={{ color: type === 'error' ? '#e57373' : 'var(--color-text-primary)' }}>{message}</span>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function CandidateDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const cvFileRef = useRef(null)

  const [candidate, setCandidate] = useState(null)
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [noteText, setNoteText] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [emailOpen, setEmailOpen] = useState(false)

  // CV parsing
  const [parseCvLoading, setParseCvLoading] = useState(false)

  // GitHub enrichment
  const [githubData, setGithubData] = useState(null)
  const [githubLoading, setGithubLoading] = useState(false)
  const [githubError, setGithubError] = useState('')

  // Toast
  const [toast, setToast] = useState(null)
  function showToast(message, type = 'success') {
    setToast({ message, type })
  }

  const fetchData = useCallback(async () => {
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
      github_url: c?.github_url ?? '',
      about: c?.about ?? '',
      status: c?.status ?? 'new',
      skills: Array.isArray(c?.skills) ? c.skills.join(', ') : '',
    })
    setNotes(n ?? [])
    setLoading(false)
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleSave() {
    setSaving(true)
    const skillsArray = editForm.skills
      ? editForm.skills.split(',').map(s => s.trim()).filter(Boolean)
      : []

    const statusChanged = candidate?.status !== editForm.status
    const prevStatus = candidate?.status

    await supabase.from('candidates').update({
      name: editForm.name,
      headline: editForm.headline,
      email: editForm.email || null,
      linkedin_url: editForm.linkedin_url || null,
      github_url: editForm.github_url || null,
      about: editForm.about || null,
      status: editForm.status,
      skills: skillsArray,
    }).eq('id', id)

    // Fire webhook if status changed
    if (statusChanged) {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        await supabase.functions.invoke('fire-webhooks', {
          body: {
            event: 'candidate.status_changed',
            payload: {
              candidate_id: id,
              candidate_name: editForm.name,
              old_status: prevStatus,
              new_status: editForm.status,
            },
          },
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
      } catch (err) {
        console.warn('Webhook fire failed (non-fatal):', err)
      }
    }

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

  // ── GitHub Enrichment ──────────────────────────────────────────────────────

  async function handleEnrichGithub() {
    const url = candidate?.github_url
    if (!url) return

    const match = url.match(/github\.com\/([^/\s?#]+)/)
    const username = match ? match[1] : url.replace(/^@/, '').trim()
    if (!username) { setGithubError('Could not extract username from URL'); return }

    setGithubLoading(true)
    setGithubError('')
    setGithubData(null)

    try {
      const [userRes, reposRes] = await Promise.all([
        fetch(`https://api.github.com/users/${username}`),
        fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=8`),
      ])
      if (!userRes.ok) throw new Error(`GitHub returned ${userRes.status} — check the URL`)

      const userData = await userRes.json()
      const reposData = reposRes.ok ? await reposRes.json() : []

      const langCounts = {}
      for (const repo of reposData) {
        if (repo.language) langCounts[repo.language] = (langCounts[repo.language] ?? 0) + 1
      }
      const topLanguages = Object.entries(langCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([lang]) => lang)

      setGithubData({
        avatar_url: userData.avatar_url,
        bio: userData.bio,
        followers: userData.followers,
        public_repos: userData.public_repos,
        company: userData.company,
        location: userData.location,
        blog: userData.blog,
        repos: reposData.slice(0, 6).map(r => ({
          name: r.name,
          description: r.description,
          stars: r.stargazers_count,
          language: r.language,
          url: r.html_url,
        })),
        topLanguages,
        username,
      })
    } catch (err) {
      setGithubError(err instanceof Error ? err.message : 'Failed to fetch GitHub data')
    }
    setGithubLoading(false)
  }

  // ── Parse CV ───────────────────────────────────────────────────────────────

  async function handleCvFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    await handleParseCv(file)
  }

  async function handleParseCv(file) {
    setParseCvLoading(true)
    try {
      const dataUrl = await fileToBase64(file)
      const base64 = dataUrl.split(',')[1]
      const { data: { session } } = await supabase.auth.getSession()

      const res = await supabase.functions.invoke('cv-enrich', {
        body: {
          candidate_id: id,
          pdf_base64: base64,
          filename: file.name,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (res.error) throw new Error(res.error.message)
      const updated = res.data?.updated ?? []
      if (updated.length > 0) {
        showToast(`CV parsed — updated: ${updated.join(', ')}`)
      } else {
        showToast('CV parsed — all fields were already filled')
      }
      fetchData()
    } catch (err) {
      showToast(err?.message ?? 'Failed to parse CV', 'error')
    }
    setParseCvLoading(false)
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // ── Render ─────────────────────────────────────────────────────────────────

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

        {/* Parse CV button */}
        <input
          ref={cvFileRef}
          type="file"
          accept=".pdf"
          style={{ display: 'none' }}
          onChange={handleCvFileChange}
        />
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => cvFileRef.current?.click()}
          disabled={parseCvLoading}
          title="Upload a PDF resume to auto-fill empty fields"
        >
          {parseCvLoading
            ? <><div className="spinner" /> Parsing...</>
            : <><Upload size={14} /> Parse CV</>}
        </button>

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
      <div className="candidate-detail-grid">

        {/* LEFT: Profile card + GitHub card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            {/* Avatar */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'var(--gray-700)',
                border: '1px solid var(--color-border-strong)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, fontWeight: 700, color: 'var(--gray-200)', marginBottom: 12,
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
                  {['new', 'contacted', 'interviewing', 'hired', 'rejected'].map(s => <option key={s} value={s}>{s}</option>)}
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
                    <label className="input-label">GitHub URL</label>
                    <input className="input" placeholder="https://github.com/username" value={editForm.github_url} onChange={e => setEditForm(p => ({ ...p, github_url: e.target.value }))} />
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
                  {candidate.github_url && (
                    <a href={candidate.github_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--color-text-secondary)' }}>
                      <Github size={14} /> GitHub <ExternalLink size={12} />
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

          {/* GitHub Panel */}
          <GitHubPanel
            githubUrl={candidate.github_url}
            githubData={githubData}
            githubLoading={githubLoading}
            githubError={githubError}
            onEnrich={handleEnrichGithub}
          />
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
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gray-400)', flexShrink: 0, marginTop: 5 }} />
                      {i < experience.length - 1 && <div style={{ width: 2, flex: 1, background: 'var(--color-border)', marginTop: 6 }} />}
                    </div>
                    <div style={{ paddingBottom: 8 }}>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{exp.title}</div>
                      {exp.company && <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginTop: 2 }}>{exp.company}</div>}
                      {(exp.start || exp.end) && <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>{[exp.start, exp.end].filter(Boolean).join(' – ')}</div>}
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

      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}

    </div>
  )
}

// ── GitHub Panel ──────────────────────────────────────────────────────────────

function GitHubPanel({ githubUrl, githubData, githubLoading, githubError, onEnrich }) {
  if (!githubUrl && !githubData) {
    return (
      <div className="card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <Github size={18} color="var(--color-accent)" />
          <h3 style={{ fontWeight: 600, fontSize: 15 }}>GitHub</h3>
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginBottom: 12 }}>
          Add a GitHub URL in edit mode to enrich this profile with public data.
        </p>
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Github size={18} color="var(--color-accent)" />
        <h3 style={{ fontWeight: 600, fontSize: 15 }}>GitHub</h3>
        <div style={{ flex: 1 }} />
        <button
          className="btn btn-secondary btn-sm"
          onClick={onEnrich}
          disabled={githubLoading || !githubUrl}
          style={{ fontSize: 12 }}
        >
          {githubLoading ? <><div className="spinner" /> Loading...</> : 'Enrich'}
        </button>
      </div>

      {githubError && (
        <p style={{ fontSize: 13, color: '#e57373', marginBottom: 8 }}>{githubError}</p>
      )}

      {!githubData && !githubLoading && !githubError && githubUrl && (
        <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
          Click <strong>Enrich</strong> to load public GitHub data.
        </p>
      )}

      {githubData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Profile header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <img
              src={githubData.avatar_url}
              alt="GitHub avatar"
              style={{ width: 48, height: 48, borderRadius: '50%', border: '1px solid var(--color-border)' }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>@{githubData.username}</div>
              {githubData.bio && (
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2, lineHeight: 1.5 }}>{githubData.bio}</div>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--color-text-secondary)' }}>
              <Users size={13} /> {githubData.followers} followers
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--color-text-secondary)' }}>
              <Github size={13} /> {githubData.public_repos} repos
            </div>
          </div>

          {/* Meta */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {githubData.company && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                <Building2 size={12} /> {githubData.company}
              </div>
            )}
            {githubData.location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                <MapPin size={12} /> {githubData.location}
              </div>
            )}
            {githubData.blog && (
              <a href={githubData.blog.startsWith('http') ? githubData.blog : `https://${githubData.blog}`} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                <Globe size={12} /> {githubData.blog}
              </a>
            )}
          </div>

          {/* Top Languages */}
          {githubData.topLanguages.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Top Languages
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {githubData.topLanguages.map(lang => (
                  <span key={lang} style={{
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-secondary)',
                    padding: '3px 10px',
                    borderRadius: 100,
                    fontSize: 12,
                    fontWeight: 500,
                  }}>{lang}</span>
                ))}
              </div>
            </div>
          )}

          {/* Repos */}
          {githubData.repos.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Recent Repos
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {githubData.repos.map(repo => (
                  <a
                    key={repo.name}
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'block',
                      background: 'var(--color-bg)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      textDecoration: 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {repo.name}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--color-text-tertiary)', flexShrink: 0 }}>
                        <Star size={11} /> {repo.stars}
                      </div>
                    </div>
                    {repo.description && (
                      <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {repo.description}
                      </div>
                    )}
                    {repo.language && (
                      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                        {repo.language}
                      </div>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
