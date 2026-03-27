import React, { useState } from 'react';
import { FileDown, Package, Clock, Info } from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../context/ToastContext';
import SafeButton from '../components/ui/SafeButton';

const TIPO_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'entrada', label: 'Entrada' },
  { value: 'salida', label: 'Salida' },
  { value: 'ajuste', label: 'Ajuste' },
  { value: 'danado', label: 'Dañado' },
];

async function downloadFile(url, params, filename) {
  const response = await api.get(url, { params, responseType: 'blob' });
  const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(blobUrl);
}

export default function Reportes() {
  const { success, error } = useToast();
  const [loadingInventario, setLoadingInventario] = useState(false);
  const [loadingMovimientos, setLoadingMovimientos] = useState(false);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [tipoMovimiento, setTipoMovimiento] = useState('');

  const handleExportInventario = async () => {
    setLoadingInventario(true);
    try {
      await downloadFile('/api/reportes/inventario', {}, 'inventario.xlsx');
      success('Reporte de inventario descargado correctamente');
    } catch (err) {
      error('Error al exportar el inventario');
    } finally {
      setLoadingInventario(false);
    }
  };

  const handleExportMovimientos = async () => {
    setLoadingMovimientos(true);
    try {
      const params = {};
      if (fechaInicio) params.fecha_inicio = fechaInicio;
      if (fechaFin) params.fecha_fin = fechaFin;
      if (tipoMovimiento) params.tipo = tipoMovimiento;
      await downloadFile('/api/reportes/movimientos', params, 'movimientos.xlsx');
      success('Reporte de movimientos descargado correctamente');
    } catch (err) {
      error('Error al exportar los movimientos');
    } finally {
      setLoadingMovimientos(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-blue mb-6">Reportes</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Card 1: Inventario Actual */}
        <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-brand-blue">Inventario Actual</h2>
          </div>
          <p className="text-slate-500 text-sm">
            Exporta el inventario completo con stock actual, mínimos y estado de cada producto.
          </p>
          <div className="mt-auto pt-2">
            <SafeButton
              onClick={handleExportInventario}
              loading={loadingInventario}
              variant="primary"
              className="w-full"
            >
              <FileDown className="w-4 h-4" />
              Exportar a Excel
            </SafeButton>
          </div>
        </div>

        {/* Card 2: Historial de Movimientos */}
        <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <h2 className="text-lg font-semibold text-brand-blue">Historial de Movimientos</h2>
          </div>
          <p className="text-slate-500 text-sm">
            Exporta el historial filtrado por rango de fechas y tipo de movimiento.
          </p>

          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Fecha Inicio</label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full min-h-[48px] px-3 py-2 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-brand-red"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Fecha Fin</label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full min-h-[48px] px-3 py-2 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-brand-red"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Tipo</label>
              <select
                value={tipoMovimiento}
                onChange={(e) => setTipoMovimiento(e.target.value)}
                className="w-full min-h-[48px] px-3 py-2 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-brand-red bg-white"
              >
                {TIPO_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-auto pt-2">
            <SafeButton
              onClick={handleExportMovimientos}
              loading={loadingMovimientos}
              variant="primary"
              className="w-full"
            >
              <FileDown className="w-4 h-4" />
              Exportar a Excel
            </SafeButton>
          </div>
        </div>
      </div>

      {/* Card 3: Info */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
            <Info className="w-5 h-5 text-slate-500" />
          </div>
          <h2 className="text-lg font-semibold text-brand-blue">Información de Exportación</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <h3 className="font-semibold text-slate-700 mb-2">Reporte: Inventario Actual</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 text-slate-500 font-medium">Columna</th>
                  <th className="text-left py-2 text-slate-500 font-medium">Descripción</th>
                </tr>
              </thead>
              <tbody className="text-slate-600">
                {[
                  ['Código', 'Código único del producto'],
                  ['Nombre', 'Nombre del producto'],
                  ['Categoría', 'Categoría asignada'],
                  ['Stock Actual', 'Cantidad en existencia'],
                  ['Stock Mínimo', 'Umbral de alerta'],
                  ['Unidad', 'Unidad de medida'],
                  ['Estado', 'Crítico / Bajo / OK'],
                ].map(([col, desc]) => (
                  <tr key={col} className="border-b border-slate-50">
                    <td className="py-1.5 font-medium">{col}</td>
                    <td className="py-1.5 text-slate-400">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="font-semibold text-slate-700 mb-2">Reporte: Historial de Movimientos</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 text-slate-500 font-medium">Columna</th>
                  <th className="text-left py-2 text-slate-500 font-medium">Descripción</th>
                </tr>
              </thead>
              <tbody className="text-slate-600">
                {[
                  ['Fecha', 'Fecha y hora en formato 12h AM/PM'],
                  ['Tipo', 'entrada / salida / ajuste / danado'],
                  ['Código', 'Código del producto'],
                  ['Producto', 'Nombre del producto'],
                  ['Cantidad', 'Unidades del movimiento'],
                  ['Stock Anterior', 'Stock antes del movimiento'],
                  ['Stock Resultante', 'Stock después del movimiento'],
                  ['Cliente / Proveedor', 'Según el tipo de movimiento'],
                  ['Motivo / Notas', 'Justificación o notas adicionales'],
                ].map(([col, desc]) => (
                  <tr key={col} className="border-b border-slate-50">
                    <td className="py-1.5 font-medium">{col}</td>
                    <td className="py-1.5 text-slate-400">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-slate-400 mt-4">
          Las fechas en los reportes se exportan en formato DD/MM/YYYY hh:mm AM/PM (hora local).
        </p>
      </div>
    </div>
  );
}
