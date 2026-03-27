import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Bell } from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../context/ToastContext';
import { useAlerts } from '../context/AlertContext';
import { formatNumber } from '../lib/utils';
import SearchInput from '../components/ui/SearchInput';
import PageLoader  from '../components/ui/PageLoader';

export default function Alertas() {
  const { toast }   = useToast();
  const { refresh } = useAlerts();

  const [criticos,   setCriticos]   = useState([]);
  const [filtered,   setFiltered]   = useState([]);
  const [search,     setSearch]     = useState('');
  const [searching,  setSearching]  = useState(false);
  const [loading,    setLoading]    = useState(true);

  const loadData = useCallback(async () => {
    try {
      const { data } = await api.get('/productos');
      const arr = Array.isArray(data) ? data : [];
      const c = arr.filter(p => parseFloat(p.stock_actual) < parseFloat(p.stock_minimo));
      c.sort((a, b) => {
        // Ordenar por diferencia más crítica primero
        const diffA = parseFloat(a.stock_actual) - parseFloat(a.stock_minimo);
        const diffB = parseFloat(b.stock_actual) - parseFloat(b.stock_minimo);
        return diffA - diffB;
      });
      setCriticos(c);
      refresh();
    } catch (err) {
      toast({ type: 'error', title: 'Error', description: err.message });
    } finally {
      setLoading(false);
    }
  }, [toast, refresh]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    setSearching(true);
    const t = setTimeout(() => {
      const s = search.toLowerCase();
      setFiltered(
        s ? criticos.filter(p =>
          p.nombre.toLowerCase().includes(s) ||
          p.codigo.toLowerCase().includes(s) ||
          (p.categoria_nombre || '').toLowerCase().includes(s)
        ) : criticos
      );
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [search, criticos]);

  if (loading) return <PageLoader />;

  function getNivelCritico(stockActual, stockMinimo) {
    const ratio = stockActual / stockMinimo;
    if (stockActual <= 0)    return { label: 'Sin Stock',      className: 'badge-red',    barColor: 'bg-red-600',    pct: 0 };
    if (ratio <= 0.25)       return { label: 'Muy Crítico',    className: 'badge-red',    barColor: 'bg-red-500',    pct: ratio * 100 };
    if (ratio <= 0.5)        return { label: 'Crítico',        className: 'badge-red',    barColor: 'bg-orange-500', pct: ratio * 100 };
    return                          { label: 'Bajo Mínimo',    className: 'badge-yellow', barColor: 'bg-yellow-500', pct: ratio * 100 };
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Alertas de Stock</h1>
          <p className="page-subtitle">
            {criticos.length === 0
              ? 'Todos los productos tienen stock suficiente'
              : <span className="text-primary font-semibold">{criticos.length} producto(s) por debajo del stock mínimo</span>
            }
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadData}>
          Actualizar
        </button>
      </div>

      {criticos.length === 0 ? (
        <div className="card p-16 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-5">
            <Bell size={40} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-700 mb-2">¡Sin Alertas!</h2>
          <p className="text-gray-400 max-w-md">
            Todos los productos tienen stock por encima del mínimo establecido. El inventario está en buen estado.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-5">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar por código, nombre o categoría..."
              loading={searching}
              className="max-w-md"
            />
          </div>

          {/* Resumen rápido */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Sin Stock',   filter: p => parseFloat(p.stock_actual) <= 0,                                                                     bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200' },
              { label: 'Muy Crítico', filter: p => parseFloat(p.stock_actual) > 0 && parseFloat(p.stock_actual)/parseFloat(p.stock_minimo) <= 0.25,    bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
              { label: 'Bajo Mínimo', filter: p => parseFloat(p.stock_actual)/parseFloat(p.stock_minimo) > 0.25,                                        bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
            ].map(({ label, filter, bg, text, border }) => (
              <div key={label} className={`card border ${border} ${bg} p-5 text-center`}>
                <p className={`text-3xl font-extrabold ${text}`}>{criticos.filter(filter).length}</p>
                <p className={`text-sm font-semibold ${text} mt-1`}>{label}</p>
              </div>
            ))}
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th className="text-right">Stock Actual</th>
                  <th className="text-right">Stock Mínimo</th>
                  <th className="text-right">Faltante</th>
                  <th>Nivel</th>
                  <th>Indicador</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-gray-400">
                    No se encontraron productos con ese criterio
                  </td></tr>
                ) : filtered.map(p => {
                  const stockA = parseFloat(p.stock_actual);
                  const stockM = parseFloat(p.stock_minimo);
                  const nivel  = getNivelCritico(stockA, stockM);
                  const falta  = Math.max(0, stockM - stockA);
                  const pct    = Math.min(100, nivel.pct);

                  return (
                    <tr key={p.id} className="bg-red-50/20">
                      <td>
                        <span className="font-mono font-semibold text-deep-blue bg-blue-50 px-2 py-0.5 rounded text-sm">
                          {p.codigo}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={16} className="text-primary flex-shrink-0" />
                          <span className="font-semibold text-gray-800">{p.nombre}</span>
                        </div>
                      </td>
                      <td>
                        {p.categoria_nombre
                          ? <span className="badge badge-blue">{p.categoria_nombre}</span>
                          : <span className="text-gray-300">—</span>
                        }
                      </td>
                      <td className="text-right font-bold text-primary">
                        {formatNumber(stockA)} <span className="text-gray-400 font-normal text-sm">{p.unidad_medida}</span>
                      </td>
                      <td className="text-right text-gray-600">
                        {formatNumber(stockM)} <span className="text-gray-400 text-sm">{p.unidad_medida}</span>
                      </td>
                      <td className="text-right font-bold text-orange-600">
                        {formatNumber(falta)} <span className="text-gray-400 font-normal text-sm">{p.unidad_medida}</span>
                      </td>
                      <td><span className={nivel.className}>{nivel.label}</span></td>
                      <td className="min-w-[100px]">
                        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                          <div
                            className={`h-2.5 rounded-full transition-all ${nivel.barColor}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{Math.round(pct)}% del mínimo</p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
