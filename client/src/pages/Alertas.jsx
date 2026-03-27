import React, { useEffect, useState } from 'react';
import { PackageCheck, RefreshCw } from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../context/ToastContext';
import SafeButton from '../components/ui/SafeButton';
import PageLoader from '../components/ui/PageLoader';
import EmptyState from '../components/ui/EmptyState';

export default function Alertas() {
  const { error } = useToast();
  const [criticos, setCriticos] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCriticos = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/alertas/criticos');
      setCriticos(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      error('Error al cargar alertas de stock crítico');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCriticos();
  }, []);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-brand-blue">Alertas de Stock</h1>
        <SafeButton onClick={fetchCriticos} variant="ghost" disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refrescar
        </SafeButton>
      </div>

      {/* Header status card */}
      {!loading && (
        <div
          className={`rounded-xl p-5 mb-6 flex items-center gap-3 ${
            criticos.length > 0
              ? 'bg-red-50 border border-red-200'
              : 'bg-green-50 border border-green-200'
          }`}
        >
          {criticos.length > 0 ? (
            <>
              <span className="text-2xl">⚠️</span>
              <div>
                <p className={`font-bold text-lg text-red-700`}>
                  {criticos.length} {criticos.length === 1 ? 'producto' : 'productos'} con stock crítico
                </p>
                <p className="text-sm text-red-500">Revisa los productos a continuación y realiza entradas para reponer el stock.</p>
              </div>
            </>
          ) : (
            <>
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-bold text-lg text-green-700">Todo el inventario está en niveles correctos</p>
                <p className="text-sm text-green-500">Todos los productos tienen stock por encima del mínimo establecido.</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        {loading ? (
          <PageLoader />
        ) : criticos.length === 0 ? (
          <EmptyState
            icon={PackageCheck}
            message="Todos los productos tienen stock suficiente"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-3 text-slate-500 font-medium">Código</th>
                  <th className="text-left py-3 px-3 text-slate-500 font-medium">Nombre</th>
                  <th className="text-left py-3 px-3 text-slate-500 font-medium">Categoría</th>
                  <th className="text-right py-3 px-3 text-slate-500 font-medium">Stock Actual</th>
                  <th className="text-right py-3 px-3 text-slate-500 font-medium">Stock Mínimo</th>
                  <th className="text-right py-3 px-3 text-slate-500 font-medium">Déficit</th>
                  <th className="text-left py-3 px-3 text-slate-500 font-medium">Unidad</th>
                </tr>
              </thead>
              <tbody>
                {criticos.map((p) => {
                  const deficit = (parseFloat(p.stock_minimo) || 0) - (parseFloat(p.stock_actual) || 0);
                  const highDeficit = deficit > (parseFloat(p.stock_minimo) || 0) * 0.5;
                  return (
                    <tr
                      key={p.id}
                      className={`border-b border-slate-50 ${
                        highDeficit
                          ? 'bg-red-50 border-l-4 border-l-red-500'
                          : 'bg-amber-50 border-l-4 border-l-amber-500'
                      }`}
                      style={{ minHeight: '56px' }}
                    >
                      <td className="py-3 px-3 font-mono text-slate-600 text-xs">{p.codigo}</td>
                      <td className="py-3 px-3 font-semibold text-slate-800">{p.nombre}</td>
                      <td className="py-3 px-3 text-slate-500">{p.categoria_nombre || '—'}</td>
                      <td className="py-3 px-3 text-right font-bold text-red-600">
                        {Number(p.stock_actual || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-600">
                        {Number(p.stock_minimo || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className={`py-3 px-3 text-right font-bold ${highDeficit ? 'text-red-700' : 'text-amber-700'}`}>
                        {Number(Math.max(deficit, 0)).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-slate-500">{p.unidad_medida}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
