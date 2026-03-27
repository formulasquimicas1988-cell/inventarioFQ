import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

const ToastContext = createContext({ toast: () => {} });

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback(({ title, description, type = 'success', duration = 4000 }) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, title, description, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const ICONS = {
    success: <CheckCircle size={20} className="text-green-600 flex-shrink-0" />,
    error:   <XCircle    size={20} className="text-red-600 flex-shrink-0" />,
    warning: <AlertCircle size={20} className="text-yellow-600 flex-shrink-0" />,
  };
  const BORDERS = {
    success: 'border-l-4 border-green-500',
    error:   'border-l-4 border-red-500',
    warning: 'border-l-4 border-yellow-500',
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`
              pointer-events-auto flex items-start gap-3 bg-white rounded-xl shadow-2xl
              p-4 min-w-[300px] max-w-[420px] animate-[slideIn_0.2s_ease]
              ${BORDERS[t.type] || BORDERS.success}
            `}
          >
            {ICONS[t.type]}
            <div className="flex-1 min-w-0">
              {t.title && <p className="font-semibold text-gray-900 text-sm">{t.title}</p>}
              {t.description && <p className="text-sm text-gray-500 mt-0.5">{t.description}</p>}
            </div>
            <button
              onClick={() => remove(t.id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-0.5"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
