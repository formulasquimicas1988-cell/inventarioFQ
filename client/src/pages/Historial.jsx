import { useState, useEffect, useCallback } from 'react';
import { History, Filter, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../context/ToastContext';
import { formatDate, formatNumber, tipoMovBadge } from '../lib/utils';
import SearchInput from '../components/ui/SearchInput';
import EmptyState  from '../components/ui/EmptyState';
import PageLoader  from '../components/ui/PageLoader';
import Pagination  from '../components/ui/Pagination';
import { useSortable } from '../hooks/useSortable';

const PAGE_SIZE = 20;

function SortTh({ col, label, sortKey, sortDir, onSort, className = '' }) {
  const active = sortKey === col;
  return (
    <th className={`cursor-pointer select-none hover:opacity-75 ${className}`} onClick={() => onSort(col)}>
      <span className="inline-flex items-center gap-1">
        {label}
        {active
          ? (sortDir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />)
          : <ChevronsUpDown size={13} className="opacity-30" />
        }
      </span>
    </th>
  );
}

export default function Historial() {
  const { toast } = useToast();

  const [movimientos, setMovimientos] = useState([]);
  const [filtered,    setFiltered]    = useState([]);
  const [search,      setSearch]      = useState('');
  const [searching,   setSearching]   = useState(false);
  const [tipoFilter,  setTipoFilter]  = useState('');
  const [fromDate,    setFromDate]    = useState('');
  const [toDate,      setToDate]      = useState('');
  const [loading,     setLoading]     = useState(true);
  const [page,        setPage]        = useState(1);

  const { sorted, sortKey, sortDir, toggleSort } = useSortable(filtered, 'fecha', 'desc');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tipoFilter) params.set('tipo', tipoFilter);
      if (fromDate)   params.set('from', fromDate);
      if (toDate)     params.set('to', toDate);
      const { data } = await api.get(`/movimientos?${params}`);
      setMovimientos(data);
    } catch (err) {
      toast({ type: 'error', title: 'Error', description: err.message });
    } finally {
      setLoading(false);
    }
  }, [toast, tipoFilter, fromDate, toDate]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    setSearching(true);
    const t = setTimeout(() => {
      const s = search.toLowerCase();
      setFiltered(
        s ? movimientos.filter(m =>
          m.producto_nombre.toLowerCase().includes(s) ||
          m.producto_codigo.toLowerCase().includes(s) ||
          m.tipo.toLowerCase().includes(s) ||
          (m.cliente   || '').toLowerCase().includes(s) ||
          (m.proveedor || '').toLowerCase().includes(s) ||
          (m.motivo    || '').toLowerCase().includes(s)
        ) : movimientos
      );
      setPage(1);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [search, movimientos]);

  useEffect(() => { setPage(1); }, [sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated  = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) return <PageLoader />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Historial de Movimientos</h1>
          <p className="page-subtitle">{filtered.length} movimientos encontrados</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 mb-5">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por producto, tipo, cliente, proveedor..."
          loading={searching}
          className="flex-1 min-w-[220px]"
        />

        <div className="relative flex items-center">
          <Filter size={16} className="absolute left-3 text-gray-400 pointer-events-none" />
          <select
            className="input pl-9 min-w-[160px]"
            value={tipoFilter}
            onChange={e => setTipoFilter(e.target.value)}
          >
            <option value="">Todos los tipos</option>
            <option value="entrada">Entradas</option>
            <option value="salida">Salidas</option>
            <option value="ajuste">Ajustes</option>
            <option value="dañado">Dañados</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="label mb-0 whitespace-nowrap">Desde:</label>
          <input type="date" className="input min-w-[160px]" value={fromDate} onChange={e => setFromDate(e.target.value)} />
        </div>

        <div className="flex items-center gap-2">
          <label className="label mb-0 whitespace-nowrap">Hasta:</label>
          <input type="date" className="input min-w-[160px]" value={toDate} onChange={e => setToDate(e.target.value)} />
        </div>

        {(tipoFilter || fromDate || toDate) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setTipoFilter(''); setFromDate(''); setToDate(''); }}>
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <SortTh col="fecha"           label="Fecha y Hora" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortTh col="tipo"            label="Tipo"         sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <th>Código</th>
              <SortTh col="producto_nombre" label="Producto"     sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortTh col="cantidad"        label="Cantidad"     sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="text-right" />
              <th className="text-right">Stock Anterior</th>
              <th>Cliente / Proveedor</th>
              <th>Motivo / Notas</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={8}>
                <EmptyState message="No se encontraron movimientos con ese criterio" icon={History} />
              </td></tr>
            ) : paginated.map(m => {
              const { label, className } = tipoMovBadge(m.tipo);
              const signo     = m.tipo === 'entrada' ? '+' : m.tipo === 'ajuste' ? '→' : '-';
              const colorCant = m.tipo === 'entrada' ? 'text-green-700'
                              : m.tipo === 'ajuste'  ? 'text-blue-700'
                              : m.tipo === 'dañado'  ? 'text-orange-600'
                              : 'text-primary';
              return (
                <tr key={m.id}>
                  <td className="whitespace-nowrap text-sm text-gray-600">{formatDate(m.fecha)}</td>
                  <td><span className={className}>{label}</span></td>
                  <td>
                    <span className="font-mono text-sm font-semibold text-deep-blue bg-blue-50 px-2 py-0.5 rounded">
                      {m.producto_codigo}
                    </span>
                  </td>
                  <td className="font-semibold text-gray-800">{m.producto_nombre}</td>
                  <td className={`text-right font-bold ${colorCant}`}>
                    {signo}{formatNumber(m.cantidad)}
                    <span className="text-gray-400 font-normal text-xs ml-1">{m.unidad_medida}</span>
                  </td>
                  <td className="text-right text-gray-500 text-sm">{formatNumber(m.cantidad_anterior)}</td>
                  <td className="text-gray-600 text-sm">
                    {m.cliente   ? <><span className="text-xs text-gray-400">Cliente: </span>{m.cliente}</> : null}
                    {m.proveedor ? <><span className="text-xs text-gray-400">Proveedor: </span>{m.proveedor}</> : null}
                    {!m.cliente && !m.proveedor ? <span className="text-gray-300">—</span> : null}
                  </td>
                  <td className="text-gray-500 text-sm max-w-[200px]">
                    {m.motivo ? <p className="truncate" title={m.motivo}>{m.motivo}</p> : null}
                    {m.notas  ? <p className="truncate text-gray-400 text-xs" title={m.notas}>{m.notas}</p> : null}
                    {!m.motivo && !m.notas ? <span className="text-gray-300">—</span> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} total={sorted.length} pageSize={PAGE_SIZE} />
    </div>
  );
}
