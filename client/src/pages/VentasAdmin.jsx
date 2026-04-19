import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Search, Eye, XCircle, Pencil, X, ChevronDown, ChevronUp, AlertCircle, Check } from 'lucide-react';
import api from '../lib/api';
import { useUser } from '../context/UserContext';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../lib/utils';
import Pagination from '../components/ui/Pagination';
import PageLoader from '../components/ui/PageLoader';
import Modal from '../components/ui/Modal';
import SafeButton from '../components/ui/SafeButton';

const fmt = (v) => `L ${parseFloat(v || 0).toFixed(2)}`;

// ── Modal detalle de venta ────────────────────────────────────────────────────

function DetalleModal({ venta, onClose, onAnular, onEditDetalle, anulando }) {
  return (
    <Modal isOpen={!!venta} onClose={onClose} title={`Venta #${venta?.id}`} size="lg">
      {venta && (
        <div className="flex flex-col gap-4">
          {/* Info venta */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-slate-500 text-xs">Vendedor</p>
              <p className="font-medium text-slate-800">{venta.vendedor}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Fecha</p>
              <p className="font-medium text-slate-800">{formatDate(venta.fecha)}</p>
            </div>
            {venta.nombre_cliente && (
              <div>
                <p className="text-slate-500 text-xs">Cliente</p>
                <p className="font-medium text-slate-800">{venta.nombre_cliente}</p>
              </div>
            )}
          </div>

          {venta.anulada && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              <strong>Venta anulada</strong>
              {venta.motivo_anulacion && <p className="mt-0.5">{venta.motivo_anulacion}</p>}
            </div>
          )}

          {/* Tabla de detalles */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-3 py-2 text-slate-500 font-medium">Descripción</th>
                  <th className="text-right px-3 py-2 text-slate-500 font-medium">Cant</th>
                  <th className="text-right px-3 py-2 text-slate-500 font-medium">P.U.</th>
                  <th className="text-right px-3 py-2 text-slate-500 font-medium">Subtotal</th>
                  {!venta.anulada && (
                    <th className="px-3 py-2 text-slate-500 font-medium text-right">Editar</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {(venta.detalles || []).map(d => (
                  <tr key={d.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-800">
                      {d.descripcion}
                      {d.sin_inventario ? (
                        <span className="ml-1 text-[10px] bg-slate-100 text-slate-500 px-1 rounded">S/I</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-600">{parseFloat(d.cantidad)}</td>
                    <td className="px-3 py-2 text-right text-slate-600">{fmt(d.precio_unitario)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-800">{fmt(d.subtotal)}</td>
                    {!venta.anulada && (
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => onEditDetalle(d)}
                          className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50"
                        >
                          <Pencil size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totales */}
          <div className="bg-slate-50 rounded-lg px-4 py-3 space-y-1">
            <div className="flex justify-between font-bold text-base">
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
          </div>

          {/* Acciones */}
          {!venta.anulada && (
            <div className="flex justify-end gap-3 pt-2 border-t">
              <SafeButton
                onClick={onAnular}
                loading={anulando}
                variant="danger"
              >
                <XCircle size={16} />
                Anular venta
              </SafeButton>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// ── Modal editar detalle ──────────────────────────────────────────────────────

function EditDetalleModal({ detalle, ventaId, usuarioId, onSaved, onClose }) {
  const { usuario } = useUser();
  const { success, error } = useToast();
  const [nuevaDesc, setNuevaDesc] = useState(detalle?.descripcion || '');
  const [nuevaCant, setNuevaCant] = useState(detalle ? String(parseFloat(detalle.cantidad)) : '');
  const [nuevoPrecio, setNuevoPrecio] = useState(detalle ? String(parseFloat(detalle.precio_unitario)) : '');
  const [nuevoProdId, setNuevoProdId] = useState(detalle?.producto_id || '');
  const [productos, setProductos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [busqProd, setBusqProd] = useState('');

  useEffect(() => {
    api.get('/api/productos', { params: { limit: 500, activo: 1 } }).then(res => {
      const lista = Array.isArray(res.data?.data) ? res.data.data : [];
      setProductos(lista);
    }).catch(() => {});
  }, []);

  const prodsFiltrados = busqProd.trim()
    ? productos.filter(p => p.nombre.toLowerCase().includes(busqProd.toLowerCase()) || p.codigo.toLowerCase().includes(busqProd.toLowerCase()))
    : productos;

  const subtotal = (parseFloat(nuevaCant) || 0) * (parseFloat(nuevoPrecio) || 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        usuario_id: usuarioId,
        usuario,
        nueva_descripcion: nuevaDesc.trim(),
        nueva_cantidad: parseFloat(nuevaCant) || detalle.cantidad,
        nuevo_precio: parseFloat(nuevoPrecio) || detalle.precio_unitario,
      };
      if (nuevoProdId !== '' && nuevoProdId != null) {
        payload.nuevo_producto_id = parseInt(nuevoProdId) || null;
      }
      await api.put(`/api/ventas/${ventaId}/detalle/${detalle.id}`, payload);
      success('Detalle actualizado correctamente');
      onSaved();
    } catch (err) {
      error(err.message || 'Error al actualizar el detalle');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={!!detalle} onClose={onClose} title="Editar línea de venta" size="md">
      {detalle && (
        <div className="flex flex-col gap-4">
          <div className="bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-500">
            Producto original: <strong className="text-slate-700">{detalle.descripcion}</strong>
          </div>

          {/* Cambiar producto */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cambiar producto</label>
            <div className="relative mb-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={busqProd}
                onChange={e => setBusqProd(e.target.value)}
                placeholder="Buscar producto..."
                className="w-full min-h-[40px] pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
              />
            </div>
            <select
              value={nuevoProdId}
              onChange={e => {
                const val = e.target.value;
                setNuevoProdId(val);
                if (val) {
                  const p = productos.find(p => p.id === parseInt(val));
                  if (p) {
                    setNuevaDesc(p.nombre);
                    const firstPrecio = [p.precio_a, p.precio_b, p.precio_c, p.precio_d].find(v => v != null);
                    if (firstPrecio != null) setNuevoPrecio(String(firstPrecio));
                  }
                }
              }}
              className="w-full min-h-[40px] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-red"
            >
              <option value="">— Mantener producto actual —</option>
              {prodsFiltrados.slice(0, 50).map(p => (
                <option key={p.id} value={p.id}>{p.nombre} ({p.codigo})</option>
              ))}
            </select>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descripción en ticket</label>
            <input
              type="text"
              value={nuevaDesc}
              onChange={e => setNuevaDesc(e.target.value)}
              className="w-full min-h-[40px] px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Cantidad */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cantidad</label>
              <input
                type="number"
                value={nuevaCant}
                onChange={e => setNuevaCant(e.target.value)}
                min="0.01" step="0.01"
                className="w-full min-h-[40px] px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
              />
            </div>
            {/* Precio */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Precio unitario</label>
              <input
                type="number"
                value={nuevoPrecio}
                onChange={e => setNuevoPrecio(e.target.value)}
                min="0" step="0.01"
                className="w-full min-h-[40px] px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
              />
            </div>
          </div>

          {/* Subtotal preview */}
          <div className="bg-slate-50 rounded-lg px-3 py-2 flex justify-between text-sm">
            <span className="text-slate-500">Subtotal</span>
            <span className="font-bold text-brand-blue">{fmt(subtotal)}</span>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <button onClick={onClose} className="min-h-[40px] px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium">
              Cancelar
            </button>
            <SafeButton onClick={handleSave} loading={saving} variant="primary">
              <Check size={16} />
              Guardar cambios
            </SafeButton>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function VentasAdmin() {
  const { usuario, usuarioId } = useUser();
  const { success, error } = useToast();

  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [anuladas, setAnuladas] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [ventaDetalle, setVentaDetalle] = useState(null);  // venta con detalles
  const [editDetalleItem, setEditDetalleItem] = useState(null); // detalle a editar
  const [anulando, setAnulando] = useState(false);
  const [showMotivo, setShowMotivo] = useState(false);
  const [motivo, setMotivo] = useState('');

  const searchDebounce = useRef(null);

  const fetchVentas = useCallback(async (searchVal, fi, ff, an, pg) => {
    setLoading(true);
    try {
      const params = { page: pg, limit: 30 };
      if (searchVal) params.search = searchVal;
      if (fi) params.fecha_inicio = fi;
      if (ff) params.fecha_fin = ff;
      if (an !== 'all') params.anuladas = an;
      const res = await api.get('/api/ventas', { params });
      const data = res.data;
      setVentas(Array.isArray(data?.data) ? data.data : []);
      setTotal(data?.total || 0);
      setTotalPages(data?.totalPages || 1);
    } catch {
      error('Error al cargar ventas');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setPage(1);
      fetchVentas(search, fechaInicio, fechaFin, anuladas, 1);
    }, 300);
  }, [search, fechaInicio, fechaFin, anuladas]);

  useEffect(() => {
    fetchVentas(search, fechaInicio, fechaFin, anuladas, page);
  }, [page]);

  const abrirDetalle = async (venta) => {
    try {
      const res = await api.get(`/api/ventas/${venta.id}`);
      setVentaDetalle(res.data);
    } catch {
      error('Error al cargar el detalle');
    }
  };

  const handleAnular = () => {
    setShowMotivo(true);
  };

  const confirmarAnulacion = async () => {
    if (!ventaDetalle) return;
    setAnulando(true);
    try {
      await api.put(`/api/ventas/${ventaDetalle.id}/anular`, { usuario_id: usuarioId, usuario, motivo });
      success(`Venta #${ventaDetalle.id} anulada y stock restaurado`);
      setVentaDetalle(null);
      setShowMotivo(false);
      setMotivo('');
      fetchVentas(search, fechaInicio, fechaFin, anuladas, page);
    } catch (err) {
      error(err.message || 'Error al anular la venta');
    } finally {
      setAnulando(false);
    }
  };

  const handleEditDetalleSaved = async () => {
    setEditDetalleItem(null);
    if (ventaDetalle) {
      try {
        const res = await api.get(`/api/ventas/${ventaDetalle.id}`);
        setVentaDetalle(res.data);
      } catch {}
    }
    fetchVentas(search, fechaInicio, fechaFin, anuladas, page);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-brand-blue">Gestión de Ventas</h1>
        <p className="text-sm text-slate-500">{total} venta(s) encontrada(s)</p>
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
              placeholder="Buscar por #ticket, cliente o vendedor..."
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
            value={anuladas}
            onChange={e => setAnuladas(e.target.value)}
            className="min-h-[44px] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-red"
          >
            <option value="all">Todas</option>
            <option value="0">Solo activas</option>
            <option value="1">Solo anuladas</option>
          </select>
        </div>

        {loading ? (
          <PageLoader />
        ) : ventas.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p>No se encontraron ventas con ese criterio</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">#</th>
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Fecha</th>
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Cliente</th>
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Vendedor</th>
                    <th className="text-right py-3 px-3 text-slate-500 font-medium">Total</th>
                    <th className="text-center py-3 px-3 text-slate-500 font-medium">Estado</th>
                    <th className="text-right py-3 px-3 text-slate-500 font-medium">Ver</th>
                  </tr>
                </thead>
                <tbody>
                  {ventas.map(v => (
                    <tr
                      key={v.id}
                      className={`border-b border-slate-50 hover:bg-slate-50 transition-colors
                        ${v.anulada ? 'opacity-60' : ''}`}
                    >
                      <td className="py-3 px-3 font-mono text-slate-600 text-xs">#{v.id}</td>
                      <td className="py-3 px-3 text-slate-600 text-xs whitespace-nowrap">{formatDate(v.fecha)}</td>
                      <td className="py-3 px-3 text-slate-700">{v.nombre_cliente || <span className="text-slate-400">—</span>}</td>
                      <td className="py-3 px-3 text-slate-600">{v.vendedor}</td>
                      <td className="py-3 px-3 text-right font-bold text-brand-blue">{fmt(v.total)}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full
                          ${v.anulada
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'}`}>
                          {v.anulada ? 'Anulada' : 'Activa'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => abrirDetalle(v)}
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
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={30}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      {/* Modal detalle */}
      <DetalleModal
        venta={ventaDetalle}
        onClose={() => { setVentaDetalle(null); setShowMotivo(false); setMotivo(''); }}
        onAnular={handleAnular}
        onEditDetalle={(d) => setEditDetalleItem(d)}
        anulando={anulando}
      />

      {/* Modal confirmación anulación */}
      <Modal
        isOpen={showMotivo}
        onClose={() => { setShowMotivo(false); setMotivo(''); }}
        title="Confirmar anulación"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <p>
              Al anular la venta <strong>#{ventaDetalle?.id}</strong>, todos los
              movimientos de inventario generados se revertirán automáticamente.
              Esta acción no se puede deshacer.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Motivo de anulación
            </label>
            <textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              rows={2}
              placeholder="Ingresa el motivo (opcional)..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-red resize-none"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setShowMotivo(false); setMotivo(''); }}
              className="min-h-[40px] px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium"
            >
              Cancelar
            </button>
            <SafeButton onClick={confirmarAnulacion} loading={anulando} variant="danger">
              <XCircle size={16} />
              Confirmar anulación
            </SafeButton>
          </div>
        </div>
      </Modal>

      {/* Modal editar detalle */}
      {editDetalleItem && (
        <EditDetalleModal
          detalle={editDetalleItem}
          ventaId={ventaDetalle?.id}
          usuarioId={usuarioId}
          onSaved={handleEditDetalleSaved}
          onClose={() => setEditDetalleItem(null)}
        />
      )}
    </div>
  );
}
