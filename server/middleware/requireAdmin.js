const pool = require('../db');

/**
 * Middleware que verifica que el usuario_id del body
 * corresponde a un usuario activo con rol 'admin' en la BD.
 */
const requireAdmin = async (req, res, next) => {
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

    if (rows[0].rol !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado: se requiere rol de administrador.' });
    }

    next();
  } catch (err) {
    console.error('requireAdmin error:', err);
    res.status(500).json({ error: 'Error al verificar permisos.' });
  }
};

module.exports = requireAdmin;
