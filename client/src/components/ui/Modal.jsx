import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function Modal({ open, onClose, onConfirm, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e) {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && onConfirm) {
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag !== 'textarea' && tag !== 'select' && tag !== 'button') {
          e.preventDefault();
          onConfirm();
        }
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose, onConfirm]);

  if (!open) return null;

  const sizeClass = size === 'lg' ? 'modal modal-lg' : 'modal';

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={sizeClass} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="text-xl font-bold text-deep-blue">{title}</h2>
          <button
            onClick={onClose}
            className="btn-icon btn-ghost text-gray-400 hover:text-gray-700"
            aria-label="Cerrar"
          >
            <X size={22} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
