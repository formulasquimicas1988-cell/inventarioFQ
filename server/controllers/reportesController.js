const pool = require('../db');
const XLSX = require('xlsx');

// Format date to Spanish 12h format
function formatDateEs(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

// GET /api/reportes/inventario
const exportInventario = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        p.codigo AS 'Código',
        p.nombre AS 'Nombre',
        c.nombre AS 'Categoría',
        p.stock_actual AS 'Stock Actual',
        p.stock_minimo AS 'Stock Mínimo',
        p.unidad_medida AS 'Unidad de Medida',
        CASE
          WHEN p.stock_actual < p.stock_minimo THEN 'Crítico'
          WHEN p.stock_actual <= p.stock_minimo * 1.5 THEN 'Bajo'
          ELSE 'OK'
        END AS 'Estado'
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.activo = 1
      ORDER BY p.nombre ASC
    `);

    const ws = XLSX.utils.json_to_sheet(rows);

    // Set column widths
    ws['!cols'] = [
      { wch: 12 }, { wch: 35 }, { wch: 25 }, { wch: 14 },
      { wch: 14 }, { wch: 18 }, { wch: 10 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

    res.setHeader('Content-Disposition', `attachment; filename="inventario_${dateStr}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error('exportInventario error:', err);
    res.status(500).json({ error: 'Error al exportar inventario' });
  }
};

// GET /api/reportes/movimientos
const exportMovimientos = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, tipo } = req.query;
    const params = [];
    let where = [];

    if (tipo && tipo !== 'all') {
      where.push('m.tipo = ?');
      params.push(tipo);
    }
    if (fecha_inicio) {
      where.push('DATE(m.fecha) >= ?');
      params.push(fecha_inicio);
    }
    if (fecha_fin) {
      where.push('DATE(m.fecha) <= ?');
      params.push(fecha_fin);
    }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [rows] = await pool.query(`
      SELECT
        m.fecha,
        m.tipo,
        p.codigo,
        p.nombre AS producto,
        m.cantidad,
        m.cantidad_anterior AS stock_anterior,
        m.stock_resultante,
        p.unidad_medida,
        m.cliente,
        m.proveedor,
        m.notas
      FROM movimientos m
      JOIN productos p ON m.producto_id = p.id
      ${whereClause}
      ORDER BY m.fecha DESC, m.id DESC
    `, params);

    const data = rows.map(r => ({
      'Fecha': formatDateEs(r.fecha),
      'Tipo': r.tipo.charAt(0).toUpperCase() + r.tipo.slice(1),
      'Código': r.codigo,
      'Producto': r.producto,
      'Cantidad': parseFloat(r.cantidad),
      'Stock Anterior': parseFloat(r.stock_anterior) || 0,
      'Stock Resultante': parseFloat(r.stock_resultante) || 0,
      'Unidad': r.unidad_medida,
      'Cliente': r.cliente || '',
      'Proveedor': r.proveedor || '',
      'Notas': r.notas || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 35 },
      { wch: 10 }, { wch: 14 }, { wch: 16 }, { wch: 10 },
      { wch: 25 }, { wch: 25 }, { wch: 40 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

    res.setHeader('Content-Disposition', `attachment; filename="movimientos_${dateStr}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error('exportMovimientos error:', err);
    res.status(500).json({ error: 'Error al exportar movimientos' });
  }
};

module.exports = { exportInventario, exportMovimientos };
