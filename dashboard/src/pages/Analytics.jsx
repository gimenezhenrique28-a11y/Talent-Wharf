import { useState, useEffect } from 'react'
import { BarChart2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { subWeeks, startOfWeek, format } from 'date-fns'

export default function Analytics() {
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('candidates')
        .select('status, source, skills, created_at')
      setCandidates(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <div className="spinner spinner-lg" />
    </div>
  )

  /* ── Pipeline funnel ── */
  const statusOrder = ['new', 'contacted', 'interviewing', 'hired', 'rejected']
  const statusCounts = statusOrder.map(s => ({
    status: s,
    count: candidates.filter(c => c.status === s).length,
  })).filter(x => x.count > 0 || ['new', 'interviewing', 'hired'].includes(x.status))
  const maxStatus = Math.max(...statusCounts.map(x => x.count), 1)

  /* ── Source breakdown ── */
  const sourceCounts = {}
  candidates.forEach(c => {
    const src = c.source || 'Unknown'
    sourceCounts[src] = (sourceCounts[src] ?? 0) + 1
  })
  const sourceArr = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])
  const maxSource = Math.max(...sourceArr.map(x => x[1]), 1)

  /* ── Weekly adds (last 5 weeks) ── */
  const weeks = Array.from({ length: 5 }, (_, i) => {
    const weekStart = startOfWeek(subWeeks(new Date(), 4 - i), { weekStartsOn: 1 })
    const weekEnd   = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
    return { label: format(weekStart, 'MMM d'), start: weekStart, end: weekEnd }
  })
  const weeklyCounts = weeks.map(w => ({
    label: w.label,
    count: candidates.filter(c => {
      const d = new Date(c.created_at)
      return d >= w.start && d < w.end
    }).length,
  }))
  const maxWeekly = Math.max(...weeklyCounts.map(x => x.count), 1)

  /* ── Top skills ── */
  const skillCounts = {}
  candidates.forEach(c => {
    if (Array.isArray(c.skills)) {
      c.skills.forEach(s => { skillCounts[s] = (skillCounts[s] ?? 0) + 1 })
    }
  })
  const topSkills = Object.entries(skillCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)
  const maxSkill = Math.max(...topSkills.map(x => x[1]), 1)

  return (
    <div className="page">
      <div style={{ marginBottom: 32 }}>
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">Pipeline metrics and candidate insights</p>
      </div>

      <div className="grid-2" style={{ gap: 20 }}>

        {/* Pipeline Funnel */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <BarChart2 size={15} color="var(--color-text-tertiary)" />
            <div className="section-title" style={{ margin: 0 }}>Pipeline Funnel</div>
          </div>
          {statusCounts.map(({ status, count }) => (
            <div key={status} className="analytics-bar-row">
              <div className="analytics-bar-label">{status}</div>
              <div className="analytics-bar-track">
                <div className="analytics-bar-fill" style={{ width: `${(count / maxStatus) * 100}%` }} />
              </div>
              <div className="analytics-bar-count">{count}</div>
            </div>
          ))}
        </div>

        {/* Source Breakdown */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <BarChart2 size={15} color="var(--color-text-tertiary)" />
            <div className="section-title" style={{ margin: 0 }}>Source Breakdown</div>
          </div>
          {sourceArr.length === 0 ? (
            <div style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>No data yet</div>
          ) : sourceArr.map(([source, count]) => (
            <div key={source} className="analytics-bar-row">
              <div className="analytics-bar-label">{source}</div>
              <div className="analytics-bar-track">
                <div className="analytics-bar-fill" style={{ width: `${(count / maxSource) * 100}%` }} />
              </div>
              <div className="analytics-bar-count">{count}</div>
            </div>
          ))}
        </div>

        {/* Added by Week */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <BarChart2 size={15} color="var(--color-text-tertiary)" />
            <div className="section-title" style={{ margin: 0 }}>Added by Week</div>
          </div>
          {/* Bottom-aligned bar chart */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 80, marginBottom: 8 }}>
            {weeklyCounts.map(({ label, count }) => (
              <div
                key={label}
                style={{
                  flex: 1,
                  height: maxWeekly > 0 ? `${Math.max((count / maxWeekly) * 76, count > 0 ? 4 : 0)}px` : '0px',
                  background: count > 0 ? 'var(--gray-500)' : 'rgba(255,255,255,0.04)',
                  borderRadius: '3px 3px 0 0',
                  transition: 'height 0.5s ease',
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {weeklyCounts.map(({ label, count }) => (
              <div key={label} style={{ flex: 1, textAlign: 'center' }}>
                {count > 0 && <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 2 }}>{count}</div>}
                <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Skills */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <BarChart2 size={15} color="var(--color-text-tertiary)" />
            <div className="section-title" style={{ margin: 0 }}>Top Skills</div>
          </div>
          {topSkills.length === 0 ? (
            <div style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>No skills data yet</div>
          ) : topSkills.map(([skill, count]) => (
            <div key={skill} className="analytics-bar-row">
              <div className="analytics-bar-label">{skill}</div>
              <div className="analytics-bar-track">
                <div className="analytics-bar-fill" style={{ width: `${(count / maxSkill) * 100}%` }} />
              </div>
              <div className="analytics-bar-count">{count}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
