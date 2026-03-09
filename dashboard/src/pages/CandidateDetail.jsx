import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Mail, Linkedin, ExternalLink, Tag, Calendar, Briefcase, MessageSquare, Save, Edit2, Trash2, User, Github, Star, GitFork, Upload, MapPin, Building2, Globe, Users, ClipboardList, CalendarPlus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'
import { format, formatDistanceToNow } from 'date-fns'
import EmailComposer from '../components/EmailComposer.jsx'
import { generateICS, parseDateTime } from '../lib/ics.js'

// ── Main Component ────────────────────────────────────────────────────────────

export default function CandidateDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
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

  // Scorecards
  const [feedback, setFeedback] = useState([])
  const [scoreFormOpen, setScoreFormOpen] = useState(false)
  const [scoreForm, setScoreForm] = useState({ overall_rating: 0, skills_rating: 0, culture_rating: 0, recommendation: '', notes: '' })
  const [scoreSaving, setScoreSaving] = useState(false)

  // Schedule / iCal
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleForm, setScheduleForm] = useState({ date: '', time: '10:00', duration: 60, location: '', notes: '' })

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [{ data: c }, { data: n }, { data: fb }] = await Promise.all([
      supabase.from('candidates').select('*').eq('id', id).single(),
      supabase.from('candidate_notes').select('*, users(name)').eq('candidate_id', id).order('created_at', { ascending: false }),
      supabase.from('candidate_feedback').select('*, profiles(name)').eq('candidate_id', id).order('created_at', { ascending: false }),
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
    setFeedback(fb ?? [])
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
    await supabase.from('candidates').update({ deleted_at: new Date().toISOString() }).eq('id', id)
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

  // ── Scorecards ─────────────────────────────────────────────────────────────

  async function handleAddScore() {
    if (scoreForm.overall_rating === 0) { toast('Please set an overall rating', 'error'); return }
    setScoreSaving(true)
    const { data: prof } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
    const { error } = await supabase.from('candidate_feedback').insert({
      candidate_id: id,
      user_id: user.id,
      org_id: prof.org_id,
      overall_rating: scoreForm.overall_rating,
      skills_rating: scoreForm.skills_rating || null,
      culture_rating: scoreForm.culture_rating || null,
      recommendation: scoreForm.recommendation || null,
      notes: scoreForm.notes || null,
    })
    if (error) { toast(error.message, 'error') }
    else {
      setScoreFormOpen(false)
      setScoreForm({ overall_rating: 0, skills_rating: 0, culture_rating: 0, recommendation: '', notes: '' })
      toast('Scorecard saved')
      fetchData()
    }
    setScoreSaving(false)
  }

  // ── Schedule / iCal ────────────────────────────────────────────────────────

  function handleDownloadICS() {
    const dtstart = parseDateTime(scheduleForm.date, scheduleForm.time)
    if (!dtstart) { toast('Please enter a valid date and time', 'error'); return }
    const dtend = new Date(dtstart.getTime() + scheduleForm.duration * 60000)
    generateICS({
      summary: `Interview: ${candidate.name}`,
      description: scheduleForm.notes || `Interview with ${candidate.name}`,
      location: scheduleForm.location,
      dtstart,
      dtend,
    })
    setScheduleOpen(false)
    toast('Calendar invite downloaded')
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
        fetch(`https://api.github.com/users/${username}/repos?sort=pushed&per_page=30`),
      ])
      if (!userRes.ok) throw new Error(`GitHub returned ${userRes.status} — check the URL`)

      const userData = await userRes.json()
      const reposData = reposRes.ok ? await reposRes.json() : []

      // Language frequency across all repos
      const langCounts = {}
      for (const repo of reposData) {
        if (repo.language) langCounts[repo.language] = (langCounts[repo.language] ?? 0) + 1
      }
      const topLanguages = Object.entries(langCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([lang]) => lang)

      // Aggregate signals
      const totalStars = reposData.reduce((sum, r) => sum + (r.stargazers_count ?? 0), 0)
      const totalForks = reposData.reduce((sum, r) => sum + (r.forks_count ?? 0), 0)
      const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      const recentRepos = reposData.filter(r => r.pushed_at && new Date(r.pushed_at) > sixMonthsAgo).length
      const notableRepos = reposData.filter(r => (r.stargazers_count ?? 0) >= 5).length

      // Tranche scoring (0–100)
      const followersScore  = Math.min((userData.followers ?? 0) / 300, 1) * 20
      const starsScore      = Math.min(totalStars / 50, 1) * 25
      const activityScore   = Math.min(recentRepos / 5, 1) * 20
      const diversityScore  = Math.min(Object.keys(langCounts).length / 4, 1) * 10
      const notableScore    = Math.min(notableRepos / 3, 1) * 15
      const reposScore      = Math.min((userData.public_repos ?? 0) / 20, 1) * 10
      const trancheScore    = Math.round(followersScore + starsScore + activityScore + diversityScore + notableScore + reposScore)

      let tranche, trancheColor
      if (trancheScore >= 70)      { tranche = 'Tier 1'; trancheColor = '#22c55e' }
      else if (trancheScore >= 50) { tranche = 'Tier 2'; trancheColor = '#3b82f6' }
      else if (trancheScore >= 30) { tranche = 'Tier 3'; trancheColor = '#f59e0b' }
      else                         { tranche = 'Tier 4'; trancheColor = '#6b7280' }

      // Sort by stars desc for display (top projects first)
      const sortedRepos = [...reposData].sort((a, b) => (b.stargazers_count ?? 0) - (a.stargazers_count ?? 0))

      setGithubData({
        avatar_url: userData.avatar_url,
        bio: userData.bio,
        followers: userData.followers,
        public_repos: userData.public_repos,
        company: userData.company,
        location: userData.location,
        blog: userData.blog,
        repos: sortedRepos.slice(0, 10).map(r => ({
          name: r.name,
          description: r.description,
          stars: r.stargazers_count ?? 0,
          forks: r.forks_count ?? 0,
          language: r.language,
          topics: Array.isArray(r.topics) ? r.topics : [],
          url: r.html_url,
        })),
        topLanguages,
        username,
        totalStars,
        totalForks,
        tranche,
        trancheScore,
        trancheColor,
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
        toast(`CV parsed — updated: ${updated.join(', ')}`)
      } else {
        toast('CV parsed — all fields were already filled')
      }
      fetchData()
    } catch (err) {
      toast(err?.message ?? 'Failed to parse CV', 'error')
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

        <button className="btn btn-secondary btn-sm" onClick={() => setScheduleOpen(true)}>
          <CalendarPlus size={14} /> Schedule
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
                  {['new', 'screening', 'interviewing', 'offered', 'hired', 'rejected', 'archived'].map(s => <option key={s} value={s}>{s}</option>)}
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

          {/* Scorecards */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <ClipboardList size={18} color="var(--color-accent)" />
              <h3 style={{ fontWeight: 600 }}>Scorecards ({feedback.length})</h3>
              <div style={{ flex: 1 }} />
              <button className="btn btn-secondary btn-sm" onClick={() => setScoreFormOpen(o => !o)}>
                {scoreFormOpen ? 'Cancel' : '+ Add Scorecard'}
              </button>
            </div>

            {scoreFormOpen && (
              <div style={{ background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Overall Rating *</div>
                    <StarRating value={scoreForm.overall_rating} onChange={v => setScoreForm(p => ({ ...p, overall_rating: v }))} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Skills Rating</div>
                    <StarRating value={scoreForm.skills_rating} onChange={v => setScoreForm(p => ({ ...p, skills_rating: v }))} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Culture Fit</div>
                    <StarRating value={scoreForm.culture_rating} onChange={v => setScoreForm(p => ({ ...p, culture_rating: v }))} />
                  </div>
                  <div>
                    <label className="input-label">Recommendation</label>
                    <select className="input" value={scoreForm.recommendation} onChange={e => setScoreForm(p => ({ ...p, recommendation: e.target.value }))}>
                      <option value="">— select —</option>
                      <option value="strong_yes">Strong Yes</option>
                      <option value="yes">Yes</option>
                      <option value="maybe">Maybe</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                  <div>
                    <label className="input-label">Notes</label>
                    <textarea className="input" rows={3} value={scoreForm.notes} onChange={e => setScoreForm(p => ({ ...p, notes: e.target.value }))} placeholder="Interview notes..." />
                  </div>
                  <button className="btn btn-primary" onClick={handleAddScore} disabled={scoreSaving}>
                    {scoreSaving ? <><div className="spinner" /> Saving...</> : 'Save Scorecard'}
                  </button>
                </div>
              </div>
            )}

            {feedback.length === 0 && !scoreFormOpen && (
              <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>No scorecards yet. Add one after an interview.</p>
            )}

            {feedback.map(fb => (
              <div key={fb.id} style={{ background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{fb.profiles?.name ?? 'Unknown'}</span>
                  <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                    {formatDistanceToNow(new Date(fb.created_at), { addSuffix: true })}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', width: 80 }}>Overall</span>
                    <StarRating value={fb.overall_rating} readOnly />
                  </div>
                  {fb.skills_rating > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', width: 80 }}>Skills</span>
                      <StarRating value={fb.skills_rating} readOnly />
                    </div>
                  )}
                  {fb.culture_rating > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', width: 80 }}>Culture</span>
                      <StarRating value={fb.culture_rating} readOnly />
                    </div>
                  )}
                  {fb.recommendation && (
                    <div style={{ marginTop: 4 }}>
                      <RecommendationBadge value={fb.recommendation} />
                    </div>
                  )}
                  {fb.notes && (
                    <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 6, lineHeight: 1.6 }}>{fb.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Schedule modal */}
      {scheduleOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <CalendarPlus size={18} color="var(--color-accent)" />
              <h3 style={{ fontWeight: 600 }}>Schedule Interview</h3>
              <div style={{ flex: 1 }} />
              <button className="btn btn-ghost btn-sm" onClick={() => setScheduleOpen(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="input-group">
                <label className="input-label">Date *</label>
                <input className="input" type="date" value={scheduleForm.date} onChange={e => setScheduleForm(p => ({ ...p, date: e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="input-label">Time *</label>
                <input className="input" type="time" value={scheduleForm.time} onChange={e => setScheduleForm(p => ({ ...p, time: e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="input-label">Duration</label>
                <select className="input" value={scheduleForm.duration} onChange={e => setScheduleForm(p => ({ ...p, duration: Number(e.target.value) }))}>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Location / Link</label>
                <input className="input" value={scheduleForm.location} onChange={e => setScheduleForm(p => ({ ...p, location: e.target.value }))} placeholder="Zoom, Google Meet, or office address" />
              </div>
              <div className="input-group">
                <label className="input-label">Notes</label>
                <textarea className="input" rows={3} value={scheduleForm.notes} onChange={e => setScheduleForm(p => ({ ...p, notes: e.target.value }))} placeholder="Additional details..." />
              </div>
              <button className="btn btn-primary" onClick={handleDownloadICS}>
                <CalendarPlus size={14} /> Download .ics Invite
              </button>
            </div>
          </div>
        </div>
      )}

      {emailOpen && (
        <EmailComposer
          candidateIds={[id]}
          onClose={() => setEmailOpen(false)}
          onSent={() => setEmailOpen(false)}
        />
      )}

    </div>
  )
}

// ── Star Rating ───────────────────────────────────────────────────────────────

function StarRating({ value, onChange, readOnly = false }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          style={{ fontSize: 20, lineHeight: 1, cursor: readOnly ? 'default' : 'pointer', color: n <= value ? '#f59e0b' : 'var(--color-border)' }}
          onClick={() => !readOnly && onChange(n)}
        >★</span>
      ))}
    </div>
  )
}

// ── Recommendation Badge ──────────────────────────────────────────────────────

const REC_COLORS = {
  strong_yes: { bg: '#052e16', text: '#4ade80', label: 'Strong Yes' },
  yes:        { bg: '#1c3829', text: '#86efac', label: 'Yes' },
  maybe:      { bg: '#2d2608', text: '#fbbf24', label: 'Maybe' },
  no:         { bg: '#2d1515', text: '#f87171', label: 'No' },
}

function RecommendationBadge({ value }) {
  const s = REC_COLORS[value] ?? { bg: 'var(--color-bg-elevated)', text: 'var(--color-text-secondary)', label: value }
  return (
    <span style={{ background: s.bg, color: s.text, padding: '2px 10px', borderRadius: 100, fontSize: 12, fontWeight: 600 }}>
      {s.label}
    </span>
  )
}

// ── GitHub Panel ──────────────────────────────────────────────────────────────

const TRANCHE_LABELS = {
  'Tier 1': 'Exceptional public footprint — top-tier open source signals',
  'Tier 2': 'Strong GitHub presence — solid projects and activity',
  'Tier 3': 'Promising profile — active but limited public footprint',
  'Tier 4': 'Early stage — limited public GitHub activity',
}

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

          {/* Tranche badge */}
          {githubData.tranche && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: githubData.trancheColor + '12',
              border: `1px solid ${githubData.trancheColor}30`,
              borderRadius: 'var(--radius-sm)',
              padding: '8px 12px',
            }}>
              <div style={{
                background: githubData.trancheColor,
                color: '#000',
                fontWeight: 700,
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 100,
                letterSpacing: '0.04em',
                flexShrink: 0,
              }}>
                {githubData.tranche}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                  {TRANCHE_LABELS[githubData.tranche]}
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: githubData.trancheColor, flexShrink: 0 }}>
                {githubData.trancheScore}<span style={{ fontSize: 10, fontWeight: 400, color: 'var(--color-text-tertiary)' }}>/100</span>
              </div>
            </div>
          )}

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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--color-text-secondary)' }}>
              <Users size={13} /> {githubData.followers} followers
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--color-text-secondary)' }}>
              <Github size={13} /> {githubData.public_repos} repos
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--color-text-secondary)' }}>
              <Star size={13} /> {githubData.totalStars} stars
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--color-text-secondary)' }}>
              <GitFork size={13} /> {githubData.totalForks} forks
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

          {/* Top Projects */}
          {githubData.repos.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Top Projects
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        {repo.forks > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                            <GitFork size={11} /> {repo.forks}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                          <Star size={11} /> {repo.stars}
                        </div>
                      </div>
                    </div>
                    {repo.description && (
                      <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {repo.description}
                      </div>
                    )}
                    {(repo.language || repo.topics.length > 0) && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                        {repo.language && (
                          <span style={{
                            fontSize: 11,
                            color: 'var(--color-text-secondary)',
                            background: 'var(--color-bg-raised)',
                            padding: '1px 6px',
                            borderRadius: 4,
                            border: '1px solid var(--color-border)',
                          }}>{repo.language}</span>
                        )}
                        {repo.topics.slice(0, 3).map(topic => (
                          <span key={topic} style={{
                            fontSize: 11,
                            color: 'var(--color-text-tertiary)',
                            background: 'var(--color-bg-raised)',
                            padding: '1px 6px',
                            borderRadius: 4,
                            border: '1px solid var(--color-border)',
                          }}>{topic}</span>
                        ))}
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
