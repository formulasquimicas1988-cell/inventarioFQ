import { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import {
  Package, AlertTriangle, ArrowDownToLine, ArrowUpFromLine,
  Tag, TrendingUp, TrendingDown, PackageX,
} from 'lucide-react';
import api from '../lib/api';
import { formatDate, formatNumber, tipoMovBadge } from '../lib/utils';
import PageLoader from '../components/ui/PageLoader';

// ── Colores ─────────────────────────────────────────────────
const C_ENTRADA = '#16a34a';
const C_SALIDA  = '#CC0000';
const C_BLUE    = '#0A1F44';

function StatCard({ icon: Icon, label, value, sub, iconBg, iconColor }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${iconBg}`}>
        <Icon size={28} className={iconColor} />
      </div>
      <div>
        <p className="text-3xl font-extrabold text-deep-blue leading-none">{value}</p>
        <p className="text-base font-semibold text-gray-700 mt-1">{label}</p>
        {sub && <p className="text-sm text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function formatChartDay(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}

export default function Dashboard() {
  const [stats,       setStats]       = useState(null);
  const [recientes,   setRecientes]   = useState([]);
  const [chartData,   setChartData]   = useState([]);
  const [topSalidas,  setTopSalidas]  = useState([]);
  const [menosSalidas,setMenosSalidas]= useState([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/stats'),
      api.get('/dashboard/movimientos-recientes'),
      api.get('/dashboard/chart-data'),
      api.get('/dashboard/top-salidas'),
      api.get('/dashboard/menos-salidas'),
    ]).then(([s, r, c, top, menos]) => {
      setStats(s.data || null);
      setRecientes(Array.isArray(r.data) ? r.data : []);
      setChartData(Array.isArray(c.data) ? c.data : []);
      setTopSalidas(Array.isArray(top.data) ? top.data : []);
      setMenosSalidas(Array.isArray(menos.data) ? menos.data : []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  const chartWithLabel = chartData.map(d => ({
    ...d,
    name: formatChartDay(d.dia),
  }));

  return (
    <div className="space-y-5">
      {/* ── Estadísticas principales ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          icon={Package}
          label="Productos Activos"
          value={stats?.total_productos ?? 0}
          sub={`${stats?.total_categorias ?? 0} categorías`}
          iconBg="bg-blue-50"
          iconColor="text-deep-blue"
        />
        <StatCard
          icon={AlertTriangle}
          label="Stock Crítico"
          value={stats?.stock_critico ?? 0}
          sub="Por debajo del mínimo"
          iconBg="bg-red-50"
          iconColor="text-primary"
        />
        <StatCard
          icon={ArrowDownToLine}
          label="Entradas Hoy"
          value={formatNumber(stats?.entradas_hoy ?? 0)}
          sub="Unidades recibidas"
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
        <StatCard
          icon={ArrowUpFromLine}
          label="Salidas Hoy"
          value={formatNumber(stats?.salidas_hoy ?? 0)}
          sub="Unidades entregadas"
          iconBg="bg-orange-50"
          iconColor="text-orange-600"
        />
        <StatCard
          icon={PackageX}
          label="Productos Dañados"
          value={stats?.total_danos ?? 0}
          sub={`${formatNumber(stats?.cantidad_danos ?? 0)} uds. dañadas`}
          iconBg="bg-orange-50"
          iconColor="text-orange-600"
        />
      </div>

      {/* ── Gráfica Entradas vs Salidas ── */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="text-xl font-bold text-deep-blue">Entradas vs Salidas — Mes Actual</h2>
            <p className="text-sm text-gray-400 mt-0.5">Movimientos diarios del mes en curso</p>
          </div>
        </div>
        <div className="card-body">
          {chartWithLabel.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              Sin movimientos registrados este mes
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartWithLabel} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 13, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 13, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '14px' }}
                  formatter={(value, name) => [
                    `${formatNumber(value)} uds`,
                    name === 'entradas' ? 'Entradas' : 'Salidas'
                  ]}
                />
                <Legend formatter={v => v === 'entradas' ? 'Entradas' : 'Salidas'} />
                <Bar dataKey="entradas" fill={C_ENTRADA} radius={[4,4,0,0]} maxBarSize={40} />
                <Bar dataKey="salidas"  fill={C_SALIDA}  radius={[4,4,0,0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Top 10 + Últimos movimientos ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top 10 más salidas */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <TrendingUp size={20} className="text-primary" />
              <h2 className="text-base font-bold text-deep-blue">Top 10 — Mayor Salida</h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            {topSalidas.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">Sin datos</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={topSalidas.slice(0,10)} layout="vertical" margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <YAxis dataKey="nombre" type="category" tick={{ fontSize: 11, fill: '#374151' }} tickLine={false} axisLine={false} width={120}
                    tickFormatter={v => v.length > 16 ? v.slice(0,16)+'…' : v}
                  />
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '13px' }}
                    formatter={v => [`${formatNumber(v)} uds`, 'Total salidas']}
                  />
                  <Bar dataKey="total_salidas" fill={C_SALIDA} radius={[0,4,4,0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top 10 menos salidas */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <TrendingDown size={20} className="text-blue-600" />
              <h2 className="text-base font-bold text-deep-blue">Top 10 — Menor Salida</h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            {menosSalidas.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">Sin datos</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={menosSalidas.slice(0,10)} layout="vertical" margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <YAxis dataKey="nombre" type="category" tick={{ fontSize: 11, fill: '#374151' }} tickLine={false} axisLine={false} width={120}
                    tickFormatter={v => v.length > 16 ? v.slice(0,16)+'…' : v}
                  />
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '13px' }}
                    formatter={v => [`${formatNumber(v)} uds`, 'Total salidas']}
                  />
                  <Bar dataKey="total_salidas" fill={C_BLUE} radius={[0,4,4,0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Últimos movimientos */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-base font-bold text-deep-blue">Últimos Movimientos</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {recientes.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">Sin movimientos</p>
            ) : recientes.map(m => {
              const { label, className } = tipoMovBadge(m.tipo);
              return (
                <div key={m.id} className="flex items-start gap-3 px-5 py-3.5">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate" style={{ fontSize: '14px' }}>
                      {m.producto_nombre}
                    </p>
                    <p className="text-gray-400 truncate" style={{ fontSize: '12px' }}>
                      {m.cliente || m.proveedor || '—'} · {formatDate(m.fecha)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={className}>{label}</span>
                    <span className="font-bold text-gray-700" style={{ fontSize: '13px' }}>
                      {formatNumber(m.cantidad)} {m.unidad_medida}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
