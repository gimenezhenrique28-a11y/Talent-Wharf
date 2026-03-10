import { useState, useEffect, useCallback } from 'react'
import { Users, UserPlus, Briefcase, TrendingUp, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function DashboardHome() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({ total: 0, thisWeek: 0, interviewing: 0, hired: 0 })
  const [jobDescription, setJobDescription] = useState('')
  const [matches, setMatches] = useState([])
  const [matching, setMatching] = useState(false)
  const [matchError, setMatchError] = useState('')

  const fetchStats = useCallback(async () => {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    const [total, thisWeek, interviewing, hired] = await Promise.all([
      supabase.from('candidates').select('*', { count: 'exact', head: true }),
      supabase.from('candidates').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo.toISOString()),
      supabase.from('candidates').select('*', { count: 'exact', head: true }).eq('status', 'interviewing'),
      supabase.from('candidates').select('*', { count: 'exact', head: true }).eq('status', 'hired'),
    ])

    setStats({
      total: total.count ?? 0,
      thisWeek: thisWeek.count ?? 0,
      interviewing: interviewing.count ?? 0,
      hired: hired.count ?? 0,
    })
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  async function handleMatch() {
    if (!jobDescription.trim()) return
    setMatching(true)
    setMatchError('')
    setMatches([])

    try {
      // Let the SDK inject the latest session token automatically.
      // getUser() verifies the token with the server and handles refresh.
      const { error: userError } = await supabase.auth.getUser()
      if (userError) {
        setMatchError('Session expired — please log in again.')
        return
      }

      const res = await supabase.functions.invoke('match-job', {
        body: { job_description: jobDescription },
      })

      if (res.error) {
        const detail = res.error?.context?.error || res.error?.context?.detail || res.error.message
        setMatchError(detail)
        return
      }
      if (res.data?.error) { setMatchError(res.data.error + (res.data.detail ? ': ' + res.data.detail : '')); return }
      setMatches(res.data?.matches ?? [])
    } catch (err) {
      setMatchError(err?.message ?? 'Unexpected error')
    } finally {
      setMatching(false)
    }
  }

  const kpiCards = [
    { label: 'Total Candidates', value: stats.total, icon: Users },
    { label: 'Added This Week', value: stats.thisWeek, icon: UserPlus },
    { label: 'Interviewing', value: stats.interviewing, icon: Briefcase },
    { label: 'Hired', value: stats.hired, icon: TrendingUp },
  ]

  return (
    <div className="page">
      {/* Welcome */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: 600,
          letterSpacing: 'var(--ls-heading)',
          lineHeight: 1.2,
          textTransform: 'uppercase',
        }}>
          {profile?.name ? `Welcome, ${profile.name.split(' ')[0]}.` : 'Welcome back.'}
        </h1>
        <p style={{
          color: 'var(--color-text-secondary)',
          marginTop: 6,
          fontSize: 12,
          letterSpacing: '0.04em',
        }}>
          Recruitment pipeline overview — {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/')} UTC
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid-4" style={{ marginBottom: 32 }}>
        {kpiCards.map(({ label, value, icon: Icon }) => (
          // eslint-disable-next-line no-unused-vars
          <div key={label} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--gray-800)',
              border: '1px solid var(--color-border-strong)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon size={18} color="var(--gray-300)" />
            </div>
            <div>
              <div style={{
                fontSize: 26,
                fontWeight: 600,
                letterSpacing: '-0.03em',
                lineHeight: 1,
                color: 'var(--white)',
              }}>{value}</div>
              <div style={{
                fontSize: 10,
                fontWeight: 500,
                color: 'var(--gray-400)',
                marginTop: 5,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* AI Matching */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 18 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-sm)',
            background: 'var(--gray-800)',
            border: '1px solid var(--color-border-strong)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Sparkles size={16} color="var(--gray-300)" />
          </div>
          <div>
            <h2 style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              letterSpacing: '0.06em',
              lineHeight: 1.3,
              textTransform: 'uppercase',
            }}>AI Job Matching</h2>
            <p style={{
              color: 'var(--color-text-secondary)',
              marginTop: 4,
              fontSize: 12,
              letterSpacing: '0.01em',
            }}>
              Paste a job description and AI will rank your best matching candidates.
            </p>
          </div>
        </div>

        <textarea
          className="input"
          rows={8}
          style={{ minHeight: 180, marginBottom: 14 }}
          placeholder="Paste a job description here..."
          value={jobDescription}
          onChange={e => setJobDescription(e.target.value)}
        />

        {matchError && <div className="error-banner" style={{ marginBottom: 14 }}>{matchError}</div>}

        <button
          className="btn btn-primary"
          onClick={handleMatch}
          disabled={matching || !jobDescription.trim()}
          style={{ color: 'var(--black)' }}
        >
          {matching
            ? <><div className="spinner" style={{ borderTopColor: '#000', borderColor: 'rgba(0,0,0,0.2)' }} /> Analysing candidates...</>
            : <><Sparkles size={15} /> Find Best Matches</>
          }
        </button>
      </div>

      {/* Match Results */}
      {matches.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <p className="section-title">Top {matches.length} matches</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {matches.map((m, i) => (
              <MatchCard key={m.id} match={m} rank={i + 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MatchCard({ match, rank }) {
  return (
    <div className="card" style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
      {/* Rank */}
      <div style={{
        width: 32,
        height: 32,
        borderRadius: 'var(--radius-sm)',
        background: 'var(--gray-800)',
        border: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--gray-400)',
        flexShrink: 0,
        letterSpacing: 'var(--ls-label)',
      }}>
        {rank}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{
              fontSize: 17,
              fontWeight: 500,
              letterSpacing: 'var(--ls-subhead)',
            }}>{match.name}</div>
            {match.matching_skills?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {match.matching_skills.map(skill => (
                  <span key={skill} style={{
                    background: 'var(--gray-800)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--gray-300)',
                    padding: '3px 10px',
                    borderRadius: 100,
                    fontSize: 12,
                    fontWeight: 400,
                    letterSpacing: 'var(--ls-label)',
                  }}>{skill}</span>
                ))}
              </div>
            )}
          </div>

          {/* Score */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{
              fontSize: 28,
              fontWeight: 500,
              color: 'var(--white)',
              letterSpacing: '-0.04em',
              lineHeight: 1,
            }}>{match.match_score}</span>
            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>/ 100</span>
          </div>
        </div>

        {match.reasoning && (
          <div style={{
            marginTop: 12,
            background: 'var(--gray-800)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            fontSize: 13,
            color: 'var(--color-text-secondary)',
            letterSpacing: 'var(--ls-body)',
            lineHeight: 1.6,
          }}>
            {match.reasoning}
          </div>
        )}
      </div>
    </div>
  )
}
