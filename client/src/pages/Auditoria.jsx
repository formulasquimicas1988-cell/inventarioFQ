import React, { useEffect, useState, useCallback, useRef } from 'react';
import api from '../lib/api';
import { useToast } from '../context/ToastContext';
import Pagination from '../components/ui/Pagination';
import PageLoader from '../components/ui/PageLoader';
import EmptyState from '../components/ui/EmptyState';
import { formatDate } from '../lib/utils';
import { ShieldCheck, LogIn } from 'lucide-react';

const MODULOS = ['all', 'Producto', 'Categoría', 'Movimiento'];

const ACCION_BADGE = {
  'creó':    'bg-green-100 text-green-700',
  'editó':   'bg-blue-100 text-blue-700',
  'eliminó': 'bg-red-100 text-red-700',
  'canceló': 'bg-orange-100 text-orange-700',
  'importó': 'bg-purple-100 text-purple-700',
};

export default function Auditoria() {
  const { error } = useToast();
  const [tab, setTab] = useState('auditoria'); // 'auditoria' | 'accesos'

  // Auditoría state
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [pageLogs, setPageLogs] = useState(1);
  const [totalPagesLogs, setTotalPagesLogs] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [filtroModulo, setFiltroModulo] = useState('all');
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('');
  const [filtroFechaFin, setFiltroFechaFin] = useState('');
  const debounceRef = useRef(null);

  // Accesos state
  const [accesos, setAccesos] = useState([]);
  const [loadingAccesos, setLoadingAccesos] = useState(true);
  const [pageAccesos, setPageAccesos] = useState(1);
  const [totalPagesAccesos, setTotalPagesAccesos] = useState(1);
  const [totalAccesos, setTotalAccesos] = useState(0);

  const fetchLogs = useCallback(async (page, usuario, modulo, fechaInicio, fechaFin) => {
    setLoadingLogs(true);
    try {
      const params = { page, limit: 50 };
      if (usuario) params.usuario = usuario;
      if (modulo && modulo !== 'all') params.modulo = modulo;
      if (fechaInicio) params.fecha_inicio = fechaInicio;
      if (fechaFin) params.fecha_fin = fechaFin;
      const res = await api.get('/api/auditoria', { params });
      setLogs(res.data.data || []);
      setTotalLogs(res.data.total || 0);
      setTotalPagesLogs(res.data.totalPages || 1);
    } catch (err) {
      error('Error al cargar auditoría');
    } finally {
      setLoadingLogs(false);
    }
  }, [error]);

  const fetchAccesos = useCallback(async (page) => {
    setLoadingAccesos(true);
    try {
      const res = await api.get('/api/auth/accesos', { params: { page, limit: 50 } });
      setAccesos(res.data.data || []);
      setTotalAccesos(res.data.total || 0);
      setTotalPagesAccesos(res.data.totalPages || 1);
    } catch (err) {
      error('Error al cargar accesos');
    } finally {
      setLoadingAccesos(false);
    }
  }, [error]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPageLogs(1);
      fetchLogs(1, filtroUsuario, filtroModulo, filtroFechaInicio, filtroFechaFin);
    }, 300);
  }, [filtroUsuario, filtroModulo, filtroFechaInicio, filtroFechaFin]);

  useEffect(() => {
    fetchLogs(pageLogs, filtroUsuario, filtroModulo, filtroFechaInicio, filtroFechaFin);
  }, [pageLogs]);

  useEffect(() => {
    fetchAccesos(pageAccesos);
  }, [pageAccesos, fetchAccesos]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-blue mb-6">Auditoría del Sistema</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('auditoria')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${tab === 'auditoria' ? 'bg-brand-blue text-white' : 'bg-white text-slate-600 hover:bg-slate-100 shadow-sm'}`}
        >
          <ShieldCheck size={16} /> Acciones del sistema
        </button>
        <button
          onClick={() => setTab('accesos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${tab === 'accesos' ? 'bg-brand-blue text-white' : 'bg-white text-slate-600 hover:bg-slate-100 shadow-sm'}`}
        >
          <LogIn size={16} /> Accesos / Logins
        </button>
      </div>

      {/* ── AUDITORÍA TAB ── */}
      {tab === 'auditoria' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          {/* Filtros */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <input
              type="text"
              value={filtroUsuario}
              onChange={e => setFiltroUsuario(e.target.value)}
              placeholder="Filtrar por usuario..."
              className="min-h-[44px] px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
            />
            <select
              value={filtroModulo}
              onChange={e => setFiltroModulo(e.target.value)}
              className="min-h-[44px] px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-red bg-white"
            >
              {MODULOS.map(m => (
                <option key={m} value={m}>{m === 'all' ? 'Todos los módulos' : m}</option>
              ))}
            </select>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Desde</label>
              <input
                type="date"
                value={filtroFechaInicio}
                onChange={e => setFiltroFechaInicio(e.target.value)}
                max={filtroFechaFin || undefined}
                className="w-full min-h-[44px] px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Hasta</label>
              <input
                type="date"
                value={filtroFechaFin}
                onChange={e => setFiltroFechaFin(e.target.value)}
                min={filtroFechaInicio || undefined}
                className="w-full min-h-[44px] px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
              />
            </div>
          </div>

          {loadingLogs ? <PageLoader /> : logs.length === 0 ? (
            <EmptyState message="No hay registros de auditoría" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-3 px-3 text-slate-500 font-medium">Fecha</th>
                      <th className="text-left py-3 px-3 text-slate-500 font-medium">Usuario</th>
                      <th className="text-left py-3 px-3 text-slate-500 font-medium">Acción</th>
                      <th className="text-left py-3 px-3 text-slate-500 font-medium">Módulo</th>
                      <th className="text-left py-3 px-3 text-slate-500 font-medium">Detalle</th>
                      <th className="text-left py-3 px-3 text-slate-500 font-medium">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(log => (
                      <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-3 px-3 text-slate-500 whitespace-nowrap text-xs">{formatDate(log.fecha)}</td>
                        <td className="py-3 px-3 font-medium text-slate-800">{log.usuario || '—'}</td>
                        <td className="py-3 px-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ACCION_BADGE[log.accion] || 'bg-slate-100 text-slate-600'}`}>
                            {log.accion}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600">{log.modulo}</td>
                        <td className="py-3 px-3 text-slate-500 text-xs max-w-xs truncate" title={log.detalle}>{log.detalle || '—'}</td>
                        <td className="py-3 px-3 text-slate-400 text-xs font-mono">{log.ip || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={pageLogs} totalPages={totalPagesLogs} total={totalLogs} limit={50} onPageChange={setPageLogs} />
            </>
          )}
        </div>
      )}

      {/* ── ACCESOS TAB ── */}
      {tab === 'accesos' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          {loadingAccesos ? <PageLoader /> : accesos.length === 0 ? (
            <EmptyState message="No hay registros de acceso" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-3 px-3 text-slate-500 font-medium">Fecha y Hora</th>
                      <th className="text-left py-3 px-3 text-slate-500 font-medium">Usuario</th>
                      <th className="text-left py-3 px-3 text-slate-500 font-medium">IP / Ubicación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accesos.map(a => (
                      <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-3 px-3 text-slate-500 whitespace-nowrap">{formatDate(a.fecha)}</td>
                        <td className="py-3 px-3 font-medium text-slate-800">{a.usuario}</td>
                        <td className="py-3 px-3 text-slate-500 font-mono text-xs">{a.ip || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={pageAccesos} totalPages={totalPagesAccesos} total={totalAccesos} limit={50} onPageChange={setPageAccesos} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
