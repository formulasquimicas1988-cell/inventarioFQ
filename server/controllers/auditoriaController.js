const pool = require('../db');

// GET /api/auditoria
const getAuditoria = async (req, res) => {
  try {
    const { page = 1, limit = 50, usuario, modulo, fecha_inicio, fecha_fin } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const where = [];

    if (usuario && usuario.trim()) {
      where.push('usuario LIKE ?');
      params.push(`%${usuario.trim()}%`);
    }
    if (modulo && modulo !== 'all') {
      where.push('modulo = ?');
      params.push(modulo);
    }
    if (fecha_inicio) {
      where.push('fecha >= ?');
      params.push(fecha_inicio);
    }
    if (fecha_fin) {
      where.push('fecha <= ?');
      params.push(fecha_fin + ' 23:59:59');
    }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM auditoria ${whereClause}`, params
    );
    const [rows] = await pool.query(
      `SELECT * FROM auditoria ${whereClause} ORDER BY fecha DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({ data: rows, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) || 1 });
  } catch (err) {
    console.error('getAuditoria error:', err);
    res.status(500).json({ error: 'Error al obtener auditoría' });
  }
};

module.exports = { getAuditoria };
