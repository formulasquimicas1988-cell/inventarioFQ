import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, Minus, Trash2, ShoppingCart, Clock, History,
  Printer, X, Check, LogOut, Star, ChevronDown, AlertCircle, Tag, Bookmark, Pencil
} from 'lucide-react';
import api from '../lib/api';
import { useUser } from '../context/UserContext';
import { coincideBusqueda, normalizarTexto } from '../lib/utils';
import { imprimirTicket } from '../lib/print';
import ApartadoEditorModal from '../components/ApartadoEditorModal';

// ── Utilidades ──────────────────────────────────────────────────────────────

const fmt = (v) => `L ${parseFloat(v || 0).toFixed(2)}`;

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ── Sub-componentes ──────────────────────────────────────────────────────────

/** Popup de selección de variante */
function VariantesModal({ variantes, todosProductos, onSelect, onClose }) {
  const [busq, setBusq] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const filtradas = busq.trim()
    ? variantes.filter(v => coincideBusqueda(busq, v.nombre))
    : variantes;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-bold text-brand-blue text-lg">Seleccionar variante</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100"><X size={20} /></button>
        </div>
        <div className="px-4 pt-3">
          <input
            ref={inputRef}
            type="text"
            value={busq}
            onChange={e => setBusq(e.target.value)}
            placeholder="Buscar variante..."
            className="w-full min-h-[44px] px-3 py-2 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-brand-red"
          />
        </div>
        <div className="overflow-y-auto max-h-64 px-4 py-3 space-y-1">
          {filtradas.length === 0 && (
            <p className="text-center text-slate-400 py-4 text-sm">Sin resultados</p>
          )}
          {filtradas.map(v => {
            const sinStock = !v.sin_inventario && stockEfectivo(v, todosProductos) <= 0;
            return (
              <button
                key={v.id}
                onClick={() => !sinStock && onSelect(v)}
                disabled={sinStock}
                className={`w-full text-left px-3 py-3 rounded-lg border transition-colors
                  ${sinStock
                    ? 'border-transparent opacity-40 cursor-not-allowed'
                    : 'border-transparent hover:bg-slate-50 hover:border-slate-200'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${sinStock ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{v.nombre}</span>
                  {sinStock && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-semibold">AGOTADO</span>}
                </div>
                {(v.precio_a != null || v.precio_b != null) && (
                  <div className="text-xs text-slate-500 mt-0.5">
                    {[
                      v.precio_a != null && `A: ${fmt(v.precio_a)}`,
                      v.precio_b != null && `B: ${fmt(v.precio_b)}`,
                    ].filter(Boolean).join('  ')}
                  </div>
                )}
                {v.stock_actual != null && !v.sin_inventario && (
                  <div className={`text-xs mt-0.5 ${sinStock ? 'text-red-400' : 'text-slate-400'}`}>Stock: {v.stock_actual}</div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Popup para agregar producto al carrito (descripción + precio + cantidad) */
function AddModal({ producto, onConfirm, onClose }) {
  const precios = [
    { nivel: 'A', valor: producto.precio_a },
    { nivel: 'B', valor: producto.precio_b },
    { nivel: 'C', valor: producto.precio_c },
    { nivel: 'D', valor: producto.precio_d },
  ].filter(p => p.valor != null);

  const [descripcion, setDescripcion] = useState(producto.nombre);
  const [nivel, setNivel] = useState(precios.length > 0 ? precios[0].nivel : null);
  const [precio, setPrecio] = useState(precios.length > 0 ? String(precios[0].valor) : '');
  const [cantidad, setCantidad] = useState('1');
  const cantRef = useRef(null);
  const parseCant = (v) => Math.max(1, Math.round(parseFloat(v) || 1));

  useEffect(() => { cantRef.current?.focus(); }, []);

  const selectPrecio = (p) => {
    setNivel(p.nivel);
    setPrecio(String(p.valor));
  };

  const cantNum = parseCant(cantidad);
  const subtotal = cantNum * (parseFloat(precio) || 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (cantNum <= 0) return;
    onConfirm({
      producto,
      descripcion: descripcion.trim() || producto.nombre,
      nivel,
      precio_unitario: parseFloat(precio) || 0,
      cantidad: cantNum,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-bold text-brand-blue text-base truncate pr-2">Agregar al ticket</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 flex-shrink-0"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 flex flex-col gap-4">
          {/* Descripción (editable siempre, campo destacado si descripcion_editable) */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Descripción{producto.descripcion_editable ? <span className="ml-1 text-brand-red">— editable</span> : ''}
            </label>
            <input
              type="text"
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              className={`w-full min-h-[44px] px-3 py-2 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-brand-red
                ${producto.descripcion_editable ? 'border-brand-red bg-red-50' : 'border-slate-300'}`}
            />
          </div>

          {/* Selección de precio */}
          {precios.length > 0 ? (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2">Precio</label>
              <div className="flex gap-2 flex-wrap">
                {precios.map(p => (
                  <button
                    key={p.nivel}
                    type="button"
                    onClick={() => selectPrecio(p)}
                    className={`flex-1 min-w-[60px] py-2 px-3 rounded-lg border-2 text-sm font-semibold transition-colors
                      ${nivel === p.nivel
                        ? 'border-brand-red bg-brand-red text-white'
                        : 'border-slate-200 text-slate-700 hover:border-brand-red'}`}
                  >
                    {p.nivel}<br />
                    <span className="text-xs font-normal">{fmt(p.valor)}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Precio unitario</label>
              <input
                type="number"
                value={precio}
                onChange={e => setPrecio(e.target.value)}
                min="0" step="0.01" placeholder="0.00"
                className="w-full min-h-[44px] px-3 py-2 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-brand-red"
              />
            </div>
          )}

          {/* Cantidad */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Cantidad</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCantidad(v => String(Math.max(1, parseCant(v) - 1)))}
                className="w-10 h-10 rounded-lg border border-slate-300 flex items-center justify-center hover:bg-slate-50"
              >
                <Minus size={16} />
              </button>
              <input
                ref={cantRef}
                type="number"
                value={cantidad}
                onChange={e => setCantidad(e.target.value)}
                onBlur={e => setCantidad(String(parseCant(e.target.value)))}
                min="1" step="1"
                className={`flex-1 min-h-[44px] px-3 py-2 border rounded-lg text-center text-base font-semibold focus:outline-none focus:ring-2
                  ${!producto.sin_inventario && cantNum > (producto.stock_actual ?? 0)
                    ? 'border-red-400 focus:ring-red-400'
                    : 'border-slate-300 focus:ring-brand-red'}`}
              />
              <button
                type="button"
                onClick={() => setCantidad(v => String(parseCant(v) + 1))}
                className="w-10 h-10 rounded-lg border border-slate-300 flex items-center justify-center hover:bg-slate-50"
              >
                <Plus size={16} />
              </button>
            </div>
            {!producto.sin_inventario && cantNum > (producto.stock_actual ?? 0) && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle size={12} />
                Stock disponible: {producto.stock_actual ?? 0}
              </p>
            )}
          </div>

          {/* Subtotal */}
          <div className="bg-slate-50 rounded-lg px-4 py-3 flex justify-between items-center">
            <span className="text-sm text-slate-500">Subtotal</span>
            <span className="text-xl font-bold text-brand-blue">{fmt(subtotal)}</span>
          </div>

          <button
            type="submit"
            disabled={cantNum <= 0 || (!producto.sin_inventario && cantNum > (producto.stock_actual ?? 0))}
            className="w-full min-h-[48px] bg-brand-red hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            Agregar al ticket
          </button>
        </form>
      </div>
    </div>
  );
}

/** Modal "En espera" */
function EnEsperaModal({ pendientes, onReanudar, onEliminar, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-bold text-brand-blue">Ventas en espera</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100"><X size={20} /></button>
        </div>
        <div className="px-4 py-3 space-y-2 max-h-80 overflow-y-auto">
          {pendientes.length === 0 && (
            <p className="text-center text-slate-400 py-6 text-sm">No hay ventas en espera</p>
          )}
          {pendientes.map(esp => (
            <div key={esp._id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm">Ticket #{esp.num}</p>
                <p className="text-xs text-slate-500">
                  {esp.carrito.length} productos · {fmt(esp.carrito.reduce((s, i) => s + parseFloat(i.subtotal || 0), 0))}
                  {esp.nombreCliente && ` · ${esp.nombreCliente}`}
                </p>
              </div>
              <button
                onClick={() => onReanudar(esp)}
                className="px-3 py-1.5 bg-brand-blue text-white text-sm rounded-lg hover:bg-blue-800"
              >
                Reanudar
              </button>
              <button
                onClick={() => onEliminar(esp._id)}
                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Modal historial del día */
function HistorialModal({ onClose, onVerDetalle }) {
  const hoyStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Tegucigalpa' }); // YYYY-MM-DD
  const [fecha, setFecha] = useState(hoyStr);
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busq, setBusq] = useState('');

  // Traer TODAS las ventas del día, paginando hasta agotar los resultados
  // (el servidor limita cada página, así que iteramos por todas las páginas).
  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    setBusq('');
    (async () => {
      try {
        const todas = [];
        let page = 1;
        const limit = 200;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const res = await api.get('/api/ventas', {
            params: { fecha_inicio: fecha, fecha_fin: fecha, limit, page },
          });
          const lote = Array.isArray(res.data?.data) ? res.data.data : [];
          todas.push(...lote);
          const totalPages = res.data?.totalPages || 1;
          if (page >= totalPages || lote.length === 0) break;
          page++;
        }
        if (!cancelado) setVentas(todas);
      } catch {
        if (!cancelado) setVentas([]);
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    return () => { cancelado = true; };
  }, [fecha]);

  const esHoy = fecha === hoyStr;

  const ventasFiltradas = busq.trim()
    ? ventas.filter(v => coincideBusqueda(
        busq,
        String(v.numero_ticket ?? v.id),
        v.nombre_cliente || '',
        v.vendedor || '',
      ))
    : ventas;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
          <h2 className="font-bold text-brand-blue">
            {esHoy ? 'Historial de hoy' : 'Historial'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100"><X size={20} /></button>
        </div>

        {/* Selector de fecha */}
        <div className="px-5 pt-3 pb-2 flex-shrink-0 flex items-center gap-2">
          <input
            type="date"
            value={fecha}
            max={hoyStr}
            onChange={e => setFecha(e.target.value)}
            className="flex-1 min-h-[38px] px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-red"
          />
          {!esHoy && (
            <button
              onClick={() => setFecha(hoyStr)}
              className="px-3 py-1.5 text-xs font-semibold bg-brand-blue text-white rounded-lg hover:bg-blue-800 whitespace-nowrap"
            >
              Hoy
            </button>
          )}
        </div>

        {/* Buscador dentro del día */}
        <div className="px-5 pb-2 flex-shrink-0">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={busq}
              onChange={e => setBusq(e.target.value)}
              placeholder="Buscar por #ticket, cliente o vendedor..."
              className="w-full min-h-[38px] pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2">
          {loading && <p className="text-center text-slate-400 py-6 text-sm">Cargando...</p>}
          {!loading && ventas.length === 0 && (
            <p className="text-center text-slate-400 py-6 text-sm">No hay ventas este día</p>
          )}
          {!loading && ventas.length > 0 && ventasFiltradas.length === 0 && (
            <p className="text-center text-slate-400 py-6 text-sm">Sin resultados para "{busq}"</p>
          )}
          {!loading && ventasFiltradas.map(v => (
            <button
              key={v.id}
              onClick={() => onVerDetalle(v)}
              className={`w-full text-left p-3 rounded-xl border transition-colors hover:bg-slate-50
                ${v.anulada ? 'border-red-200 bg-red-50' : 'border-slate-200'}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-semibold text-slate-800">Ticket #{v.numero_ticket ?? v.id}</span>
                  {!!v.anulada && <span className="ml-2 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Anulada</span>}
                  {v.nombre_cliente && <p className="text-xs text-slate-500">{v.nombre_cliente}</p>}
                  {v.vendedor && <p className="text-[11px] text-slate-400">Vendedor: {v.vendedor}</p>}
                </div>
                <div className="text-right">
                  <p className="font-bold text-brand-blue">{fmt(v.total)}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(v.fecha).toLocaleTimeString('es-MX', { timeZone: 'America/Tegucigalpa', hour: '2-digit', minute: '2-digit', hour12: true })}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
        <div className="px-4 pb-4 pt-2 border-t flex-shrink-0">
          <p className="text-sm text-slate-500 text-center">
            {!loading && `${ventas.filter(v => !v.anulada).length} venta(s)`}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Modal para crear un apartado a partir del carrito actual */
function ApartarModal({ carrito, total, usuario, usuarioId, onCreado, onClose }) {
  const [nombreCliente, setNombreCliente] = useState('');
  const [telefono, setTelefono] = useState('');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const clienteRef = useRef(null);
  const uidRef = useRef(null);

  useEffect(() => { clienteRef.current?.focus(); }, []);

  const guardar = async () => {
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
      onCreado({
        id: res.data.id,
        numero: res.data.id,
        nombreCliente: nombreCliente.trim(),
        telefono: telefono.trim() || null,
        total,
        fecha: new Date(),
        items: [...carrito],
      });
    } catch (err) {
      setError(err.message || 'Error al registrar el apartado');
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
          <h2 className="font-bold text-brand-blue flex items-center gap-2"><Bookmark size={18} /> Apartar productos</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100"><X size={20} /></button>
        </div>
        <div className="px-5 py-4 flex flex-col gap-3">
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
            Los productos se descuentan del stock como <strong>apartado</strong>. El cliente paga el total al retirar (ahí se genera el ticket).
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Nombre del cliente *</label>
            <input
              ref={clienteRef}
              type="text"
              value={nombreCliente}
              onChange={e => { setNombreCliente(e.target.value); setError(''); }}
              placeholder="Nombre de quien aparta"
              className="w-full min-h-[44px] px-3 py-2 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-brand-red"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Teléfono (opcional)</label>
            <input
              type="tel"
              value={telefono}
              onChange={e => setTelefono(e.target.value)}
              placeholder="Para avisarle"
              className="w-full min-h-[44px] px-3 py-2 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-brand-red"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Notas (opcional)</label>
            <input
              type="text"
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Referencia, seña, etc."
              className="w-full min-h-[44px] px-3 py-2 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-brand-red"
            />
          </div>
          <div className="bg-slate-50 rounded-lg px-4 py-3 flex justify-between items-center">
            <span className="text-sm text-slate-500">Total a apartar</span>
            <span className="text-xl font-bold text-brand-blue">{fmt(total)}</span>
          </div>
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /><span>{error}</span>
            </div>
          )}
          <button
            onClick={guardar}
            disabled={guardando}
            className="w-full min-h-[48px] bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {guardando ? 'Guardando...' : (<><Bookmark size={18} /> Confirmar apartado</>)}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Modal de gestión de apartados (listar, entregar, cancelar) */
function ApartadosModal({ usuario, usuarioId, onClose, onStockChange }) {
  const [estado, setEstado] = useState('activo');
  const [busq, setBusq] = useState('');
  const [apartados, setApartados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState(null);          // detalle del apartado abierto
  const [accion, setAccion] = useState(null);     // 'entregar' | 'cancelar'
  const [efectivo, setEfectivo] = useState('');
  const [motivo, setMotivo] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const [editando, setEditando] = useState(false);

  const cargar = useCallback(() => {
    setLoading(true);
    api.get('/api/apartados', { params: { estado, search: busq.trim() || undefined, limit: 200 } })
      .then(res => setApartados(Array.isArray(res.data?.data) ? res.data.data : []))
      .catch(() => setApartados([]))
      .finally(() => setLoading(false));
  }, [estado, busq]);

  const recargarSel = async () => {
    if (!sel) return;
    try {
      const res = await api.get(`/api/apartados/${sel.id}`);
      setSel(res.data);
    } catch {}
  };

  // Debounce: recarga desde el servidor al cambiar estado o búsqueda
  useEffect(() => {
    const t = setTimeout(cargar, 250);
    return () => clearTimeout(t);
  }, [cargar]);

  const abrirDetalle = async (a) => {
    setAccion(null); setError(''); setEfectivo(''); setMotivo('');
    try {
      const res = await api.get(`/api/apartados/${a.id}`);
      setSel(res.data);
    } catch {
      setError('No se pudo cargar el apartado');
    }
  };

  const filtrados = apartados;

  const confirmarEntrega = async () => {
    setProcesando(true); setError('');
    try {
      const res = await api.put(`/api/apartados/${sel.id}/entregar`, {
        usuario_id: usuarioId,
        usuario,
        efectivo_recibido: efectivo !== '' ? parseFloat(efectivo) : null,
      });
      imprimirTicket({
        id: res.data.venta_id,
        numero_ticket: res.data.numero_ticket,
        items: (sel.detalles || []).map(d => ({
          descripcion: d.descripcion, cantidad: d.cantidad,
          precio_unitario: d.precio_unitario, subtotal: d.subtotal,
        })),
        total: res.data.total,
        cambio: res.data.cambio,
        efectivo: res.data.efectivo,
        nombreCliente: sel.nombre_cliente,
        fecha: new Date(),
      });
      setSel(null); setAccion(null); setEfectivo('');
      onStockChange?.();
      cargar();
    } catch (err) {
      setError(err.message || 'Error al entregar el apartado');
    } finally {
      setProcesando(false);
    }
  };

  const confirmarCancelacion = async () => {
    setProcesando(true); setError('');
    try {
      await api.put(`/api/apartados/${sel.id}/cancelar`, { usuario, motivo: motivo.trim() || null });
      setSel(null); setAccion(null); setMotivo('');
      onStockChange?.();
      cargar();
    } catch (err) {
      setError(err.message || 'Error al cancelar el apartado');
    } finally {
      setProcesando(false);
    }
  };

  const saldoEfectivo = efectivo !== '' ? parseFloat(efectivo) - parseFloat(sel?.total || 0) : null;

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
          <h2 className="font-bold text-brand-blue flex items-center gap-2">
            {sel ? <button onClick={() => { setSel(null); setAccion(null); }} className="text-slate-400 hover:text-slate-700">←</button> : <Bookmark size={18} />}
            {sel ? `Apartado #${sel.id}` : 'Apartados'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100"><X size={20} /></button>
        </div>

        {!sel ? (
          <>
            {/* Filtros */}
            <div className="px-5 pt-3 pb-2 flex-shrink-0 space-y-2">
              <div className="flex gap-1.5">
                {[['activo','Activos'],['entregado','Entregados'],['cancelado','Cancelados'],['all','Todos']].map(([val,label]) => (
                  <button
                    key={val}
                    onClick={() => setEstado(val)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors
                      ${estado === val ? 'bg-brand-blue text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >{label}</button>
                ))}
              </div>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={busq}
                  onChange={e => setBusq(e.target.value)}
                  placeholder="Buscar por #, cliente, teléfono o producto..."
                  className="w-full min-h-[38px] pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
                />
              </div>
            </div>
            {/* Lista */}
            <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2">
              {loading && <p className="text-center text-slate-400 py-6 text-sm">Cargando...</p>}
              {!loading && filtrados.length === 0 && (
                <p className="text-center text-slate-400 py-6 text-sm">No hay apartados</p>
              )}
              {!loading && filtrados.map(a => (
                <button
                  key={a.id}
                  onClick={() => abrirDetalle(a)}
                  className={`w-full text-left p-3 rounded-xl border transition-colors hover:bg-slate-50
                    ${a.estado === 'cancelado' ? 'border-slate-200 opacity-60'
                      : a.estado === 'entregado' ? 'border-green-200 bg-green-50'
                      : 'border-amber-200 bg-amber-50'}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <span className="font-semibold text-slate-800">#{a.id} · {a.nombre_cliente}</span>
                      {a.telefono && <p className="text-xs text-slate-500">Tel: {a.telefono}</p>}
                      <EstadoBadge estado={a.estado} />
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-brand-blue">{fmt(a.total)}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(a.fecha).toLocaleDateString('es-MX', { timeZone: 'America/Tegucigalpa', day: '2-digit', month: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          /* Detalle del apartado */
          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800">{sel.nombre_cliente}</p>
                {sel.telefono && <p className="text-xs text-slate-500">Tel: {sel.telefono}</p>}
                {sel.creado_por && <p className="text-[11px] text-slate-400">Creado por: {sel.creado_por}</p>}
              </div>
              <EstadoBadge estado={sel.estado} />
            </div>
            {sel.notas && <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">{sel.notas}</p>}

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {(sel.detalles || []).map(d => (
                    <tr key={d.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-3 py-2 text-slate-800">{d.descripcion}</td>
                      <td className="px-2 py-2 text-right text-slate-500">{parseFloat(d.cantidad)} × {fmt(d.precio_unitario)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{fmt(d.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span><span className="text-brand-blue">{fmt(sel.total)}</span>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /><span>{error}</span>
              </div>
            )}

            {sel.estado === 'activo' && accion === null && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => { setEditando(true); setError(''); }}
                  className="col-span-2 min-h-[42px] bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-xl flex items-center justify-center gap-2"
                >
                  <Pencil size={16} /> Editar apartado
                </button>
                <button
                  onClick={() => { setAccion('cancelar'); setError(''); }}
                  className="min-h-[46px] bg-red-100 hover:bg-red-200 text-red-700 font-semibold rounded-xl"
                >
                  Cancelar apartado
                </button>
                <button
                  onClick={() => { setAccion('entregar'); setError(''); }}
                  className="min-h-[46px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
                >
                  <Check size={18} /> Entregar
                </button>
              </div>
            )}

            {sel.estado === 'activo' && accion === 'entregar' && (
              <div className="space-y-2 pt-1 border-t">
                <p className="text-sm font-medium text-slate-700">Cobrar y entregar — genera el ticket</p>
                <label className="block text-xs text-slate-500">Efectivo recibido (opcional)</label>
                <input
                  type="number" value={efectivo} min="0" step="0.01" placeholder="0.00"
                  onChange={e => setEfectivo(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-brand-red"
                />
                {saldoEfectivo != null && (
                  <p className={`text-sm font-semibold ${saldoEfectivo < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {saldoEfectivo < 0 ? `Faltan ${fmt(Math.abs(saldoEfectivo))}` : `Cambio: ${fmt(saldoEfectivo)}`}
                  </p>
                )}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setAccion(null)} className="flex-1 min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl">Volver</button>
                  <button onClick={confirmarEntrega} disabled={procesando} className="flex-1 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl">
                    {procesando ? '...' : 'Confirmar entrega'}
                  </button>
                </div>
              </div>
            )}

            {sel.estado === 'activo' && accion === 'cancelar' && (
              <div className="space-y-2 pt-1 border-t">
                <p className="text-sm font-medium text-slate-700">Cancelar apartado — se restaura el stock</p>
                <input
                  type="text" value={motivo} onChange={e => setMotivo(e.target.value)}
                  placeholder="Motivo (opcional)"
                  className="w-full min-h-[44px] px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
                />
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setAccion(null)} className="flex-1 min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl">Volver</button>
                  <button onClick={confirmarCancelacion} disabled={procesando} className="flex-1 min-h-[44px] bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold rounded-xl">
                    {procesando ? '...' : 'Confirmar cancelación'}
                  </button>
                </div>
              </div>
            )}

            {sel.estado === 'entregado' && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700">
                Entregado{sel.venta_id ? ` — Venta #${sel.venta_id}` : ''}.
              </div>
            )}
            {sel.estado === 'cancelado' && (
              <div className="bg-slate-100 rounded-lg px-3 py-2 text-sm text-slate-600">
                Cancelado{sel.motivo_cancelacion ? `: ${sel.motivo_cancelacion}` : ''}.
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    {editando && sel && (
      <ApartadoEditorModal
        existente={sel}
        usuario={usuario}
        usuarioId={usuarioId}
        onClose={() => setEditando(false)}
        onSaved={async () => {
          setEditando(false);
          await recargarSel();
          onStockChange?.();
          cargar();
        }}
      />
    )}
    </>
  );
}

/** Badge de estado de apartado */
function EstadoBadge({ estado }) {
  const map = {
    activo: 'bg-amber-100 text-amber-700',
    entregado: 'bg-green-100 text-green-700',
    cancelado: 'bg-slate-200 text-slate-600',
  };
  const label = { activo: 'Activo', entregado: 'Entregado', cancelado: 'Cancelado' }[estado] || estado;
  return <span className={`inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${map[estado] || 'bg-slate-100 text-slate-600'}`}>{label}</span>;
}

/** Modal detalle de venta (solo lectura, para historial de caja) */
function DetalleVentaModal({ venta, onClose, onReimprimir }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
          <div>
            <h2 className="font-bold text-brand-blue">Ticket #{venta.numero_ticket ?? venta.id}</h2>
            {venta.nombre_cliente && <p className="text-sm text-slate-500">{venta.nombre_cliente}</p>}
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-4 py-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left pb-2 text-slate-500 font-medium">Producto</th>
                <th className="text-right pb-2 text-slate-500 font-medium">Cant</th>
                <th className="text-right pb-2 text-slate-500 font-medium">P.U.</th>
                <th className="text-right pb-2 text-slate-500 font-medium">Sub</th>
              </tr>
            </thead>
            <tbody>
              {(venta.detalles || []).map(d => (
                <tr key={d.id} className="border-b border-slate-50">
                  <td className="py-2 pr-2 text-slate-800">{d.descripcion}</td>
                  <td className="py-2 text-right text-slate-600">{parseFloat(d.cantidad)}</td>
                  <td className="py-2 text-right text-slate-600">{fmt(d.precio_unitario)}</td>
                  <td className="py-2 text-right font-semibold text-slate-800">{fmt(d.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-4 border-t flex-shrink-0 space-y-1">
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span className="text-brand-blue">{fmt(venta.total)}</span>
          </div>
          {venta.efectivo_recibido != null && (
            <div className="flex justify-between text-sm text-slate-500">
              <span>Efectivo</span><span>{fmt(venta.efectivo_recibido)}</span>
            </div>
          )}
          {venta.cambio != null && (
            <div className="flex justify-between text-sm text-slate-500">
              <span>Cambio</span><span>{fmt(venta.cambio)}</span>
            </div>
          )}
          <button
            onClick={() => onReimprimir(true)}
            className="w-full mt-3 min-h-[44px] bg-brand-blue hover:bg-blue-800 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <Printer size={16} />
            Reimprimir (copia)
          </button>
          <button
            onClick={() => onReimprimir(false)}
            className="w-full mt-2 min-h-[44px] bg-slate-700 hover:bg-slate-800 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <Printer size={16} />
            Reimprimir original
          </button>
        </div>
      </div>
    </div>
  );
}


/** Modal para editar precios de productos desde la caja */
function PreciosModal({ productos, onClose, onGuardado }) {
  const [busq, setBusq] = useState('');
  const [editando, setEditando] = useState(null); // { id, precio_a, precio_b, precio_c, precio_d }
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const filtrados = busq.trim()
    ? productos.filter(p => coincideBusqueda(busq, p.nombre, p.codigo))
    : productos;

  const abrirEdicion = (p) => {
    setEditando({
      id: p.id,
      nombre: p.nombre,
      precio_a: p.precio_a != null ? String(p.precio_a) : '',
      precio_b: p.precio_b != null ? String(p.precio_b) : '',
      precio_c: p.precio_c != null ? String(p.precio_c) : '',
      precio_d: p.precio_d != null ? String(p.precio_d) : '',
    });
    setError('');
    setExito('');
  };

  const guardar = async () => {
    setGuardando(true);
    setError('');
    setExito('');
    try {
      const prod = productos.find(p => p.id === editando.id);
      await api.put(`/api/productos/${editando.id}`, {
        ...prod,
        precio_a: editando.precio_a !== '' ? parseFloat(editando.precio_a) : null,
        precio_b: editando.precio_b !== '' ? parseFloat(editando.precio_b) : null,
        precio_c: editando.precio_c !== '' ? parseFloat(editando.precio_c) : null,
        precio_d: editando.precio_d !== '' ? parseFloat(editando.precio_d) : null,
        usuario: prod.usuario,
      });
      setExito(`Precios de "${editando.nombre}" actualizados`);
      setEditando(null);
      onGuardado();
    } catch {
      setError('Error al guardar. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <Tag size={18} className="text-brand-blue" />
            <h2 className="font-bold text-brand-blue">Editar precios</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100"><X size={20} /></button>
        </div>

        {/* Búsqueda */}
        <div className="px-4 pt-3 pb-2 flex-shrink-0">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={busq}
              onChange={e => setBusq(e.target.value)}
              placeholder="Buscar producto..."
              className="w-full min-h-[40px] pl-9 pr-4 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
            />
          </div>
        </div>

        {/* Feedback */}
        {exito && (
          <div className="mx-4 mb-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
            <Check size={14} /> {exito}
          </div>
        )}

        {/* Lista */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          {filtrados.map(p => {
            const isEditando = editando?.id === p.id;
            return (
              <div key={p.id} className={`rounded-xl border transition-all ${isEditando ? 'border-brand-red shadow-sm' : 'border-slate-200'}`}>
                {/* Fila principal */}
                <button
                  onClick={() => isEditando ? setEditando(null) : abrirEdicion(p)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                >
                  <div>
                    <span className="font-medium text-slate-800 text-sm">{p.nombre}</span>
                    <div className="flex gap-2 mt-0.5">
                      {['A','B','C','D'].map(n => {
                        const v = p[`precio_${n.toLowerCase()}`];
                        return v != null
                          ? <span key={n} className="text-[11px] text-slate-500">{n}: {fmt(v)}</span>
                          : null;
                      })}
                      {['a','b','c','d'].every(n => p[`precio_${n}`] == null) && (
                        <span className="text-[11px] text-slate-400 italic">Sin precios</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-brand-red font-semibold">{isEditando ? 'Cancelar' : 'Editar'}</span>
                </button>

                {/* Form inline */}
                {isEditando && (
                  <div className="px-4 pb-4 border-t border-slate-100 pt-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                      {['a','b','c','d'].map(n => (
                        <div key={n}>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Precio {n.toUpperCase()}</label>
                          <input
                            type="number"
                            value={editando[`precio_${n}`]}
                            onChange={e => setEditando(prev => ({ ...prev, [`precio_${n}`]: e.target.value }))}
                            min="0" step="0.01" placeholder="—"
                            className="w-full min-h-[38px] px-2 py-1 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
                          />
                        </div>
                      ))}
                    </div>
                    {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
                    <button
                      onClick={guardar}
                      disabled={guardando}
                      className="w-full min-h-[38px] bg-brand-red hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition-colors"
                    >
                      {guardando ? 'Guardando...' : 'Guardar precios'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Stock efectivo: resuelve producto_base_id ────────────────────────────────
// Los alias (producto_base_id != null) comparten stock con su producto base
function stockEfectivo(producto, todosProductos) {
  if (!producto || producto.sin_inventario) return Infinity;
  if (producto.producto_base_id) {
    const base = todosProductos.find(p => p.id === producto.producto_base_id);
    if (base) return base.stock_actual ?? 0;
  }
  return producto.stock_actual ?? 0;
}

// ── Protección contra doble clic ─────────────────────────────────────────────
function useThrottle(fn, ms = 800) {
  const busy = useRef(false);
  return useCallback((...args) => {
    if (busy.current) return;
    busy.current = true;
    fn(...args);
    setTimeout(() => { busy.current = false; }, ms);
  }, [fn, ms]);
}

// ── Componente principal ─────────────────────────────────────────────────────

export default function Caja() {
  const { usuario, usuarioId, rol, logout } = useUser();
  const navigate = useNavigate();

  // Productos
  const [productos, setProductos] = useState([]);
  const [loadingProd, setLoadingProd] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [ultimaSync, setUltimaSync] = useState(null);

  // Carrito
  const [carrito, setCarrito] = useState([]);
  const [nombreCliente, setNombreCliente] = useState('');
  const [efectivo, setEfectivo] = useState('');
  const [cobrando, setCobrando] = useState(false);
  const [errorCobro, setErrorCobro] = useState('');

  // Tickets en espera y contador — persisten en sessionStorage
  const [enEspera, setEnEspera] = useState(() => {
    try {
      const saved = sessionStorage.getItem('fq_en_espera');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [ticketNum, setTicketNum] = useState(1);

  // Sincronizar enEspera con sessionStorage
  useEffect(() => {
    try { sessionStorage.setItem('fq_en_espera', JSON.stringify(enEspera)); } catch {}
  }, [enEspera]);

  // Historial
  const [ventaDetalle, setVentaDetalle] = useState(null);

  // Modales
  const [variantesModal, setVariantesModal] = useState(null);  // {producto, variantes}
  const [enEsperaModal, setEnEsperaModal] = useState(false);
  const [historialModal, setHistorialModal] = useState(false);
  const [preciosModal, setPreciosModal] = useState(false);
  const [apartarModal, setApartarModal] = useState(false);
  const [apartadosModal, setApartadosModal] = useState(false);
  const [apartadoMsg, setApartadoMsg] = useState('');

  const carritoRef = useRef(null);
  const carritoStateRef = useRef([]);
  useEffect(() => { carritoStateRef.current = carrito; }, [carrito]);

  // Protección contra doble cobro: el ref bloquea de forma síncrona (el estado
  // `cobrando` no alcanza a actualizarse entre dos Enter/clics seguidos)
  const cobrandoRef = useRef(false);
  // UID de idempotencia: se mantiene entre reintentos del mismo carrito para que
  // el servidor no registre la venta dos veces; se descarta si el carrito cambia
  const ventaUidRef = useRef(null);
  useEffect(() => { ventaUidRef.current = null; }, [carrito]);

  // ── Cargar productos ──────────────────────────────────────────────────────

  const cargarProductos = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoadingProd(true);
    try {
      const res = await api.get('/api/productos', { params: { limit: 1000, activo: 1 } });
      const data = res.data;
      const lista = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
      setProductos(lista);
      setUltimaSync(new Date());
    } catch {
      // silencio
    } finally {
      if (!silencioso) setLoadingProd(false);
    }
  }, []);

  useEffect(() => { cargarProductos(); }, [cargarProductos]);

  // Refresco silencioso: al volver a la pestaña + cada 30s
  useEffect(() => {
    const onFocus = () => cargarProductos(true);
    document.addEventListener('visibilitychange', onFocus);
    const interval = setInterval(() => cargarProductos(true), 10000);
    return () => {
      document.removeEventListener('visibilitychange', onFocus);
      clearInterval(interval);
    };
  }, [cargarProductos]);

  // Obtener el próximo número de ticket desde el servidor
  const refrescarTicketNum = useCallback(() => {
    api.get('/api/ventas', { params: { limit: 1 } }).then(res => {
      const ultima = res.data?.data?.[0];
      if (ultima?.numero_ticket) setTicketNum(ultima.numero_ticket + 1);
    }).catch(() => {});
  }, []);

  useEffect(() => { refrescarTicketNum(); }, [refrescarTicketNum]);

// ── Datos derivados ───────────────────────────────────────────────────────

  const productosFavoritos = productos.filter(p => p.favorito);

  const productosFiltrados = busqueda.trim()
    ? (() => {
        const q = normalizarTexto(busqueda);
        return productos
          .filter(p => coincideBusqueda(busqueda, p.nombre, p.codigo))
          .sort((a, b) => {
            const aStarts = normalizarTexto(a.nombre).startsWith(q);
            const bStarts = normalizarTexto(b.nombre).startsWith(q);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            return 0;
          });
      })()
    : productos;

  const total = carrito.reduce((s, i) => s + parseFloat(i.subtotal || 0), 0);
  const cambio = efectivo !== '' ? parseFloat(efectivo) - total : null;

  // ── Flujo de agregar producto ─────────────────────────────────────────────

  const agregarDirecto = (producto) => {
    const nivel = producto.precio_a != null ? 'A'
      : producto.precio_b != null ? 'B'
      : producto.precio_c != null ? 'C'
      : producto.precio_d != null ? 'D'
      : null;
    const precio = parseFloat(producto.precio_a ?? producto.precio_b ?? producto.precio_c ?? producto.precio_d ?? 0) || 0;

    // Validar stock antes de agregar/incrementar (usa ref para evitar closure stale)
    if (!producto.sin_inventario) {
      const stockDisp = stockEfectivo(producto, productos);
      const enCarrito = carritoStateRef.current.find(i =>
        i.producto_id === producto.id && i.nivel === nivel && !i.descripcion_editable
      );
      const cantActual = enCarrito ? enCarrito.cantidad : 0;
      if (cantActual + 1 > stockDisp) {
        setErrorCobro(`Sin stock: "${producto.nombre}" — hay ${stockDisp} en existencia y ya tienes ${cantActual} en el ticket.`);
        return;
      }
    }

    setErrorCobro('');
    setCarrito(prev => {
      const existente = prev.find(i =>
        i.producto_id === producto.id &&
        i.nivel === nivel &&
        !i.descripcion_editable
      );
      if (existente) {
        return prev.map(i =>
          i._id === existente._id
            ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.precio_unitario }
            : i
        );
      }
      return [...prev, {
        _id: genId(),
        producto_id: producto.id,
        descripcion: producto.nombre,
        cantidad: 1,
        precio_unitario: precio,
        nivel,
        subtotal: precio,
        sin_inventario: producto.sin_inventario ? 1 : 0,
        descripcion_editable: producto.descripcion_editable ? 1 : 0,
      }];
    });
    setBusqueda('');
  };

  const _iniciarAgregar = (producto) => {
    // Solo agrupar si el producto tiene es_grupo activado
    if (producto.es_grupo) {
      const primeraPalabra = producto.nombre.split(' ')[0].toLowerCase();
      const variantes = productos.filter(p =>
        p.activo && p.es_grupo && p.nombre.toLowerCase().startsWith(primeraPalabra)
      );
      if (variantes.length > 1) {
        setVariantesModal({ producto, variantes });
        return;
      }
    }

    // Sin grupo o único en su grupo → bloquear si no hay stock
    if (!producto.sin_inventario && stockEfectivo(producto, productos) <= 0) return;
    agregarDirecto(producto);
  };
  const iniciarAgregar = useThrottle(_iniciarAgregar, 120);

  const onVarianteSeleccionada = (variante) => {
    setVariantesModal(null);
    agregarDirecto(variante);
  };

  // ── Modificar carrito ─────────────────────────────────────────────────────

  const eliminarItem = (_id) => setCarrito(prev => prev.filter(i => i._id !== _id));

  const cambiarCantidad = (_id, delta) => {
    if (delta > 0) {
      const item = carritoStateRef.current.find(i => i._id === _id);
      if (item && !item.sin_inventario) {
        const prod = productos.find(p => p.id === item.producto_id);
        if (prod) {
          const stockDisp = stockEfectivo(prod, productos);
          if (item.cantidad + 1 > stockDisp) {
            setErrorCobro(`Sin stock: "${item.descripcion}" — hay ${stockDisp} en existencia.`);
            return;
          }
        }
      }
    }
    setErrorCobro('');
    setCarrito(prev => prev.map(i => {
      if (i._id !== _id) return i;
      const nuevaCant = Math.max(1, Math.round(i.cantidad) + delta);
      return { ...i, cantidad: nuevaCant, subtotal: nuevaCant * i.precio_unitario };
    }));
  };

  // ── En espera ─────────────────────────────────────────────────────────────

  const ponerEnEspera = useThrottle(() => {
    if (!carrito.length) return;
    setEnEspera(prev => [...prev, {
      _id: genId(),
      carrito,
      nombreCliente,
      num: ticketNum,
    }]);
    setCarrito([]);
    setNombreCliente('');
    setEfectivo('');
    setTicketNum(n => n + 1);
  }, 600);

  const reanudarEnEspera = (esp) => {
    // Si hay carrito activo, mandarlo a espera
    if (carrito.length) {
      setEnEspera(prev => [...prev.filter(e => e._id !== esp._id), {
        _id: genId(),
        carrito,
        nombreCliente,
        num: ticketNum,
      }]);
    } else {
      setEnEspera(prev => prev.filter(e => e._id !== esp._id));
    }
    setCarrito(esp.carrito);
    setNombreCliente(esp.nombreCliente);
    setEfectivo('');
    setEnEsperaModal(false);
  };

  const eliminarEnEspera = (_id) => setEnEspera(prev => prev.filter(e => e._id !== _id));

  // ── Historial ─────────────────────────────────────────────────────────────

  const verDetalleVenta = async (venta) => {
    try {
      const res = await api.get(`/api/ventas/${venta.id}`);
      setVentaDetalle(res.data);
    } catch {
      setVentaDetalle(venta);
    }
  };

  // ── Apartar ───────────────────────────────────────────────────────────────

  const handleApartadoCreado = () => {
    setApartarModal(false);
    setCarrito([]);
    setNombreCliente('');
    setEfectivo('');
    cargarProductos(true); // el stock ya bajó por el apartado
    // No se imprime al apartar: el comprobante se imprime a demanda desde
    // el detalle del apartado (botón "Comprobante").
    setApartadoMsg('Apartado guardado — stock reservado');
    setTimeout(() => setApartadoMsg(''), 3500);
  };

  // ── Cobrar ────────────────────────────────────────────────────────────────

  const cobrar = useCallback(async () => {
    if (cobrandoRef.current) return;
    if (!carrito.length) return;
    if (!usuarioId) {
      setErrorCobro('Sesión sin ID de usuario. Por favor cierra sesión y vuelve a entrar.');
      return;
    }

    // Validar stock de cada item contra la lista actual de productos
    for (const item of carrito) {
      if (item.sin_inventario) continue;
      const prod = productos.find(p => p.id === item.producto_id);
      if (!prod) continue;
      const stockDisponible = stockEfectivo(prod, productos);
      if (item.cantidad > stockDisponible) {
        setErrorCobro(
          `Stock insuficiente: "${item.descripcion}" — pediste ${item.cantidad} pero solo hay ${stockDisponible} en existencia.`
        );
        return;
      }
    }

    setErrorCobro('');
    cobrandoRef.current = true;
    setCobrando(true);
    if (!ventaUidRef.current) {
      ventaUidRef.current = crypto.randomUUID?.() ?? genId();
    }
    try {
      const res = await api.post('/api/ventas', {
        usuario_id: usuarioId,
        usuario,
        nombre_cliente: nombreCliente.trim() || null,
        efectivo_recibido: efectivo !== '' ? parseFloat(efectivo) : null,
        client_uid: ventaUidRef.current,
        items: carrito.map(i => ({
          producto_id: i.producto_id,
          descripcion: i.descripcion,
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
          subtotal: i.subtotal,
          sin_inventario: i.sin_inventario,
        })),
      });

      const ticketData = {
        id: res.data.id,
        numero_ticket: res.data.numero_ticket,
        items: [...carrito],
        total,
        cambio: res.data.cambio,
        nombreCliente,
        efectivo: efectivo !== '' ? parseFloat(efectivo) : null,
        fecha: new Date(),
        vendedor: usuario,
      };

      ventaUidRef.current = null;
      setCarrito([]);
      setNombreCliente('');
      setEfectivo('');
      cargarProductos(true); // refrescar stock en tiempo real
      setTicketNum(res.data.numero_ticket + 1); // usar número real devuelto por el servidor
      imprimirTicket(ticketData);
    } catch (err) {
      setErrorCobro(err.message || 'Error al cobrar la venta');
    } finally {
      cobrandoRef.current = false;
      setCobrando(false);
    }
  }, [carrito, usuarioId, usuario, nombreCliente, efectivo, total, productos, refrescarTicketNum]);

  // ── Enter para cobrar ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.key !== 'Enter') return;
      const modalAbierto = variantesModal || enEsperaModal || historialModal || ventaDetalle || apartarModal || apartadosModal;
      if (modalAbierto) return;
      const active = document.activeElement;
      const tag = active?.tagName;
      // Permitir Enter desde el campo de efectivo
      if (active?.id === 'efectivo-input') { cobrar(); return; }
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      cobrar();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [variantesModal, enEsperaModal, historialModal, ventaDetalle, apartarModal, apartadosModal, cobrar]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">

      {/* ── Header de Caja ── */}
      <header className="bg-brand-blue flex items-center justify-between px-4 h-14 flex-shrink-0 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <img src="/logo.ico" alt="" className="w-7 h-7 rounded-lg object-contain flex-shrink-0" />
          <span className="text-white font-bold text-base hidden sm:block">Fórmulas Químicas</span>
          <span className="text-white/60 text-sm hidden sm:block">·</span>
          <span className="text-white/80 text-sm">Ticket #{ticketNum}</span>
          {ultimaSync && (
            <span className="text-white/50 text-xs hidden sm:block">
              {ultimaSync.toLocaleTimeString('es-MX', { timeZone: 'America/Tegucigalpa', hour: '2-digit', minute: '2-digit', hour12: true })}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={ponerEnEspera}
            disabled={!carrito.length}
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-40 text-sm transition-colors"
          >
            <Clock size={16} />
            <span className="hidden sm:block">En espera</span>
            {enEspera.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-brand-red text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {enEspera.length}
              </span>
            )}
          </button>

          {enEspera.length > 0 && (
            <button
              onClick={() => setEnEsperaModal(true)}
              className="px-3 py-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 text-sm transition-colors"
            >
              <ChevronDown size={16} />
            </button>
          )}

          <button
            onClick={() => setHistorialModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 text-sm transition-colors"
          >
            <History size={16} />
            <span className="hidden sm:block">Historial</span>
          </button>

          <button
            onClick={() => setApartadosModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 text-sm transition-colors"
          >
            <Bookmark size={16} />
            <span className="hidden sm:block">Apartados</span>
          </button>

          <button
            onClick={() => setPreciosModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 text-sm transition-colors"
          >
            <Tag size={16} />
            <span className="hidden sm:block">Precios</span>
          </button>

          {rol === 'admin' && (
            <button
              onClick={() => navigate('/ventas')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 text-sm transition-colors"
            >
              <span className="hidden sm:block">Inventario</span>
            </button>
          )}

          <div className="h-6 w-px bg-white/20 mx-1" />
          <span className="text-white/70 text-sm hidden sm:block">{usuario}</span>
          <button
            onClick={logout}
            title="Cerrar sesión"
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* ── Cuerpo principal: dos columnas ── */}
      <div className="flex flex-1">

        {/* ── Panel izquierdo: ticket ── */}
        <div className="flex flex-col w-full md:w-3/5 bg-white border-r border-slate-200">

          {/* Tabla del ticket */}
          <div ref={carritoRef}>
            {carrito.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-3">
                <ShoppingCart size={48} />
                <p className="text-sm">El ticket está vacío</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white border-b border-slate-100">
                  <tr>
                    <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs">Cant</th>
                    <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs">Producto</th>
                    <th className="text-right py-2 px-3 text-slate-400 font-medium text-xs">P.U.</th>
                    <th className="text-right py-2 px-3 text-slate-400 font-medium text-xs">Sub</th>
                    <th className="py-2 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {carrito.map(item => (
                    <tr key={item._id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => cambiarCantidad(item._id, -1)}
                            className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 text-xs"
                          >
                            <Minus size={12} />
                          </button>
                          <input
                            type="number"
                            value={Math.round(item.cantidad)}
                            min="1"
                            step="1"
                            onChange={e => {
                              const v = Math.max(1, parseInt(e.target.value) || 1);
                              setCarrito(prev => prev.map(i =>
                                i._id === item._id
                                  ? { ...i, cantidad: v, subtotal: v * i.precio_unitario }
                                  : i
                              ));
                            }}
                            className="w-12 h-7 text-center text-sm font-semibold text-slate-700 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-red"
                          />
                          <button
                            onClick={() => cambiarCantidad(item._id, 1)}
                            className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 text-xs"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        {item.descripcion_editable ? (
                          <input
                            type="text"
                            value={item.descripcion}
                            onChange={e => setCarrito(prev => prev.map(i =>
                              i._id === item._id ? { ...i, descripcion: e.target.value } : i
                            ))}
                            className="w-full h-7 px-2 text-sm text-slate-800 border border-brand-red bg-red-50 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-red"
                            placeholder="Descripción..."
                          />
                        ) : (
                          <div className="text-slate-800 font-medium text-sm leading-tight">{item.descripcion}</div>
                        )}
                        {item.nivel && (
                          <span className="text-[10px] text-slate-400">Precio {item.nivel}</span>
                        )}
                        {!item.sin_inventario && (() => {
                          const prod = productos.find(p => p.id === item.producto_id);
                          const stockDisp = prod ? stockEfectivo(prod, productos) : null;
                          return stockDisp !== null && item.cantidad > stockDisp ? (
                            <div className="flex items-center gap-1 text-red-500 text-[10px] mt-0.5">
                              <AlertCircle size={10} />
                              Solo hay {stockDisp} en stock
                            </div>
                          ) : null;
                        })()}
                      </td>
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          value={item.precio_unitario}
                          min="0" step="0.01"
                          onChange={e => {
                            const v = parseFloat(e.target.value) || 0;
                            setCarrito(prev => prev.map(i =>
                              i._id === item._id
                                ? { ...i, precio_unitario: v, subtotal: Math.round(i.cantidad) * v }
                                : i
                            ));
                          }}
                          className="w-20 h-7 text-right text-sm text-slate-700 border border-slate-200 rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-brand-red"
                        />
                      </td>
                      <td className="py-2 px-2 text-right font-bold text-slate-800 text-sm">{fmt(item.subtotal)}</td>
                      <td className="py-2 px-2">
                        <button
                          onClick={() => eliminarItem(item._id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Panel de cobro */}
          <div className="flex-shrink-0 border-t border-slate-200 p-4 space-y-3 bg-white">
            {/* Cliente */}
            <input
              type="text"
              value={nombreCliente}
              onChange={e => setNombreCliente(e.target.value)}
              placeholder="Nombre del cliente (opcional)"
              className="w-full min-h-[40px] px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
            />

            {/* Total */}
            <div className="bg-slate-900 rounded-xl px-4 py-3 flex justify-between items-center">
              <span className="text-slate-400 text-sm font-medium">TOTAL A PAGAR</span>
              <span className="text-white text-2xl font-bold">{fmt(total)}</span>
            </div>

            {/* Efectivo + cambio */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs text-slate-500 mb-1">Efectivo recibido</label>
                <input
                  id="efectivo-input"
                  type="number"
                  value={efectivo}
                  onChange={e => { setEfectivo(e.target.value); setErrorCobro(''); }}
                  min="0" step="0.01" placeholder="0.00"
                  className="w-full min-h-[44px] px-3 py-2 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-brand-red"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-slate-500 mb-1">Cambio</label>
                <div className={`min-h-[44px] px-3 py-2 rounded-lg border flex items-center justify-center font-bold text-lg
                  ${cambio != null && cambio < 0
                    ? 'border-red-300 bg-red-50 text-red-600'
                    : 'border-slate-200 bg-slate-50 text-emerald-600'}`}
                >
                  {cambio == null
                    ? '—'
                    : cambio < 0
                      ? `Faltan ${fmt(Math.abs(cambio))}`
                      : fmt(cambio)}
                </div>
              </div>
            </div>

            {/* Error de cobro */}
            {errorCobro && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>{errorCobro}</span>
              </div>
            )}

            {/* Botón cobrar */}
            <button
              onClick={cobrar}
              disabled={carrito.length === 0 || cobrando}
              className="w-full min-h-[52px] bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {cobrando ? (
                <span>Procesando...</span>
              ) : (
                <>
                  <Check size={20} />
                  Cobrar e imprimir ticket
                </>
              )}
            </button>

            {/* Botón apartar */}
            <button
              onClick={() => setApartarModal(true)}
              disabled={carrito.length === 0 || cobrando}
              className="w-full min-h-[44px] bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Bookmark size={18} />
              Apartar (reservar sin cobrar)
            </button>
          </div>
        </div>

        {/* ── Panel derecho: productos ── */}
        <div className="hidden md:flex flex-col flex-1 bg-slate-50">

          {/* Favoritos */}
          {productosFavoritos.length > 0 && (
            <div className="flex-shrink-0 px-4 pt-4 pb-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                <Star size={12} className="inline mr-1" />
                Favoritos
              </p>
              <div className="flex flex-wrap gap-2">
                {productosFavoritos.map(p => {
                  // Si tiene es_grupo, revisar si AL MENOS UNA variante tiene stock
                  const primeraPalabra = p.nombre.split(' ')[0].toLowerCase();
                  const variantes = p.es_grupo
                    ? productos.filter(v => v.activo && v.es_grupo && v.nombre.toLowerCase().startsWith(primeraPalabra))
                    : [];
                  const tieneVariantes = variantes.length > 1;
                  const sinStock = tieneVariantes
                    ? !variantes.some(v => stockEfectivo(v, productos) > 0)
                    : (!p.sin_inventario && stockEfectivo(p, productos) <= 0);
                  return (
                    <button
                      key={p.id}
                      onClick={() => iniciarAgregar(p)}
                      disabled={sinStock}
                      title={sinStock ? 'Sin stock' : undefined}
                      className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors shadow-sm
                        ${sinStock
                          ? 'bg-slate-300 text-slate-500 cursor-not-allowed line-through'
                          : 'bg-brand-blue text-white hover:bg-blue-800'
                        }`}
                    >
                      {p.nombre}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Buscador */}
          <div className="flex-shrink-0 px-4 py-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar producto por nombre o código..."
                className="w-full min-h-[44px] pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-red"
              />
              {busqueda && (
                <button
                  onClick={() => setBusqueda('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Lista de productos */}
          <div className="px-4 pb-4">
            {loadingProd ? (
              <p className="text-center text-slate-400 py-8 text-sm">Cargando productos...</p>
            ) : productosFiltrados.length === 0 ? (
              <p className="text-center text-slate-400 py-8 text-sm">
                {busqueda ? 'Sin resultados' : 'No hay productos disponibles'}
              </p>
            ) : (
              <div className="space-y-1">
                {productosFiltrados.map(p => {
                  const precios = [p.precio_a, p.precio_b, p.precio_c, p.precio_d].filter(v => v != null);
                  const precioMin = precios.length ? Math.min(...precios) : null;
                  const stockDisp = stockEfectivo(p, productos);
                  const sinStock = !p.sin_inventario && stockDisp <= 0;
                  const stockBajo = !p.sin_inventario && !sinStock && parseFloat(stockDisp) <= parseFloat(p.stock_minimo ?? 0);
                  return (
                    <button
                      key={p.id}
                      onClick={() => iniciarAgregar(p)}
                      disabled={sinStock}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left
                        ${sinStock
                          ? 'bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed'
                          : 'bg-white border-slate-100 hover:border-brand-red hover:shadow-sm cursor-pointer'
                        }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-sm font-medium truncate ${sinStock ? 'text-slate-400' : 'text-slate-800'}`}>{p.nombre}</span>
                          {!!p.favorito && <Star size={12} className="text-amber-400 fill-amber-400 flex-shrink-0" />}
                          {!!p.sin_inventario && (
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1 rounded flex-shrink-0">S/I</span>
                          )}
                          {sinStock && (
                            <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-semibold flex-shrink-0">AGOTADO</span>
                          )}
                          {stockBajo && (
                            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold flex-shrink-0">POCO</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {precioMin != null && (
                            <span className={`text-xs font-semibold ${sinStock ? 'text-slate-400' : 'text-brand-blue'}`}>
                              {precios.length > 1 ? `desde ${fmt(precioMin)}` : fmt(precioMin)}
                            </span>
                          )}
                          {!p.sin_inventario && (
                            <span className={`text-[10px] ${sinStock ? 'text-red-400 font-semibold' : stockBajo ? 'text-amber-600 font-semibold' : 'text-slate-400'}`}>
                              Stock: {stockDisp}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modales ── */}

      {variantesModal && (
        <VariantesModal
          variantes={variantesModal.variantes}
          todosProductos={productos}
          onSelect={onVarianteSeleccionada}
          onClose={() => setVariantesModal(null)}
        />
      )}

      {enEsperaModal && (
        <EnEsperaModal
          pendientes={enEspera}
          onReanudar={reanudarEnEspera}
          onEliminar={eliminarEnEspera}
          onClose={() => setEnEsperaModal(false)}
        />
      )}

      {historialModal && (
        <HistorialModal
          onClose={() => { setHistorialModal(false); setVentaDetalle(null); }}
          onVerDetalle={verDetalleVenta}
        />
      )}

      {apartarModal && (
        <ApartarModal
          carrito={carrito}
          total={total}
          usuario={usuario}
          usuarioId={usuarioId}
          onCreado={handleApartadoCreado}
          onClose={() => setApartarModal(false)}
        />
      )}

      {apartadosModal && (
        <ApartadosModal
          usuario={usuario}
          usuarioId={usuarioId}
          onClose={() => setApartadosModal(false)}
          onStockChange={() => cargarProductos(true)}
        />
      )}

      {ventaDetalle && (
        <DetalleVentaModal
          venta={ventaDetalle}
          onClose={() => setVentaDetalle(null)}
          onReimprimir={(esCopia) => imprimirTicket({
            id: ventaDetalle.id,
            numero_ticket: ventaDetalle.numero_ticket,
            items: (ventaDetalle.detalles || []).map(d => ({
              descripcion: d.descripcion,
              cantidad: d.cantidad,
              precio_unitario: d.precio_unitario,
              subtotal: d.subtotal,
            })),
            total: ventaDetalle.total,
            cambio: ventaDetalle.cambio,
            efectivo: ventaDetalle.efectivo_recibido,
            nombreCliente: ventaDetalle.nombre_cliente,
            fecha: ventaDetalle.fecha,
            vendedor: ventaDetalle.vendedor,
          }, esCopia)}
        />
      )}

      {preciosModal && (
        <PreciosModal
          productos={productos}
          onClose={() => setPreciosModal(false)}
          onGuardado={() => cargarProductos(true)}
        />
      )}

      {/* Aviso flotante al apartar (abajo, se desvanece solo) */}
      {apartadoMsg && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] bg-amber-500 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2">
          <Bookmark size={16} />
          {apartadoMsg}
        </div>
      )}

    </div>
  );
}
