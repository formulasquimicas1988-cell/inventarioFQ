const pool = require('../db');

// GET /api/alertas/criticos
const getCriticos = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        p.id,
        p.codigo,
        p.nombre,
        p.stock_actual,
        p.stock_minimo,
        p.unidad_medida,
        c.nombre AS categoria_nombre,
        (p.stock_minimo - p.stock_actual) AS deficit
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.activo = 1
        AND p.stock_actual < p.stock_minimo
      ORDER BY deficit DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('getCriticos error:', err);
    res.status(500).json({ error: 'Error al obtener alertas críticas' });
  }
};

module.exports = { getCriticos };
