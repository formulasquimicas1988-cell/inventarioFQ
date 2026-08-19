const pool = require('../db');

/**
 * Middleware que permite la acción solo a usuarios con rol 'admin' o 'caja'.
 * Se usa para acciones que generan una venta/ticket (p. ej. entregar un
 * apartado): almacén puede ver y gestionar, pero no cobrar/imprimir ticket.
 */
const requireCajaOrAdmin = async (req, res, next) => {
  const usuario_id = req.body?.usuario_id;

  if (!usuario_id) {
    return res.status(401).json({ error: 'No autorizado: se requiere usuario_id.' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT rol FROM usuarios WHERE id = ? AND activo = 1',
      [parseInt(usuario_id)]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado o inactivo.' });
    }

    if (rows[0].rol !== 'admin' && rows[0].rol !== 'caja') {
      return res.status(403).json({ error: 'Acceso denegado: solo caja o administrador pueden entregar apartados.' });
    }

    next();
  } catch (err) {
    console.error('requireCajaOrAdmin error:', err);
    res.status(500).json({ error: 'Error al verificar permisos.' });
  }
};

module.exports = requireCajaOrAdmin;
