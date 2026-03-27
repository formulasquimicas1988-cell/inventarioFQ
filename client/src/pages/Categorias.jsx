import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../context/ToastContext';
import Modal          from '../components/ui/Modal';
import ConfirmDialog  from '../components/ui/ConfirmDialog';
import SafeButton     from '../components/ui/SafeButton';
import SearchInput    from '../components/ui/SearchInput';
import EmptyState     from '../components/ui/EmptyState';
import PageLoader     from '../components/ui/PageLoader';

const EMPTY_FORM = { nombre: '' };

export default function Categorias() {
  const { toast } = useToast();
  const [categorias, setCategorias] = useState([]);
  const [filtered,   setFiltered]   = useState([]);
  const [search,     setSearch]     = useState('');
  const [loading,    setLoading]    = useState(true);

  const [modalOpen,  setModalOpen]  = useState(false);
  const [editItem,   setEditItem]   = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);
  const [errors,     setErrors]     = useState({});

  const [delOpen,    setDelOpen]    = useState(false);
  const [delItem,    setDelItem]    = useState(null);
  const [deleting,   setDeleting]   = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/categorias');
      setCategorias(Array.isArray(data) ? data : []);
    } catch (e) {
      toast({ type: 'error', title: 'Error', description: e.message });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  // Filtro en tiempo real con debounce 300ms
  useEffect(() => {
    const t = setTimeout(() => {
      const s = search.toLowerCase();
      setFiltered(
        s ? categorias.filter(c => c.nombre.toLowerCase().includes(s)) : categorias
      );
    }, 300);
    return () => clearTimeout(t);
  }, [search, categorias]);

  function openCreate() {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(cat) {
    setEditItem(cat);
    setForm({ nombre: cat.nombre });
    setErrors({});
    setModalOpen(true);
  }

  function validate() {
    const e = {};
    if (!form.nombre.trim()) e.nombre = 'El nombre es obligatorio';
    return e;
  }

  async function handleSave() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      if (editItem) {
        await api.put(`/categorias/${editItem.id}`, form);
        toast({ title: 'Categoría actualizada' });
      } else {
        await api.post('/categorias', form);
        toast({ title: 'Categoría creada' });
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast({ type: 'error', title: 'Error', description: err.message });
    } finally {
      setSaving(false);
    }
  }

  function openDelete(cat) {
    setDelItem(cat);
    setDelOpen(true);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/categorias/${delItem.id}`);
      toast({ title: 'Categoría eliminada' });
      setDelOpen(false);
      load();
    } catch (err) {
      toast({ type: 'error', title: 'Error', description: err.message });
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Categorías</h1>
          <p className="page-subtitle">{categorias.length} categorías registradas</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={20} />
          Nueva Categoría
        </button>
      </div>

      {/* Búsqueda */}
      <div className="mb-5">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nombre o descripción..."
          className="max-w-md"
        />
      </div>

      {/* Tabla */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Nombre</th>
              <th className="text-center">Productos</th>
              <th className="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <EmptyState
                    message={search ? 'No se encontraron categorías con ese criterio' : 'Sin categorías registradas'}
                    icon={Tag}
                  />
                </td>
              </tr>
            ) : filtered.map((cat, idx) => (
              <tr key={cat.id}>
                <td className="text-gray-400 font-medium w-12">{idx + 1}</td>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Tag size={16} className="text-deep-blue" />
                    </div>
                    <span className="font-semibold text-gray-800">{cat.nombre}</span>
                  </div>
                </td>
                <td className="text-center">
                  <span className="badge badge-blue">{cat.total_productos} productos</span>
                </td>
                <td>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      className="btn-icon btn-ghost text-blue-600 hover:bg-blue-50"
                      onClick={() => openEdit(cat)}
                      title="Editar"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      className="btn-icon btn-ghost text-red-500 hover:bg-red-50"
                      onClick={() => openDelete(cat)}
                      title="Eliminar"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Crear/Editar */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleSave}
        title={editItem ? 'Editar Categoría' : 'Nueva Categoría'}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </button>
            <SafeButton className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving && <span className="spinner" />}
              {editItem ? 'Guardar Cambios' : 'Crear Categoría'}
            </SafeButton>
          </>
        }
      >
        <div className="form-group">
          <label className="label">Nombre <span className="text-primary">*</span></label>
          <input
            className={`input ${errors.nombre ? 'input-error' : ''}`}
            value={form.nombre}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            placeholder="Ej: Desengrasantes"
            maxLength={100}
            autoFocus
          />
          {errors.nombre && <p className="text-sm text-red-500 mt-1">{errors.nombre}</p>}
        </div>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        open={delOpen}
        onClose={() => setDelOpen(false)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Eliminar Categoría"
        message={`¿Estás seguro de eliminar la categoría "${delItem?.nombre}"? Esta acción no se puede deshacer. Si tiene productos activos asociados, no podrá eliminarse.`}
      />
    </div>
  );
}
