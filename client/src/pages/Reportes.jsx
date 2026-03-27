import { useState } from 'react';
import {
  FileBarChart2, FileSpreadsheet, Download, Package,
  History, Filter, CheckCircle, FileText,
} from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../context/ToastContext';

function ReportCard({ icon: Icon, title, description, children, color = 'bg-blue-50', iconColor = 'text-deep-blue' }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}>
            <Icon size={24} className={iconColor} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-deep-blue">{title}</h2>
            <p className="text-sm text-gray-400">{description}</p>
          </div>
        </div>
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}

async function buildInventarioPDF(productos) {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Header bar
  doc.setFillColor(10, 31, 68);
  doc.rect(0, 0, 297, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('Fórmulas Químicas — Inventario Actual', 14, 14);
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.text(`Generado: ${new Date().toLocaleDateString('es-GT')}`, 283, 14, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  autoTable(doc, {
    startY: 27,
    head: [['Código', 'Nombre', 'Categoría', 'Stock Actual', 'Stock Mínimo', 'Unidad', 'Estado']],
    body: productos.map(p => {
      const critico = parseFloat(p.stock_actual) < parseFloat(p.stock_minimo);
      return [p.codigo, p.nombre, p.categoria_nombre || '—', String(p.stock_actual), String(p.stock_minimo), p.unidad_medida, critico ? 'Crítico' : 'OK'];
    }),
    headStyles: { fillColor: [10, 31, 68], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didParseCell(data) {
      if (data.column.index === 6 && data.section === 'body') {
        if (data.cell.raw === 'Crítico') {
          data.cell.styles.textColor = [204, 0, 0];
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [22, 163, 74];
        }
      }
    },
    styles: { fontSize: 9, cellPadding: 3 },
    margin: { left: 14, right: 14 },
  });

  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Página ${i} de ${pages}`, 148, doc.internal.pageSize.height - 5, { align: 'center' });
  }

  return doc;
}

async function buildMovimientosPDF(movimientos) {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFillColor(10, 31, 68);
  doc.rect(0, 0, 297, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('Fórmulas Químicas — Historial de Movimientos', 14, 14);
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.text(`Generado: ${new Date().toLocaleDateString('es-GT')}`, 283, 14, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  const tipoColors = {
    entrada: [22, 163, 74],
    salida:  [204, 0, 0],
    ajuste:  [37, 99, 235],
    dañado:  [234, 88, 12],
  };

  autoTable(doc, {
    startY: 27,
    head: [['Fecha', 'Tipo', 'Código', 'Producto', 'Cantidad', 'Cliente/Proveedor', 'Motivo']],
    body: movimientos.map(m => [
      new Date(m.fecha).toLocaleDateString('es-GT'),
      m.tipo.charAt(0).toUpperCase() + m.tipo.slice(1),
      m.producto_codigo,
      m.producto_nombre,
      `${m.tipo === 'entrada' ? '+' : m.tipo === 'ajuste' ? '→' : '-'}${m.cantidad} ${m.unidad_medida}`,
      m.cliente || m.proveedor || '—',
      m.motivo || '—',
    ]),
    headStyles: { fillColor: [10, 31, 68], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didParseCell(data) {
      if (data.column.index === 1 && data.section === 'body') {
        const tipo = movimientos[data.row.index]?.tipo;
        if (tipoColors[tipo]) data.cell.styles.textColor = tipoColors[tipo];
        data.cell.styles.fontStyle = 'bold';
      }
    },
    styles: { fontSize: 8, cellPadding: 2.5 },
    margin: { left: 14, right: 14 },
    columnStyles: { 3: { cellWidth: 50 }, 6: { cellWidth: 45 } },
  });

  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Página ${i} de ${pages}`, 148, doc.internal.pageSize.height - 5, { align: 'center' });
  }

  return doc;
}

export default function Reportes() {
  const { toast } = useToast();

  const [downloadingInv,    setDownloadingInv]    = useState(false);
  const [downloadingInvPDF, setDownloadingInvPDF] = useState(false);

  const [fromDate,       setFromDate]       = useState('');
  const [toDate,         setToDate]         = useState('');
  const [tipoMov,        setTipoMov]        = useState('');
  const [downloadingMov,    setDownloadingMov]    = useState(false);
  const [downloadingMovPDF, setDownloadingMovPDF] = useState(false);

  async function exportInventario() {
    setDownloadingInv(true);
    try {
      const response = await api.get('/reportes/inventario', { responseType: 'blob' });
      const url  = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href     = url;
      link.download = `inventario_${new Date().toISOString().slice(0,10)}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Excel exportado', description: 'El inventario se descargó correctamente' });
    } catch (err) {
      toast({ type: 'error', title: 'Error al exportar', description: err.message });
    } finally {
      setDownloadingInv(false);
    }
  }

  async function exportInventarioPDF() {
    setDownloadingInvPDF(true);
    try {
      const { data: productos } = await api.get('/productos');
      const doc = await buildInventarioPDF(productos);
      doc.save(`inventario_${new Date().toISOString().slice(0,10)}.pdf`);
      toast({ title: 'PDF exportado', description: 'El inventario se descargó como PDF' });
    } catch (err) {
      toast({ type: 'error', title: 'Error al exportar PDF', description: err.message });
    } finally {
      setDownloadingInvPDF(false);
    }
  }

  async function exportMovimientos() {
    setDownloadingMov(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set('from', fromDate);
      if (toDate)   params.set('to', toDate);
      if (tipoMov)  params.set('tipo', tipoMov);

      const response = await api.get(`/reportes/movimientos?${params}`, { responseType: 'blob' });
      const url  = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href     = url;
      link.download = `movimientos_${new Date().toISOString().slice(0,10)}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Excel exportado', description: 'El historial se descargó correctamente' });
    } catch (err) {
      toast({ type: 'error', title: 'Error al exportar', description: err.message });
    } finally {
      setDownloadingMov(false);
    }
  }

  async function exportMovimientosPDF() {
    setDownloadingMovPDF(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set('from', fromDate);
      if (toDate)   params.set('to', toDate);
      if (tipoMov)  params.set('tipo', tipoMov);

      const { data: movimientos } = await api.get(`/movimientos?${params}`);
      const doc = await buildMovimientosPDF(movimientos);
      doc.save(`movimientos_${new Date().toISOString().slice(0,10)}.pdf`);
      toast({ title: 'PDF exportado', description: 'El historial se descargó como PDF' });
    } catch (err) {
      toast({ type: 'error', title: 'Error al exportar PDF', description: err.message });
    } finally {
      setDownloadingMovPDF(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reportes</h1>
          <p className="page-subtitle">Exporta datos del inventario a Excel o PDF</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Reporte 1: Inventario Actual */}
        <ReportCard
          icon={Package}
          title="Inventario Actual"
          description="Estado completo del inventario con todos los productos"
          color="bg-blue-50"
          iconColor="text-deep-blue"
        >
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">El reporte incluye:</p>
              <ul className="space-y-2">
                {['Código y nombre del producto','Categoría','Stock actual y mínimo','Unidad de medida','Estado (OK / Crítico)'].map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle size={15} className="text-green-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
              <p className="text-sm text-yellow-700">
                Los productos con stock crítico se destacan en rojo en ambos formatos.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                className="btn-primary flex-1 justify-center"
                onClick={exportInventario}
                disabled={downloadingInv}
              >
                {downloadingInv ? <span className="spinner" /> : <Download size={18} />}
                {downloadingInv ? 'Generando...' : 'Excel (.xlsx)'}
              </button>
              <button
                className="btn btn-secondary flex-1 justify-center"
                onClick={exportInventarioPDF}
                disabled={downloadingInvPDF}
              >
                {downloadingInvPDF ? <span className="spinner" /> : <FileText size={18} />}
                {downloadingInvPDF ? 'Generando...' : 'PDF (.pdf)'}
              </button>
            </div>
          </div>
        </ReportCard>

        {/* Reporte 2: Historial de Movimientos */}
        <ReportCard
          icon={History}
          title="Historial de Movimientos"
          description="Registro de entradas, salidas y ajustes por rango de fechas"
          color="bg-green-50"
          iconColor="text-green-700"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group mb-0">
                <label className="label">Fecha desde</label>
                <input type="date" className="input" value={fromDate} onChange={e => setFromDate(e.target.value)} />
              </div>
              <div className="form-group mb-0">
                <label className="label">Fecha hasta</label>
                <input type="date" className="input" value={toDate} onChange={e => setToDate(e.target.value)} />
              </div>
            </div>

            <div className="form-group mb-0">
              <label className="label">Tipo de movimiento</label>
              <div className="relative flex items-center">
                <Filter size={16} className="absolute left-3 text-gray-400 pointer-events-none" />
                <select className="input pl-9" value={tipoMov} onChange={e => setTipoMov(e.target.value)}>
                  <option value="">Todos (entradas + salidas + ajustes + dañados)</option>
                  <option value="entrada">Solo Entradas</option>
                  <option value="salida">Solo Salidas</option>
                  <option value="ajuste">Solo Ajustes</option>
                  <option value="dañado">Solo Dañados</option>
                </select>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">El reporte incluye:</p>
              <ul className="space-y-2">
                {['Fecha y hora del movimiento','Tipo (Entrada/Salida/Ajuste/Dañado)','Código y nombre del producto','Cantidad y unidad de medida','Cliente / Proveedor','Motivo'].map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle size={15} className="text-green-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                className="btn-primary bg-green-700 hover:bg-green-800 flex-1 justify-center"
                onClick={exportMovimientos}
                disabled={downloadingMov}
              >
                {downloadingMov ? <span className="spinner" /> : <Download size={18} />}
                {downloadingMov ? 'Generando...' : 'Excel (.xlsx)'}
              </button>
              <button
                className="btn btn-secondary flex-1 justify-center"
                onClick={exportMovimientosPDF}
                disabled={downloadingMovPDF}
              >
                {downloadingMovPDF ? <span className="spinner" /> : <FileText size={18} />}
                {downloadingMovPDF ? 'Generando...' : 'PDF (.pdf)'}
              </button>
            </div>
          </div>
        </ReportCard>
      </div>

      <div className="mt-6 card bg-blue-50 border border-blue-100">
        <div className="card-body flex items-start gap-4">
          <FileSpreadsheet size={28} className="text-deep-blue flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-deep-blue text-base">Compatibilidad</h3>
            <p className="text-sm text-gray-600 mt-1">
              Los reportes Excel son compatibles con Microsoft Excel, LibreOffice Calc y Google Sheets.
              Los PDF se generan en formato A4 horizontal y pueden imprimirse directamente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
