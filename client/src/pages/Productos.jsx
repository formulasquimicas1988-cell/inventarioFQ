import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Pencil, Trash2, Plus, FileUp, FileDown, ChevronUp, ChevronDown } from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../context/ToastContext';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import SearchInput from '../components/ui/SearchInput';
import SafeButton from '../components/ui/SafeButton';
import Pagination from '../components/ui/Pagination';
import PageLoader from '../components/ui/PageLoader';
import EmptyState from '../components/ui/EmptyState';
import { getStockBadge, getStockStatus } from '../lib/utils';
import { useSortable } from '../hooks/useSortable';
import { useUser } from '../context/UserContext';

const UNIDADES = ['Litros', 'Kilos', 'Gramos', 'Unidades', 'Cajas', 'Galones', 'Toneladas', 'Metros'];

function getStatusLabel(stockActual, stockMinimo) {
  const s = getStockStatus(stockActual, stockMinimo);
  if (s === 'critico') return 'Crítico';
  if (s === 'bajo') return 'Bajo';
  return 'OK';
}

const emptyForm = {
  codigo: '',
  nombre: '',
  categoria_id: '',
  stock_actual: '',
  stock_minimo: '',
  unidad_medida: 'Litros',
  unidad_custom: '',
};

export default function Productos() {
  const { success, error } = useToast();
  const { usuario } = useUser();
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [search, setSearch] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const searchDebounce = useRef(null);
  const fileInputRef = useRef(null);
  const { sorted: productosSorted, sortKey, sortDir, handleSort } = useSortable(productos, 'nombre');

  const fetchProductos = useCallback(async (searchVal, catVal, pageVal) => {
    setLoading(true);
    try {
      const params = { page: pageVal, limit: 20 };
      if (searchVal) params.search = searchVal;
      if (catVal) params.categoria_id = catVal;
      const res = await api.get('/api/productos', { params });
      const data = res.data;
      if (Array.isArray(data)) {
        setProductos(data);
        setTotal(data.length);
        setTotalPages(1);
      } else {
        setProductos(Array.isArray(data?.data) ? data.data : []);
        setTotal(data?.total || 0);
        setTotalPages(data?.totalPages || 1);
      }
    } catch (err) {
      error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    api.get('/api/categorias').then(res => {
      setCategorias(Array.isArray(res.data) ? res.data : []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setPage(1);
      fetchProductos(search, categoriaFilter, 1);
    }, 300);
  }, [search, categoriaFilter]);

  useEffect(() => {
    fetchProductos(search, categoriaFilter, page);
  }, [page]);

  const openCreate = () => {
    setEditItem(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditItem(p);
    const isCustom = !UNIDADES.includes(p.unidad_medida);
    setForm({
      codigo: p.codigo || '',
      nombre: p.nombre || '',
      categoria_id: p.categoria_id || '',
      stock_actual: '',
      stock_minimo: p.stock_minimo != null ? String(p.stock_minimo) : '',
      unidad_medida: isCustom ? '__custom__' : (p.unidad_medida || 'Litros'),
      unidad_custom: isCustom ? (p.unidad_medida || '') : '',
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditItem(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.codigo.trim() || !form.nombre.trim()) {
      error('Código y nombre son obligatorios');
      return;
    }
    const unidad = form.unidad_medida === '__custom__' ? form.unidad_custom.trim() : form.unidad_medida;
    if (!unidad) {
      error('Especifica la unidad de medida');
      return;
    }
    if (!editItem && form.stock_actual !== '' && parseFloat(form.stock_actual) < 0) {
      error('El stock inicial no puede ser negativo');
      return;
    }
    if (form.stock_minimo !== '' && parseFloat(form.stock_minimo) < 0) {
      error('El stock mínimo no puede ser negativo');
      return;
    }
    const payload = {
      codigo: form.codigo.trim(),
      nombre: form.nombre.trim(),
      categoria_id: form.categoria_id || null,
      stock_minimo: form.stock_minimo !== '' ? parseFloat(form.stock_minimo) : 0,
      unidad_medida: unidad,
    };
    if (!editItem) {
      payload.stock_actual = form.stock_actual !== '' ? parseFloat(form.stock_actual) : 0;
      payload.usuario = usuario;
    }
    setSaving(true);
    try {
      if (editItem) {
        await api.put(`/api/productos/${editItem.id}`, payload);
        success('Producto actualizado correctamente');
      } else {
        await api.post('/api/productos', payload);
        success('Producto creado correctamente');
      }
      handleCloseModal();
      fetchProductos(search, categoriaFilter, page);
    } catch (err) {
      error(err?.response?.data?.message || 'Error al guardar el producto');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      await api.delete(`/api/productos/${deleteItem.id}`);
      success('Producto eliminado correctamente');
      setDeleteItem(null);
      fetchProductos(search, categoriaFilter, page);
    } catch (err) {
      error(err?.response?.data?.message || 'Error al eliminar el producto');
    }
  };

  const handleImport = async (e) => {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      error('Selecciona un archivo Excel');
      return;
    }
    setImportLoading(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/api/productos/importar/excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(res.data);
      const total = (res.data?.insertados || 0) + (res.data?.actualizados || 0);
      if (total > 0) {
        success(`Importación completada: ${res.data.insertados} nuevos, ${res.data.actualizados} actualizados`);
        fetchProductos(search, categoriaFilter, 1);
      }
    } catch (err) {
      error(err?.response?.data?.message || 'Error al importar el archivo');
    } finally {
      setImportLoading(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = 'codigo,nombre,unidad_medida,categoria,stock_actual,stock_minimo\nEJ001,Ejemplo Producto,Litros,Categoria A,100,10\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_productos.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-brand-blue">Productos</h1>
        <div className="flex gap-2 flex-wrap">
          <SafeButton onClick={() => setShowImport(true)} variant="ghost">
            <FileUp className="w-4 h-4" />
            Importar Excel
          </SafeButton>
          <SafeButton onClick={openCreate} variant="primary">
            <Plus className="w-4 h-4" />
            Nuevo Producto
          </SafeButton>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por código o nombre..."
            className="flex-1"
          />
          <select
            value={categoriaFilter}
            onChange={(e) => setCategoriaFilter(e.target.value)}
            className="min-h-[48px] px-3 py-2 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-brand-red bg-white"
          >
            <option value="">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <PageLoader />
        ) : productos.length === 0 ? (
          <EmptyState
            message={search || categoriaFilter ? 'No se encontraron productos con ese criterio' : 'No hay productos registrados'}
            action={(!search && !categoriaFilter) ? { label: 'Nuevo Producto', onClick: openCreate } : undefined}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {[
                      { key: 'codigo', label: 'Código', align: 'left' },
                      { key: 'nombre', label: 'Nombre', align: 'left' },
                      { key: 'categoria_nombre', label: 'Categoría', align: 'left' },
                      { key: 'stock_actual', label: 'Stock Actual', align: 'right' },
                      { key: 'stock_minimo', label: 'Stock Mín.', align: 'right' },
                      { key: 'unidad_medida', label: 'Unidad', align: 'left' },
                    ].map(({ key, label, align }) => (
                      <th
                        key={key}
                        onClick={() => handleSort(key)}
                        className={`py-3 px-3 text-slate-500 font-medium cursor-pointer select-none hover:text-slate-700 ${align === 'right' ? 'text-right' : 'text-left'}`}
                      >
                        <span className="inline-flex items-center gap-1">
                          {label}
                          {sortKey === key
                            ? sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                            : <ChevronUp className="w-3 h-3 opacity-20" />}
                        </span>
                      </th>
                    ))}
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Estado</th>
                    <th className="text-right py-3 px-3 text-slate-500 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {productosSorted.map((p) => (
                    <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50" style={{ minHeight: '56px' }}>
                      <td className="py-3 px-3 font-mono text-slate-600 text-xs">{p.codigo}</td>
                      <td className="py-3 px-3 font-medium text-slate-800">{p.nombre}</td>
                      <td className="py-3 px-3 text-slate-500">{p.categoria_nombre || '—'}</td>
                      <td className="py-3 px-3 text-right font-semibold text-slate-700">
                        {Number(p.stock_actual || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-500">
                        {Number(p.stock_minimo || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-slate-500">{p.unidad_medida}</td>
                      <td className="py-3 px-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getStockBadge(p.stock_actual, p.stock_minimo)}`}>
                          {getStatusLabel(p.stock_actual, p.stock_minimo)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(p)}
                            title="Editar"
                            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteItem(p)}
                            title="Eliminar"
                            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editItem ? 'Editar Producto' : 'Nuevo Producto'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Código <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.codigo}
                onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
                placeholder="Ej. PROD001"
                required
                className="w-full min-h-[48px] px-3 py-2 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Nombre del producto"
                required
                className="w-full min-h-[48px] px-3 py-2 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
              <select
                value={form.categoria_id}
                onChange={(e) => setForm((f) => ({ ...f, categoria_id: e.target.value }))}
                className="w-full min-h-[48px] px-3 py-2 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-brand-red bg-white"
              >
                <option value="">Sin categoría</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unidad de Medida</label>
              <select
                value={form.unidad_medida}
                onChange={(e) => setForm((f) => ({ ...f, unidad_medida: e.target.value }))}
                className="w-full min-h-[48px] px-3 py-2 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-brand-red bg-white"
              >
                {UNIDADES.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
                <option value="__custom__">Otra (especificar)</option>
              </select>
            </div>
          </div>

          {form.unidad_medida === '__custom__' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unidad personalizada</label>
              <input
                type="text"
                value={form.unidad_custom}
                onChange={(e) => setForm((f) => ({ ...f, unidad_custom: e.target.value }))}
                placeholder="Ej. Toneladas cortas, Piezas..."
                className="w-full min-h-[48px] px-3 py-2 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {!editItem && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Stock Inicial</label>
                <input
                  type="number"
                  value={form.stock_actual}
                  onChange={(e) => setForm((f) => ({ ...f, stock_actual: e.target.value }))}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full min-h-[48px] px-3 py-2 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Stock Mínimo</label>
              <input
                type="number"
                value={form.stock_minimo}
                onChange={(e) => setForm((f) => ({ ...f, stock_minimo: e.target.value }))}
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full min-h-[48px] px-3 py-2 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleCloseModal}
              className="min-h-[48px] px-5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
            >
              Cancelar
            </button>
            <SafeButton type="submit" loading={saving} variant="primary">
              {editItem ? 'Guardar Cambios' : 'Crear Producto'}
            </SafeButton>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        title="Eliminar Producto"
        message={`¿Eliminar el producto "${deleteItem?.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
      />

      {/* Import Excel Modal */}
      <Modal
        isOpen={showImport}
        onClose={() => { setShowImport(false); setImportResult(null); }}
        title="Importar Productos desde Excel"
        size="md"
      >
        <div className="flex flex-col gap-4">
          <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600">
            <p className="font-semibold mb-2">Columnas requeridas:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><code className="bg-slate-200 px-1 rounded">codigo</code> — Código único del producto</li>
              <li><code className="bg-slate-200 px-1 rounded">nombre</code> — Nombre del producto</li>
              <li><code className="bg-slate-200 px-1 rounded">unidad_medida</code> — Ej: Litros, Kilos</li>
            </ul>
            <p className="font-semibold mt-3 mb-2">Columnas opcionales:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><code className="bg-slate-200 px-1 rounded">categoria</code></li>
              <li><code className="bg-slate-200 px-1 rounded">stock_actual</code></li>
              <li><code className="bg-slate-200 px-1 rounded">stock_minimo</code></li>
            </ul>
          </div>

          <button
            type="button"
            onClick={downloadTemplate}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium self-start"
          >
            <FileDown className="w-4 h-4" />
            Descargar Plantilla CSV
          </button>

          <form onSubmit={handleImport} className="flex flex-col gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Archivo Excel (.xlsx, .xls, .csv)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="w-full min-h-[48px] px-3 py-2 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-brand-red"
              />
            </div>

            {importResult && (
              <div className={`rounded-lg p-4 text-sm ${(importResult.insertados > 0 || importResult.actualizados > 0) ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                <p className="font-semibold">
                  {importResult.insertados > 0 && <span>{importResult.insertados} nuevos. </span>}
                  {importResult.actualizados > 0 && <span>{importResult.actualizados} actualizados. </span>}
                  {importResult.insertados === 0 && importResult.actualizados === 0 && <span>No se procesó ningún producto.</span>}
                </p>
                {importResult.errores && importResult.errores.length > 0 && (
                  <ul className="mt-2 list-disc list-inside space-y-1 text-xs">
                    {importResult.errores.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowImport(false); setImportResult(null); }}
                className="min-h-[48px] px-5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
              >
                Cerrar
              </button>
              <SafeButton type="submit" loading={importLoading} variant="primary">
                <FileUp className="w-4 h-4" />
                Importar
              </SafeButton>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
