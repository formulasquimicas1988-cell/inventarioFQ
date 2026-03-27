import { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import { formatNumber } from '../../lib/utils';
import { cn } from '../../lib/utils';

export default function ProductoSearch({ productos = [], value, onChange, error, placeholder = 'Buscar producto por nombre o código...' }) {
  const [query,    setQuery]    = useState('');
  const [open,     setOpen]     = useState(false);
  const [filtered, setFiltered] = useState([]);
  const inputRef    = useRef();
  const containerRef = useRef();

  const selected = productos.find(p => String(p.id) === String(value));

  // Filtrado en tiempo real con debounce 200ms
  useEffect(() => {
    const t = setTimeout(() => {
      const q = query.toLowerCase().trim();
      setFiltered(
        q
          ? productos.filter(p =>
              p.nombre.toLowerCase().includes(q) ||
              p.codigo.toLowerCase().includes(q)
            ).slice(0, 30)
          : productos.slice(0, 30)
      );
    }, 200);
    return () => clearTimeout(t);
  }, [query, productos]);

  // Cerrar al hacer clic afuera
  useEffect(() => {
    const handler = e => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleOpen() {
    setOpen(true);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleSelect(p) {
    onChange(String(p.id));
    setOpen(false);
    setQuery('');
  }

  function handleClear(e) {
    e.stopPropagation();
    onChange('');
    setOpen(false);
    setQuery('');
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger / display */}
      <div
        onClick={handleOpen}
        className={cn(
          'flex items-center gap-2 w-full rounded-lg border-2 bg-white cursor-pointer',
          'px-3 py-2 transition-colors duration-150',
          open   ? 'border-deep-blue'  : 'border-gray-200',
          error  ? 'border-red-400'    : '',
        )}
        style={{ minHeight: '42px' }}
      >
        <Search size={16} className="text-gray-400 flex-shrink-0" />

        {open ? (
          <input
            ref={inputRef}
            className="flex-1 outline-none bg-transparent text-gray-900 placeholder-gray-400"
            style={{ fontSize: '14px', border: 'none', padding: 0, minHeight: 'auto' }}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={placeholder}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span
            className={cn('flex-1 truncate text-sm', selected ? 'text-gray-900 font-medium' : 'text-gray-400')}
          >
            {selected
              ? <><span className="font-mono text-xs text-deep-blue bg-blue-50 px-1.5 py-0.5 rounded mr-2">{selected.codigo}</span>{selected.nombre}</>
              : placeholder
            }
          </span>
        )}

        {selected && !open
          ? <button type="button" onClick={handleClear} className="text-gray-400 hover:text-gray-600 flex-shrink-0 p-0.5">
              <X size={15} />
            </button>
          : <ChevronDown size={15} className={cn('text-gray-400 flex-shrink-0 transition-transform', open && 'rotate-180')} />
        }
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-[100] left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden"
          style={{ maxHeight: '260px', overflowY: 'auto' }}
        >
          {filtered.length === 0 ? (
            <div className="px-4 py-4 text-sm text-gray-400 text-center">
              No se encontraron productos
            </div>
          ) : filtered.map(p => {
            const sinStock  = parseFloat(p.stock_actual) <= 0;
            const isSelected = String(p.id) === String(value);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelect(p)}
                className={cn(
                  'w-full text-left px-4 py-2.5 flex items-center justify-between gap-3',
                  'border-b border-gray-50 last:border-b-0 transition-colors',
                  isSelected ? 'bg-blue-50' : 'hover:bg-gray-50',
                  sinStock   ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-xs font-semibold text-deep-blue bg-blue-50 px-1.5 py-0.5 rounded flex-shrink-0">
                    {p.codigo}
                  </span>
                  <span className="text-sm font-medium text-gray-800 truncate">{p.nombre}</span>
                </div>
                <span className={cn('text-xs font-semibold flex-shrink-0', sinStock ? 'text-red-500' : 'text-gray-500')}>
                  {formatNumber(p.stock_actual)} {p.unidad_medida}
                  {sinStock ? ' ⚠' : ''}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
