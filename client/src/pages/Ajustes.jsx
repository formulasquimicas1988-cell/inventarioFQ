import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../lib/api';
import { useToast } from '../context/ToastContext';
import { useUser } from '../context/UserContext';
import ProductoSearch from '../components/ui/ProductoSearch';
import SearchInput from '../components/ui/SearchInput';
import SafeButton from '../components/ui/SafeButton';
import Pagination from '../components/ui/Pagination';
import PageLoader from '../components/ui/PageLoader';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { formatDate } from '../lib/utils';

function getNowDatetimeLocal() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

const emptyForm = () => ({
  producto: null,
  nueva_cantidad: '',
  notas: '',
  fecha: getNowDatetimeLocal(),
});

export default function Ajustes() {
  const { success, error } = useToast();
  const { usuario } = useUser();
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [ajustes, setAjustes] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [cancelItem, setCancelItem] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const searchDebounce = useRef(null);

  const fetchAjustes = useCallback(async (searchVal, pageVal) => {
    setLoading(true);
    try {
      const params = { page: pageVal, limit: 20 };
      if (searchVal) params.search = searchVal;
      const res = await api.get('/api/movimientos/ajustes', { params });
      const data = res.data;
      if (Array.isArray(data)) {
        setAjustes(data);
        setTotal(data.length);
        setTotalPages(1);
      } else {
        setAjustes(Array.isArray(data?.data) ? data.data : []);
        setTotal(data?.total || 0);
        setTotalPages(data?.totalPages || 1);
      }
    } catch (err) {
      error('Error al cargar el historial de ajustes');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setPage(1);
      fetchAjustes(search, 1);
    }, 300);
  }, [search]);

  useEffect(() => {
    fetchAjustes(search, page);
  }, [page]);

  const handleCancelar = async () => {
    if (!cancelItem) return;
    setCancellingId(cancelItem.id);
    try {
      await api.delete(`/api/movimientos/${cancelItem.id}/cancelar`);
      success('Ajuste cancelado y stock restaurado');
      setCancelItem(null);
      fetchAjustes(search, page);
    } catch (err) {
      error(err?.response?.data?.error || 'Error al cancelar el ajuste');
    } finally {
      setCancellingId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.producto) {
      error('Selecciona un producto');
      return;
    }
    if (form.nueva_cantidad === '' || parseFloat(form.nueva_cantidad) < 0) {
      error('La nueva cantidad debe ser 0 o mayor');
      return;
    }
    if (!form.notas.trim()) {
      error('Las notas son obligatorias');
      return;
    }
    setSaving(true);
    try {
      await api.post('/api/movimientos/ajuste', {
        producto_id: form.producto.id,
        nueva_cantidad: parseFloat(form.nueva_cantidad),
        notas: form.notas.trim(),
        fecha: form.fecha || getNowDatetimeLocal(),
        usuario,
      });
      success('Ajuste registrado correctamente');
      setForm(emptyForm());
      setPage(1);
      fetchAjustes(search, 1);
    } catch (err) {
      error(err?.response?.data?.message || 'Error al registrar el ajuste');
    } finally {
      setSaving(false);
    }
  };

  const stockActual = form.producto ? parseFloat(form.producto.stock_actual) || 0 : null;
  const nuevaCantidad = form.nueva_cantidad !== '' ? parseFloat(form.nueva_cantidad) : null;
  const diferencia = stockActual !== null && nuevaCantidad !== null ? nuevaCantidad - stockActual : null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-blue mb-6">Ajustes de Inventario</h1>

      {/* Form Card */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Registrar Ajuste de Inventario</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Producto <span className="text-red-500">*</span>
              </label>
              <ProductoSearch
                value={form.producto}
                onChange={(p) => setForm((f) => ({ ...f, producto: p }))}
                placeholder="Buscar producto por nombre o código..."
              />
            </div>

            {form.producto && (
              <div className="md:col-span-2">
                <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-700">
                  <span className="font-semibold">Stock actual:</span>{' '}
                  {Number(stockActual).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                  {form.producto.unidad_medida}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nueva Cantidad <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.nueva_cantidad}
                onChange={(e) => setForm((f) => ({ ...f, nueva_cantidad: e.target.value }))}
                min="0"
                step="0.01"
                placeholder="0.00"
                required
                className="w-full min-h-[48px] px-3 py-2 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
              />
              <p className="text-xs text-slate-400 mt-1">Ingresa el stock absoluto que habrá después del ajuste.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha y Hora</label>
              <input
                type="datetime-local"
                value={form.fecha}
                onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
                className="w-full min-h-[48px] px-3 py-2 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
              />
            </div>

            {/* Preview */}
            {form.producto && nuevaCantidad !== null && (
              <div className="md:col-span-2">
                <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm flex flex-wrap gap-4">
                  <span className="text-slate-600">
                    Stock actual: <strong>{Number(stockActual).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                  </span>
                  <span className="text-slate-400">→</span>
                  <span className="text-slate-600">
                    Nuevo stock: <strong>{Number(nuevaCantidad).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                  </span>
                  <span className="text-slate-400">|</span>
                  <span className={diferencia >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                    Diferencia: {diferencia >= 0 ? '+' : ''}{Number(diferencia).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Notas <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.notas}
                onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
                placeholder="Describe el motivo del ajuste (conteo físico, merma, corrección de error, etc.)"
                rows={3}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <SafeButton type="submit" loading={saving} variant="primary" className="min-w-[180px]">
              Registrar Ajuste
            </SafeButton>
          </div>
        </form>
      </div>

      {/* History Card */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Historial de Ajustes</h2>

        <div className="mb-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por producto o código..."
            className="max-w-md"
          />
        </div>

        {loading ? (
          <PageLoader />
        ) : ajustes.length === 0 ? (
          <EmptyState message="No se encontraron ajustes registrados" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Fecha</th>
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Producto</th>
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Código</th>
                    <th className="text-right py-3 px-3 text-slate-500 font-medium">Stock Ant.</th>
                    <th className="text-right py-3 px-3 text-slate-500 font-medium">Nueva Cant.</th>
                    <th className="text-right py-3 px-3 text-slate-500 font-medium">Diferencia</th>
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Notas</th>
                    <th className="py-3 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {ajustes.map((a) => {
                    const diff = (parseFloat(a.stock_resultante) || 0) - (parseFloat(a.stock_anterior) || 0);
                    return (
                      <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50" style={{ minHeight: '56px' }}>
                        <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{formatDate(a.fecha)}</td>
                        <td className="py-3 px-3 font-medium text-slate-800">{a.nombre || a.producto_nombre}</td>
                        <td className="py-3 px-3 font-mono text-slate-500 text-xs">{a.codigo || a.producto_codigo}</td>
                        <td className="py-3 px-3 text-right text-slate-500">
                          {a.stock_anterior != null ? Number(a.stock_anterior).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-slate-700">
                          {a.stock_resultante != null ? Number(a.stock_resultante).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                        </td>
                        <td className={`py-3 px-3 text-right font-semibold ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {diff >= 0 ? '+' : ''}{Number(diff).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-slate-500 text-xs max-w-[200px]">
                          {a.notas || '—'}
                        </td>
                        <td className="py-3 px-3">
                          <button
                            onClick={() => setCancelItem(a)}
                            disabled={cancellingId === a.id}
                            className="text-xs text-red-400 hover:text-red-600 font-medium whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Cancelar ajuste"
                          >
                            {cancellingId === a.id ? '...' : 'Cancelar'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={20}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!cancelItem}
        onClose={() => setCancelItem(null)}
        onConfirm={handleCancelar}
        title="Cancelar ajuste"
        message={cancelItem ? `¿Cancelar el ajuste de "${cancelItem.nombre || cancelItem.producto_nombre}"? El stock se restaurará al valor anterior (${Number(cancelItem.stock_anterior ?? cancelItem.cantidad_anterior).toLocaleString('es-MX', { minimumFractionDigits: 2 })}).` : ''}
        confirmText="Sí, cancelar"
        cancelText="No, mantener"
      />
    </div>
  );
}
