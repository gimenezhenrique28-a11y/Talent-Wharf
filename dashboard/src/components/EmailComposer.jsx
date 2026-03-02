import { useState, useEffect } from 'react'
import { X, Send, Eye, Mail, CalendarPlus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { generateICS, parseDateTime } from '../lib/ics.js'

const TEMPLATES = {
  '': { name: 'Custom Email (blank)', subject: '', body: '' },
  interview_invite: {
    name: 'Interview Invitation',
    subject: 'Interview Invitation — {position} at {company}',
    body: `Hi {name},\n\nWe'd love to invite you to interview for the {position} role at {company}.\n\n📅 Date: {date}\n⏰ Time: {time}\n📍 Location: {location}\n💻 Format: {format}\n⏱ Duration: {duration}\n\nPlease reply to confirm your availability or book a time directly: {scheduling_link}\n\nBest regards,\nThe {company} Team`,
    vars: ['company', 'position', 'date', 'time', 'location', 'format', 'duration', 'scheduling_link'],
  },
  follow_up: {
    name: 'Follow Up',
    subject: 'Following Up — {position} at {company}',
    body: `Hi {name},\n\nI wanted to follow up regarding the {position} opportunity at {company}.\n\nWe were impressed with your profile and would love to continue the conversation.\n\nAre you still interested? If so, feel free to book a time: {scheduling_link}\n\nBest regards,\nThe {company} Team`,
    vars: ['company', 'position', 'scheduling_link'],
  },
  initial_outreach: {
    name: 'Initial Outreach',
    subject: 'Exciting Opportunity — {position} at {company}',
    body: `Hi {name},\n\nI came across your profile and think you'd be a great fit for the {position} role at {company}.\n\nWould you be open to a quick call to learn more? {scheduling_link}\n\nBest regards,\nThe {company} Team`,
    vars: ['company', 'position', 'scheduling_link'],
  },
  rejection: {
    name: 'Rejection Notice',
    subject: 'Update on Your Application — {company}',
    body: `Hi {name},\n\nThank you for your interest in the {position} role at {company}.\n\nAfter careful consideration, we've decided to move forward with other candidates.\n\nWe appreciate your time and wish you the best.\n\nBest regards,\nThe {company} Team`,
    vars: ['company', 'position'],
  },
  offer: {
    name: 'Job Offer',
    subject: 'Job Offer — {position} at {company}',
    body: `Hi {name},\n\nWe're thrilled to offer you the {position} position at {company}!\n\n💰 Compensation: {salary}\n🎁 Benefits: {benefits}\n📅 Start Date: {start_date}\n\nWe look forward to welcoming you to the team!\n\nBest regards,\nThe {company} Team`,
    vars: ['company', 'position', 'salary', 'benefits', 'start_date'],
  },
}

export default function EmailComposer({ candidateIds, onClose, onSent }) {
  const [templateId, setTemplateId] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [vars, setVars] = useState({})
  const [preview, setPreview] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const tpl = TEMPLATES[templateId]

  function handleDownloadICS() {
    const date = vars.date ?? ''
    const time = vars.time ?? ''
    const dtstart = parseDateTime(date, time)
    if (!dtstart) {
      alert('Fill in the date and time variables first to download an invite.')
      return
    }
    const durationMin = vars.duration ? parseInt(vars.duration) : 60
    const dtend = new Date(dtstart.getTime() + (isNaN(durationMin) ? 60 : durationMin) * 60000)
    const position = vars.position ?? 'Interview'
    const company  = vars.company  ?? ''
    generateICS({
      summary:  `${position}${company ? ' at ' + company : ''}`,
      description: substituteVars(body),
      location: vars.location ?? '',
      dtstart,
      dtend,
    })
  }

  // ── Load scheduling link from profile on mount ────────────────────────────
  useEffect(() => {
    async function loadSchedulingLink() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('calendly_url')
        .eq('id', user.id)
        .single()
      if (profile?.calendly_url) {
        setVars(p => ({ scheduling_link: profile.calendly_url, ...p }))
      }
    }
    loadSchedulingLink()
  }, [])

  useEffect(() => {
    if (tpl) {
      setSubject(tpl.subject)
      setBody(tpl.body)
      // Keep scheduling_link when switching templates
      setVars(p => {
        const keepLink = p.scheduling_link ? { scheduling_link: p.scheduling_link } : {}
        return keepLink
      })
    }
  }, [templateId])

  function substituteVars(text) {
    return text.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`)
  }

  async function handleSend() {
    if (!subject.trim() || !body.trim()) return
    setSending(true)
    setError('')

    const { data: { session } } = await supabase.auth.getSession()
    const res = await supabase.functions.invoke('send-email', {
      body: {
        candidate_ids: candidateIds,
        subject,
        body,
        template_id: templateId || undefined,
        variables: vars,
      },
      headers: { Authorization: `Bearer ${session.access_token}` },
    })

    setSending(false)
    if (res.error) { setError(res.error.message); return }
    onSent?.()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 680,
        maxHeight: '90vh',
        background: 'var(--color-bg-raised)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '20px 24px', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Mail size={18} color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Send Email</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>To {candidateIds.length} candidate{candidateIds.length !== 1 ? 's' : ''}</div>
          </div>
          <button className="btn btn-ghost" style={{ padding: 8 }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && <div className="error-banner">{error}</div>}

          {/* Template */}
          <div className="input-group">
            <label className="input-label">Template</label>
            <select className="input" value={templateId} onChange={e => setTemplateId(e.target.value)}>
              {Object.entries(TEMPLATES).map(([id, t]) => <option key={id} value={id}>{t.name}</option>)}
            </select>
          </div>

          {/* Template vars */}
          {tpl?.vars?.length > 0 && (
            <div>
              <div className="input-label" style={{ marginBottom: 10 }}>Template Variables</div>
              <div className="grid-2">
                {tpl.vars.map(v => (
                  <div key={v} className="input-group">
                    <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {v.replace(/_/g, ' ')}
                      {v === 'scheduling_link' && vars.scheduling_link && (
                        <span style={{ fontSize: 10, background: 'var(--color-accent-subtle)', color: 'var(--color-accent)', padding: '1px 7px', borderRadius: 100, fontWeight: 600 }}>
                          auto-filled
                        </span>
                      )}
                    </label>
                    <input
                      className="input"
                      placeholder={v === 'scheduling_link' ? 'https://calendly.com/...' : `{${v}}`}
                      value={vars[v] ?? ''}
                      onChange={e => setVars(p => ({ ...p, [v]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subject */}
          <div className="input-group">
            <label className="input-label">Subject</label>
            <input className="input" placeholder="Email subject" value={subject} onChange={e => setSubject(e.target.value)} />
          </div>

          {/* Body */}
          <div className="input-group">
            <label className="input-label">Message</label>
            <textarea
              className="input"
              rows={12}
              style={{ resize: 'vertical' }}
              placeholder="Write your email..."
              value={body}
              onChange={e => setBody(e.target.value)}
            />
            <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
              Use <code style={{ background: 'var(--color-bg-elevated)', padding: '1px 5px', borderRadius: 4 }}>{'{name}'}</code> for candidate name,{' '}
              <code style={{ background: 'var(--color-bg-elevated)', padding: '1px 5px', borderRadius: 4 }}>{'{scheduling_link}'}</code> for your Calendly/scheduling URL
            </span>
          </div>

          {/* Preview toggle */}
          <button className="btn btn-ghost btn-sm" onClick={() => setPreview(p => !p)} style={{ alignSelf: 'flex-start', gap: 6 }}>
            <Eye size={14} /> {preview ? 'Hide Preview' : 'Show Preview'}
          </button>

          {preview && (
            <div style={{ background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-md)', padding: '16px 20px', fontSize: 14, color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
              <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 12 }}>{substituteVars(subject)}</div>
              {substituteVars(body)}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', padding: '16px 24px', borderTop: '1px solid var(--color-border)', flexShrink: 0, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          {templateId === 'interview_invite' && (
            <button
              className="btn btn-secondary"
              onClick={handleDownloadICS}
              title={!vars.date ? 'Fill in date and time first' : 'Download calendar invite'}
            >
              <CalendarPlus size={15} /> Download .ics
            </button>
          )}
          <button className="btn btn-primary" onClick={handleSend} disabled={sending || !subject.trim() || !body.trim()}>
            {sending ? <><div className="spinner" /> Sending...</> : <><Send size={15} /> Send Email</>}
          </button>
        </div>
      </div>
    </div>
  )
}
