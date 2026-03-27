import { useState, useEffect, useCallback } from 'react';
import { Plus, ArrowDownToLine, Search } from 'lucide-react';
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
  cantidad: '',
  proveedor: '',
  notas: '',
  fecha: '',
};

export default function Entradas() {
  const { toast }  = useToast();
  const { refresh: refreshAlerts } = useAlerts();

  const [entradas,   setEntradas]   = useState([]);
  const [filtered,   setFiltered]   = useState([]);
  const [productos,  setProductos]  = useState([]);
  const [search,     setSearch]     = useState('');
  const [searching,  setSearching]  = useState(false);
  const [loading,    setLoading]    = useState(true);

  const [modalOpen,  setModalOpen]  = useState(false);
  const [form,       setForm]       = useState({ ...EMPTY_FORM, fecha: toDatetimeLocal(new Date()) });
  const [saving,     setSaving]     = useState(false);
  const [errors,     setErrors]     = useState({});

  const loadData = useCallback(async () => {
    try {
      const [e, p] = await Promise.all([
        api.get('/movimientos?tipo=entrada'),
        api.get('/productos'),
      ]);
      setEntradas(e.data);
      setProductos(p.data);
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
        s ? entradas.filter(e =>
          e.producto_nombre.toLowerCase().includes(s) ||
          e.producto_codigo.toLowerCase().includes(s) ||
          (e.proveedor || '').toLowerCase().includes(s)
        ) : entradas
      );
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [search, entradas]);

  function openModal() {
    setForm({ ...EMPTY_FORM, fecha: toDatetimeLocal(new Date()) });
    setErrors({});
    setModalOpen(true);
  }

  function validate() {
    const e = {};
    if (!form.producto_id)       e.producto_id = 'Selecciona un producto';
    if (!form.cantidad || parseFloat(form.cantidad) <= 0) e.cantidad = 'La cantidad debe ser mayor a 0';
    if (!form.fecha)             e.fecha = 'La fecha es obligatoria';
    return e;
  }

  async function handleSave() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      await api.post('/movimientos', {
        producto_id: form.producto_id,
        tipo: 'entrada',
        cantidad: parseFloat(form.cantidad),
        proveedor: form.proveedor || null,
        notas: form.notas || null,
        fecha: form.fecha,
      });
      toast({ title: 'Entrada registrada correctamente' });
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
          <h1 className="page-title">Entradas de Stock</h1>
          <p className="page-subtitle">{entradas.length} entradas registradas</p>
        </div>
        <button className="btn-primary" onClick={openModal}>
          <Plus size={20} />
          Nueva Entrada
        </button>
      </div>

      <div className="mb-5">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por producto, código o proveedor..."
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
              <th className="text-right">Cantidad</th>
              <th>Proveedor</th>
              <th>Notas</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6}>
                <EmptyState
                  message={search ? 'No se encontraron entradas con ese criterio' : 'Sin entradas registradas'}
                  icon={ArrowDownToLine}
                />
              </td></tr>
            ) : filtered.map(e => (
              <tr key={e.id}>
                <td className="whitespace-nowrap text-sm text-gray-600">{formatDate(e.fecha)}</td>
                <td>
                  <span className="font-mono font-semibold text-deep-blue bg-blue-50 px-2 py-0.5 rounded text-sm">
                    {e.producto_codigo}
                  </span>
                </td>
                <td className="font-semibold text-gray-800">{e.producto_nombre}</td>
                <td className="text-right font-bold text-green-700">
                  +{formatNumber(e.cantidad)} <span className="text-gray-400 font-normal text-sm">{e.unidad_medida}</span>
                </td>
                <td className="text-gray-600">{e.proveedor || <span className="text-gray-300">—</span>}</td>
                <td className="text-gray-500 text-sm max-w-xs truncate">{e.notas || <span className="text-gray-300">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleSave}
        title="Registrar Entrada"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancelar</button>
            <SafeButton className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving && <span className="spinner" />}
              Registrar Entrada
            </SafeButton>
          </>
        }
      >
        <div className="form-group">
          <label className="label">Producto <span className="text-primary">*</span></label>
          <ProductoSearch
            productos={productos}
            value={form.producto_id}
            onChange={id => setForm(f => ({ ...f, producto_id: id }))}
            error={!!errors.producto_id}
          />
          {errors.producto_id && <p className="text-sm text-red-500">{errors.producto_id}</p>}
        </div>

        <div className="form-grid-2 gap-5">
          <div className="form-group">
            <label className="label">Cantidad <span className="text-primary">*</span></label>
            <input
              type="number" step="0.01" min="0.01"
              className={`input ${errors.cantidad ? 'input-error' : ''}`}
              value={form.cantidad}
              onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))}
              placeholder="0"
            />
            {errors.cantidad && <p className="text-sm text-red-500">{errors.cantidad}</p>}
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
          <label className="label">Proveedor</label>
          <input
            className="input"
            value={form.proveedor}
            onChange={e => setForm(f => ({ ...f, proveedor: e.target.value }))}
            placeholder="Nombre del proveedor (opcional)"
            maxLength={200}
          />
        </div>

        <div className="form-group">
          <label className="label">Notas</label>
          <textarea
            className="input resize-none"
            rows={3}
            value={form.notas}
            onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
            placeholder="Observaciones adicionales (opcional)..."
          />
        </div>
      </Modal>
    </div>
  );
}
