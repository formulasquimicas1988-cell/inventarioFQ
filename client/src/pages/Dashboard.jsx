import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Package, AlertTriangle, ArrowDownCircle, ArrowUpCircle, PackageX } from 'lucide-react';
import api from '../lib/api';
import { formatDate } from '../lib/utils';
import PageLoader from '../components/ui/PageLoader';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recientes, setRecientes] = useState([]);
  const [graficaMes, setGraficaMes] = useState([]);
  const [topSalidas, setTopSalidas] = useState([]);
  const [menosSalidas, setMenosSalidas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [statsRes, recientesRes, graficaRes, topRes, menosRes] = await Promise.all([
          api.get('/api/dashboard/stats'),
          api.get('/api/dashboard/movimientos-recientes'),
          api.get('/api/dashboard/grafica-mes'),
          api.get('/api/dashboard/top-salidas'),
          api.get('/api/dashboard/menos-salidas'),
        ]);
        setStats(statsRes.data || {});
        setRecientes(Array.isArray(recientesRes.data) ? recientesRes.data : []);
        setGraficaMes(Array.isArray(graficaRes.data) ? graficaRes.data : []);
        setTopSalidas(Array.isArray(topRes.data) ? topRes.data : []);
        setMenosSalidas(Array.isArray(menosRes.data) ? menosRes.data : []);
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) return <PageLoader />;

  const tipoBadge = (tipo) => {
    const map = {
      entrada: 'bg-green-100 text-green-700',
      salida: 'bg-red-100 text-red-700',
      ajuste: 'bg-amber-100 text-amber-700',
      danado: 'bg-orange-100 text-orange-700',
    };
    return map[tipo] || 'bg-slate-100 text-slate-600';
  };

  const tipoLabel = (tipo) => {
    const map = { entrada: 'Entrada', salida: 'Salida', ajuste: 'Ajuste', danado: 'Dañado' };
    return map[tipo] || tipo;
  };

  const graficaData = graficaMes.map((d) => ({
    ...d,
    dia: d.dia ? String(d.dia).split('-')[2] || d.dia : d.dia,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-blue mb-6">Dashboard</h1>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* Total Productos */}
        <div className="bg-white rounded-xl shadow-sm p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Package className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Total Productos</p>
            <p className="text-2xl font-bold text-brand-blue">{stats?.total_productos ?? 0}</p>
          </div>
        </div>

        {/* Stock Crítico */}
        <div className="bg-white rounded-xl shadow-sm p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Stock Crítico</p>
            <p className="text-2xl font-bold text-red-600">
              {stats?.stock_critico ?? 0}
            </p>
          </div>
        </div>

        {/* Entradas del Mes */}
        <div className="bg-white rounded-xl shadow-sm p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <ArrowDownCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Entradas del Mes</p>
            <p className="text-2xl font-bold text-green-600">{stats?.entradas_mes ?? 0}</p>
          </div>
        </div>

        {/* Salidas del Mes */}
        <div className="bg-white rounded-xl shadow-sm p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <ArrowUpCircle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Salidas del Mes</p>
            <p className="text-2xl font-bold text-red-600">{stats?.salidas_mes ?? 0}</p>
          </div>
        </div>

        {/* Dañados del Mes */}
        <div className="bg-white rounded-xl shadow-sm p-6 flex items-center gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${(stats?.danados_mes ?? 0) > 0 ? 'bg-orange-100' : 'bg-slate-100'}`}>
            <PackageX className={`w-6 h-6 ${(stats?.danados_mes ?? 0) > 0 ? 'text-orange-600' : 'text-slate-400'}`} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Dañados del Mes</p>
            <p className={`text-2xl font-bold ${(stats?.danados_mes ?? 0) > 0 ? 'text-orange-600' : 'text-slate-400'}`}>
              {stats?.danados_mes ?? 0}
            </p>
          </div>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-brand-blue mb-4">Movimientos del Mes</h2>
        {graficaData.length === 0 ? (
          <p className="text-slate-400 text-center py-10">Sin datos para este mes.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={graficaData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="entradas" name="Entradas" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="salidas" name="Salidas" fill="#CC0000" radius={[4, 4, 0, 0]} />
              <Bar dataKey="danados" name="Dañados" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top 10 Más Salidas */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-brand-blue mb-4">Top 10 Más Salidas</h2>
          {topSalidas.length === 0 ? (
            <p className="text-slate-400 text-center py-6">Sin datos.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 px-2 text-slate-500 font-medium w-8">#</th>
                    <th className="text-left py-2 px-2 text-slate-500 font-medium">Producto</th>
                    <th className="text-left py-2 px-2 text-slate-500 font-medium">Código</th>
                    <th className="text-right py-2 px-2 text-slate-500 font-medium">Total Salidas</th>
                  </tr>
                </thead>
                <tbody>
                  {topSalidas.map((p, i) => (
                    <tr key={p.id || i} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-2 px-2 text-slate-400">{i + 1}</td>
                      <td className="py-2 px-2 text-slate-700 font-medium">{p.nombre}</td>
                      <td className="py-2 px-2 text-slate-500">{p.codigo}</td>
                      <td className="py-2 px-2 text-right font-bold text-red-600">{Number(p.total_salidas || 0).toLocaleString('es-MX')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top 10 Menos Salidas */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-brand-blue mb-4">Top 10 Menos Salidas</h2>
          {menosSalidas.length === 0 ? (
            <p className="text-slate-400 text-center py-6">Sin datos.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 px-2 text-slate-500 font-medium w-8">#</th>
                    <th className="text-left py-2 px-2 text-slate-500 font-medium">Producto</th>
                    <th className="text-left py-2 px-2 text-slate-500 font-medium">Código</th>
                    <th className="text-right py-2 px-2 text-slate-500 font-medium">Total Salidas</th>
                  </tr>
                </thead>
                <tbody>
                  {menosSalidas.map((p, i) => (
                    <tr key={p.id || i} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-2 px-2 text-slate-400">{i + 1}</td>
                      <td className="py-2 px-2 text-slate-700 font-medium">{p.nombre}</td>
                      <td className="py-2 px-2 text-slate-500">{p.codigo}</td>
                      <td className="py-2 px-2 text-right font-bold text-slate-600">{Number(p.total_salidas || 0).toLocaleString('es-MX')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Últimos Movimientos */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-brand-blue mb-4">Últimos Movimientos</h2>
        {recientes.length === 0 ? (
          <p className="text-slate-400 text-center py-6">Sin movimientos recientes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-3 text-slate-500 font-medium">Fecha</th>
                  <th className="text-left py-3 px-3 text-slate-500 font-medium">Tipo</th>
                  <th className="text-left py-3 px-3 text-slate-500 font-medium">Producto</th>
                  <th className="text-left py-3 px-3 text-slate-500 font-medium">Código</th>
                  <th className="text-right py-3 px-3 text-slate-500 font-medium">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {recientes.map((m, i) => (
                  <tr key={m.id || i} className="border-b border-slate-50 hover:bg-slate-50 min-h-[56px]">
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{formatDate(m.fecha)}</td>
                    <td className="py-3 px-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${tipoBadge(m.tipo)}`}>
                        {tipoLabel(m.tipo)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-medium">{m.nombre || m.producto_nombre}</td>
                    <td className="py-3 px-3 text-slate-500">{m.codigo || m.producto_codigo}</td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-700">
                      {Number(m.cantidad || 0).toLocaleString('es-MX')} {m.unidad_medida}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
