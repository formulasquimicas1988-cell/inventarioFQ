import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import api from '../../lib/api';

export default function ProductoSearch({ value, onChange, placeholder = 'Buscar producto...', disabled = false }) {
  const [inputText, setInputText] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  // When value changes externally (product selected or cleared), sync input text
  useEffect(() => {
    if (value) {
      setInputText(value.nombre || '');
    } else {
      setInputText('');
    }
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchResults = useCallback(async (text) => {
    if (!text || text.trim().length < 1) {
      setResults([]);
      setOpen(false);
      setFetchError(false);
      return;
    }
    setLoading(true);
    setFetchError(false);
    try {
      const res = await api.get('/api/productos', { params: { search: text, activo: 1, limit: 20 } });
      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
        ? res.data.data
        : [];
      setResults(data);
      setOpen(true);
    } catch {
      setResults([]);
      setFetchError(true);
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e) => {
    const text = e.target.value;
    setInputText(text);
    // If user starts typing after selecting a product, clear the selection
    if (value) {
      onChange(null);
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchResults(text);
    }, 300);
  };

  const handleSelect = (product) => {
    onChange(product);
    setInputText(product.nombre);
    setOpen(false);
    setResults([]);
  };

  const handleClear = () => {
    onChange(null);
    setInputText('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-5 h-5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={inputText}
          onChange={handleInputChange}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
            else if (inputText && !value) fetchResults(inputText);
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full min-h-[48px] pl-10 pr-10 py-2 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent bg-white disabled:bg-slate-50 disabled:cursor-not-allowed"
        />
        {(value || inputText) && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 h-6 w-6 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-full"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-3 text-slate-500 text-sm">Buscando...</div>
          ) : fetchError ? (
            <div className="px-4 py-3 text-red-500 text-sm">Error al conectar con el servidor</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3 text-slate-500 text-sm">Sin resultados</div>
          ) : (
            results.map((product) => (
              <button
                key={product.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(product);
                }}
                className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
              >
                <span className="font-medium text-slate-800 text-sm">
                  [{product.codigo}] — {product.nombre}
                </span>
                <span className="ml-2 text-xs text-slate-500">
                  (Stock: {product.stock_actual != null ? Number(product.stock_actual).toLocaleString('es-MX') : '—'} {product.unidad_medida})
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
