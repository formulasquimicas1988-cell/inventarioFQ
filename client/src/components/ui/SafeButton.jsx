import React from 'react';

const variants = {
  primary: 'bg-brand-red hover:bg-red-700 active:bg-red-800 text-white',
  secondary: 'bg-brand-blue hover:bg-blue-900 active:bg-blue-950 text-white',
  danger: 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white',
  ghost: 'bg-transparent hover:bg-slate-100 active:bg-slate-200 text-slate-700 border border-slate-300',
  outline: 'bg-white hover:bg-slate-50 text-brand-blue border border-brand-blue',
};

export default function SafeButton({ onClick, children, loading = false, disabled = false, className = '', variant = 'primary', type = 'button' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`min-h-[48px] px-5 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 justify-center ${variants[variant] || variants.primary} ${(disabled || loading) ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
      )}
      {children}
    </button>
  );
}
