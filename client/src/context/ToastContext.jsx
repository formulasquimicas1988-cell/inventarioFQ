import React, { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react'

const ToastContext = createContext(null)

let toastId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info') => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const success = useCallback((msg) => addToast(msg, 'success'), [addToast])
  const error = useCallback((msg) => addToast(msg, 'error'), [addToast])
  const info = useCallback((msg) => addToast(msg, 'info'), [addToast])
  const warning = useCallback((msg) => addToast(msg, 'warning'), [addToast])

  return (
    <ToastContext.Provider value={{ success, error, info, warning }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

const TOAST_STYLES = {
  success: {
    container: 'bg-green-50 border-green-200 text-green-800',
    icon: <CheckCircle size={20} className="text-green-600 flex-shrink-0" />,
  },
  error: {
    container: 'bg-red-50 border-red-200 text-red-800',
    icon: <XCircle size={20} className="text-red-600 flex-shrink-0" />,
  },
  info: {
    container: 'bg-blue-50 border-blue-200 text-blue-800',
    icon: <Info size={20} className="text-blue-600 flex-shrink-0" />,
  },
  warning: {
    container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    icon: <AlertTriangle size={20} className="text-yellow-600 flex-shrink-0" />,
  },
}

function ToastContainer({ toasts, onRemove }) {
  if (toasts.length === 0) return null

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-3"
      style={{ maxWidth: '420px', width: '100%' }}
    >
      {toasts.map(toast => {
        const style = TOAST_STYLES[toast.type] || TOAST_STYLES.info
        return (
          <div
            key={toast.id}
            className={`toast-enter flex items-start gap-3 p-4 rounded-xl border shadow-lg ${style.container}`}
            style={{ minHeight: '48px' }}
          >
            {style.icon}
            <span className="flex-1 text-sm font-medium leading-relaxed">{toast.message}</span>
            <button
              onClick={() => onRemove(toast.id)}
              className="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
              style={{ minHeight: 'unset' }}
              aria-label="Cerrar notificación"
            >
              <X size={16} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
