import { useState, useEffect, useRef } from 'react'
import { User, Building2, Key, Save, Copy, Check, Plus, Trash2, RefreshCw, Link, Bell, Globe, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'

const WEBHOOK_EVENTS = [
  { id: 'candidate.created',        label: 'Candidate created' },
  { id: 'candidate.status_changed', label: 'Status changed' },
]

async function generateRawKey() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
  return `wharf_sk_${hex}`
}

async function sha256hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function Settings() {
  const { user, profile } = useAuth()
  const { toast } = useToast()

  // Profile
  const [name, setName]     = useState(profile?.name ?? '')
  const [saving, setSaving] = useState(false)

  // API keys
  const [apiKeys, setApiKeys]           = useState([])
  const [generatingKey, setGenerating]  = useState(false)
  const [newKeyName, setNewKeyName]     = useState('')
  const [revealedKey, setRevealedKey]   = useState(null)
  const [copied, setCopied]             = useState(false)

  // Calendly
  const [calendlyUrl, setCalendlyUrl]       = useState('')
  const [savingCalendly, setSavingCalendly] = useState(false)

  // Slack
  const [slackUrl, setSlackUrl]                       = useState('')
  const [slackEvents, setSlackEvents]                 = useState(['candidate.created', 'candidate.status_changed'])
  const [slackId, setSlackId]                         = useState(null)
  const [savingSlack, setSavingSlack]                 = useState(false)
  const [showSlackUrl, setShowSlackUrl]               = useState(false)
  const [slackSigningSecret, setSlackSigningSecret]   = useState('')
  const [showSigningSecret, setShowSigningSecret]     = useState(false)
  const [savingSigningSecret, setSavingSigningSecret] = useState(false)
  const [copiedSlashUrl, setCopiedSlashUrl]           = useState(false)

  // Generic webhooks
  const [webhooks, setWebhooks]   = useState([])
  const [showAddWh, setShowAddWh] = useState(false)
  const [addingWh, setAddingWh]   = useState(false)
  const [newWh, setNewWh]         = useState({ name: '', url: '', events: ['candidate.created', 'candidate.status_changed'], secret: '' })

  const newKeyInputRef = useRef(null)

  useEffect(() => {
    if (profile?.name)        setName(profile.name)
    if (profile?.calendly_url) setCalendlyUrl(profile.calendly_url)
    loadApiKeys()
    loadWebhooks()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  // ── Loaders ──────────────────────────────────────────────────────────────

  async function loadApiKeys() {
    if (!user?.id) return
    const { data } = await supabase
      .from('api_keys')
      .select('id, key_prefix, name, created_at, revoked')
      .eq('user_id', user.id)
      .eq('revoked', false)
      .order('created_at', { ascending: false })
    setApiKeys(data ?? [])
  }

  async function loadWebhooks() {
    if (!profile?.org_id) return
    const [{ data }, { data: org }] = await Promise.all([
      supabase.from('webhooks').select('id, name, url, type, events, active, created_at').eq('org_id', profile.org_id).order('created_at', { ascending: true }),
      supabase.from('organizations').select('slack_signing_secret').eq('id', profile.org_id).single(),
    ])
    const all = data ?? []
    const slack = all.find(w => w.type === 'slack')
    if (slack) {
      setSlackUrl(slack.url)
      setSlackEvents(slack.events ?? ['candidate.created', 'candidate.status_changed'])
      setSlackId(slack.id)
    }
    setWebhooks(all.filter(w => w.type !== 'slack'))
    if (org?.slack_signing_secret) setSlackSigningSecret(org.slack_signing_secret)
  }

  // ── Profile ───────────────────────────────────────────────────────────────

  async function handleSaveName() {
    if (!name.trim()) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update({ name: name.trim() }).eq('id', user.id)
    setSaving(false)
    if (error) { toast(error.message, 'error'); return }
    toast('Profile updated')
  }

  // ── API Keys ──────────────────────────────────────────────────────────────

  async function handleGenerateKey() {
    if (!newKeyName.trim()) { toast('Enter a key name first', 'error'); return }
    setGenerating(true)
    const raw    = await generateRawKey()
    const hash   = await sha256hex(raw)
    const prefix = raw.slice(0, 20)
    const { data, error } = await supabase.from('api_keys').insert({
      user_id: user.id, org_id: profile.org_id,
      key_hash: hash, key_prefix: prefix, name: newKeyName.trim(),
    }).select('id').single()
    setGenerating(false)
    if (error) { toast(error.message, 'error'); return }
    setRevealedKey({ key: raw, id: data.id })
    setNewKeyName('')
    loadApiKeys()
  }

  async function handleRevokeKey(id) {
    if (!confirm('Revoke this key? Any integrations using it will stop working.')) return
    await supabase.from('api_keys').update({ revoked: true }).eq('id', id)
    toast('Key revoked')
    if (revealedKey?.id === id) setRevealedKey(null)
    loadApiKeys()
  }

  async function copyKey(text) {
    await navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Calendly ──────────────────────────────────────────────────────────────

  async function handleSaveCalendly() {
    setSavingCalendly(true)
    const { error } = await supabase.from('profiles').update({ calendly_url: calendlyUrl.trim() || null }).eq('id', user.id)
    setSavingCalendly(false)
    if (error) { toast(error.message, 'error'); return }
    toast('Scheduling link saved')
  }

  // ── Slack ─────────────────────────────────────────────────────────────────

  async function handleSaveSlack() {
    if (!slackUrl.trim()) {
      if (slackId) {
        await supabase.from('webhooks').delete().eq('id', slackId)
        setSlackId(null)
        toast('Slack integration removed')
      }
      return
    }
    setSavingSlack(true)
    if (slackId) {
      const { error } = await supabase.from('webhooks').update({ url: slackUrl.trim(), events: slackEvents }).eq('id', slackId)
      setSavingSlack(false)
      if (error) { toast(error.message, 'error'); return }
    } else {
      const { data, error } = await supabase.from('webhooks').insert({
        org_id: profile.org_id, name: 'Slack', url: slackUrl.trim(), type: 'slack', events: slackEvents,
      }).select('id').single()
      setSavingSlack(false)
      if (error) { toast(error.message, 'error'); return }
      setSlackId(data.id)
    }
    toast('Slack integration saved')
  }

  function toggleSlackEvent(ev) {
    setSlackEvents(prev => prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev])
  }

  async function handleSaveSigningSecret() {
    if (!profile?.org_id) return
    setSavingSigningSecret(true)
    const { error } = await supabase.from('organizations').update({ slack_signing_secret: slackSigningSecret.trim() || null }).eq('id', profile.org_id)
    setSavingSigningSecret(false)
    if (error) { toast(error.message, 'error'); return }
    toast('Signing secret saved')
  }

  async function copySlashUrl(text) {
    await navigator.clipboard.writeText(text).catch(() => {})
    setCopiedSlashUrl(true)
    setTimeout(() => setCopiedSlashUrl(false), 2000)
  }

  // ── Generic Webhooks ──────────────────────────────────────────────────────

  async function handleAddWebhook() {
    if (!newWh.name.trim() || !newWh.url.trim()) { toast('Name and URL are required', 'error'); return }
    setAddingWh(true)
    const { error } = await supabase.from('webhooks').insert({
      org_id: profile.org_id, name: newWh.name.trim(), url: newWh.url.trim(),
      type: 'generic', events: newWh.events, secret: newWh.secret.trim() || null,
    })
    setAddingWh(false)
    if (error) { toast(error.message, 'error'); return }
    setNewWh({ name: '', url: '', events: ['candidate.created', 'candidate.status_changed'], secret: '' })
    setShowAddWh(false)
    toast('Webhook added')
    loadWebhooks()
  }

  async function handleToggleWebhook(id, active) {
    const { error } = await supabase.from('webhooks').update({ active: !active }).eq('id', id)
    if (error) { toast(error.message, 'error'); return }
    loadWebhooks()
  }

  async function handleDeleteWebhook(id) {
    if (!confirm('Delete this webhook?')) return
    const { error } = await supabase.from('webhooks').delete().eq('id', id)
    if (error) { toast(error.message, 'error'); return }
    toast('Webhook deleted')
    loadWebhooks()
  }

  function toggleWhEvent(ev) {
    setNewWh(prev => ({ ...prev, events: prev.events.includes(ev) ? prev.events.filter(e => e !== ev) : [...prev.events, ev] }))
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="page page-narrow">
      <div style={{ marginBottom: 32 }}>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account, integrations, and automations</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Profile */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <User size={16} color="var(--color-text-tertiary)" />
            <h3 style={{ fontWeight: 600 }}>Profile</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="input-group">
              <label className="input-label">Name</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="input-group">
              <label className="input-label">Email</label>
              <input className="input" value={user?.email ?? ''} disabled style={{ opacity: 0.5 }} />
            </div>
            <div>
              <button className="btn btn-primary btn-sm" onClick={handleSaveName} disabled={saving || !name.trim()}>
                {saving ? <><div className="spinner" /> Saving…</> : <><Save size={14} /> Save Profile</>}
              </button>
            </div>
          </div>
        </div>

        {/* Organization */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <Building2 size={16} color="var(--color-text-tertiary)" />
            <h3 style={{ fontWeight: 600 }}>Organization</h3>
          </div>
          <div className="input-group">
            <label className="input-label">Organization ID</label>
            <input className="input" value={profile?.org_id ?? '—'} disabled style={{ opacity: 0.5, fontFamily: 'monospace', fontSize: 12 }} />
          </div>
          {profile?.org_id && (
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
              Use this ID when integrating via the REST API.
            </div>
          )}
        </div>

        {/* API Keys */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <Key size={16} color="var(--color-text-tertiary)" />
            <h3 style={{ fontWeight: 600 }}>API Keys</h3>
          </div>

          {revealedKey && (
            <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>⚠️ Copy this key now — it won't be shown again</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" value={revealedKey.key} readOnly style={{ fontFamily: 'monospace', fontSize: 11, flex: 1 }} />
                <button className="btn btn-secondary btn-sm" onClick={() => copyKey(revealedKey.key)} style={{ flexShrink: 0 }}>
                  {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setRevealedKey(null)} style={{ flexShrink: 0 }}>Dismiss</button>
              </div>
            </div>
          )}

          {apiKeys.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {apiKeys.map(k => (
                <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{k.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontFamily: 'monospace' }}>{k.key_prefix}••••••••</div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                    {new Date(k.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={() => handleRevokeKey(k.id)}>
                    <Trash2 size={12} /> Revoke
                  </button>
                </div>
              ))}
            </div>
          )}

          {apiKeys.length === 0 && !revealedKey && (
            <div style={{ color: 'var(--color-text-tertiary)', fontSize: 13, marginBottom: 16 }}>
              No active API keys. Generate one to authenticate with cv-enrich and extension-capture.
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              ref={newKeyInputRef}
              className="input"
              placeholder="Key name (e.g. Production)"
              value={newKeyName}
              onChange={e => setNewKeyName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGenerateKey()}
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary btn-sm" onClick={handleGenerateKey} disabled={generatingKey || !newKeyName.trim()} style={{ flexShrink: 0 }}>
              {generatingKey ? <><div className="spinner" /> Generating…</> : <><Plus size={14} /> Generate Key</>}
            </button>
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            Keys use the <code style={{ fontFamily: 'monospace' }}>wharf_sk_</code> prefix.
          </div>
        </div>

        {/* Calendly */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Link size={16} color="var(--color-text-tertiary)" />
            <h3 style={{ fontWeight: 600 }}>Scheduling Link</h3>
          </div>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
            Your Calendly (or any scheduling) link — auto-fills <code style={{ fontFamily: 'monospace', fontSize: 12 }}>{'{scheduling_link}'}</code> in email templates.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input"
              placeholder="https://calendly.com/your-name/30min"
              value={calendlyUrl}
              onChange={e => setCalendlyUrl(e.target.value)}
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary btn-sm" onClick={handleSaveCalendly} disabled={savingCalendly} style={{ flexShrink: 0 }}>
              {savingCalendly ? <><div className="spinner" /> Saving…</> : <><Save size={14} /> Save</>}
            </button>
          </div>
        </div>

        {/* Slack */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Bell size={16} color="var(--color-text-tertiary)" />
            <h3 style={{ fontWeight: 600 }}>Slack Notifications</h3>
          </div>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
            Paste a{' '}
            <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)' }}>
              Slack Incoming Webhook URL
            </a>{' '}
            to receive notifications in a channel.
          </p>
          <div className="input-group" style={{ marginBottom: 14 }}>
            <label className="input-label">Slack Webhook URL</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input"
                type={showSlackUrl ? 'text' : 'password'}
                placeholder="https://hooks.slack.com/services/..."
                value={slackUrl}
                onChange={e => setSlackUrl(e.target.value)}
                style={{ flex: 1 }}
              />
              <button className="btn btn-ghost btn-sm" onClick={() => setShowSlackUrl(v => !v)} style={{ flexShrink: 0 }}>
                {showSlackUrl ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div className="input-label" style={{ marginBottom: 8 }}>Notify on</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {WEBHOOK_EVENTS.map(ev => (
                <label key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={slackEvents.includes(ev.id)} onChange={() => toggleSlackEvent(ev.id)} style={{ accentColor: 'var(--color-accent)', width: 14, height: 14 }} />
                  {ev.label}
                </label>
              ))}
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleSaveSlack} disabled={savingSlack}>
            {savingSlack ? <><div className="spinner" /> Saving…</> : <><Save size={14} /> Save Slack Config</>}
          </button>
          {slackId && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--color-text-tertiary)' }}>✓ Slack integration active</div>}

          {/* Slash Commands subsection */}
          <div style={{ marginTop: 28, paddingTop: 24, borderTop: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>Slash Commands</span>
              <span style={{ fontSize: 11, background: 'var(--color-bg-elevated)', color: 'var(--color-text-tertiary)', padding: '1px 8px', borderRadius: 100 }}>beta</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
              Enable <code style={{ fontFamily: 'monospace', fontSize: 12 }}>/wharf</code> commands in Slack to query your pipeline, search candidates, and add new ones from any channel.
            </p>

            {/* Signing secret */}
            <div className="input-group" style={{ marginBottom: 14 }}>
              <label className="input-label">Slack Signing Secret</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="input"
                  type={showSigningSecret ? 'text' : 'password'}
                  placeholder="Paste from Slack App → Basic Information"
                  value={slackSigningSecret}
                  onChange={e => setSlackSigningSecret(e.target.value)}
                  style={{ flex: 1, fontFamily: slackSigningSecret ? 'monospace' : undefined, fontSize: slackSigningSecret ? 12 : undefined }}
                />
                <button className="btn btn-ghost btn-sm" onClick={() => setShowSigningSecret(v => !v)} style={{ flexShrink: 0 }}>
                  {showSigningSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={handleSaveSigningSecret} disabled={savingSigningSecret} style={{ marginBottom: 16 }}>
              {savingSigningSecret ? <><div className="spinner" /> Saving…</> : <><Save size={14} /> Save Secret</>}
            </button>

            {/* Slash command URL */}
            {profile?.org_id && (
              <div className="input-group" style={{ marginBottom: 16 }}>
                <label className="input-label">Your Slash Command URL</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="input"
                    readOnly
                    value={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/slack-slash?org=${profile.org_id}`}
                    style={{ flex: 1, fontFamily: 'monospace', fontSize: 11 }}
                  />
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => copySlashUrl(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/slack-slash?org=${profile.org_id}`)}
                    style={{ flexShrink: 0 }}
                  >
                    {copiedSlashUrl ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                  </button>
                </div>
              </div>
            )}

            {/* Setup steps */}
            <div style={{ background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Setup steps</div>
              <ol style={{ fontSize: 13, color: 'var(--color-text-secondary)', paddingLeft: 18, lineHeight: 1.8, margin: 0 }}>
                <li>Go to <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)' }}>api.slack.com/apps</a> → create or open your Wharf app</li>
                <li>Under <strong>Slash Commands</strong>, create <code style={{ fontFamily: 'monospace' }}>/wharf</code> and paste the URL above</li>
                <li>Under <strong>Interactivity &amp; Shortcuts</strong>, enable it and paste the <em>same URL</em> as the Request URL — this powers the Hire/Pass buttons</li>
                <li>Copy the <strong>Signing Secret</strong> from Basic Information and paste it above</li>
                <li>Install the app to your workspace — done!</li>
              </ol>
              <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 12 }}>
                <strong>Slash commands:</strong> <code style={{ fontFamily: 'monospace' }}>/wharf pipeline</code> · <code style={{ fontFamily: 'monospace' }}>/wharf search [name]</code> · <code style={{ fontFamily: 'monospace' }}>/wharf add [name] [email]</code>
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 6 }}>
                <strong>Interactive buttons:</strong> when a candidate moves to <em>Interviewing</em>, Wharf posts a Slack card with ✅ Hire · ⏭ Keep · ❌ Pass buttons your team can click to update status without opening the app.
              </div>
            </div>
          </div>
        </div>

        {/* Webhooks */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Globe size={16} color="var(--color-text-tertiary)" />
              <h3 style={{ fontWeight: 600 }}>Webhooks</h3>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowAddWh(v => !v)}>
              <Plus size={14} /> Add Webhook
            </button>
          </div>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
            POST to any URL on candidate events. Works with Zapier, Make, or your own system.
          </p>

          {webhooks.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: showAddWh ? 16 : 0 }}>
              {webhooks.map(wh => (
                <div key={wh.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{wh.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wh.url}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>{(wh.events ?? []).join(', ')}</div>
                  </div>
                  <button className={`btn btn-sm ${wh.active ? 'btn-secondary' : 'btn-ghost'}`} onClick={() => handleToggleWebhook(wh.id, wh.active)}>
                    <RefreshCw size={12} /> {wh.active ? 'Active' : 'Paused'}
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteWebhook(wh.id)}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {webhooks.length === 0 && !showAddWh && (
            <div style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>No webhooks configured yet.</div>
          )}

          {showAddWh && (
            <div style={{ background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-md)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12, marginTop: webhooks.length > 0 ? 0 : 0 }}>
              <div className="grid-2">
                <div className="input-group">
                  <label className="input-label">Name</label>
                  <input className="input" placeholder="Zapier trigger" value={newWh.name} onChange={e => setNewWh(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="input-group">
                  <label className="input-label">URL</label>
                  <input className="input" placeholder="https://hooks.zapier.com/..." value={newWh.url} onChange={e => setNewWh(p => ({ ...p, url: e.target.value }))} />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Signing Secret (optional)</label>
                <input className="input" type="password" placeholder="Used to verify X-Wharf-Signature header" value={newWh.secret} onChange={e => setNewWh(p => ({ ...p, secret: e.target.value }))} />
              </div>
              <div>
                <div className="input-label" style={{ marginBottom: 8 }}>Events</div>
                <div style={{ display: 'flex', gap: 16 }}>
                  {WEBHOOK_EVENTS.map(ev => (
                    <label key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                      <input type="checkbox" checked={newWh.events.includes(ev.id)} onChange={() => toggleWhEvent(ev.id)} style={{ accentColor: 'var(--color-accent)', width: 14, height: 14 }} />
                      {ev.label}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={handleAddWebhook} disabled={addingWh}>
                  {addingWh ? <><div className="spinner" /> Adding…</> : <><Plus size={14} /> Add Webhook</>}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowAddWh(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
