import { useState, useEffect } from 'react'
import { User, Building2, Key, Save, Copy, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'

export default function Settings() {
  const { user, profile } = useAuth()
  const { toast } = useToast()

  const [name, setName] = useState(profile?.name ?? '')
  const [saving, setSaving] = useState(false)
  const [apiKey, setApiKey] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (profile?.name) setName(profile.name)
    loadApiKey()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  async function loadApiKey() {
    if (!profile?.org_id) return
    const { data } = await supabase
      .from('api_keys')
      .select('id, key_prefix, name, created_at, revoked')
      .eq('org_id', profile.org_id)
      .eq('revoked', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setApiKey(data)
  }

  async function handleSaveName() {
    if (!name.trim()) return
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ name: name.trim() })
      .eq('id', user.id)
    setSaving(false)
    if (error) { toast(error.message, 'error'); return }
    toast('Profile updated')
  }

  function handleCopy() {
    if (!apiKey?.key_prefix) return
    navigator.clipboard.writeText(apiKey.key_prefix).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="page page-narrow">
      <div style={{ marginBottom: 32 }}>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account and organization</p>
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
              <input
                className="input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="input-group">
              <label className="input-label">Email</label>
              <input
                className="input"
                value={user?.email ?? ''}
                disabled
                style={{ opacity: 0.5 }}
              />
            </div>
            <div>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleSaveName}
                disabled={saving || !name.trim()}
              >
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
            <input
              className="input"
              value={profile?.org_id ?? '—'}
              disabled
              style={{ opacity: 0.5, fontFamily: 'monospace', fontSize: 12 }}
            />
          </div>
          {profile?.org_id && (
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
              Use this ID when integrating via the REST API.
            </div>
          )}
        </div>

        {/* API Key */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <Key size={16} color="var(--color-text-tertiary)" />
            <h3 style={{ fontWeight: 600 }}>API Key</h3>
          </div>
          {apiKey ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {apiKey.name && (
                <div style={{ fontSize: 13, fontWeight: 500 }}>{apiKey.name}</div>
              )}
              <div className="input-group">
                <label className="input-label">Key prefix</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="input"
                    value={`${apiKey.key_prefix}••••••••••••••••••`}
                    disabled
                    style={{ fontFamily: 'monospace', fontSize: 12 }}
                  />
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleCopy}
                    style={{ flexShrink: 0 }}
                  >
                    {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                  </button>
                </div>
              </div>
              {apiKey.created_at && (
                <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                  Created {new Date(apiKey.created_at).toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              )}
            </div>
          ) : (
            <div style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>
              No API key configured for this organization.
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
