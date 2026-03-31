import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Package, Tag, ArrowDownCircle, ArrowUpCircle,
  SlidersHorizontal, History, Bell, FileBarChart2, ChevronLeft, ChevronRight, PackageX
} from 'lucide-react'
import { useAlerts } from '../context/AlertContext'

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/productos', label: 'Productos', icon: Package },
  { path: '/categorias', label: 'Categorías', icon: Tag },
  { path: '/entradas', label: 'Entradas', icon: ArrowDownCircle },
  { path: '/salidas', label: 'Salidas', icon: ArrowUpCircle },
  { path: '/ajustes', label: 'Ajustes', icon: SlidersHorizontal },
  { path: '/historial', label: 'Historial', icon: History },
  { path: '/danados', label: 'Dañados', icon: PackageX },
  { path: '/alertas', label: 'Alertas', icon: Bell, hasAlert: true },
  { path: '/reportes', label: 'Reportes', icon: FileBarChart2 },
]

export default function Sidebar({ mobileOpen, onMobileClose }) {
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true'
  })
  const { criticosCount } = useAlerts()

  const toggle = () => {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem('sidebar_collapsed', String(next))
      return next
    })
  }

  return (
    <aside
      className={`
        sidebar-transition flex flex-col flex-shrink-0 h-screen bg-brand-blue overflow-hidden
        fixed md:relative inset-y-0 left-0 z-40 md:z-auto
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}
      style={{ width: collapsed ? '72px' : '260px' }}
    >
      {/* Logo area */}
      <div className="flex items-center h-16 px-4 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="/logo.ico"
            alt="Fórmulas Químicas"
            className="w-9 h-9 flex-shrink-0 rounded-lg object-contain"
          />
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm leading-tight truncate">Fórmulas</p>
              <p className="text-white/70 text-xs leading-tight truncate">Químicas</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5">
        {NAV_ITEMS.map(({ path, label, icon: Icon, hasAlert }) => (
          <NavLink
            key={path}
            to={path}
            onClick={onMobileClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 transition-colors relative group
               ${collapsed ? 'justify-center' : ''}
               ${isActive
                 ? 'bg-white/10 border-l-4 border-brand-red text-white'
                 : 'border-l-4 border-transparent text-white/75 hover:bg-white/5 hover:text-white'
               }`
            }
            style={{ minHeight: '48px' }}
          >
            {({ isActive }) => (
              <>
                <div className="relative flex-shrink-0">
                  <Icon size={20} className={isActive ? 'text-white' : 'text-white/75 group-hover:text-white'} />
                  {hasAlert && criticosCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-brand-red text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5 leading-none">
                      {criticosCount > 99 ? '99+' : criticosCount}
                    </span>
                  )}
                </div>
                {!collapsed && (
                  <span className="text-sm font-medium truncate">{label}</span>
                )}
                {collapsed && (
                  <span className="
                    pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2
                    bg-slate-800 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg
                    whitespace-nowrap shadow-lg
                    opacity-0 group-hover:opacity-100
                    scale-95 group-hover:scale-100
                    transition-all duration-150 z-50
                  ">
                    {label}
                    {hasAlert && criticosCount > 0 && (
                      <span className="ml-1.5 bg-brand-red text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                        {criticosCount > 99 ? '99+' : criticosCount}
                      </span>
                    )}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle — desktop only */}
      <div className="hidden md:block flex-shrink-0 border-t border-white/10 p-2">
        <button
          onClick={toggle}
          className="w-full flex items-center justify-center rounded-lg text-white/75 hover:text-white hover:bg-white/5 transition-colors"
          style={{ minHeight: '48px' }}
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          {collapsed ? <ChevronRight size={20} /> : (
            <span className="flex items-center gap-2 text-sm">
              <ChevronLeft size={20} />
              <span>Colapsar</span>
            </span>
          )}
        </button>
      </div>
    </aside>
  )
}
