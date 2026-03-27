import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AlertProvider }  from './context/AlertContext';
import { ToastProvider }  from './context/ToastContext';
import Layout             from './components/Layout';
import Dashboard          from './pages/Dashboard';
import Categorias         from './pages/Categorias';
import Productos          from './pages/Productos';
import Entradas           from './pages/Entradas';
import Salidas            from './pages/Salidas';
import Ajustes            from './pages/Ajustes';
import Historial          from './pages/Historial';
import Alertas            from './pages/Alertas';
import Danados            from './pages/Danados';
import Reportes           from './pages/Reportes';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AlertProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index         element={<Dashboard />} />
              <Route path="categorias" element={<Categorias />} />
              <Route path="productos"  element={<Productos />} />
              <Route path="entradas"   element={<Entradas />} />
              <Route path="salidas"    element={<Salidas />} />
              <Route path="ajustes"    element={<Ajustes />} />
              <Route path="historial"  element={<Historial />} />
              <Route path="danados"    element={<Danados />} />
              <Route path="alertas"    element={<Alertas />} />
              <Route path="reportes"   element={<Reportes />} />
              <Route path="*"          element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </AlertProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
