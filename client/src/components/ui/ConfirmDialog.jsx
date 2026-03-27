import Modal      from './Modal';
import SafeButton from './SafeButton';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Eliminar', loading = false }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title || 'Confirmar acción'}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <SafeButton
            className="btn btn-primary bg-red-600 hover:bg-red-700"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : null}
            {confirmLabel}
          </SafeButton>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
          <AlertTriangle size={24} className="text-red-600" />
        </div>
        <p className="text-gray-600 leading-relaxed pt-2">{message}</p>
      </div>
    </Modal>
  );
}
