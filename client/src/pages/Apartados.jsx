import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Search, Eye, Check, XCircle, Printer, Bookmark, AlertCircle, Plus, Minus, X, Trash2 } from 'lucide-react';
import api from '../lib/api';
import { useUser } from '../context/UserContext';
import { useToast } from '../context/ToastContext';
import { formatDate, coincideBusqueda } from '../lib/utils';
import { imprimirTicket, imprimirApartado } from '../lib/print';
import Pagination from '../components/ui/Pagination';
import PageLoader from '../components/ui/PageLoader';
import Modal from '../components/ui/Modal';
import SafeButton from '../components/ui/SafeButton';

const fmt = (v) => `L ${parseFloat(v || 0).toFixed(2)}`;

const ESTADO_STYLE = {
  activo: 'bg-amber-100 text-amber-700',
  entregado: 'bg-green-100 text-green-700',
  cancelado: 'bg-slate-200 text-slate-600',
};
const ESTADO_LABEL = { activo: 'Activo', entregado: 'Entregado', cancelado: 'Cancelado' };

function EstadoBadge({ estado }) {
  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ESTADO_STYLE[estado] || 'bg-slate-100 text-slate-600'}`}>
      {ESTADO_LABEL[estado] || estado}
    </span>
  );
}

// ── Modal detalle / acciones ──────────────────────────────────────────────────

function DetalleModal({ apartado, onClose, onEntregar, onCancelar, procesando, puedeEntregar }) {
  const [accion, setAccion] = useState(null);     // 'entregar' | 'cancelar'
  const [efectivo, setEfectivo] = useState('');
  const [motivo, setMotivo] = useState('');

  useEffect(() => { setAccion(null); setEfectivo(''); setMotivo(''); }, [apartado?.id]);

  if (!apartado) return null;
  const saldo = efectivo !== '' ? parseFloat(efectivo) - parseFloat(apartado.total || 0) : null;

  return (
    <Modal isOpen={!!apartado} onClose={onClose} title={`Apartado #${apartado.id}`} size="lg">
      <div className="flex flex-col gap-4">
        {/* Info */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div><p className="text-slate-500 text-xs">Cliente</p><p className="font-medium text-slate-800">{apartado.nombre_cliente}</p></div>
          {apartado.telefono && <div><p className="text-slate-500 text-xs">Teléfono</p><p className="font-medium text-slate-800">{apartado.telefono}</p></div>}
          <div><p className="text-slate-500 text-xs">Fecha</p><p className="font-medium text-slate-800">{formatDate(apartado.fecha)}</p></div>
          <div><p className="text-slate-500 text-xs">Estado</p><EstadoBadge estado={apartado.estado} /></div>
          {apartado.creado_por && <div><p className="text-slate-500 text-xs">Creado por</p><p className="font-medium text-slate-800">{apartado.creado_por}</p></div>}
        </div>

        {apartado.notas && (
          <div className="bg-slate-50 rounded-lg px-3 py-2 text-sm text-slate-600">{apartado.notas}</div>
        )}

        {/* Items */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-3 py-2 text-slate-500 font-medium">Descripción</th>
                <th className="text-right px-3 py-2 text-slate-500 font-medium">Cant</th>
                <th className="text-right px-3 py-2 text-slate-500 font-medium">P.U.</th>
                <th className="text-right px-3 py-2 text-slate-500 font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {(apartado.detalles || []).map(d => (
                <tr key={d.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-800">
                    {d.descripcion}
                    {d.sin_inventario ? <span className="ml-1 text-[10px] bg-slate-100 text-slate-500 px-1 rounded">S/I</span> : null}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-600">{parseFloat(d.cantidad)}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{fmt(d.precio_unitario)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-800">{fmt(d.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-slate-50 rounded-lg px-4 py-3 flex justify-between font-bold text-base">
          <span>Total</span><span className="text-brand-blue">{fmt(apartado.total)}</span>
        </div>

        {apartado.estado === 'entregado' && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
            Apartado entregado{apartado.venta_id ? ` — Venta #${apartado.venta_id}` : ''}.
          </div>
        )}
        {apartado.estado === 'cancelado' && (
          <div className="bg-slate-100 rounded-lg px-4 py-3 text-sm text-slate-600">
            Apartado cancelado{apartado.motivo_cancelacion ? `: ${apartado.motivo_cancelacion}` : ''}.
          </div>
        )}

        {/* Acciones */}
        <div className="flex flex-wrap justify-end gap-3 pt-2 border-t">
          <button
            onClick={() => imprimirApartado({
              id: apartado.id, numero: apartado.id, nombreCliente: apartado.nombre_cliente,
              telefono: apartado.telefono, total: apartado.total, fecha: apartado.fecha, items: apartado.detalles,
            })}
            className="min-h-[40px] px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium flex items-center gap-2"
          >
            <Printer size={16} /> Comprobante
          </button>

          {apartado.estado === 'activo' && accion === null && (
            <>
              <button
                onClick={() => setAccion('cancelar')}
                className="min-h-[40px] px-4 py-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium flex items-center gap-2"
              >
                <XCircle size={16} /> Cancelar
              </button>
              {puedeEntregar && (
                <button
                  onClick={() => setAccion('entregar')}
                  className="min-h-[40px] px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium flex items-center gap-2"
                >
                  <Check size={16} /> Entregar
                </button>
              )}
            </>
          )}
          {apartado.estado === 'activo' && accion === null && !puedeEntregar && (
            <p className="w-full text-right text-xs text-slate-400">La entrega (cobro e impresión del ticket) la realiza caja o el administrador.</p>
          )}
        </div>

        {/* Sub-form entregar */}
        {apartado.estado === 'activo' && accion === 'entregar' && puedeEntregar && (
          <div className="border-t pt-3 space-y-2">
            <p className="text-sm font-medium text-slate-700">Cobrar y entregar — se genera el ticket de venta</p>
            <label className="block text-xs text-slate-500">Efectivo recibido (opcional)</label>
            <input
              type="number" value={efectivo} min="0" step="0.01" placeholder="0.00"
              onChange={e => setEfectivo(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-brand-red"
            />
            {saldo != null && (
              <p className={`text-sm font-semibold ${saldo < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {saldo < 0 ? `Faltan ${fmt(Math.abs(saldo))}` : `Cambio: ${fmt(saldo)}`}
              </p>
            )}
            <div className="flex justify-end gap-3 pt-1">
              <button onClick={() => setAccion(null)} className="min-h-[40px] px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium">Volver</button>
              <SafeButton onClick={() => onEntregar(apartado, efectivo)} loading={procesando} variant="primary">
                <Check size={16} /> Confirmar entrega
              </SafeButton>
            </div>
          </div>
        )}

        {/* Sub-form cancelar */}
        {apartado.estado === 'activo' && accion === 'cancelar' && (
          <div className="border-t pt-3 space-y-2">
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>Al cancelar, el stock reservado vuelve a estar disponible.</span>
            </div>
            <input
              type="text" value={motivo} onChange={e => setMotivo(e.target.value)}
              placeholder="Motivo (opcional)"
              className="w-full min-h-[44px] px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
            />
            <div className="flex justify-end gap-3 pt-1">
              <button onClick={() => setAccion(null)} className="min-h-[40px] px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium">Volver</button>
              <SafeButton onClick={() => onCancelar(apartado, motivo)} loading={procesando} variant="danger">
                <XCircle size={16} /> Confirmar cancelación
              </SafeButton>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Modal crear apartado ───────────────────────────────────────────────────────

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function CrearApartadoModal({ usuario, usuarioId, onClose, onCreado }) {
  const [productos, setProductos] = useState([]);
  const [busq, setBusq] = useState('');
  const [carrito, setCarrito] = useState([]);
  const [nombreCliente, setNombreCliente] = useState('');
  const [telefono, setTelefono] = useState('');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const uidRef = useRef(null);

  useEffect(() => {
    api.get('/api/productos', { params: { limit: 1000, activo: 1 } })
      .then(res => {
        const data = res.data;
        setProductos(Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []));
      })
      .catch(() => {});
  }, []);

  // Stock efectivo (resuelve alias con producto_base_id)
  const stockDe = (prod) => {
    if (!prod || prod.sin_inventario) return Infinity;
    if (prod.producto_base_id) {
      const base = productos.find(p => p.id === prod.producto_base_id);
      if (base) return base.stock_actual ?? 0;
    }
    return prod.stock_actual ?? 0;
  };

  const filtrados = busq.trim()
    ? productos.filter(p => coincideBusqueda(busq, p.nombre, p.codigo)).slice(0, 30)
    : [];

  const agregar = (prod) => {
    setError('');
    setCarrito(prev => {
      const ex = prev.find(i => i.producto_id === prod.id);
      if (ex) {
        if (!prod.sin_inventario && ex.cantidad + 1 > stockDe(prod)) {
          setError(`Sin stock suficiente de "${prod.nombre}" (hay ${stockDe(prod)}).`);
          return prev;
        }
        return prev.map(i => i._id === ex._id
          ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.precio_unitario }
          : i);
      }
      if (!prod.sin_inventario && stockDe(prod) <= 0) {
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
    if (prod && !item.sin_inventario && nueva > stockDe(prod)) {
      setError(`Solo hay ${stockDe(prod)} de "${prod.nombre}".`);
      nueva = stockDe(prod);
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
    if (!uidRef.current) uidRef.current = crypto.randomUUID?.() ?? genId();
    try {
      const res = await api.post('/api/apartados', {
        usuario_id: usuarioId,
        usuario,
        nombre_cliente: nombreCliente.trim(),
        telefono: telefono.trim() || null,
        notas: notas.trim() || null,
        client_uid: uidRef.current,
        items: carrito.map(i => ({
          producto_id: i.producto_id,
          descripcion: i.descripcion,
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
          subtotal: i.subtotal,
          sin_inventario: i.sin_inventario,
        })),
      });
      // No se imprime al apartar (los pedidos suelen llegar por teléfono/WhatsApp);
      // el comprobante se imprime a demanda desde el detalle del apartado.
      onCreado();
    } catch (err) {
      setError(err.message || 'Error al registrar el apartado');
      setGuardando(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Nuevo apartado" size="lg">
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
                const stock = stockDe(p);
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

        {/* Carrito del apartado */}
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
          <span className="text-sm text-slate-500">Total a apartar</span>
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
            <Bookmark size={16} /> Confirmar apartado
          </SafeButton>
        </div>
      </div>
    </Modal>
  );
}

// ── Página ─────────────────────────────────────────────────────────────────────

export default function Apartados() {
  const { usuario, usuarioId, rol } = useUser();
  const { success, error } = useToast();
  const puedeEntregar = rol === 'admin';

  const [apartados, setApartados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [estado, setEstado] = useState('activo');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [detalle, setDetalle] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [crearOpen, setCrearOpen] = useState(false);

  const searchDebounce = useRef(null);

  const fetchApartados = useCallback(async (searchVal, fi, ff, est, pg) => {
    setLoading(true);
    try {
      const params = { page: pg, limit: 30 };
      if (searchVal) params.search = searchVal;
      if (fi) params.fecha_inicio = fi;
      if (ff) params.fecha_fin = ff;
      if (est !== 'all') params.estado = est;
      const res = await api.get('/api/apartados', { params });
      const data = res.data;
      setApartados(Array.isArray(data?.data) ? data.data : []);
      setTotal(data?.total || 0);
      setTotalPages(data?.totalPages || 1);
    } catch {
      error('Error al cargar apartados');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setPage(1);
      fetchApartados(search, fechaInicio, fechaFin, estado, 1);
    }, 300);
  }, [search, fechaInicio, fechaFin, estado]);

  useEffect(() => {
    fetchApartados(search, fechaInicio, fechaFin, estado, page);
  }, [page]);

  const abrirDetalle = async (a) => {
    try {
      const res = await api.get(`/api/apartados/${a.id}`);
      setDetalle(res.data);
    } catch {
      error('Error al cargar el detalle');
    }
  };

  const handleEntregar = async (apartado, efectivo) => {
    setProcesando(true);
    try {
      const res = await api.put(`/api/apartados/${apartado.id}/entregar`, {
        usuario_id: usuarioId,
        usuario,
        efectivo_recibido: efectivo !== '' ? parseFloat(efectivo) : null,
      });
      imprimirTicket({
        id: res.data.venta_id,
        numero_ticket: res.data.numero_ticket,
        items: (apartado.detalles || []).map(d => ({
          descripcion: d.descripcion, cantidad: d.cantidad,
          precio_unitario: d.precio_unitario, subtotal: d.subtotal,
        })),
        total: res.data.total,
        cambio: res.data.cambio,
        efectivo: res.data.efectivo,
        nombreCliente: apartado.nombre_cliente,
        fecha: new Date(),
      });
      success(`Apartado #${apartado.id} entregado — Venta #${res.data.venta_id}`);
      setDetalle(null);
      fetchApartados(search, fechaInicio, fechaFin, estado, page);
    } catch (err) {
      error(err.message || 'Error al entregar el apartado');
    } finally {
      setProcesando(false);
    }
  };

  const handleCancelar = async (apartado, motivo) => {
    setProcesando(true);
    try {
      await api.put(`/api/apartados/${apartado.id}/cancelar`, { usuario, motivo: motivo?.trim() || null });
      success(`Apartado #${apartado.id} cancelado — stock restaurado`);
      setDetalle(null);
      fetchApartados(search, fechaInicio, fechaFin, estado, page);
    } catch (err) {
      error(err.message || 'Error al cancelar el apartado');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-brand-blue flex items-center gap-2">
          <Bookmark size={24} /> Apartados
        </h1>
        <div className="flex items-center gap-3">
          <p className="text-sm text-slate-500">{total} apartado(s)</p>
          <button
            onClick={() => setCrearOpen(true)}
            className="min-h-[42px] px-4 py-2 rounded-lg bg-brand-red hover:bg-red-700 text-white text-sm font-semibold flex items-center gap-2"
          >
            <Plus size={16} /> Nuevo apartado
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por #, cliente, teléfono o producto..."
              className="w-full min-h-[44px] pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
            />
          </div>
          <input
            type="date"
            value={fechaInicio}
            onChange={e => setFechaInicio(e.target.value)}
            className="min-h-[44px] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-red"
          />
          <input
            type="date"
            value={fechaFin}
            onChange={e => setFechaFin(e.target.value)}
            className="min-h-[44px] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-red"
          />
          <select
            value={estado}
            onChange={e => setEstado(e.target.value)}
            className="min-h-[44px] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-red"
          >
            <option value="activo">Activos</option>
            <option value="entregado">Entregados</option>
            <option value="cancelado">Cancelados</option>
            <option value="all">Todos</option>
          </select>
        </div>

        {loading ? (
          <PageLoader />
        ) : apartados.length === 0 ? (
          <div className="text-center py-12 text-slate-400"><p>No hay apartados con ese criterio</p></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">#</th>
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Fecha</th>
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Cliente</th>
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Teléfono</th>
                    <th className="text-right py-3 px-3 text-slate-500 font-medium">Total</th>
                    <th className="text-center py-3 px-3 text-slate-500 font-medium">Estado</th>
                    <th className="text-right py-3 px-3 text-slate-500 font-medium">Ver</th>
                  </tr>
                </thead>
                <tbody>
                  {apartados.map(a => (
                    <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-mono text-slate-600 text-xs">#{a.id}</td>
                      <td className="py-3 px-3 text-slate-600 text-xs whitespace-nowrap">{formatDate(a.fecha)}</td>
                      <td className="py-3 px-3 text-slate-700">{a.nombre_cliente}</td>
                      <td className="py-3 px-3 text-slate-500">{a.telefono || <span className="text-slate-300">—</span>}</td>
                      <td className="py-3 px-3 text-right font-bold text-brand-blue">{fmt(a.total)}</td>
                      <td className="py-3 px-3 text-center"><EstadoBadge estado={a.estado} /></td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => abrirDetalle(a)}
                          className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                          title="Ver detalle"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} total={total} limit={30} onPageChange={setPage} />
          </>
        )}
      </div>

      <DetalleModal
        apartado={detalle}
        onClose={() => setDetalle(null)}
        onEntregar={handleEntregar}
        onCancelar={handleCancelar}
        procesando={procesando}
        puedeEntregar={puedeEntregar}
      />

      {crearOpen && (
        <CrearApartadoModal
          usuario={usuario}
          usuarioId={usuarioId}
          onClose={() => setCrearOpen(false)}
          onCreado={() => {
            setCrearOpen(false);
            success('Apartado registrado — stock reservado');
            fetchApartados(search, fechaInicio, fechaFin, estado, page);
          }}
        />
      )}
    </div>
  );
}
