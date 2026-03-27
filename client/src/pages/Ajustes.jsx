import { useState, useEffect, useCallback } from 'react';
import { Plus, SlidersHorizontal } from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../context/ToastContext';
import { useAlerts } from '../context/AlertContext';
import { formatDate, formatNumber, toDatetimeLocal } from '../lib/utils';
import Modal          from '../components/ui/Modal';
import SafeButton     from '../components/ui/SafeButton';
import SearchInput    from '../components/ui/SearchInput';
import EmptyState     from '../components/ui/EmptyState';
import PageLoader     from '../components/ui/PageLoader';
import ProductoSearch from '../components/ui/ProductoSearch';

const EMPTY_FORM = {
  producto_id: '',
  nuevo_stock: '',
  motivo: '',
  notas: '',
  fecha: '',
};

export default function Ajustes() {
  const { toast }  = useToast();
  const { refresh: refreshAlerts } = useAlerts();

  const [ajustes,    setAjustes]    = useState([]);
  const [filtered,   setFiltered]   = useState([]);
  const [productos,  setProductos]  = useState([]);
  const [search,     setSearch]     = useState('');
  const [searching,  setSearching]  = useState(false);
  const [loading,    setLoading]    = useState(true);

  const [modalOpen,  setModalOpen]  = useState(false);
  const [form,       setForm]       = useState({ ...EMPTY_FORM, fecha: toDatetimeLocal(new Date()) });
  const [saving,     setSaving]     = useState(false);
  const [errors,     setErrors]     = useState({});

  // Stock actual del producto seleccionado para preview
  const [stockPreview, setStockPreview] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [a, p] = await Promise.all([
        api.get('/movimientos?tipo=ajuste'),
        api.get('/productos'),
      ]);
      setAjustes(Array.isArray(a.data) ? a.data : []);
      setProductos(Array.isArray(p.data) ? p.data : []);
    } catch (err) {
      toast({ type: 'error', title: 'Error', description: err.message });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  // Filtro en tiempo real
  useEffect(() => {
    setSearching(true);
    const t = setTimeout(() => {
      const s = search.toLowerCase();
      setFiltered(
        s ? ajustes.filter(a =>
          a.producto_nombre.toLowerCase().includes(s) ||
          a.producto_codigo.toLowerCase().includes(s) ||
          (a.motivo || '').toLowerCase().includes(s)
        ) : ajustes
      );
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [search, ajustes]);

  function openModal() {
    setForm({ ...EMPTY_FORM, fecha: toDatetimeLocal(new Date()) });
    setErrors({});
    setStockPreview(null);
    setModalOpen(true);
  }

  function handleProductoChange(productoId) {
    setForm(f => ({ ...f, producto_id: productoId }));
    if (productoId) {
      const prod = productos.find(p => String(p.id) === productoId);
      setStockPreview(prod ? parseFloat(prod.stock_actual) : null);
    } else {
      setStockPreview(null);
    }
  }

  function validate() {
    const e = {};
    if (!form.producto_id)    e.producto_id = 'Selecciona un producto';
    if (form.nuevo_stock === '' || isNaN(form.nuevo_stock) || parseFloat(form.nuevo_stock) < 0)
      e.nuevo_stock = 'Ingresa un valor de stock válido (≥ 0)';
    if (!form.motivo?.trim()) e.motivo = 'El motivo del ajuste es obligatorio';
    if (!form.fecha)          e.fecha = 'La fecha es obligatoria';
    return e;
  }

  async function handleSave() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      await api.post('/movimientos', {
        producto_id: form.producto_id,
        tipo: 'ajuste',
        cantidad: parseFloat(form.nuevo_stock),  // envía el nuevo valor
        motivo: form.motivo.trim(),
        notas: form.notas || null,
        fecha: form.fecha,
      });
      toast({ title: 'Ajuste registrado correctamente' });
      setModalOpen(false);
      loadData();
      refreshAlerts();
    } catch (err) {
      toast({ type: 'error', title: 'Error', description: err.message });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Ajustes de Inventario</h1>
          <p className="page-subtitle">{ajustes.length} ajustes registrados</p>
        </div>
        <button className="btn-primary" onClick={openModal}>
          <Plus size={20} />
          Nuevo Ajuste
        </button>
      </div>

      <div className="mb-5">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por producto, código o motivo..."
          loading={searching}
          className="max-w-md"
        />
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Fecha y Hora</th>
              <th>Código</th>
              <th>Producto</th>
              <th className="text-right">Stock Anterior</th>
              <th className="text-right">Nuevo Stock</th>
              <th className="text-right">Diferencia</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7}>
                <EmptyState
                  message={search ? 'No se encontraron ajustes con ese criterio' : 'Sin ajustes registrados'}
                  icon={SlidersHorizontal}
                />
              </td></tr>
            ) : filtered.map(a => {
              // La cantidad en ajuste es el nuevo valor
              const stockAnterior = parseFloat(a.cantidad_anterior);
              const nuevoStock    = parseFloat(a.cantidad);
              const diff          = nuevoStock - stockAnterior;
              return (
                <tr key={a.id}>
                  <td className="whitespace-nowrap text-sm text-gray-600">{formatDate(a.fecha)}</td>
                  <td>
                    <span className="font-mono font-semibold text-deep-blue bg-blue-50 px-2 py-0.5 rounded text-sm">
                      {a.producto_codigo}
                    </span>
                  </td>
                  <td className="font-semibold text-gray-800">{a.producto_nombre}</td>
                  <td className="text-right text-gray-500">{formatNumber(stockAnterior)}</td>
                  <td className="text-right font-bold text-blue-700">{formatNumber(nuevoStock)}</td>
                  <td className="text-right font-bold">
                    <span className={diff >= 0 ? 'text-green-600' : 'text-primary'}>
                      {diff >= 0 ? '+' : ''}{formatNumber(diff)}
                    </span>
                  </td>
                  <td className="text-gray-600 text-sm max-w-xs">
                    {a.motivo || <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleSave}
        title="Registrar Ajuste de Inventario"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancelar</button>
            <SafeButton className="btn-primary bg-blue-700 hover:bg-blue-800" onClick={handleSave} disabled={saving}>
              {saving && <span className="spinner" />}
              Aplicar Ajuste
            </SafeButton>
          </>
        }
      >
        <div className="form-group">
          <label className="label">Producto <span className="text-primary">*</span></label>
          <ProductoSearch
            productos={productos}
            value={form.producto_id}
            onChange={id => handleProductoChange(id)}
            error={!!errors.producto_id}
          />
          {errors.producto_id && <p className="text-sm text-red-500">{errors.producto_id}</p>}
        </div>

        {stockPreview !== null && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
            <p className="text-sm font-semibold text-blue-700">
              Stock actual: <span className="text-xl font-bold">{formatNumber(stockPreview)}</span>
            </p>
            {form.nuevo_stock !== '' && !isNaN(form.nuevo_stock) && (
              <p className="text-sm text-blue-600 mt-1">
                Diferencia: {' '}
                <span className={parseFloat(form.nuevo_stock) - stockPreview >= 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                  {parseFloat(form.nuevo_stock) - stockPreview >= 0 ? '+' : ''}
                  {formatNumber(parseFloat(form.nuevo_stock) - stockPreview)}
                </span>
              </p>
            )}
          </div>
        )}

        <div className="form-grid-2 gap-5">
          <div className="form-group">
            <label className="label">Nuevo Valor de Stock <span className="text-primary">*</span></label>
            <input
              type="number" step="0.01" min="0"
              className={`input ${errors.nuevo_stock ? 'input-error' : ''}`}
              value={form.nuevo_stock}
              onChange={e => setForm(f => ({ ...f, nuevo_stock: e.target.value }))}
              placeholder="0"
            />
            {errors.nuevo_stock && <p className="text-sm text-red-500">{errors.nuevo_stock}</p>}
          </div>
          <div className="form-group">
            <label className="label">Fecha y Hora <span className="text-primary">*</span></label>
            <input
              type="datetime-local"
              className={`input ${errors.fecha ? 'input-error' : ''}`}
              value={form.fecha}
              onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
            />
            {errors.fecha && <p className="text-sm text-red-500">{errors.fecha}</p>}
          </div>
        </div>

        <div className="form-group">
          <label className="label">Motivo del Ajuste <span className="text-primary">*</span></label>
          <input
            className={`input ${errors.motivo ? 'input-error' : ''}`}
            value={form.motivo}
            onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))}
            placeholder="Ej: Corrección por inventario físico, derrame accidental..."
            maxLength={300}
          />
          {errors.motivo && <p className="text-sm text-red-500">{errors.motivo}</p>}
        </div>

        <div className="form-group">
          <label className="label">Notas adicionales</label>
          <textarea
            className="input resize-none"
            rows={2}
            value={form.notas}
            onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
            placeholder="Observaciones opcionales..."
          />
        </div>
      </Modal>
    </div>
  );
}
