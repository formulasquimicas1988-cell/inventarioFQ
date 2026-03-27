import { useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAlerts } from '../context/AlertContext';
import { formatDate } from '../lib/utils';

const TITLES = {
  '/':           { title: 'Dashboard',            subtitle: 'Resumen general del inventario' },
  '/categorias': { title: 'Categorías',           subtitle: 'Gestión de categorías de productos' },
  '/productos':  { title: 'Productos',            subtitle: 'Gestión del catálogo de productos' },
  '/entradas':   { title: 'Entradas de Stock',    subtitle: 'Registro de compras y recepciones' },
  '/salidas':    { title: 'Salidas de Stock',     subtitle: 'Registro de entregas a clientes' },
  '/ajustes':    { title: 'Ajustes de Inventario', subtitle: 'Correcciones y ajustes de stock' },
  '/historial':  { title: 'Historial de Movimientos', subtitle: 'Registro completo de movimientos' },
  '/danados':    { title: 'Productos Dañados',        subtitle: 'Registro de mermas y daños de inventario' },
  '/alertas':    { title: 'Alertas de Stock',     subtitle: 'Productos con stock crítico' },
  '/reportes':   { title: 'Reportes',             subtitle: 'Exportar datos del inventario' },
};

export default function Header() {
  const location = useLocation();
  const { count } = useAlerts();
  const now = new Date();

  const info = TITLES[location.pathname] || TITLES['/'];

  return (
    <header className="h-16 flex-shrink-0 flex items-center justify-between px-6 bg-deep-blue shadow-md">
      <div>
        <h1 className="font-bold text-white leading-tight" style={{ fontSize: '18px' }}>
          {info.title}
        </h1>
        <p className="text-white/50 leading-tight" style={{ fontSize: '12px' }}>
          {info.subtitle}
        </p>
      </div>

      <div className="flex items-center gap-4">
        {/* Hora actual */}
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-white/80 font-medium" style={{ fontSize: '13px' }}>
            {formatDate(now)}
          </span>
        </div>

        {/* Campana de alertas */}
        <a
          href="/alertas"
          className="relative flex items-center justify-center w-11 h-11 rounded-xl
                     text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          title={count > 0 ? `${count} producto(s) con stock crítico` : 'Sin alertas'}
        >
          <Bell size={22} />
          {count > 0 && (
            <span
              className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full
                         flex items-center justify-center text-white font-bold shadow-md"
              style={{ fontSize: '11px' }}
            >
              {count > 9 ? '9+' : count}
            </span>
          )}
        </a>

        {/* Avatar empresa */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg overflow-hidden shadow-md flex-shrink-0">
            <img src="/logo.ico" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div className="hidden md:block">
            <p className="text-white font-semibold leading-tight" style={{ fontSize: '13px' }}>
              Fórmulas Químicas
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
