import React, { useEffect } from 'react'
import ReactDOM from 'react-dom'
import { X } from 'lucide-react'

const SIZE_CLASSES = {
  sm: 'max-w-[480px]',
  md: 'max-w-[600px]',
  lg: 'max-w-[800px]',
  xl: 'max-w-[1000px]',
}

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  const contentRef = React.useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e) => {
      if (e.key === 'Escape' && onClose) onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) return
    const timer = setTimeout(() => {
      const el = contentRef.current?.querySelector('input:not([type="hidden"]):not([disabled]), textarea, select')
      el?.focus()
    }, 50)
    return () => clearTimeout(timer)
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={`bg-white rounded-xl shadow-2xl w-full ${SIZE_CLASSES[size] || SIZE_CLASSES.md} flex flex-col max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            style={{ minHeight: '48px', minWidth: '48px' }}
            aria-label="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>
        {/* Body */}
        <div ref={contentRef} className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
