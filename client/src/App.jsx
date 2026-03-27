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

function AppRoutes() {
  const { usuario } = useUser();

  if (!usuario) return <Login />;

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
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
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
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
