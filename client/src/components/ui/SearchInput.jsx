import { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function SearchInput({ value, onChange, placeholder = 'Buscar...', loading = false, className = '' }) {
  return (
    <div className={cn('relative flex items-center', className)}>
      <Search size={18} className="absolute left-4 text-gray-400 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="input pl-11 pr-10"
      />
      {loading && (
        <Loader2 size={16} className="absolute right-10 text-gray-400 animate-spin" />
      )}
      {value && !loading && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 text-gray-400 hover:text-gray-600 p-1 rounded"
          type="button"
          aria-label="Limpiar búsqueda"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
