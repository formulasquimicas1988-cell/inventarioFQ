import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Tag, Package, ArrowDownToLine,
  ArrowUpFromLine, SlidersHorizontal, History,
  Bell, FileBarChart2, ChevronLeft, ChevronRight,
  PackageX,
} from 'lucide-react';
import { useAlerts } from '../context/AlertContext';
import { cn } from '../lib/utils';

const NAV_ITEMS = [
  { path: '/',           label: 'Dashboard',     icon: LayoutDashboard },
  { path: '/categorias', label: 'Categorías',    icon: Tag },
  { path: '/productos',  label: 'Productos',     icon: Package },
  { type: 'separator', label: 'Control de Stock' },
  { path: '/entradas',   label: 'Entradas',      icon: ArrowDownToLine },
  { path: '/salidas',    label: 'Salidas',        icon: ArrowUpFromLine },
  { path: '/ajustes',    label: 'Ajustes',        icon: SlidersHorizontal },
  { path: '/danados',    label: 'Dañados',        icon: PackageX },
  { path: '/historial',  label: 'Historial',     icon: History },
  { type: 'separator', label: 'Reportes' },
  { path: '/alertas',    label: 'Alertas',       icon: Bell, alert: true },
  { path: '/reportes',   label: 'Reportes',      icon: FileBarChart2 },
];

export default function Sidebar({ collapsed, onToggle }) {
  const location  = useLocation();
  const { count } = useAlerts();

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-sidebar text-white transition-sidebar flex-shrink-0',
        collapsed ? 'w-[64px]' : 'w-[230px] xl:w-[260px]'
      )}
    >
      {/* Logo / Branding */}
      <div className={cn(
        'flex items-center border-b border-white/10 flex-shrink-0',
        collapsed ? 'justify-center py-5 px-2' : 'gap-3 px-5 py-5'
      )}>
        <div className="flex-shrink-0 w-10 h-10 rounded-xl overflow-hidden shadow-lg">
          <img src="/logo.ico" alt="Logo" className="w-full h-full object-contain" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-bold text-white leading-tight" style={{ fontSize: '15px' }}>
              Fórmulas Químicas
            </p>
            <p className="text-white/50" style={{ fontSize: '11px' }}>Sistema de Inventario</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {NAV_ITEMS.map((item, idx) => {
          if (item.type === 'separator') {
            return collapsed ? (
              <div key={idx} className="border-t border-white/10 my-2 mx-2" />
            ) : (
              <div key={idx} className="px-3 pt-5 pb-1">
                <span className="text-white/40 font-semibold uppercase tracking-wider" style={{ fontSize: '11px' }}>
                  {item.label}
                </span>
              </div>
            );
          }

          const Icon       = item.icon;
          const isActive   = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path);
          const showBadge  = item.alert && count > 0;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center rounded-xl my-0.5 transition-all duration-150 relative group',
                'min-h-[48px]',
                collapsed ? 'justify-center px-2 py-3 mx-1' : 'gap-3 px-3 py-3 mx-1',
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-white/65 hover:bg-white/8 hover:text-white'
              )}
            >
              <div className="relative flex-shrink-0">
                <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
                {showBadge && collapsed && (
                  <span className="alert-dot">{count > 9 ? '9+' : count}</span>
                )}
              </div>
              {!collapsed && (
                <>
                  <span className="flex-1 font-medium" style={{ fontSize: '15px' }}>
                    {item.label}
                  </span>
                  {showBadge && (
                    <span className="flex-shrink-0 bg-primary text-white rounded-full px-2 py-0.5 font-bold"
                      style={{ fontSize: '12px' }}>
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </>
              )}
              {/* Tooltip en modo colapsado */}
              {collapsed && (
                <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white rounded-lg
                                text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100
                                pointer-events-none transition-opacity z-50 shadow-xl">
                  {item.label}
                  {showBadge && <span className="ml-2 bg-primary rounded-full px-1.5 py-0.5" style={{ fontSize: '11px' }}>{count}</span>}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Toggle button */}
      <div className="border-t border-white/10 p-3">
        <button
          onClick={onToggle}
          title={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          className={cn(
            'w-full flex items-center rounded-xl py-3 px-3 transition-all duration-150',
            'text-white/50 hover:bg-white/10 hover:text-white min-h-[48px]',
            collapsed ? 'justify-center' : 'gap-3'
          )}
        >
          {collapsed
            ? <ChevronRight size={20} />
            : <>
                <ChevronLeft size={20} />
                <span className="font-medium" style={{ fontSize: '14px' }}>Colapsar</span>
              </>
          }
        </button>
      </div>
    </aside>
  );
}
