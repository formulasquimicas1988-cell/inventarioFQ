const db      = require('../db');
const ExcelJS = require('exceljs');

const HEADER_FILL  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A1F44' } };
const HEADER_FONT  = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
const BORDER       = {
  top:    { style: 'thin', color: { argb: 'FFD0D7E3' } },
  left:   { style: 'thin', color: { argb: 'FFD0D7E3' } },
  bottom: { style: 'thin', color: { argb: 'FFD0D7E3' } },
  right:  { style: 'thin', color: { argb: 'FFD0D7E3' } },
};
const CRITICAL_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFECEC' } };

function formatDateES(date) {
  if (!date) return '';
  const d = new Date(date);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${dd}/${mm}/${yyyy} ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
}

// GET /api/reportes/inventario
const exportInventario = async (_req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.codigo, p.nombre, c.nombre AS categoria, p.stock_actual,
             p.stock_minimo, p.unidad_medida,
             CASE WHEN p.stock_actual < p.stock_minimo THEN 'CRÍTICO' ELSE 'OK' END AS estado
      FROM productos p
      LEFT JOIN categorias c ON c.id = p.categoria_id
      WHERE p.activo = 1
      ORDER BY p.nombre ASC
    `);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Fórmulas Químicas';
    const ws = wb.addWorksheet('Inventario Actual');

    ws.columns = [
      { header: 'Código',          key: 'codigo',        width: 14 },
      { header: 'Nombre',          key: 'nombre',        width: 38 },
      { header: 'Categoría',       key: 'categoria',     width: 18 },
      { header: 'Stock Actual',    key: 'stock_actual',  width: 14 },
      { header: 'Stock Mínimo',    key: 'stock_minimo',  width: 14 },
      { header: 'Unidad',          key: 'unidad_medida', width: 12 },
      { header: 'Estado',          key: 'estado',        width: 12 },
    ];

    // Cabecera
    const headerRow = ws.getRow(1);
    headerRow.eachCell(cell => {
      cell.fill = HEADER_FILL;
      cell.font = HEADER_FONT;
      cell.border = BORDER;
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    });
    headerRow.height = 30;

    rows.forEach((row, idx) => {
      const r = ws.addRow(row);
      r.height = 22;
      const isCritical = row.estado === 'CRÍTICO';
      r.eachCell(cell => {
        cell.border = BORDER;
        cell.alignment = { vertical: 'middle' };
        if (isCritical) cell.fill = CRITICAL_FILL;
      });
      // Colorear estado
      const estadoCell = r.getCell('estado');
      estadoCell.font = { bold: true, color: { argb: isCritical ? 'FFCC0000' : 'FF166534' } };
    });

    // Título en la fila 1 (insertar antes del header)
    ws.spliceRows(1, 0, [`INVENTARIO ACTUAL - Fórmulas Químicas - Generado: ${formatDateES(new Date())}`]);
    ws.mergeCells('A1:G1');
    const titleRow = ws.getRow(1);
    titleRow.height = 28;
    titleRow.getCell(1).font = { bold: true, size: 13, color: { argb: 'FF0A1F44' } };
    titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="inventario_${Date.now()}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/reportes/movimientos?from=&to=&tipo=
const exportMovimientos = async (req, res) => {
  try {
    const { from = '', to = '', tipo = '' } = req.query;
    let sql = `
      SELECT m.fecha, m.tipo, p.codigo, p.nombre AS producto, p.unidad_medida,
             m.cantidad, m.cantidad_anterior,
             m.cliente, m.proveedor, m.motivo, m.notas
      FROM movimientos m
      JOIN productos p ON p.id = m.producto_id
      WHERE 1=1
    `;
    const params = [];
    if (tipo)  { sql += ' AND m.tipo = ?'; params.push(tipo); }
    if (from)  { sql += ' AND m.fecha >= ?'; params.push(from); }
    if (to)    { sql += ' AND m.fecha <= ?'; params.push(to + ' 23:59:59'); }
    sql += ' ORDER BY m.fecha DESC';

    const [rows] = await db.query(sql, params);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Fórmulas Químicas';
    const ws = wb.addWorksheet('Historial de Movimientos');

    ws.columns = [
      { header: 'Fecha y Hora',       key: 'fecha',            width: 22 },
      { header: 'Tipo',               key: 'tipo',             width: 12 },
      { header: 'Código',             key: 'codigo',           width: 14 },
      { header: 'Producto',           key: 'producto',         width: 38 },
      { header: 'Cantidad',           key: 'cantidad',         width: 12 },
      { header: 'Stock Anterior',     key: 'cantidad_anterior',width: 14 },
      { header: 'Unidad',             key: 'unidad_medida',    width: 10 },
      { header: 'Cliente',            key: 'cliente',          width: 25 },
      { header: 'Proveedor',          key: 'proveedor',        width: 25 },
      { header: 'Motivo/Justif.',     key: 'motivo',           width: 30 },
      { header: 'Notas',              key: 'notas',            width: 30 },
    ];

    const headerRow = ws.getRow(1);
    headerRow.eachCell(cell => {
      cell.fill = HEADER_FILL;
      cell.font = HEADER_FONT;
      cell.border = BORDER;
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    });
    headerRow.height = 30;

    const TYPE_COLORS = { entrada: 'FF166534', salida: 'FFCC0000', ajuste: 'FF1e40af' };
    const TYPE_BG     = { entrada: 'FFdcfce7', salida: 'FFFFECEC', ajuste: 'FFdbeafe' };

    rows.forEach(row => {
      const r = ws.addRow({
        ...row,
        fecha: formatDateES(row.fecha),
      });
      r.height = 22;
      r.eachCell(cell => { cell.border = BORDER; cell.alignment = { vertical: 'middle' }; });
      const tipoCell = r.getCell('tipo');
      const tipoVal  = row.tipo;
      tipoCell.font  = { bold: true, color: { argb: TYPE_COLORS[tipoVal] || 'FF000000' } };
      tipoCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: TYPE_BG[tipoVal] || 'FFFFFFFF' } };
      tipoCell.value = tipoVal.charAt(0).toUpperCase() + tipoVal.slice(1);
    });

    ws.spliceRows(1, 0, [`HISTORIAL DE MOVIMIENTOS - Fórmulas Químicas - Generado: ${formatDateES(new Date())}`]);
    ws.mergeCells('A1:K1');
    const titleRow = ws.getRow(1);
    titleRow.height = 28;
    titleRow.getCell(1).font = { bold: true, size: 13, color: { argb: 'FF0A1F44' } };
    titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="movimientos_${Date.now()}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { exportInventario, exportMovimientos };
