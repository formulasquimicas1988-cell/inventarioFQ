const db = require('../db');

// GET /api/dashboard/stats
const getStats = async (_req, res) => {
  try {
    const [[{ total_productos }]] = await db.query(
      'SELECT COUNT(*) AS total_productos FROM productos WHERE activo = 1'
    );
    const [[{ stock_critico }]] = await db.query(
      'SELECT COUNT(*) AS stock_critico FROM productos WHERE activo = 1 AND stock_actual < stock_minimo'
    );
    const [[{ entradas_hoy }]] = await db.query(
      `SELECT COALESCE(SUM(cantidad),0) AS entradas_hoy
       FROM movimientos
       WHERE tipo = 'entrada' AND DATE(fecha) = CURDATE()`
    );
    const [[{ salidas_hoy }]] = await db.query(
      `SELECT COALESCE(SUM(cantidad),0) AS salidas_hoy
       FROM movimientos
       WHERE tipo = 'salida' AND DATE(fecha) = CURDATE()`
    );
    const [[{ total_categorias }]] = await db.query(
      'SELECT COUNT(*) AS total_categorias FROM categorias'
    );
    const [[{ total_danos, cantidad_danos }]] = await db.query(
      `SELECT COUNT(*) AS total_danos, COALESCE(SUM(cantidad),0) AS cantidad_danos
       FROM movimientos WHERE tipo = 'dañado'`
    );

    res.json({ total_productos, stock_critico, entradas_hoy, salidas_hoy, total_categorias, total_danos, cantidad_danos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/dashboard/movimientos-recientes
const getMovimientosRecientes = async (_req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT m.id, m.tipo, m.cantidad, m.cliente, m.proveedor, m.fecha,
             p.nombre AS producto_nombre, p.codigo AS producto_codigo, p.unidad_medida
      FROM movimientos m
      JOIN productos p ON p.id = m.producto_id
      ORDER BY m.fecha DESC
      LIMIT 10
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/dashboard/chart-data  (entradas vs salidas del mes actual por día)
const getChartData = async (_req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        DATE(fecha) AS dia,
        tipo,
        SUM(cantidad) AS total
      FROM movimientos
      WHERE
        YEAR(fecha)  = YEAR(CURDATE()) AND
        MONTH(fecha) = MONTH(CURDATE())
      GROUP BY dia, tipo
      ORDER BY dia ASC
    `);

    // Construir mapa por fecha
    const map = {};
    rows.forEach(r => {
      const key = r.dia.toISOString().split('T')[0];
      if (!map[key]) map[key] = { dia: key, entradas: 0, salidas: 0 };
      if (r.tipo === 'entrada') map[key].entradas = parseFloat(r.total);
      if (r.tipo === 'salida')  map[key].salidas  = parseFloat(r.total);
    });

    res.json(Object.values(map));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/dashboard/top-salidas  (top 10 productos con más salidas)
const getTopSalidas = async (_req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.nombre, p.codigo, COALESCE(SUM(m.cantidad),0) AS total_salidas
      FROM productos p
      LEFT JOIN movimientos m ON m.producto_id = p.id AND m.tipo = 'salida'
      WHERE p.activo = 1
      GROUP BY p.id
      ORDER BY total_salidas DESC
      LIMIT 10
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/dashboard/menos-salidas  (top 10 productos con menos salidas)
const getMenosSalidas = async (_req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.nombre, p.codigo, COALESCE(SUM(m.cantidad),0) AS total_salidas
      FROM productos p
      LEFT JOIN movimientos m ON m.producto_id = p.id AND m.tipo = 'salida'
      WHERE p.activo = 1
      GROUP BY p.id
      ORDER BY total_salidas ASC
      LIMIT 10
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/dashboard/alertas-count
const getAlertasCount = async (_req, res) => {
  try {
    const [[{ count }]] = await db.query(
      'SELECT COUNT(*) AS count FROM productos WHERE activo = 1 AND stock_actual < stock_minimo'
    );
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getStats, getMovimientosRecientes, getChartData, getTopSalidas, getMenosSalidas, getAlertasCount };
