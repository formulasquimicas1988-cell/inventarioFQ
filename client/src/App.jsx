import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ToastProvider } from './context/ToastContext'
import { AlertProvider } from './context/AlertContext'
import { UserProvider, useUser } from './context/UserContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Productos from './pages/Productos'
import Categorias from './pages/Categorias'
import Entradas from './pages/Entradas'
import Salidas from './pages/Salidas'
import Ajustes from './pages/Ajustes'
import Historial from './pages/Historial'
import Alertas from './pages/Alertas'
import Reportes from './pages/Reportes'
import Danados from './pages/Danados'
import Auditoria from './pages/Auditoria'
import Caja from './pages/Caja'
import VentasAdmin from './pages/VentasAdmin'

// Redirige a la ruta home según el rol
function HomeRedirect() {
  const { rol } = useUser();
  if (rol === 'caja') return <Navigate to="/caja" replace />;
  return <Navigate to="/dashboard" replace />;
}

// Rutas para rol 'caja': solo ve la página de Caja (sin Layout)
function CajaRoutes() {
  return (
    <Routes>
      <Route path="*" element={<Caja />} />
    </Routes>
  );
}

// Rutas para rol 'almacen' y 'admin': inventario + extras para admin
function InventarioRoutes() {
  const { rol } = useUser();
  return (
    <Routes>
      {/* Caja: full-screen, fuera del Layout (sin sidebar/header del inventario) */}
      {rol === 'admin' && <Route path="/caja" element={<Caja />} />}

      <Route path="/" element={<Layout />}>
        <Route index element={<HomeRedirect />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="productos" element={<Productos />} />
        <Route path="categorias" element={<Categorias />} />
        <Route path="entradas" element={<Entradas />} />
        <Route path="salidas" element={<Salidas />} />
        <Route path="ajustes" element={<Ajustes />} />
        <Route path="historial" element={<Historial />} />
        <Route path="danados" element={<Danados />} />
        <Route path="alertas" element={<Alertas />} />
        <Route path="reportes" element={<Reportes />} />
        <Route path="auditoria" element={<Auditoria />} />
        {rol === 'admin' && <Route path="ventas" element={<VentasAdmin />} />}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

function AppRoutes() {
  const { usuario, rol } = useUser();

  if (!usuario) return <Login />;

  if (rol === 'caja') return <CajaRoutes />;

  return <InventarioRoutes />;
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <UserProvider>
        <ToastProvider>
          <AlertProvider>
            <AppRoutes />
          </AlertProvider>
        </ToastProvider>
      </UserProvider>
    </BrowserRouter>
  )
}
