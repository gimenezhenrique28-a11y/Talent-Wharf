import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'

// ── Viewport scaling ─────────────────────────────────────────────────────────
// Scales the entire UI to fill wider screens (1440px is the design baseline).
// On screens ≤ 1440px zoom stays at 1 — nothing shrinks on laptops.
// Capped at 1.5× so 4K monitors don't get extreme sizing.
;(function applyViewportZoom() {
  function update() {
    const zoom = Math.min(1.5, Math.max(1, window.innerWidth / 1440))
    document.documentElement.style.zoom = zoom.toFixed(4)
  }
  update()
  window.addEventListener('resize', update, { passive: true })
})()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
