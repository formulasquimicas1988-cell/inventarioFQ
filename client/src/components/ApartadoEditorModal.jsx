import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Plus, Minus, Trash2, Bookmark, AlertCircle } from 'lucide-react';
import api from '../lib/api';
import { coincideBusqueda } from '../lib/utils';
import Modal from './ui/Modal';
import SafeButton from './ui/SafeButton';

const fmt = (v) => `L ${parseFloat(v || 0).toFixed(2)}`;
function genId() { return `${Date.now()}-${Math.random().toString(36).slice(2)}`; }

/**
 * Editor de apartados: sirve para crear (existente = null) y para editar
 * (existente = apartado con .detalles). Ajusta el stock disponible en modo
 * edición sumando lo que este mismo apartado ya tenía reservado.
 */
export default function ApartadoEditorModal({ existente, usuario, usuarioId, onClose, onSaved }) {
  const editando = !!existente;

  const [productos, setProductos] = useState([]);
  const [busq, setBusq] = useState('');
  const [carrito, setCarrito] = useState(() =>
    editando
      ? (existente.detalles || []).map(d => ({
          _id: genId(),
          producto_id: d.producto_id,
          descripcion: d.descripcion,
          cantidad: parseFloat(d.cantidad),
          precio_unitario: parseFloat(d.precio_unitario),
          subtotal: parseFloat(d.subtotal),
          sin_inventario: d.sin_inventario ? 1 : 0,
        }))
      : []
  );
  const [nombreCliente, setNombreCliente] = useState(existente?.nombre_cliente || '');
  const [telefono, setTelefono] = useState(existente?.telefono || '');
  const [notas, setNotas] = useState(existente?.notas || '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const uidRef = useRef(null);

  useEffect(() => {
    api.get('/api/productos', { params: { limit: 1000, activo: 1 } })
      .then(res => {
        const d = res.data;
        setProductos(Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []));
      })
      .catch(() => {});
  }, []);

  const baseDe = (prod) => prod.producto_base_id || prod.id;

  const rawStock = (prod) => {
    if (!prod || prod.sin_inventario) return Infinity;
    if (prod.producto_base_id) {
      const b = productos.find(p => p.id === prod.producto_base_id);
      if (b) return b.stock_actual ?? 0;
    }
    return prod.stock_actual ?? 0;
  };

  // Cantidades ya reservadas por ESTE apartado (para no bloquear al editar,
  // ya que el stock_actual del servidor ya tiene ese descuento aplicado).
  const reservado = useMemo(() => {
    const m = {};
    if (!editando) return m;
    for (const d of (existente.detalles || [])) {
      if (!d.producto_id || d.sin_inventario) continue;
      const prod = productos.find(p => p.id === d.producto_id);
      if (!prod) continue;
      const bid = baseDe(prod);
      m[bid] = (m[bid] || 0) + Math.round(parseFloat(d.cantidad) || 0);
    }
    return m;
  }, [productos, existente, editando]);

  const availStock = (prod) => {
    if (!prod || prod.sin_inventario) return Infinity;
    return rawStock(prod) + (reservado[baseDe(prod)] || 0);
  };

  const filtrados = busq.trim()
    ? productos.filter(p => coincideBusqueda(busq, p.nombre, p.codigo)).slice(0, 30)
    : [];

  const agregar = (prod) => {
    setError('');
    setCarrito(prev => {
      const ex = prev.find(i => i.producto_id === prod.id);
      if (ex) {
        if (!prod.sin_inventario && ex.cantidad + 1 > availStock(prod)) {
          setError(`Sin stock suficiente de "${prod.nombre}" (disponible ${availStock(prod)}).`);
          return prev;
        }
        return prev.map(i => i._id === ex._id
          ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.precio_unitario }
          : i);
      }
      if (!prod.sin_inventario && availStock(prod) <= 0) {
        setError(`"${prod.nombre}" no tiene stock disponible.`);
        return prev;
      }
      const precio = parseFloat(prod.precio_a ?? prod.precio_b ?? prod.precio_c ?? prod.precio_d ?? 0) || 0;
      return [...prev, {
        _id: genId(), producto_id: prod.id, descripcion: prod.nombre,
        cantidad: 1, precio_unitario: precio, subtotal: precio,
        sin_inventario: prod.sin_inventario ? 1 : 0,
      }];
    });
    setBusq('');
  };

  const cambiarCantidad = (_id, val) => {
    const item = carrito.find(i => i._id === _id);
    const prod = productos.find(p => p.id === item?.producto_id);
    let nueva = Math.max(1, Math.round(parseFloat(val) || 1));
    if (prod && !item.sin_inventario && nueva > availStock(prod)) {
      setError(`Solo hay ${availStock(prod)} disponibles de "${prod.nombre}".`);
      nueva = availStock(prod);
    } else {
      setError('');
    }
    setCarrito(prev => prev.map(i => i._id === _id ? { ...i, cantidad: nueva, subtotal: nueva * i.precio_unitario } : i));
  };

  const cambiarPrecio = (_id, val) => {
    const precio = parseFloat(val) || 0;
    setCarrito(prev => prev.map(i => i._id === _id ? { ...i, precio_unitario: precio, subtotal: i.cantidad * precio } : i));
  };

  const quitar = (_id) => setCarrito(prev => prev.filter(i => i._id !== _id));

  const total = carrito.reduce((s, i) => s + parseFloat(i.subtotal || 0), 0);

  const guardar = async () => {
    if (!carrito.length) { setError('Agregá al menos un producto'); return; }
    if (!nombreCliente.trim()) { setError('El nombre del cliente es obligatorio'); return; }
    if (!usuarioId) { setError('Sesión sin ID de usuario. Cierra sesión y vuelve a entrar.'); return; }
    setError('');
    setGuardando(true);
    const payload = {
      usuario_id: usuarioId,
      usuario,
      nombre_cliente: nombreCliente.trim(),
      telefono: telefono.trim() || null,
      notas: notas.trim() || null,
      items: carrito.map(i => ({
        producto_id: i.producto_id,
        descripcion: i.descripcion,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
        subtotal: i.subtotal,
        sin_inventario: i.sin_inventario,
      })),
    };
    try {
      if (editando) {
        await api.put(`/api/apartados/${existente.id}`, payload);
        onSaved('Apartado actualizado');
      } else {
        if (!uidRef.current) uidRef.current = crypto.randomUUID?.() ?? genId();
        await api.post('/api/apartados', { ...payload, client_uid: uidRef.current });
        onSaved('Apartado registrado — stock reservado');
      }
    } catch (err) {
      setError(err.message || 'Error al guardar el apartado');
      setGuardando(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={editando ? `Editar apartado #${existente.id}` : 'Nuevo apartado'} size="lg">
      <div className="flex flex-col gap-4">
        {/* Datos del cliente */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Nombre del cliente *</label>
            <input
              type="text" value={nombreCliente}
              onChange={e => { setNombreCliente(e.target.value); setError(''); }}
              placeholder="Nombre de quien aparta"
              className="w-full min-h-[44px] px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Teléfono (opcional)</label>
            <input
              type="tel" value={telefono} onChange={e => setTelefono(e.target.value)}
              placeholder="Para avisarle"
              className="w-full min-h-[44px] px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Notas (opcional)</label>
          <input
            type="text" value={notas} onChange={e => setNotas(e.target.value)}
            placeholder="Referencia, seña, etc."
            className="w-full min-h-[44px] px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
          />
        </div>

        {/* Buscador de productos */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Agregar productos</label>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text" value={busq} onChange={e => setBusq(e.target.value)}
              placeholder="Buscar producto por nombre o código..."
              className="w-full min-h-[44px] pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
            />
          </div>
          {busq.trim() && (
            <div className="mt-1 border border-slate-200 rounded-lg max-h-52 overflow-y-auto divide-y divide-slate-100">
              {filtrados.length === 0 && <p className="text-center text-slate-400 py-3 text-sm">Sin resultados</p>}
              {filtrados.map(p => {
                const stock = availStock(p);
                const sinStock = !p.sin_inventario && stock <= 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => !sinStock && agregar(p)}
                    disabled={sinStock}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm ${sinStock ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-50'}`}
                  >
                    <span className="text-slate-800">{p.nombre}</span>
                    <span className="text-xs text-slate-400 flex items-center gap-2">
                      {!p.sin_inventario && <span className={sinStock ? 'text-red-400 font-semibold' : ''}>Stock: {stock}</span>}
                      <Plus size={14} className="text-brand-red" />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Items */}
        {carrito.length > 0 && (
          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-3 py-2 text-slate-500 font-medium">Producto</th>
                  <th className="px-2 py-2 text-slate-500 font-medium text-center">Cant</th>
                  <th className="px-2 py-2 text-slate-500 font-medium text-right">P.U.</th>
                  <th className="px-2 py-2 text-slate-500 font-medium text-right">Subtotal</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {carrito.map(i => (
                  <tr key={i._id} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-800">{i.descripcion}</td>
                    <td className="px-2 py-2">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => cambiarCantidad(i._id, i.cantidad - 1)} className="w-6 h-6 rounded border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100"><Minus size={12} /></button>
                        <input
                          type="number" min="1" value={Math.round(i.cantidad)}
                          onChange={e => cambiarCantidad(i._id, e.target.value)}
                          className="w-12 h-7 text-center border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-red"
                        />
                        <button onClick={() => cambiarCantidad(i._id, i.cantidad + 1)} className="w-6 h-6 rounded border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100"><Plus size={12} /></button>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <input
                        type="number" min="0" step="0.01" value={i.precio_unitario}
                        onChange={e => cambiarPrecio(i._id, e.target.value)}
                        className="w-20 h-7 text-right border border-slate-200 rounded px-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-red"
                      />
                    </td>
                    <td className="px-2 py-2 text-right font-semibold text-slate-800">{fmt(i.subtotal)}</td>
                    <td className="px-2 py-2 text-right">
                      <button onClick={() => quitar(i._id)} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="bg-slate-50 rounded-lg px-4 py-3 flex justify-between items-center">
          <span className="text-sm text-slate-500">Total {editando ? '' : 'a apartar'}</span>
          <span className="text-xl font-bold text-brand-blue">{fmt(total)}</span>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /><span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t">
          <button onClick={onClose} className="min-h-[44px] px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium">Cancelar</button>
          <SafeButton onClick={guardar} loading={guardando} variant="primary">
            <Bookmark size={16} /> {editando ? 'Guardar cambios' : 'Confirmar apartado'}
          </SafeButton>
        </div>
      </div>
    </Modal>
  );
}
