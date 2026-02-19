import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function CandidateForm() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '', email: '', headline: '', linkedin_url: '',
    skills: '', about: '', notes: '', source: 'Manual',
  })

  function set(field) {
    return e => setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const skillsArray = form.skills
      ? form.skills.split(',').map(s => s.trim()).filter(Boolean)
      : []

    const { error } = await supabase.from('candidates').insert({
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

    setSaving(false)
    if (error) setError(error.message)
    else navigate('/candidates')
  }

  return (
    <div className="page">
      <div style={{ marginBottom: 24 }}>
        <Link to="/candidates" className="btn btn-ghost" style={{ padding: '8px 0', color: 'var(--color-text-secondary)' }}>
          <ArrowLeft size={16} /> Back to Candidates
        </Link>
      </div>

      <div style={{ maxWidth: 800 }}>
        <h2 className="page-title" style={{ marginBottom: 8 }}>Add Candidate</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 32 }}>Fill in the candidate's details</p>

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
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <><div className="spinner" /> Saving...</> : <><Save size={16} /> Save Candidate</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
