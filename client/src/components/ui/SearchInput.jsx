import React from 'react';
import { Search, X } from 'lucide-react';

export default function SearchInput({ value, onChange, placeholder = 'Buscar...', className = '' }) {
  return (
    <div className={`relative flex items-center ${className}`}>
      <Search className="absolute left-3 w-5 h-5 text-slate-400 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full min-h-[48px] pl-10 pr-10 py-2 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent bg-white"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 min-h-0 h-6 w-6 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-full"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
