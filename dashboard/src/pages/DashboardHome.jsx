import { useState, useEffect } from 'react'
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

  useEffect(() => { fetchStats() }, [])

  async function fetchStats() {
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
  }

  async function handleMatch() {
    if (!jobDescription.trim()) return
    setMatching(true)
    setMatchError('')
    setMatches([])

    const { data: { session } } = await supabase.auth.getSession()
    const res = await supabase.functions.invoke('match-job', {
      body: { job_description: jobDescription },
      headers: { Authorization: `Bearer ${session.access_token}` },
    })

    setMatching(false)
    if (res.error) { setMatchError(res.error.message); return }
    setMatches(res.data?.matches ?? [])
  }

  const kpiCards = [
    { label: 'Total Candidates', value: stats.total,        icon: Users      },
    { label: 'Added This Week',  value: stats.thisWeek,     icon: UserPlus   },
    { label: 'Interviewing',     value: stats.interviewing,  icon: Briefcase  },
    { label: 'Hired',            value: stats.hired,         icon: TrendingUp },
  ]

  return (
    <div className="page">
      {/* Welcome */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 500,
          letterSpacing: 'var(--ls-heading)',
          lineHeight: 1.2,
        }}>
          {profile?.name ? `Good to see you, ${profile.name.split(' ')[0]}.` : 'Welcome back.'}
        </h1>
        <p style={{
          color: 'var(--color-text-secondary)',
          marginTop: 8,
          fontSize: 15,
          letterSpacing: 'var(--ls-body)',
        }}>
          Your recruitment pipeline at a glance.
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid-4" style={{ marginBottom: 40 }}>
        {kpiCards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-md)',
              background: 'var(--gray-800)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon size={20} color="var(--gray-300)" />
            </div>
            <div>
              <div style={{
                fontSize: 30,
                fontWeight: 500,
                letterSpacing: '-0.04em',
                lineHeight: 1,
                color: 'var(--white)',
              }}>{value}</div>
              <div style={{
                fontSize: 13,
                color: 'var(--color-text-secondary)',
                marginTop: 4,
                letterSpacing: 'var(--ls-body)',
              }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* AI Matching */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 'var(--radius-sm)',
            background: 'var(--gray-800)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Sparkles size={18} color="var(--gray-300)" />
          </div>
          <div>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: 500,
              letterSpacing: 'var(--ls-subhead)',
              lineHeight: 1.3,
            }}>AI Job Matching</h2>
            <p style={{
              color: 'var(--color-text-secondary)',
              marginTop: 4,
              fontSize: 14,
              letterSpacing: 'var(--ls-body)',
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
        <div style={{ marginTop: 32 }}>
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
