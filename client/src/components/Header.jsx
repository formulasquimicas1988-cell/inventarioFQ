import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { LogOut, Menu } from 'lucide-react'

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/productos': 'Productos',
  '/categorias': 'Categorías',
  '/entradas': 'Entradas',
  '/salidas': 'Salidas',
  '/ajustes': 'Ajustes de Inventario',
  '/historial': 'Historial de Movimientos',
  '/alertas': 'Alertas de Stock',
  '/reportes': 'Reportes',
  '/danados': 'Productos Dañados',
  '/auditoria': 'Auditoría del Sistema',
  '/ventas': 'Gestión de Ventas',
  '/caja': 'Caja',
}

const ROL_BADGE = {
  admin: { label: 'Admin', cls: 'bg-brand-red' },
  caja: { label: 'Caja', cls: 'bg-emerald-600' },
  almacen: { label: 'Almacén', cls: 'bg-slate-500' },
}

function getPageTitle(pathname) {
  return PAGE_TITLES[pathname] || 'Inventario'
}

function formatDateTime(date) {
  return date.toLocaleString('es-MX', {
    timeZone: 'America/Tegucigalpa',
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export default function Header({ onMenuToggle }) {
  const location = useLocation()
  const { usuario, rol, logout } = useUser()
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  const title = getPageTitle(location.pathname)
  const badge = ROL_BADGE[rol] || ROL_BADGE.almacen

  return (
    <header
      className="bg-brand-blue flex items-center justify-between px-3 md:px-6 flex-shrink-0"
      style={{ height: '64px' }}
    >
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuToggle}
          className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-white font-semibold text-base md:text-lg truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
        <div className="text-white/80 text-sm capitalize hidden sm:block">
          {formatDateTime(now)}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-brand-red flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">{usuario.charAt(0).toUpperCase()}</span>
          </div>
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-white text-sm font-medium leading-tight">{usuario}</span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded text-white ${badge.cls}`}>
              {badge.label}
            </span>
          </div>
          <button
            onClick={logout}
            title="Cambiar usuario"
            className="ml-1 flex items-center justify-center w-8 h-8 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}
