import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Download, Upload, CheckCircle, XCircle, AlertCircle, ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext.jsx'

const CSV_TEMPLATE = `name,email,headline,linkedin_url,skills,about,source,notes
John Doe,john@example.com,Senior Engineer,https://linkedin.com/in/johndoe,"React,Node.js,TypeScript",Experienced full-stack developer,LinkedIn,Great candidate`

export default function CandidatesImport() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const fileRef = useRef(null)
  const [file, setFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [errors, setErrors] = useState([])

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'talentwharf-template.csv'
    a.click(); URL.revokeObjectURL(url)
  }

  function parseCSV(text) {
    const lines = text.trim().split('\n')
    if (lines.length < 2) return []
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    return lines.slice(1).map(line => {
      const values = []
      let inQuote = false, current = ''
      for (const char of line) {
        if (char === '"') { inQuote = !inQuote }
        else if (char === ',' && !inQuote) { values.push(current.trim()); current = '' }
        else current += char
      }
      values.push(current.trim())
      return Object.fromEntries(headers.map((h, i) => [h, (values[i] ?? '').replace(/^"|"$/g, '')]))
    })
  }

  async function handleImport() {
    if (!file) return
    setImporting(true)
    setResult(null)
    setErrors([])

    const text = await file.text()
    const rows = parseCSV(text)

    let success = 0, failed = 0, duplicates = 0
    const errs = []

    for (const row of rows) {
      if (!row.name?.trim()) { failed++; errs.push(`Row skipped: missing name`); continue }

      const skills = row.skills ? row.skills.split(',').map(s => s.trim()).filter(Boolean) : []

      const { error } = await supabase.from('candidates').upsert({
        name: row.name.trim(),
        email: row.email?.trim() || null,
        headline: row.headline?.trim() || null,
        linkedin_url: row.linkedin_url?.trim() || null,
        skills,
        about: row.about?.trim() || null,
        notes: row.notes?.trim() || null,
        source: row.source?.trim() || 'CSV Import',
        org_id: profile?.org_id,
        status: 'new',
      }, { onConflict: 'email,org_id', ignoreDuplicates: false })

      if (error) {
        if (error.code === '23505') { duplicates++ }
        else { failed++; errs.push(`${row.name}: ${error.message}`) }
      } else {
        success++
      }
    }

    setImporting(false)
    setResult({ success, failed, duplicates })
    setErrors(errs)
  }

  return (
    <div className="page">
      <div style={{ marginBottom: 24 }}>
        <Link to="/candidates" className="btn btn-ghost" style={{ padding: '8px 0', color: 'var(--color-text-secondary)' }}>
          <ArrowLeft size={16} /> Back to Candidates
        </Link>
      </div>

      <div className="page-header">
        <div>
          <h2 className="page-title">Import Candidates</h2>
          <p className="page-subtitle">Upload a CSV file to import candidates in bulk</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Template download */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 12, flexShrink: 0,
              background: 'var(--color-accent-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Download size={24} color="var(--color-accent)" />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontWeight: 600, marginBottom: 8 }}>Download CSV Template</h3>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                  <strong style={{ color: 'var(--color-text-primary)' }}>Required:</strong> name, email
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  <strong style={{ color: 'var(--color-text-primary)' }}>Optional:</strong> headline, linkedin_url, skills, about, source, notes
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={downloadTemplate}>
                <Download size={14} /> Download Template
              </button>
            </div>
          </div>
        </div>

        {/* File upload */}
        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Upload Your CSV File</h3>
          <div
            style={{
              border: '2px dashed var(--color-border-strong)',
              borderRadius: 'var(--radius-lg)',
              padding: '40px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'border-color 0.15s',
            }}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.name.endsWith('.csv')) setFile(f) }}
          >
            {file ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <CheckCircle size={20} color="var(--color-success)" />
                <span style={{ fontWeight: 600 }}>{file.name}</span>
                <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            ) : (
              <>
                <Upload size={28} color="var(--color-text-tertiary)" style={{ marginBottom: 12 }} />
                <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>Drop your CSV here or click to browse</p>
                <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Only .csv files accepted</p>
              </>
            )}
          </div>

          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
            onChange={e => setFile(e.target.files?.[0] ?? null)} />

          {file && (
            <button className="btn btn-primary btn-full" style={{ marginTop: 16 }} onClick={handleImport} disabled={importing}>
              {importing ? <><div className="spinner" /> Importing...</> : <><Upload size={16} /> Import Candidates</>}
            </button>
          )}
        </div>

        {/* Results */}
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="import-results-grid">
              <ResultCard icon={CheckCircle} color="var(--color-success)" subtle="var(--color-success-subtle)" count={result.success} label="Imported" />
              <ResultCard icon={XCircle} color="var(--color-danger)" subtle="var(--color-danger-subtle)" count={result.failed} label="Failed" />
              <ResultCard icon={AlertCircle} color="var(--color-warning)" subtle="var(--color-warning-subtle)" count={result.duplicates} label="Duplicates" />
            </div>

            {errors.length > 0 && (
              <div style={{ background: 'var(--color-danger-subtle)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
                <div style={{ fontWeight: 600, color: 'var(--color-danger)', marginBottom: 8 }}>Errors</div>
                {errors.map((e, i) => <div key={i} style={{ fontSize: 13, color: 'var(--color-danger)', marginBottom: 4 }}>• {e}</div>)}
              </div>
            )}

            <button className="btn btn-primary btn-full" onClick={() => navigate('/candidates')}>
              View All Candidates
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// eslint-disable-next-line no-unused-vars
function ResultCard({ icon: Icon, color, subtle, count, label }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '20px 16px' }}>
      <div style={{ width: 44, height: 44, borderRadius: '50%', background: subtle, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
        <Icon size={20} color={color} />
      </div>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{count}</div>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', marginTop: 4 }}>{label}</div>
    </div>
  )
}
