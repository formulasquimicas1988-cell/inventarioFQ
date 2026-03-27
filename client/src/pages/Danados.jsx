import { useState, useEffect, useCallback } from 'react';
import { Plus, PackageX } from 'lucide-react';
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
  motivo: '',
  notas: '',
  fecha: '',
};

export default function Danados() {
  const { toast }  = useToast();
  const { refresh: refreshAlerts } = useAlerts();

  const [danos,      setDanos]      = useState([]);
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
      const [d, p] = await Promise.all([
        api.get('/movimientos?tipo=dañado'),
        api.get('/productos'),
      ]);
      setDanos(d.data);
      setProductos(p.data);
    } catch (err) {
      toast({ type: 'error', title: 'Error', description: err.message });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  // Filtro en tiempo real con debounce 300ms
  useEffect(() => {
    setSearching(true);
    const t = setTimeout(() => {
      const s = search.toLowerCase();
      setFiltered(
        s ? danos.filter(d =>
          d.producto_nombre.toLowerCase().includes(s) ||
          d.producto_codigo.toLowerCase().includes(s) ||
          (d.motivo || '').toLowerCase().includes(s)
        ) : danos
      );
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [search, danos]);

  function openModal() {
    setForm({ ...EMPTY_FORM, fecha: toDatetimeLocal(new Date()) });
    setErrors({});
    setModalOpen(true);
  }

  function validate() {
    const e = {};
    if (!form.producto_id) e.producto_id = 'Selecciona un producto';
    if (!form.cantidad || parseFloat(form.cantidad) <= 0) e.cantidad = 'La cantidad debe ser mayor a 0';
    if (!form.fecha) e.fecha = 'La fecha es obligatoria';
    return e;
  }

  async function handleSave() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      await api.post('/movimientos', {
        producto_id: form.producto_id,
        tipo: 'dañado',
        cantidad: parseFloat(form.cantidad),
        motivo: form.motivo || null,
        notas: form.notas || null,
        fecha: form.fecha,
      });
      toast({ title: 'Registro de daño guardado correctamente' });
      setModalOpen(false);
      loadData();
      refreshAlerts();
    } catch (err) {
      toast({ type: 'error', title: 'Error', description: err.message });
    } finally {
      setSaving(false);
    }
  }

  // Totales
  const totalCantidad = danos.reduce((s, d) => s + parseFloat(d.cantidad), 0);

  if (loading) return <PageLoader />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Productos Dañados</h1>
          <p className="page-subtitle">
            {danos.length} registro(s) — {formatNumber(totalCantidad)} unidades dañadas en total
          </p>
        </div>
        <button className="btn-primary" onClick={openModal}>
          <Plus size={20} />
          Registrar Daño
        </button>
      </div>

      {/* Resumen */}
      {danos.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="card p-5 flex items-center gap-4 border-l-4 border-orange-400">
            <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <PackageX size={24} className="text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-orange-600">{danos.length}</p>
              <p className="text-sm font-semibold text-gray-600">Eventos de daño registrados</p>
            </div>
          </div>
          <div className="card p-5 flex items-center gap-4 border-l-4 border-red-400">
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <PackageX size={24} className="text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-red-600">{formatNumber(totalCantidad)}</p>
              <p className="text-sm font-semibold text-gray-600">Unidades totales dañadas</p>
            </div>
          </div>
        </div>
      )}

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
              <th className="text-right">Cantidad Dañada</th>
              <th>Motivo</th>
              <th>Notas</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6}>
                <EmptyState
                  message={search ? 'No se encontraron registros con ese criterio' : 'Sin productos dañados registrados'}
                  icon={PackageX}
                />
              </td></tr>
            ) : filtered.map(d => (
              <tr key={d.id}>
                <td className="whitespace-nowrap text-sm text-gray-600">{formatDate(d.fecha)}</td>
                <td>
                  <span className="font-mono font-semibold text-deep-blue bg-blue-50 px-2 py-0.5 rounded text-sm">
                    {d.producto_codigo}
                  </span>
                </td>
                <td className="font-semibold text-gray-800">{d.producto_nombre}</td>
                <td className="text-right font-bold text-orange-700">
                  -{formatNumber(d.cantidad)}{' '}
                  <span className="text-gray-400 font-normal text-sm">{d.unidad_medida}</span>
                </td>
                <td className="text-gray-600 text-sm max-w-[180px] truncate">
                  {d.motivo || <span className="text-gray-300">—</span>}
                </td>
                <td className="text-gray-500 text-sm max-w-[180px] truncate">
                  {d.notas || <span className="text-gray-300">—</span>}
                </td>
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
        title="Registrar Producto Dañado"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </button>
            <SafeButton
              className="btn btn-primary bg-orange-600 hover:bg-orange-700"
              onClick={handleSave}
              disabled={saving}
            >
              {saving && <span className="spinner" />}
              Registrar Daño
            </SafeButton>
          </>
        }
      >
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-5 flex items-start gap-3">
          <PackageX size={20} className="text-orange-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-orange-700">
            Esta acción reducirá el stock del producto seleccionado. Se registrará en el historial de movimientos.
          </p>
        </div>

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
            <label className="label">Cantidad Dañada <span className="text-primary">*</span></label>
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
          <label className="label">Motivo del daño</label>
          <input
            className="input"
            value={form.motivo}
            onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))}
            placeholder="Ej: Derrame, vencimiento, accidente, contaminación..."
            maxLength={300}
          />
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
