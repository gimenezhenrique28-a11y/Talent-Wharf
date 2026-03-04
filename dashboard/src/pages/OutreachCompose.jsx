import { useState, useEffect, useRef } from 'react'
import { Search, X, Send, Eye, CalendarPlus, UserPlus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { generateICS, parseDateTime } from '../lib/ics.js'
import { useToast } from '../contexts/ToastContext.jsx'

/* ── Hardcoded templates (mirror of edge function) ─────────────────────────── */
const TEMPLATES = {
  '': { name: 'Custom Email (blank)', subject: '', body: '' },
  initial_outreach: {
    name: 'Initial Outreach',
    subject: 'Exciting Opportunity — {position} at {company}',
    body: `Hi {name},\n\nI came across your profile and think you'd be a great fit for the {position} role at {company}.\n\nWould you be open to a quick call to learn more? {scheduling_link}\n\nBest regards,\nThe {company} Team`,
    vars: ['company', 'position', 'scheduling_link'],
  },
  follow_up: {
    name: 'Follow Up',
    subject: 'Following Up — {position} at {company}',
    body: `Hi {name},\n\nI wanted to follow up regarding the {position} opportunity at {company}.\n\nWe were impressed with your profile and would love to continue the conversation.\n\nAre you still interested? Feel free to reply to this email.\n\nBest regards,\nThe {company} Team`,
    vars: ['company', 'position', 'scheduling_link'],
  },
  interview_invite: {
    name: 'Interview Invitation',
    subject: 'Interview Invitation — {position} at {company}',
    body: `Hi {name},\n\nWe'd love to invite you to interview for the {position} role at {company}.\n\n📅 Date: {date}\n⏰ Time: {time}\n📍 Location: {location}\n💻 Format: {format}\n⏱ Duration: {duration}\n\nPlease reply to confirm your availability or book a time directly: {scheduling_link}\n\nBest regards,\nThe {company} Team`,
    vars: ['company', 'position', 'date', 'time', 'location', 'format', 'duration', 'scheduling_link'],
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

export default function OutreachCompose() {
  const { toast } = useToast()

  /* ── Recipient state ── */
  const [query, setQuery]           = useState('')
  const [suggestions, setSuggs]     = useState([])
  const [searching, setSearching]   = useState(false)
  const [recipients, setRecipients] = useState([]) // [{id, name, email}]
  const inputRef = useRef(null)
  const dropRef  = useRef(null)

  /* ── Compose state ── */
  const [templateId, setTemplateId] = useState('')
  const [subject, setSubject]       = useState('')
  const [body, setBody]             = useState('')
  const [vars, setVars]             = useState({})
  const [preview, setPreview]       = useState(false)
  const [sending, setSending]       = useState(false)
  const [error, setError]           = useState('')
  const [successCount, setSuccess]  = useState(null)

  const tpl = TEMPLATES[templateId]

  /* ── Load scheduling link from profile ── */
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles').select('calendly_url').eq('id', user.id).single()
      if (profile?.calendly_url) setVars(p => ({ scheduling_link: profile.calendly_url, ...p }))
    }
    load()
  }, [])

  /* ── Candidate search ── */
  useEffect(() => {
    if (!query || query.length < 2) { setSuggs([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      const { data } = await supabase
        .from('candidates')
        .select('id, name, email')
        .ilike('name', `%${query}%`)
        .limit(8)
      setSuggs((data ?? []).filter(c => !recipients.find(r => r.id === c.id)))
      setSearching(false)
    }, 220)
    return () => clearTimeout(t)
  }, [query, recipients])

  /* ── Close dropdown on outside click ── */
  useEffect(() => {
    function onDown(e) {
      if (!dropRef.current?.contains(e.target) && !inputRef.current?.contains(e.target)) {
        setSuggs([])
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  function addRecipient(c) {
    setRecipients(prev => [...prev, c])
    setQuery('')
    setSuggs([])
    inputRef.current?.focus()
  }

  function removeRecipient(id) {
    setRecipients(prev => prev.filter(c => c.id !== id))
  }

  /* ── Template switch ── */
  useEffect(() => {
    if (tpl) {
      setSubject(tpl.subject)
      setBody(tpl.body)
      setVars(p => p.scheduling_link ? { scheduling_link: p.scheduling_link } : {})
    }
  }, [templateId])

  function substituteVars(text) {
    return text.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`)
  }

  function handleDownloadICS() {
    const dtstart = parseDateTime(vars.date ?? '', vars.time ?? '')
    if (!dtstart) { alert('Fill in the date and time variables first.'); return }
    const dur = parseInt(vars.duration ?? '60')
    const dtend = new Date(dtstart.getTime() + (isNaN(dur) ? 60 : dur) * 60000)
    generateICS({
      summary:     `${vars.position ?? 'Interview'}${vars.company ? ' at ' + vars.company : ''}`,
      description: substituteVars(body),
      location:    vars.location ?? '',
      dtstart, dtend,
    })
  }

  async function handleSend() {
    if (!subject.trim() || !body.trim()) return
    if (recipients.length === 0) { setError('Add at least one recipient.'); return }
    setSending(true)
    setError('')

    const { data: { session } } = await supabase.auth.getSession()
    const res = await supabase.functions.invoke('send-email', {
      body: {
        candidate_ids: recipients.map(r => r.id),
        subject,
        body,
        template_id: templateId || undefined,
        variables: vars,
      },
      headers: { Authorization: `Bearer ${session.access_token}` },
    })

    setSending(false)
    if (res.error) { setError(res.error.message); return }

    const { sent } = res.data ?? {}
    setSuccess(sent ?? recipients.length)
    toast(`Sent to ${sent ?? recipients.length} candidate${(sent ?? recipients.length) !== 1 ? 's' : ''}`)
    setRecipients([])
    setSubject('')
    setBody('')
    setTemplateId('')
    setVars({})
    setPreview(false)
  }

  return (
    <div className="page">
      <div style={{ marginBottom: 28 }}>
        <h1 className="page-title">Compose</h1>
        <p className="page-subtitle">Send emails to one or more candidates</p>
      </div>


        {successCount !== null && (
          <div className="success-banner" style={{ marginBottom: 20 }}>
            ✓ Email sent to {successCount} candidate{successCount !== 1 ? 's' : ''} successfully.
          </div>
        )}

        {error && <div className="error-banner" style={{ marginBottom: 20 }}>{error}</div>}

        <div className="card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── To field ── */}
          <div className="input-group">
            <label className="input-label">To</label>
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-bg-elevated)',
              padding: '6px 10px',
              minHeight: 42,
              cursor: 'text',
            }} onClick={() => inputRef.current?.focus()}>
              {recipients.map(r => (
                <div key={r.id} style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'var(--color-bg-raised)',
                  border: '1px solid var(--color-border-strong)',
                  borderRadius: 100,
                  padding: '2px 8px 2px 10px',
                  fontSize: 12, fontWeight: 500,
                  color: 'var(--color-text-primary)',
                  flexShrink: 0,
                }}>
                  <span>{r.name}</span>
                  {!r.email && (
                    <span style={{ fontSize: 10, color: 'var(--color-danger)', marginLeft: 2 }}>no email</span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeRecipient(r.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--color-text-tertiary)', lineHeight: 0 }}
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
              <div style={{ position: 'relative', flex: '1 1 160px', minWidth: 120 }}>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder={recipients.length === 0 ? 'Search candidates…' : ''}
                  style={{
                    background: 'none', border: 'none', outline: 'none',
                    color: 'var(--color-text-primary)', fontSize: 13,
                    width: '100%', padding: '2px 0',
                  }}
                />
                {/* Dropdown */}
                {(suggestions.length > 0 || searching) && (
                  <div ref={dropRef} style={{
                    position: 'absolute', top: 'calc(100% + 6px)', left: -10,
                    width: 300, zIndex: 200,
                    background: 'var(--color-bg-raised)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    overflow: 'hidden',
                  }}>
                    {searching && (
                      <div style={{ padding: '10px 14px', fontSize: 13, color: 'var(--color-text-tertiary)', display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div className="spinner" /> Searching…
                      </div>
                    )}
                    {suggestions.map(c => (
                      <div
                        key={c.id}
                        onClick={() => addCandidate(c)}
                        style={{
                          padding: '9px 14px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 10,
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-elevated)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <UserPlus size={13} color="var(--color-text-tertiary)" />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{c.email ?? 'No email'}</div>
                        </div>
                      </div>
                    ))}
                    {!searching && suggestions.length === 0 && query.length >= 2 && (
                      <div style={{ padding: '10px 14px', fontSize: 13, color: 'var(--color-text-tertiary)' }}>No candidates found</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            {recipients.length > 0 && (
              <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                {recipients.length} recipient{recipients.length !== 1 ? 's' : ''}
                {recipients.filter(r => !r.email).length > 0 && (
                  <span style={{ color: 'var(--color-warning)', marginLeft: 8 }}>
                    ({recipients.filter(r => !r.email).length} missing email — will be skipped)
                  </span>
                )}
              </span>
            )}
          </div>

          {/* ── Template ── */}
          <div className="input-group">
            <label className="input-label">Template</label>
            <select className="input" value={templateId} onChange={e => setTemplateId(e.target.value)}>
              {Object.entries(TEMPLATES).map(([id, t]) => <option key={id} value={id}>{t.name}</option>)}
            </select>
          </div>

          {/* ── Template vars ── */}
          {tpl?.vars?.length > 0 && (
            <div>
              <div className="input-label" style={{ marginBottom: 10 }}>Template Variables</div>
              <div className="grid-2">
                {tpl.vars.map(v => (
                  <div key={v} className="input-group">
                    <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {v.replace(/_/g, ' ')}
                      {v === 'scheduling_link' && vars.scheduling_link && (
                        <span style={{ fontSize: 10, background: 'rgba(99,102,241,0.15)', color: '#818cf8', padding: '1px 7px', borderRadius: 100, fontWeight: 600 }}>auto-filled</span>
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

          {/* ── Subject ── */}
          <div className="input-group">
            <label className="input-label">Subject</label>
            <input className="input" placeholder="Email subject" value={subject} onChange={e => setSubject(e.target.value)} />
          </div>

          {/* ── Body ── */}
          <div className="input-group">
            <label className="input-label">Message</label>
            <textarea
              className="input"
              rows={12}
              style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.7 }}
              placeholder="Write your email…"
              value={body}
              onChange={e => setBody(e.target.value)}
            />
            <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
              Use <code style={{ background: 'var(--color-bg-elevated)', padding: '1px 5px', borderRadius: 4 }}>{'{name}'}</code> for candidate name
            </span>
          </div>

          {/* ── Preview toggle ── */}
          <button className="btn btn-ghost btn-sm" onClick={() => setPreview(p => !p)} style={{ alignSelf: 'flex-start' }}>
            <Eye size={14} /> {preview ? 'Hide Preview' : 'Show Preview'}
          </button>

          {preview && (
            <div style={{
              background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-md)',
              padding: '16px 20px', fontSize: 14, color: 'var(--color-text-secondary)',
              whiteSpace: 'pre-wrap', lineHeight: 1.7,
              border: '1px solid var(--color-border)',
            }}>
              <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 12 }}>{substituteVars(subject)}</div>
              {substituteVars(body)}
            </div>
          )}

          {/* ── Actions ── */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 4, flexWrap: 'wrap' }}>
            {templateId === 'interview_invite' && (
              <button className="btn btn-secondary" onClick={handleDownloadICS} title={!vars.date ? 'Fill in date and time first' : 'Download calendar invite'}>
                <CalendarPlus size={15} /> Download .ics
              </button>
            )}
            <button
              className="btn btn-primary"
              onClick={handleSend}
              disabled={sending || !subject.trim() || !body.trim() || recipients.length === 0}
            >
              {sending ? <><div className="spinner" /> Sending…</> : <><Send size={15} /> Send to {recipients.length > 0 ? recipients.length : '…'}</>}
            </button>
          </div>

        </div>
    </div>
  )

  function addCandidate(c) {
    if (!recipients.find(r => r.id === c.id)) setRecipients(prev => [...prev, c])
    setQuery('')
    setSuggs([])
    inputRef.current?.focus()
  }
}
