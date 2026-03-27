import React, { useEffect, useState } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../context/ToastContext';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import SearchInput from '../components/ui/SearchInput';
import SafeButton from '../components/ui/SafeButton';
import PageLoader from '../components/ui/PageLoader';
import EmptyState from '../components/ui/EmptyState';

export default function Categorias() {
  const { success, error } = useToast();
  const [categorias, setCategorias] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ nombre: '' });

  const fetchCategorias = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/categorias');
      setCategorias(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      error('Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategorias();
  }, []);

  const openCreate = () => {
    setEditItem(null);
    setForm({ nombre: '' });
    setShowModal(true);
  };

  const openEdit = (cat) => {
    setEditItem(cat);
    setForm({ nombre: cat.nombre || '' });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditItem(null);
    setForm({ nombre: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      error('El nombre es obligatorio');
      return;
    }
    setSaving(true);
    try {
      if (editItem) {
        await api.put(`/api/categorias/${editItem.id}`, form);
        success('Categoría actualizada correctamente');
      } else {
        await api.post('/api/categorias', form);
        success('Categoría creada correctamente');
      }
      handleCloseModal();
      fetchCategorias();
    } catch (err) {
      error(err?.response?.data?.message || 'Error al guardar la categoría');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      await api.delete(`/api/categorias/${deleteItem.id}`);
      success('Categoría eliminada correctamente');
      setDeleteItem(null);
      fetchCategorias();
    } catch (err) {
      error(err?.response?.data?.message || 'Error al eliminar la categoría');
    }
  };

  const filtered = categorias.filter((c) => {
    const q = search.toLowerCase();
    return (
      !q ||
      (c.nombre || '').toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-brand-blue">Categorías</h1>
        <SafeButton onClick={openCreate} variant="primary">
          <Plus className="w-4 h-4" />
          Nueva Categoría
        </SafeButton>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="mb-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por nombre..."
            className="max-w-md"
          />
        </div>

        {loading ? (
          <PageLoader />
        ) : filtered.length === 0 ? (
          <EmptyState
            message={search ? 'No se encontraron categorías con ese criterio' : 'No hay categorías registradas'}
            action={!search ? { label: 'Nueva Categoría', onClick: openCreate } : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-4 text-slate-500 font-medium">Nombre</th>
                  <th className="text-right py-3 px-4 text-slate-500 font-medium">Productos</th>
                  <th className="text-right py-3 px-4 text-slate-500 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((cat) => (
                  <tr key={cat.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-800" style={{ minHeight: '56px' }}>
                      {cat.nombre}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center justify-center bg-blue-100 text-blue-700 text-xs font-semibold rounded-full px-2 py-0.5">
                        {cat.total_productos ?? 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(cat)}
                          title="Editar"
                          className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteItem(cat)}
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
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editItem ? 'Editar Categoría' : 'Nueva Categoría'}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              placeholder="Nombre de la categoría"
              required
              className="w-full min-h-[48px] px-3 py-2 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
            />
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
              {editItem ? 'Guardar Cambios' : 'Crear Categoría'}
            </SafeButton>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        title="Eliminar Categoría"
        message={`¿Eliminar categoría "${deleteItem?.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
      />
    </div>
  );
}
