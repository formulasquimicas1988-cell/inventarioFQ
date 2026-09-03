import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Search, Eye, Check, XCircle, Bookmark, Plus, Pencil, AlertCircle } from 'lucide-react';
import api from '../lib/api';
import { useUser } from '../context/UserContext';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../lib/utils';
import { imprimirTicketConCopia } from '../lib/print';
import { METODOS_PAGO } from '../lib/metodosPago';
import Pagination from '../components/ui/Pagination';
import PageLoader from '../components/ui/PageLoader';
import Modal from '../components/ui/Modal';
import SafeButton from '../components/ui/SafeButton';
import ApartadoEditorModal from '../components/ApartadoEditorModal';

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

function DetalleModal({ apartado, onClose, onEntregar, onCancelar, onEditar, procesando, puedeEntregar }) {
  const [accion, setAccion] = useState(null);     // 'entregar' | 'cancelar'
  const [efectivo, setEfectivo] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [motivo, setMotivo] = useState('');

  useEffect(() => { setAccion(null); setEfectivo(''); setMetodoPago('efectivo'); setMotivo(''); }, [apartado?.id]);

  if (!apartado) return null;
  const entregaEsEfectivo = metodoPago === 'efectivo';
  const saldo = entregaEsEfectivo && efectivo !== '' ? parseFloat(efectivo) - parseFloat(apartado.total || 0) : null;

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
          {apartado.estado === 'activo' && accion === null && (
            <>
              <button
                onClick={() => onEditar(apartado)}
                className="min-h-[40px] px-4 py-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm font-medium flex items-center gap-2"
              >
                <Pencil size={16} /> Editar
              </button>
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
            <label className="block text-xs text-slate-500">Método de pago</label>
            <div className="grid grid-cols-2 gap-2">
              {METODOS_PAGO.map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMetodoPago(m.value)}
                  className={`min-h-[40px] px-2 py-1.5 rounded-lg border text-sm font-semibold transition-colors
                    ${metodoPago === m.value
                      ? 'border-brand-red bg-red-50 text-brand-red'
                      : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {entregaEsEfectivo && (
              <>
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
              </>
            )}
            <div className="flex justify-end gap-3 pt-1">
              <button onClick={() => setAccion(null)} className="min-h-[40px] px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium">Volver</button>
              <SafeButton onClick={() => onEntregar(apartado, efectivo, metodoPago)} loading={procesando} variant="primary">
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
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorExistente, setEditorExistente] = useState(null); // null = crear

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

  const handleEntregar = async (apartado, efectivo, metodoPago = 'efectivo') => {
    setProcesando(true);
    try {
      const res = await api.put(`/api/apartados/${apartado.id}/entregar`, {
        usuario_id: usuarioId,
        usuario,
        metodo_pago: metodoPago,
        efectivo_recibido: metodoPago === 'efectivo' && efectivo !== '' ? parseFloat(efectivo) : null,
      });
      imprimirTicketConCopia({
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
            onClick={() => { setEditorExistente(null); setEditorOpen(true); }}
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
        onEditar={(a) => { setDetalle(null); setEditorExistente(a); setEditorOpen(true); }}
        procesando={procesando}
        puedeEntregar={puedeEntregar}
      />

      {editorOpen && (
        <ApartadoEditorModal
          existente={editorExistente}
          usuario={usuario}
          usuarioId={usuarioId}
          onClose={() => setEditorOpen(false)}
          onSaved={(msg) => {
            setEditorOpen(false);
            success(msg);
            fetchApartados(search, fechaInicio, fechaFin, estado, page);
          }}
        />
      )}
    </div>
  );
}
