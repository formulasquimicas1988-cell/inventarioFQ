const pool = require('../db');

// GET /api/dashboard/stats
const getStats = async (req, res) => {
  try {
    const [[{ total_productos }]] = await pool.query(
      'SELECT COUNT(*) AS total_productos FROM productos WHERE activo = 1'
    );

    const [[{ stock_critico }]] = await pool.query(
      'SELECT COUNT(*) AS stock_critico FROM productos WHERE activo = 1 AND stock_actual < stock_minimo'
    );

    const [[{ entradas_mes }]] = await pool.query(`
      SELECT COALESCE(SUM(cantidad), 0) AS entradas_mes
      FROM movimientos
      WHERE tipo = 'entrada'
        AND YEAR(fecha) = YEAR(NOW())
        AND MONTH(fecha) = MONTH(NOW())
    `);

    const [[{ salidas_mes }]] = await pool.query(`
      SELECT COALESCE(SUM(cantidad), 0) AS salidas_mes
      FROM movimientos
      WHERE tipo = 'salida'
        AND YEAR(fecha) = YEAR(NOW())
        AND MONTH(fecha) = MONTH(NOW())
    `);

    const [[{ danados_mes }]] = await pool.query(`
      SELECT COALESCE(SUM(cantidad), 0) AS danados_mes
      FROM movimientos
      WHERE tipo = 'danado'
        AND YEAR(fecha) = YEAR(NOW())
        AND MONTH(fecha) = MONTH(NOW())
    `);

    res.json({ total_productos, stock_critico, entradas_mes, salidas_mes, danados_mes });
  } catch (err) {
    console.error('getStats error:', err);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};

// GET /api/dashboard/movimientos-recientes
const getMovimientosRecientes = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT m.id, m.tipo, m.cantidad, m.fecha, m.cliente, m.proveedor,
             p.nombre AS producto_nombre, p.codigo AS producto_codigo, p.unidad_medida
      FROM movimientos m
      JOIN productos p ON m.producto_id = p.id
      ORDER BY m.fecha DESC, m.id DESC
      LIMIT 10
    `);
    res.json(rows);
  } catch (err) {
    console.error('getMovimientosRecientes error:', err);
    res.status(500).json({ error: 'Error al obtener movimientos recientes' });
  }
};

// GET /api/dashboard/grafica-mes
const getGraficaMes = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        DAY(fecha) AS dia,
        SUM(CASE WHEN tipo = 'entrada' THEN cantidad ELSE 0 END) AS entradas,
        SUM(CASE WHEN tipo = 'salida' THEN cantidad ELSE 0 END) AS salidas,
        SUM(CASE WHEN tipo = 'danado' THEN cantidad ELSE 0 END) AS danados
      FROM movimientos
      WHERE YEAR(fecha) = YEAR(NOW())
        AND MONTH(fecha) = MONTH(NOW())
      GROUP BY DAY(fecha)
      ORDER BY dia ASC
    `);

    // Fill in all days of the current month with 0 if no data
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dataMap = {};
    rows.forEach(r => { dataMap[r.dia] = r; });

    const result = [];
    for (let d = 1; d <= daysInMonth; d++) {
      result.push({
        dia: d,
        entradas: dataMap[d] ? parseFloat(dataMap[d].entradas) : 0,
        salidas: dataMap[d] ? parseFloat(dataMap[d].salidas) : 0,
        danados: dataMap[d] ? parseFloat(dataMap[d].danados) : 0,
      });
    }
    res.json(result);
  } catch (err) {
    console.error('getGraficaMes error:', err);
    res.status(500).json({ error: 'Error al obtener datos de gráfica' });
  }
};

// GET /api/dashboard/top-salidas
const getTopSalidas = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        p.id, p.codigo, p.nombre, p.unidad_medida,
        COALESCE(SUM(m.cantidad), 0) AS total_salidas
      FROM productos p
      LEFT JOIN movimientos m ON m.producto_id = p.id AND m.tipo = 'salida'
      WHERE p.activo = 1
      GROUP BY p.id
      ORDER BY total_salidas DESC
      LIMIT 10
    `);
    res.json(rows);
  } catch (err) {
    console.error('getTopSalidas error:', err);
    res.status(500).json({ error: 'Error al obtener top salidas' });
  }
};

// GET /api/dashboard/menos-salidas
const getMenosSalidas = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        p.id, p.codigo, p.nombre, p.unidad_medida,
        COALESCE(SUM(m.cantidad), 0) AS total_salidas
      FROM productos p
      LEFT JOIN movimientos m ON m.producto_id = p.id AND m.tipo = 'salida'
      WHERE p.activo = 1
      GROUP BY p.id
      ORDER BY total_salidas ASC
      LIMIT 10
    `);
    res.json(rows);
  } catch (err) {
    console.error('getMenosSalidas error:', err);
    res.status(500).json({ error: 'Error al obtener productos con menos salidas' });
  }
};

module.exports = { getStats, getMovimientosRecientes, getGraficaMes, getTopSalidas, getMenosSalidas };
