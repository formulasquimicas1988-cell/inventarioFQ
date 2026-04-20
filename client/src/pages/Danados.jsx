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
  cantidad: '',
  notas: '',
  fecha: getNowDatetimeLocal(),
});

export default function Danados() {
  const { success, error } = useToast();
  const { usuario } = useUser();
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [danados, setDanados] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [cancelItem, setCancelItem] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const searchDebounce = useRef(null);

  const fetchDanados = useCallback(async (searchVal, pageVal) => {
    setLoading(true);
    try {
      const params = { page: pageVal, limit: 20 };
      if (searchVal) params.search = searchVal;
      const res = await api.get('/api/movimientos/danados', { params });
      const data = res.data;
      if (Array.isArray(data)) {
        setDanados(data);
        setTotal(data.length);
        setTotalPages(1);
      } else {
        setDanados(Array.isArray(data?.data) ? data.data : []);
        setTotal(data?.total || 0);
        setTotalPages(data?.totalPages || 1);
      }
    } catch (err) {
      error('Error al cargar el historial de productos dañados');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setPage(1);
      fetchDanados(search, 1);
    }, 300);
  }, [search]);

  useEffect(() => {
    fetchDanados(search, page);
  }, [page]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.producto) {
      error('Selecciona un producto');
      return;
    }
    if (!form.cantidad || parseFloat(form.cantidad) <= 0) {
      error('La cantidad debe ser mayor a 0');
      return;
    }
    if (!form.notas.trim()) {
      error('El motivo del daño es obligatorio');
      return;
    }
    setSaving(true);
    try {
      await api.post('/api/movimientos/danado', {
        producto_id: form.producto.id,
        cantidad: parseFloat(form.cantidad),
        notas: form.notas.trim(),
        usuario,
      });
      success('Producto dañado registrado correctamente');
      setForm(emptyForm());
      setPage(1);
      fetchDanados(search, 1);
    } catch (err) {
      error(err?.response?.data?.error || 'Error al registrar el producto dañado');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelar = async () => {
    if (!cancelItem) return;
    setCancellingId(cancelItem.id);
    try {
      await api.delete(`/api/movimientos/${cancelItem.id}/cancelar`);
      success('Registro cancelado y stock restaurado');
      setCancelItem(null);
      fetchDanados(search, page);
    } catch (err) {
      error(err?.response?.data?.error || 'Error al cancelar el registro');
    } finally {
      setCancellingId(null);
    }
  };

  const stockActual = form.producto ? parseFloat(form.producto.stock_actual) || 0 : null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-blue mb-6">Productos Dañados</h1>

      {/* Form Card */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Registrar Producto Dañado</h2>
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
                <div className="bg-orange-50 border border-orange-100 rounded-lg px-4 py-3 text-sm text-orange-700">
                  <span className="font-semibold">Stock actual:</span>{' '}
                  {Number(stockActual).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}{' '}
                  {form.producto.unidad_medida}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Cantidad Dañada <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.cantidad}
                onKeyDown={(e) => { if (e.key === '.' || e.key === ',') e.preventDefault(); }}
                onChange={(e) => setForm((f) => ({ ...f, cantidad: e.target.value }))}
                min="1"
                step="1"
                placeholder="0"
                required
                className="w-full min-h-[48px] px-3 py-2 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
              />
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

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Motivo del Daño <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.notas}
                onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
                placeholder="Describe el motivo del daño (caducidad, derrame, contaminación, golpe, etc.)"
                rows={3}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <SafeButton type="submit" loading={saving} variant="primary" className="min-w-[180px]">
              Registrar Daño
            </SafeButton>
          </div>
        </form>
      </div>

      {/* History Card */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Historial de Productos Dañados</h2>

        <div className="mb-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por producto, código o motivo..."
            className="max-w-md"
          />
        </div>

        {loading ? (
          <PageLoader />
        ) : danados.length === 0 ? (
          <EmptyState message="No se encontraron registros de productos dañados" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Fecha</th>
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Producto</th>
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Código</th>
                    <th className="text-right py-3 px-3 text-slate-500 font-medium">Cantidad</th>
                    <th className="text-right py-3 px-3 text-slate-500 font-medium">Stock Ant.</th>
                    <th className="text-right py-3 px-3 text-slate-500 font-medium">Stock Res.</th>
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Motivo</th>
                    <th className="py-3 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {danados.map((d) => (
                    <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50" style={{ minHeight: '56px' }}>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{formatDate(d.fecha)}</td>
                      <td className="py-3 px-3 font-medium text-slate-800">{d.nombre || d.producto_nombre}</td>
                      <td className="py-3 px-3 font-mono text-slate-500 text-xs">{d.codigo || d.producto_codigo}</td>
                      <td className="py-3 px-3 text-right font-semibold text-orange-600">
                        -{Number(d.cantidad || 0).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {d.unidad_medida}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-500">
                        {d.stock_anterior != null ? Number(d.stock_anterior).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '—'}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-700 font-medium">
                        {d.stock_resultante != null ? Number(d.stock_resultante).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '—'}
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-xs max-w-[200px] truncate">{d.notas || '—'}</td>
                      <td className="py-3 px-3">
                        <button
                          onClick={() => setCancelItem(d)}
                          disabled={cancellingId === d.id}
                          className="text-xs text-red-400 hover:text-red-600 font-medium whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Cancelar registro"
                        >
                          {cancellingId === d.id ? '...' : 'Cancelar'}
                        </button>
                      </td>
                    </tr>
                  ))}
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
        title="Cancelar registro de daño"
        message={cancelItem ? `¿Cancelar el registro de daño de ${Number(cancelItem.cantidad).toLocaleString('es-MX', { minimumFractionDigits: 0 })} ${cancelItem.unidad_medida} de "${cancelItem.nombre || cancelItem.producto_nombre}"? El stock se restaurará al valor anterior.` : ''}
        confirmText="Sí, cancelar"
        cancelText="No, mantener"
      />
    </div>
  );
}
