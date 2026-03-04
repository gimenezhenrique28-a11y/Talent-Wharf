import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Save, Upload, FileText, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function CandidateForm() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const cvFileRef = useRef(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parsedFile, setParsedFile] = useState(null)

  const [form, setForm] = useState({
    name: '', email: '', headline: '', linkedin_url: '',
    skills: '', about: '', notes: '', source: 'Manual',
  })

  function set(field) {
    return e => setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  // ── Parse CV to pre-fill form ──────────────────────────────────────────────

  async function handleCvFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setParsedFile(null)
    setParsing(true)
    setError('')

    try {
      const dataUrl = await fileToBase64(file)
      const base64 = dataUrl.split(',')[1]
      const { data: { session } } = await supabase.auth.getSession()

      const res = await supabase.functions.invoke('parse-resume', {
        body: { pdf_base64: base64, filename: file.name },
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (res.error) throw new Error(res.error.message)
      const d = res.data?.data ?? {}

      setForm(prev => ({
        ...prev,
        name:     d.name     ? String(d.name)     : prev.name,
        email:    d.email    ? String(d.email)    : prev.email,
        headline: d.headline ? String(d.headline) : prev.headline,
        about:    d.about    ? String(d.about)    : prev.about,
        skills:   Array.isArray(d.skills) && d.skills.length > 0
          ? d.skills.join(', ')
          : prev.skills,
        source: 'Manual',
      }))

      setParsedFile(file.name)
    } catch (err) {
      setError(err?.message ?? 'Failed to parse CV')
    }
    setParsing(false)
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const skillsArray = form.skills
      ? form.skills.split(',').map(s => s.trim()).filter(Boolean)
      : []

    const { data: newCandidate, error: insertErr } = await supabase
      .from('candidates')
      .insert({
        name: form.name,
        email: form.email || null,
        headline: form.headline || null,
        linkedin_url: form.linkedin_url || null,
        skills: skillsArray,
        about: form.about || null,
        notes: form.notes || null,
        source: form.source,
        org_id: profile?.org_id,
      })
      .select('id')
      .single()

    if (insertErr) {
      setSaving(false)
      setError(insertErr.message)
      return
    }

    // Fire webhook for candidate.created (non-fatal)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await supabase.functions.invoke('fire-webhooks', {
        body: {
          event: 'candidate.created',
          payload: {
            candidate_id: newCandidate.id,
            candidate_name: form.name,
            source: form.source,
          },
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
    } catch (err) {
      console.warn('Webhook fire failed (non-fatal):', err)
    }

    setSaving(false)
    navigate(`/candidates/${newCandidate.id}`)
  }

  return (
    <div className="page">
      <div style={{ marginBottom: 24 }}>
        <Link to="/candidates" className="btn btn-ghost" style={{ padding: '8px 0', color: 'var(--color-text-secondary)' }}>
          <ArrowLeft size={16} /> Back to Candidates
        </Link>
      </div>


        {/* Header row with Parse PDF button */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 className="page-title" style={{ marginBottom: 8 }}>Add Candidate</h1>
            <p style={{ color: 'var(--color-text-secondary)' }}>Fill in the candidate's details</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <input
              ref={cvFileRef}
              type="file"
              accept=".pdf"
              style={{ display: 'none' }}
              onChange={handleCvFileChange}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => cvFileRef.current?.click()}
              disabled={parsing}
            >
              {parsing
                ? <><div className="spinner" /> Parsing CV...</>
                : <><Upload size={15} /> Parse from PDF</>}
            </button>
            {parsedFile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                <FileText size={13} />
                <span>Pre-filled from <strong>{parsedFile}</strong></span>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--color-text-tertiary)' }}
                  onClick={() => setParsedFile(null)}
                >
                  <X size={13} />
                </button>
              </div>
            )}
          </div>
        </div>

        {error && <div className="error-banner" style={{ marginBottom: 24 }}>{error}</div>}

        <div className="card" style={{ padding: 36 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Row 1 */}
            <div className="grid-2">
              <div className="input-group">
                <label className="input-label">Name <span className="required">*</span></label>
                <input className="input" placeholder="Full name" value={form.name} onChange={set('name')} required />
              </div>
              <div className="input-group">
                <label className="input-label">Email</label>
                <input className="input" type="email" placeholder="Email address" value={form.email} onChange={set('email')} />
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid-2">
              <div className="input-group">
                <label className="input-label">Headline</label>
                <input className="input" placeholder="e.g. Senior Frontend Engineer" value={form.headline} onChange={set('headline')} />
              </div>
              <div className="input-group">
                <label className="input-label">LinkedIn URL</label>
                <input className="input" placeholder="https://linkedin.com/in/..." value={form.linkedin_url} onChange={set('linkedin_url')} />
              </div>
            </div>

            {/* Skills */}
            <div className="input-group">
              <label className="input-label">Skills</label>
              <input className="input" placeholder="React, TypeScript, Node.js, ..." value={form.skills} onChange={set('skills')} />
              <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Separate skills with commas</span>
            </div>

            {/* About */}
            <div className="input-group">
              <label className="input-label">About</label>
              <textarea className="input" rows={4} placeholder="Brief description..." value={form.about} onChange={set('about')} />
            </div>

            {/* Notes */}
            <div className="input-group">
              <label className="input-label">Notes</label>
              <textarea className="input" rows={3} placeholder="Internal notes..." value={form.notes} onChange={set('notes')} />
            </div>

            {/* Source */}
            <div className="input-group">
              <label className="input-label">Source</label>
              <select className="input" value={form.source} onChange={set('source')}>
                <option value="Manual">Manual</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Gmail">Gmail</option>
                <option value="CSV Import">CSV Import</option>
                <option value="Extension">Extension</option>
                <option value="API">API</option>
              </select>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/candidates')}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving || parsing}>
                {saving ? <><div className="spinner" /> Saving...</> : <><Save size={16} /> Save Candidate</>}
              </button>
            </div>
          </form>
        </div>
    </div>
  )
}
