import React, { useState } from 'react'
import Modal from './Modal'
import { AlertTriangle } from 'lucide-react'

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = '¿Confirmar acción?',
  message = '¿Estás seguro de que deseas realizar esta acción?',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmClassName,
}) {
  const [loading, setLoading] = useState(false)
  const defaultConfirmClass = 'bg-brand-red hover:bg-red-700 text-white'

  const handleConfirm = async () => {
    if (loading) return
    setLoading(true)
    try {
      await onConfirm()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={loading ? undefined : onClose} title={title} size="sm">
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <p className="text-slate-600 text-sm leading-relaxed pt-1">{message}</p>
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ minHeight: '48px' }}
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`px-5 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${confirmClassName || defaultConfirmClass}`}
            style={{ minHeight: '48px' }}
          >
            {loading && (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
            )}
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  )
}
