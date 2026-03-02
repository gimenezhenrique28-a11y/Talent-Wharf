import { X } from 'lucide-react'

const SHORTCUTS = [
  { keys: '⌘K / Ctrl+K', description: 'Open command palette' },
  { keys: '?',            description: 'Show keyboard shortcuts' },
  { keys: '⌘N / Ctrl+N', description: 'Add new candidate' },
  { keys: 'Esc',          description: 'Close any overlay' },
  { keys: 'G → H',        description: 'Go to Home' },
  { keys: 'G → C',        description: 'Go to Candidates' },
  { keys: 'G → A',        description: 'Go to Analytics' },
  { keys: 'G → S',        description: 'Go to Settings' },
]

export default function ShortcutsModal({ onClose }) {
  return (
    <div className="shortcuts-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="shortcuts-box">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, letterSpacing: 'var(--ls-subhead)' }}>Keyboard Shortcuts</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
              Navigate faster without leaving the keyboard
            </div>
          </div>
          <button className="btn btn-ghost" style={{ padding: 6 }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
          {SHORTCUTS.map(s => (
            <div key={s.keys} className="shortcut-row">
              <kbd className="shortcut-key">{s.keys}</kbd>
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{s.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
