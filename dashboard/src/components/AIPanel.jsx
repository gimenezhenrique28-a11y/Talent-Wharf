import { ChevronLeft, ChevronRight } from 'lucide-react'

// TODO: replace all MOCK_* with real data from Supabase once
//       LinkedIn / GitHub enrichment pipeline is live

const MOCK_PIPELINE = [
  { label: 'New',       count: 12 },
  { label: 'Screening', count:  4 },
  { label: 'Interview', count:  2 },
  { label: 'Offered',   count:  1 },
  { label: 'Hired',     count:  1 },
]

const MOCK_SKILLS = [
  { name: 'React',      count: 8 },
  { name: 'Python',     count: 6 },
  { name: 'TypeScript', count: 4 },
  { name: 'Node.js',    count: 3 },
  { name: 'Go',         count: 2 },
]

const MOCK_ATTENTION = [
  { initials: 'MC', name: 'Maria Costa',  days: 30 },
  { initials: 'JB', name: 'João Braga',   days: 25 },
  { initials: 'KL', name: 'Kate Lima',    days: 18 },
]

const MOCK_OPEN_TO_WORK = [
  { initials: 'AS', name: 'Ana Silva'    },
  { initials: 'RG', name: 'Rui Gomes'   },
  { initials: 'TP', name: 'Tomás Pinto'  },
  { initials: 'FM', name: 'Fátima Melo'  },
]

const MAX_SKILL_COUNT = Math.max(...MOCK_SKILLS.map(s => s.count))
const TOTAL = MOCK_PIPELINE.reduce((s, p) => s + p.count, 0)

export default function AIPanel({ open, onToggle }) {
  return (
    <aside className={`right-panel${open ? '' : ' collapsed'}`}>

      {/* ── Collapsed strip (icon + label + expand button) ── */}
      <div className="rp-collapsed-strip">
        <button className="rp-toggle-btn" onClick={onToggle} title="Expand AI Insights">
          <ChevronLeft size={15} strokeWidth={1.75} />
        </button>
        <span className="rp-vertical-label">AI Insights</span>
      </div>

      {/* ── Full panel body ─────────────────────────────────── */}
      <div className="rp-body">

        {/* Header */}
        <div className="right-panel-header">
          <span>AI Insights</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            <span className="rp-badge">Beta</span>
            <button className="rp-toggle-btn" onClick={onToggle} title="Collapse">
              <ChevronRight size={15} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Pipeline */}
        <div className="rp-section">
          <div className="rp-section-label">Pipeline</div>
          {MOCK_PIPELINE.map(p => (
            <div key={p.label} className="rp-pipeline-row">
              <span className="rp-pipeline-label">{p.label}</span>
              <div className="rp-pipeline-track">
                <div
                  className="rp-pipeline-fill"
                  style={{ width: `${(p.count / TOTAL) * 100}%` }}
                />
              </div>
              <span className="rp-pipeline-count">{p.count}</span>
            </div>
          ))}
          <div className="rp-pipeline-total">{TOTAL} total</div>
        </div>

        {/* Top Skills */}
        <div className="rp-section">
          <div className="rp-section-label">Top Skills</div>
          {MOCK_SKILLS.map(s => (
            <div key={s.name} className="rp-skill-row">
              <span className="rp-skill-name">{s.name}</span>
              <div className="rp-skill-track">
                <div
                  className="rp-skill-fill"
                  style={{ width: `${(s.count / MAX_SKILL_COUNT) * 100}%` }}
                />
              </div>
              <span className="rp-skill-count">{s.count}</span>
            </div>
          ))}
        </div>

        {/* Needs Attention */}
        <div className="rp-section">
          <div className="rp-section-label">Needs Attention</div>
          {MOCK_ATTENTION.map((a, i) => (
            <div key={i} className="rp-person-row">
              <div className="rp-mini-avatar">{a.initials}</div>
              <div className="rp-person-content">
                <span className="rp-person-name">{a.name}</span>
                <span className="rp-person-meta">No contact · {a.days}d ago</span>
              </div>
            </div>
          ))}
        </div>

        {/* Open to Work */}
        <div className="rp-section">
          <div className="rp-section-row">
            <div className="rp-section-label" style={{ margin: 0 }}>Open to Work</div>
            <span className="rp-badge">{MOCK_OPEN_TO_WORK.length}</span>
          </div>
          <div className="rp-avatar-cluster">
            {MOCK_OPEN_TO_WORK.slice(0, 4).map((c, i) => (
              <div key={i} className="rp-mini-avatar" title={c.name}
                style={{ marginLeft: i > 0 ? -8 : 0, zIndex: 4 - i }}>
                {c.initials}
              </div>
            ))}
          </div>
          <div className="rp-person-meta" style={{ marginTop: 6 }}>
            {MOCK_OPEN_TO_WORK.map(c => c.name.split(' ')[0]).join(', ')}
          </div>
        </div>

      </div>
    </aside>
  )
}
