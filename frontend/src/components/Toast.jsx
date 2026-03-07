import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import clsx from 'clsx'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    if (duration > 0) {
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
    }
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = {
    success: (msg, duration) => addToast(msg, 'success', duration),
    error: (msg, duration) => addToast(msg, 'error', duration),
    info: (msg, duration) => addToast(msg, 'info', duration),
    remove: removeToast,
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onRemove }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const icons = {
    success: <CheckCircle2 size={15} className="text-emerald shrink-0" />,
    error: <AlertCircle size={15} className="text-red-400 shrink-0" />,
    info: <Info size={15} className="text-violet-400 shrink-0" />,
  }

  const borders = {
    success: 'border-emerald/20',
    error: 'border-red-400/20',
    info: 'border-violet-400/20',
  }

  return (
    <div
      className={clsx(
        'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl bg-panel border shadow-2xl text-sm font-body transition-all duration-300 min-w-64 max-w-sm',
        borders[toast.type],
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      )}
    >
      {icons[toast.type]}
      <p className="text-text flex-1">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-dim hover:text-text transition-colors ml-1"
      >
        <X size={13} />
      </button>
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
