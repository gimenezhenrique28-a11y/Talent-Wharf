import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { subWeeks, startOfWeek, format } from 'date-fns'
import * as XLSX from 'xlsx'
import { Download } from 'lucide-react'

/* ── Color palette for charts ─────────────────────────────────────────────── */
const STATUS_COLORS = {
  new:          'var(--color-text-tertiary)',
  screening:    '#60a5fa',
  interviewing: '#fbbf24',
  offered:      '#c084fc',
  hired:        '#6ee7b7',
  rejected:     '#f87171',
}
const SOURCE_COLOR = '#60a5fa'
const WEEKLY_COLOR = '#818cf8'  // indigo
const SKILL_COLOR  = '#2dd4bf'  // teal

export default function Analytics() {
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading]       = useState(true)
  const [loadError, setLoadError]   = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from('candidates')
          .select('status, source, skills, created_at')
        if (error) throw error
        setCandidates(data ?? [])
      } catch (err) {
        setLoadError(err?.message ?? 'Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <div className="spinner spinner-lg" />
    </div>
  )

  if (loadError) return (
    <div className="page">
      <div className="error-banner">{loadError}</div>
    </div>
  )

  /* ── Summary stats ── */
  const total    = candidates.length
  const hired    = candidates.filter(c => c.status === 'hired').length
  const hireRate = total > 0 ? Math.round((hired / total) * 100) : 0
  const active   = candidates.filter(c =>
    c.status === 'screening' || c.status === 'interviewing' || c.status === 'offered'
  ).length

  /* ── Pipeline funnel ── */
  const statusOrder = ['new', 'screening', 'interviewing', 'offered', 'hired', 'rejected']
  const statusCounts = statusOrder.map(s => ({
    status: s,
    count: candidates.filter(c => c.status === s).length,
  })).filter(x => x.count > 0 || ['new', 'screening', 'interviewing', 'hired'].includes(x.status))
  const maxStatus = Math.max(...statusCounts.map(x => x.count), 1)

  /* ── Source breakdown ── */
  const sourceCounts = {}
  candidates.forEach(c => {
    const src = c.source || 'Unknown'
    sourceCounts[src] = (sourceCounts[src] ?? 0) + 1
  })
  const sourceArr  = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])
  const maxSource  = Math.max(...sourceArr.map(x => x[1]), 1)

  /* ── Weekly adds (last 6 weeks) ── */
  const weeks = Array.from({ length: 6 }, (_, i) => {
    const weekStart = startOfWeek(subWeeks(new Date(), 5 - i), { weekStartsOn: 1 })
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
  const maxSkill  = Math.max(...topSkills.map(x => x[1]), 1)


  /* ── Export to Excel ── */
  function exportToExcel() {
    const wb = XLSX.utils.book_new()

    const summaryData = [
      ['Metric', 'Value'],
      ['Total Candidates', total],
      ['Hired', hired],
      ['Active in Pipeline', active],
      ['Hire Rate (%)', hireRate],
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Summary')

    const funnelData = [
      ['Status', 'Count'],
      ...statusCounts.map(({ status, count }) => [status, count]),
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(funnelData), 'Pipeline Funnel')

    const sourceData = [
      ['Source', 'Count'],
      ...sourceArr.map(([source, count]) => [source, count]),
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sourceData), 'Source Breakdown')

    const weeklyData = [
      ['Week Starting', 'Candidates Added'],
      ...weeklyCounts.map(({ label, count }) => [label, count]),
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(weeklyData), 'Weekly Adds')

    const skillsData = [
      ['Skill', 'Candidate Count'],
      ...Object.entries(skillCounts).sort((a, b) => b[1] - a[1]).map(([skill, count]) => [skill, count]),
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(skillsData), 'Skills')

    const fileName = 'wharf-analytics-' + format(new Date(), 'yyyy-MM-dd') + '.xlsx'
    XLSX.writeFile(wb, fileName)
  }

  return (
    <div className="page">

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Pipeline metrics and candidate insights</p>
        </div>
        <button className="btn btn-secondary" onClick={exportToExcel} style={{ gap: 6, marginTop: 4 }}>
          <Download size={14} />
          Export to Excel
        </button>
      </div>

      {/* ── Summary strip ─────────────────────────────────────────────── */}
      <div className="analytics-summary" style={{ marginBottom: 24 }}>
        <div className="analytics-stat">
          <div className="analytics-stat-value">{total}</div>
          <div className="analytics-stat-label">Total Candidates</div>
        </div>
        <div className="analytics-stat">
          <div className="analytics-stat-value" style={{ color: STATUS_COLORS.hired }}>{hired}</div>
          <div className="analytics-stat-label">Hired</div>
        </div>
        <div className="analytics-stat">
          <div className="analytics-stat-value" style={{ color: STATUS_COLORS.screening }}>{active}</div>
          <div className="analytics-stat-label">Active in Pipeline</div>
        </div>
        <div className="analytics-stat">
          <div className="analytics-stat-value" style={{ color: '#818cf8' }}>{hireRate}%</div>
          <div className="analytics-stat-label">Hire Rate</div>
        </div>
      </div>

      {/* ── Charts grid ───────────────────────────────────────────────── */}
      <div className="grid-2" style={{ gap: 20 }}>

        {/* Pipeline Funnel */}
        <div className="card">
          <div className="analytics-card-header">
            <div className="section-title" style={{ margin: 0 }}>Pipeline Funnel</div>
          </div>
          {statusCounts.map(({ status, count }) => (
            <div key={status} className="analytics-bar-row">
              <div className="analytics-bar-label">{status}</div>
              <div className="analytics-bar-track">
                <div
                  className="analytics-bar-fill"
                  style={{
                    width: `${(count / maxStatus) * 100}%`,
                    background: STATUS_COLORS[status] ?? 'var(--gray-500)',
                  }}
                />
              </div>
              <div className="analytics-bar-count">{count}</div>
            </div>
          ))}
        </div>

        {/* Source Breakdown */}
        <div className="card">
          <div className="analytics-card-header">
            <div className="section-title" style={{ margin: 0 }}>Source Breakdown</div>
          </div>
          {sourceArr.length === 0 ? (
            <div style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>No data yet</div>
          ) : sourceArr.map(([source, count]) => (
            <div key={source} className="analytics-bar-row">
              <div className="analytics-bar-label">{source}</div>
              <div className="analytics-bar-track">
                <div
                  className="analytics-bar-fill"
                  style={{ width: `${(count / maxSource) * 100}%`, background: SOURCE_COLOR }}
                />
              </div>
              <div className="analytics-bar-count">{count}</div>
            </div>
          ))}
        </div>

        {/* Added by Week */}
        <div className="card">
          <div className="analytics-card-header">
            <div className="section-title" style={{ margin: 0 }}>Added by Week</div>
          </div>
          {/* Vertical bar chart */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120, marginBottom: 8 }}>
            {weeklyCounts.map(({ label, count }) => (
              <div
                key={label}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  height: '100%',
                  gap: 4,
                }}
              >
                <div style={{
                  fontSize: 11, fontWeight: 600,
                  color: count > 0 ? 'var(--color-text-secondary)' : 'transparent',
                  minHeight: 16,
                }}>
                  {count}
                </div>
                <div style={{
                  width: '100%',
                  height: maxWeekly > 0
                    ? `${Math.max((count / maxWeekly) * 88, count > 0 ? 6 : 2)}px`
                    : '2px',
                  background: count > 0 ? WEEKLY_COLOR : 'rgba(255,255,255,0.05)',
                  borderRadius: '3px 3px 0 0',
                  transition: 'height 0.5s ease',
                }} />
              </div>
            ))}
          </div>
          {/* Week labels */}
          <div style={{
            display: 'flex', gap: 8,
            borderTop: '1px solid var(--color-border)',
            paddingTop: 8,
          }}>
            {weeklyCounts.map(({ label }) => (
              <div key={label} style={{
                flex: 1, textAlign: 'center',
                fontSize: 10, color: 'var(--color-text-tertiary)',
                whiteSpace: 'nowrap',
              }}>
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Top Skills */}
        <div className="card">
          <div className="analytics-card-header">
            <div className="section-title" style={{ margin: 0 }}>Top Skills</div>
          </div>
          {topSkills.length === 0 ? (
            <div style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>No skills data yet</div>
          ) : topSkills.map(([skill, count]) => (
            <div key={skill} className="analytics-bar-row">
              <div className="analytics-bar-label">{skill}</div>
              <div className="analytics-bar-track">
                <div
                  className="analytics-bar-fill"
                  style={{ width: `${(count / maxSkill) * 100}%`, background: SKILL_COLOR }}
                />
              </div>
              <div className="analytics-bar-count">{count}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
