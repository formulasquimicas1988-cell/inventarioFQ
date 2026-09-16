import React, { useEffect, useState } from 'react';
import { Pencil, Trash2, Plus, Megaphone, Eye, EyeOff } from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../context/ToastContext';
import { useUser } from '../context/UserContext';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import SafeButton from '../components/ui/SafeButton';
import PageLoader from '../components/ui/PageLoader';
import EmptyState from '../components/ui/EmptyState';

export default function MensajesPantalla() {
  const { success, error } = useToast();
  const { usuarioId, usuario } = useUser();

  const [mensajes, setMensajes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [form, setForm] = useState({ texto: '', activo: true });

  // Contexto admin para requireAdmin en el backend
  const authBody = { usuario_id: usuarioId, usuario };

  const fetchMensajes = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/mensajes');
      setMensajes(Array.isArray(res.data) ? res.data : []);
    } catch {
      error('Error al cargar los mensajes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMensajes(); }, []);

  const openCreate = () => {
    setEditItem(null);
    setForm({ texto: '', activo: true });
    setShowModal(true);
  };

  const openEdit = (m) => {
    setEditItem(m);
    setForm({ texto: m.texto || '', activo: !!m.activo });
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setEditItem(null);
    setForm({ texto: '', activo: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.texto.trim()) { error('El mensaje no puede estar vacío'); return; }
    setSaving(true);
    try {
      const body = { texto: form.texto.trim(), activo: form.activo ? 1 : 0, ...authBody };
      if (editItem) {
        await api.put(`/api/mensajes/${editItem.id}`, body);
        success('Mensaje actualizado');
      } else {
        await api.post('/api/mensajes', body);
        success('Mensaje creado');
      }
      handleClose();
      fetchMensajes();
    } catch (err) {
      error(err?.response?.data?.error || 'Error al guardar el mensaje');
    } finally {
      setSaving(false);
    }
  };

  const toggleActivo = async (m) => {
    try {
      await api.put(`/api/mensajes/${m.id}`, { activo: m.activo ? 0 : 1, ...authBody });
      setMensajes((list) => list.map((x) => (x.id === m.id ? { ...x, activo: m.activo ? 0 : 1 } : x)));
    } catch (err) {
      error(err?.response?.data?.error || 'Error al cambiar el estado');
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      await api.delete(`/api/mensajes/${deleteItem.id}`, { data: authBody });
      success('Mensaje eliminado');
      setDeleteItem(null);
      fetchMensajes();
    } catch (err) {
      error(err?.response?.data?.error || 'Error al eliminar el mensaje');
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Megaphone className="w-6 h-6 text-brand-red" />
          <h1 className="text-2xl font-bold text-brand-blue">Pantalla TV — Cinta de mensajes</h1>
        </div>
        <SafeButton onClick={openCreate} variant="primary">
          <Plus className="w-4 h-4" />
          Nuevo mensaje
        </SafeButton>
      </div>

      <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-lg px-4 py-3 mb-6">
        Estos mensajes se muestran en la <strong>cinta de abajo</strong> de la pantalla de la bodega (la tele).
        Los <strong>activos</strong> van pasando uno tras otro. Los cambios aparecen en la tele en menos de un minuto.
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        {loading ? (
          <PageLoader />
        ) : mensajes.length === 0 ? (
          <EmptyState
            message="No hay mensajes todavía"
            action={{ label: 'Nuevo mensaje', onClick: openCreate }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-4 text-slate-500 font-medium">Mensaje</th>
                  <th className="text-center py-3 px-4 text-slate-500 font-medium w-32">Estado</th>
                  <th className="text-right py-3 px-4 text-slate-500 font-medium w-32">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {mensajes.map((m) => (
                  <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-800" style={{ minHeight: '56px' }}>
                      <span className={m.activo ? '' : 'text-slate-400 line-through'}>{m.texto}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => toggleActivo(m)}
                        title={m.activo ? 'Activo — clic para ocultar' : 'Oculto — clic para mostrar'}
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1 transition-colors ${
                          m.activo ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {m.activo ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        {m.activo ? 'Activo' : 'Oculto'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(m)}
                          title="Editar"
                          className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteItem(m)}
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

      <Modal isOpen={showModal} onClose={handleClose} title={editItem ? 'Editar mensaje' : 'Nuevo mensaje'} size="md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Mensaje <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.texto}
              onChange={(e) => setForm((f) => ({ ...f, texto: e.target.value }))}
              placeholder="Ej: ¡Bienvenidos a Fórmulas Químicas! Promoción de cloro esta semana 🧴"
              rows={3}
              maxLength={500}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent resize-none"
            />
            <p className="text-xs text-slate-400 mt-1">{form.texto.length}/500</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))}
              className="w-5 h-5 accent-brand-red"
            />
            <span className="text-sm text-slate-700">Mostrar en la tele (activo)</span>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={handleClose} className="min-h-[48px] px-5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors">
              Cancelar
            </button>
            <SafeButton type="submit" loading={saving} variant="primary">
              {editItem ? 'Guardar cambios' : 'Crear mensaje'}
            </SafeButton>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        title="Eliminar mensaje"
        message={`¿Eliminar este mensaje de la cinta? "${deleteItem?.texto?.slice(0, 80)}"`}
        confirmText="Eliminar"
      />
    </div>
  );
}
