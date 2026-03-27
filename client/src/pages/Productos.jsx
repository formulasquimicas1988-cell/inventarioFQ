import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Pencil, Trash2, Package, Upload, Download, Filter, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../lib/api';
import { useToast } from '../context/ToastContext';
import { useAlerts } from '../context/AlertContext';
import { formatNumber } from '../lib/utils';
import Modal         from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import SafeButton    from '../components/ui/SafeButton';
import SearchInput   from '../components/ui/SearchInput';
import EmptyState    from '../components/ui/EmptyState';
import PageLoader    from '../components/ui/PageLoader';
import Pagination    from '../components/ui/Pagination';
import { useSortable } from '../hooks/useSortable';

const PAGE_SIZE = 15;

const EMPTY_FORM = {
  codigo: '', nombre: '', categoria_id: '',
  stock_actual: '', stock_minimo: '',
  unidad_medida: 'litro',
};

const UNIDADES = ['litro', 'kg', 'gramo', 'mililitro', 'unidad', 'caja', 'galón', 'tambor'];

function SortTh({ col, label, sortKey, sortDir, onSort, className = '' }) {
  const active = sortKey === col;
  return (
    <th className={`cursor-pointer select-none hover:opacity-75 ${className}`} onClick={() => onSort(col)}>
      <span className="inline-flex items-center gap-1">
        {label}
        {active
          ? (sortDir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />)
          : <ChevronsUpDown size={13} className="opacity-30" />
        }
      </span>
    </th>
  );
}

