import React, { useEffect, useState, useRef } from 'react';
import { FileDown } from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../context/ToastContext';
import SearchInput from '../components/ui/SearchInput';
import SafeButton from '../components/ui/SafeButton';
import Pagination from '../components/ui/Pagination';
import PageLoader from '../components/ui/PageLoader';
import EmptyState from '../components/ui/EmptyState';
import { formatDate } from '../lib/utils';

const TIPO_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'entrada', label: 'Entrada' },
  { value: 'salida', label: 'Salida' },
  { value: 'ajuste', label: 'Ajuste' },
  { value: 'danado', label: 'Dañado' },
];

const TIPO_BADGE = {
  entrada: 'bg-green-500 text-white',
  salida: 'bg-red-500 text-white',
  ajuste: 'bg-amber-500 text-white',
  danado: 'bg-orange-500 text-white',
};

const TIPO_LABEL = {
  entrada: 'Entrada',
  salida: 'Salida',
  ajuste: 'Ajuste',
  danado: 'Dañado',
};

export default function Historial() {
  const { error } = useToast();
  const [movimientos, setMovimientos] = useState([]);
  const [search, setSearch] = useState('');
  const [tipo, setTipo] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const debounceRef = useRef(null);

  const fetchMovimientos = async (searchVal, tipoVal, fechaInicioVal, fechaFinVal, pageVal) => {
    setLoading(true);
    try {
      const params = { page: pageVal, limit: 50 };
      if (searchVal) params.search = searchVal;
      if (tipoVal) params.tipo = tipoVal;
      if (fechaInicioVal) params.fecha_inicio = fechaInicioVal;
      if (fechaFinVal) params.fecha_fin = fechaFinVal;
      const res = await api.get('/api/movimientos', { params });
      const data = res.data;
      if (Array.isArray(data)) {
        setMovimientos(data);
        setTotal(data.length);
        setTotalPages(1);
      } else {
        setMovimientos(Array.isArray(data?.data) ? data.data : []);
        setTotal(data?.total || 0);
        setTotalPages(data?.totalPages || 1);
      }
    } catch (err) {
      error('Error al cargar el historial de movimientos');
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch on filter changes (debounced for search)
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchMovimientos(search, tipo, fechaInicio, fechaFin, 1);
    }, 300);
  }, [search, tipo, fechaInicio, fechaFin]);

  useEffect(() => {
    fetchMovimientos(search, tipo, fechaInicio, fechaFin, page);
  }, [page]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (tipo) params.tipo = tipo;
      if (fechaInicio) params.fecha_inicio = fechaInicio;
      if (fechaFin) params.fecha_fin = fechaFin;
      const res = await api.get('/api/reportes/movimientos', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `historial_${new Date().toISOString().slice(0,10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      error('Error al exportar el historial');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-brand-blue">Historial de Movimientos</h1>
        <SafeButton onClick={handleExport} loading={exporting} variant="ghost">
          <FileDown className="w-4 h-4" />
          Exportar Excel
        </SafeButton>
      </div>

      {/* Filters Card */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Buscar</label>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Producto, código, cliente..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Tipo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full min-h-[48px] px-3 py-2 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-brand-red bg-white"
            >
              {TIPO_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Fecha Inicio</label>
            <input
              type="date"
              value={fechaInicio}
              max={fechaFin || undefined}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full min-h-[48px] px-3 py-2 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-brand-red"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Fecha Fin</label>
            <input
              type="date"
              value={fechaFin}
              min={fechaInicio || undefined}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full min-h-[48px] px-3 py-2 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-brand-red"
            />
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        {!loading && (
          <p className="text-sm text-slate-500 mb-4 font-medium">
            Total: <span className="text-slate-700">{total.toLocaleString('es-MX')}</span> movimientos
          </p>
        )}

        {loading ? (
          <PageLoader />
        ) : movimientos.length === 0 ? (
          <EmptyState message="No se encontraron movimientos" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-3 text-slate-500 font-medium whitespace-nowrap">Fecha</th>
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Tipo</th>
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Código</th>
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Producto</th>
                    <th className="text-right py-3 px-3 text-slate-500 font-medium">Cantidad</th>
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Unidad</th>
                    <th className="text-right py-3 px-3 text-slate-500 font-medium">Stock Ant.</th>
                    <th className="text-right py-3 px-3 text-slate-500 font-medium">Stock Res.</th>
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Cliente</th>
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Proveedor</th>
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Notas</th>
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Registró</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map((m) => (
                    <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50" style={{ minHeight: '56px' }}>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap text-xs">{formatDate(m.fecha)}</td>
                      <td className="py-3 px-3">
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${TIPO_BADGE[m.tipo] || 'bg-slate-200 text-slate-700'}`}>
                          {TIPO_LABEL[m.tipo] || m.tipo}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500 text-xs whitespace-nowrap">{m.codigo || m.producto_codigo || '—'}</td>
                      <td className="py-3 px-3 font-medium text-slate-800 whitespace-nowrap">{m.nombre || m.producto_nombre || '—'}</td>
                      <td className="py-3 px-3 text-right font-semibold text-slate-700 whitespace-nowrap">
                        {Number(m.cantidad || 0).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap">{m.unidad_medida || '—'}</td>
                      <td className="py-3 px-3 text-right text-slate-500 whitespace-nowrap">
                        {m.stock_anterior != null ? Number(m.stock_anterior).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '—'}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-700 font-medium whitespace-nowrap">
                        {m.stock_resultante != null ? Number(m.stock_resultante).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '—'}
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-xs">{m.cliente || '—'}</td>
                      <td className="py-3 px-3 text-slate-500 text-xs">{m.proveedor || '—'}</td>
                      <td className="py-3 px-3 text-slate-400 text-xs max-w-[150px] truncate">{m.notas || '—'}</td>
                      <td className="py-3 px-3 text-slate-500 text-xs whitespace-nowrap">{m.usuario || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={50}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
