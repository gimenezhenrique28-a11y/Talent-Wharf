import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const ICONS = {
  success: CheckCircle2,
  error:   XCircle,
  info:    Info,
}

const COLORS = {
  success: 'var(--color-success)',
  error:   'var(--color-danger)',
  info:    'var(--color-text-secondary)',
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])

  function dismiss(id) {
    setToasts(t => t.filter(x => x.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map(t => {
            const Icon = ICONS[t.type] ?? Info
            return (
              <div key={t.id} className={`toast toast-${t.type}`}>
                <Icon size={15} style={{ color: COLORS[t.type], flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13 }}>{t.message}</span>
                <button
                  onClick={() => dismiss(t.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', padding: '0 0 0 4px', display: 'flex' }}
                >
                  <X size={13} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