export default function Productos() {
  const { toast }       = useToast();
  const { refresh: refreshAlerts } = useAlerts();
  const fileRef         = useRef();

  const [productos,   setProductos]   = useState([]);
  const [filtered,    setFiltered]    = useState([]);
  const [categorias,  setCategorias]  = useState([]);
  const [search,      setSearch]      = useState('');
  const [catFilter,   setCatFilter]   = useState('');
  const [searching,   setSearching]   = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [page,        setPage]        = useState(1);

  const { sorted, sortKey, sortDir, toggleSort } = useSortable(filtered, 'nombre');

  const [modalOpen,   setModalOpen]   = useState(false);
  const [editItem,    setEditItem]    = useState(null);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [saving,      setSaving]      = useState(false);
  const [errors,      setErrors]      = useState({});

  const [delOpen,     setDelOpen]     = useState(false);
  const [delItem,     setDelItem]     = useState(null);
  const [deleting,    setDeleting]    = useState(false);

  const [importing,   setImporting]   = useState(false);

  const loadCategorias = useCallback(async () => {
    const { data } = await api.get('/categorias');
    setCategorias(data);
  }, []);

  const loadProductos = useCallback(async () => {
    try {
      const { data } = await api.get('/productos');
      setProductos(data);
    } catch (e) {
      toast({ type: 'error', title: 'Error cargando productos', description: e.message });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadCategorias();
    loadProductos();
  }, [loadCategorias, loadProductos]);

  useEffect(() => {
    setSearching(true);
    const t = setTimeout(() => {
      const s = search.toLowerCase();
      let result = productos;
      if (s) {
        result = result.filter(p =>
          p.codigo.toLowerCase().includes(s) ||
          p.nombre.toLowerCase().includes(s) ||
          (p.categoria_nombre || '').toLowerCase().includes(s)
        );
      }
      if (catFilter) {
        result = result.filter(p => String(p.categoria_id) === catFilter);
      }
      setFiltered(result);
      setPage(1);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [search, catFilter, productos]);

  useEffect(() => { setPage(1); }, [sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated  = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openCreate() {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(p) {
    setEditItem(p);
    setForm({
      codigo:        p.codigo,
      nombre:        p.nombre,
      categoria_id:  p.categoria_id ? String(p.categoria_id) : '',
      stock_actual:  String(p.stock_actual),
      stock_minimo:  String(p.stock_minimo),
      unidad_medida: p.unidad_medida || 'litro',
    });
    setErrors({});
    setModalOpen(true);
  }

  function validate() {
    const e = {};
    if (!form.codigo.trim())  e.codigo = 'El código es obligatorio';
    if (!form.nombre.trim())  e.nombre = 'El nombre es obligatorio';
    if (form.stock_actual === '' || isNaN(form.stock_actual)) e.stock_actual = 'Debe ser un número';
    if (form.stock_minimo === '' || isNaN(form.stock_minimo)) e.stock_minimo = 'Debe ser un número';
    return e;
  }

  async function handleSave() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        categoria_id: form.categoria_id || null,
        stock_actual: parseFloat(form.stock_actual),
        stock_minimo: parseFloat(form.stock_minimo),
      };
      if (editItem) {
        await api.put(`/productos/${editItem.id}`, payload);
        toast({ title: 'Producto actualizado' });
      } else {
        await api.post('/productos', payload);
        toast({ title: 'Producto creado' });
      }
      setModalOpen(false);
      loadProductos();
      refreshAlerts();
    } catch (err) {
      toast({ type: 'error', title: 'Error', description: err.message });
    } finally {
      setSaving(false);
    }
  }

  function openDelete(p) { setDelItem(p); setDelOpen(true); }

  async function handleDelete() {
    setDeleting(true);
    try {
      const { data } = await api.delete(`/productos/${delItem.id}`);
      toast({ title: data.message || 'Producto eliminado' });
      setDelOpen(false);
      loadProductos();
      refreshAlerts();
    } catch (err) {
      toast({ type: 'error', title: 'Error', description: err.message });
    } finally {
      setDeleting(false);
    }
  }

  async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/productos/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast({
        title: `Importación completada`,
        description: `${data.insertados} producto(s) importados${data.errores?.length ? `, ${data.errores.length} error(es)` : ''}`,
      });
      loadProductos();
      refreshAlerts();
    } catch (err) {
      toast({ type: 'error', title: 'Error al importar', description: err.message });
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  }

  function downloadTemplate() {
    const data = [
      ['codigo', 'nombre', 'categoria', 'stock_actual', 'stock_minimo', 'unidad_medida'],
      ['DEG-001', 'Desengrasante Pro', 'Desengrasantes', 50, 20, 'litro'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Productos');
    XLSX.writeFile(wb, 'plantilla_productos.xlsx');
  }

  if (loading) return <PageLoader />;

  const criticos = productos.filter(p => parseFloat(p.stock_actual) < parseFloat(p.stock_minimo));

  return (
    <div>
      {/* Header */}
      <div className="page-header flex-wrap gap-3">
        <div>
          <h1 className="page-title">Productos</h1>
          <p className="page-subtitle">
            {productos.length} productos · {criticos.length > 0 && (
              <span className="text-primary font-semibold">{criticos.length} con stock crítico</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button className="btn btn-ghost btn-sm" onClick={downloadTemplate} title="Descargar plantilla Excel">
            <Download size={18} />
            Plantilla
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => fileRef.current.click()}
            disabled={importing}
          >
            {importing ? <span className="spinner" /> : <Upload size={18} />}
            Importar Excel
          </button>
          <input type="file" ref={fileRef} className="hidden" accept=".xlsx,.xls" onChange={handleImport} />
          <button className="btn-primary" onClick={openCreate}>
            <Plus size={20} />
            Nuevo Producto
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 mb-5 flex-wrap">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por código, nombre o categoría..."
          loading={searching}
          className="flex-1 min-w-[220px]"
        />
        <div className="relative flex items-center">
          <Filter size={16} className="absolute left-3 text-gray-400 pointer-events-none" />
          <select
            className="input pl-9 pr-8 min-w-[180px]"
            value={catFilter}
            onChange={e => setCatFilter(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {categorias.map(c => (
              <option key={c.id} value={String(c.id)}>{c.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <SortTh col="codigo"           label="Código"       sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortTh col="nombre"           label="Nombre"       sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortTh col="categoria_nombre" label="Categoría"    sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortTh col="stock_actual"     label="Stock Actual" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="text-right" />
              <SortTh col="stock_minimo"     label="Stock Mínimo" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="text-right" />
              <th>Unidad</th>
              <th className="text-center">Estado</th>
              <th className="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <EmptyState
                    message={search || catFilter ? 'No se encontraron productos con ese criterio' : 'Sin productos registrados'}
                    icon={Package}
                  />
                </td>
              </tr>
            ) : paginated.map(p => {
              const esCritico = parseFloat(p.stock_actual) < parseFloat(p.stock_minimo);
              return (
                <tr key={p.id} className={esCritico ? 'bg-red-50/30' : ''}>
                  <td>
                    <span className="font-mono font-semibold text-deep-blue bg-blue-50 px-2 py-0.5 rounded text-sm">
                      {p.codigo}
                    </span>
                  </td>
                  <td className="font-semibold text-gray-800">{p.nombre}</td>
                  <td>
                    {p.categoria_nombre
                      ? <span className="badge badge-blue">{p.categoria_nombre}</span>
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                  <td className="text-right font-bold text-gray-800">{formatNumber(p.stock_actual)}</td>
                  <td className="text-right text-gray-500">{formatNumber(p.stock_minimo)}</td>
                  <td className="text-gray-500 text-sm">{p.unidad_medida}</td>
                  <td className="text-center">
                    {esCritico
                      ? <span className="badge badge-red">⚠ Crítico</span>
                      : <span className="badge badge-green">OK</span>
                    }
                  </td>
                  <td>
                    <div className="flex items-center justify-center gap-2">
                      <button className="btn-icon btn-ghost text-blue-600 hover:bg-blue-50" onClick={() => openEdit(p)} title="Editar">
                        <Pencil size={18} />
                      </button>
                      <button className="btn-icon btn-ghost text-red-500 hover:bg-red-50" onClick={() => openDelete(p)} title="Eliminar">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} total={sorted.length} pageSize={PAGE_SIZE} />

      {/* Modal Crear/Editar */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleSave}
        title={editItem ? 'Editar Producto' : 'Nuevo Producto'}
        size="lg"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </button>
            <SafeButton className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving && <span className="spinner" />}
              {editItem ? 'Guardar Cambios' : 'Crear Producto'}
            </SafeButton>
          </>
        }
      >
        <div className="form-grid-2 gap-5">
          <div className="form-group">
            <label className="label">Código <span className="text-primary">*</span></label>
            <input
              className={`input ${errors.codigo ? 'input-error' : ''}`}
              value={form.codigo}
              onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))}
              placeholder="Ej: DEG-001"
              maxLength={50}
            />
            {errors.codigo && <p className="text-sm text-red-500">{errors.codigo}</p>}
          </div>
          <div className="form-group">
            <label className="label">Categoría</label>
            <select
              className="input"
              value={form.categoria_id}
              onChange={e => setForm(f => ({ ...f, categoria_id: e.target.value }))}
            >
              <option value="">Sin categoría</option>
              {categorias.map(c => (
                <option key={c.id} value={String(c.id)}>{c.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="label">Nombre <span className="text-primary">*</span></label>
          <input
            className={`input ${errors.nombre ? 'input-error' : ''}`}
            value={form.nombre}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            placeholder="Nombre del producto"
            maxLength={200}
          />
          {errors.nombre && <p className="text-sm text-red-500">{errors.nombre}</p>}
        </div>

        <div className="form-grid-2 gap-5">
          <div className="form-group">
            <label className="label">Stock Actual <span className="text-primary">*</span></label>
            <input
              type="number" step="0.01" min="0"
              className={`input ${errors.stock_actual ? 'input-error' : ''}`}
              value={form.stock_actual}
              onChange={e => setForm(f => ({ ...f, stock_actual: e.target.value }))}
              placeholder="0"
            />
            {errors.stock_actual && <p className="text-sm text-red-500">{errors.stock_actual}</p>}
          </div>
          <div className="form-group">
            <label className="label">Stock Mínimo <span className="text-primary">*</span></label>
            <input
              type="number" step="0.01" min="0"
              className={`input ${errors.stock_minimo ? 'input-error' : ''}`}
              value={form.stock_minimo}
              onChange={e => setForm(f => ({ ...f, stock_minimo: e.target.value }))}
              placeholder="0"
            />
            {errors.stock_minimo && <p className="text-sm text-red-500">{errors.stock_minimo}</p>}
          </div>
        </div>

        <div className="form-group">
          <label className="label">Unidad de Medida</label>
          <select
            className="input"
            value={form.unidad_medida}
            onChange={e => setForm(f => ({ ...f, unidad_medida: e.target.value }))}
          >
            {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        open={delOpen}
        onClose={() => setDelOpen(false)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Eliminar Producto"
        message={`¿Estás seguro de eliminar "${delItem?.nombre}" (${delItem?.codigo})? Si tiene historial de movimientos, será desactivado en lugar de eliminado.`}
      />
    </div>
  );
}
