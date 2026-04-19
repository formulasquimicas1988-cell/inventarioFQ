const pool = require('../db');

/**
 * Registra una acción en la tabla de auditoría.
 * @param {object} params
 * @param {string} params.usuario  - Nombre del usuario que hizo la acción
 * @param {string} params.accion   - 'creó', 'editó', 'eliminó', 'canceló', 'importó'
 * @param {string} params.modulo   - 'Producto', 'Categoría', 'Entrada', 'Salida', etc.
 * @param {string} params.detalle  - Descripción legible del cambio
 * @param {string} params.ip       - IP del cliente
 */
async function logAudit({ usuario, accion, modulo, detalle, ip }) {
  try {
    await pool.query(
      'INSERT INTO auditoria (usuario, accion, modulo, detalle, ip) VALUES (?, ?, ?, ?, ?)',
      [usuario || 'Sistema', accion, modulo, detalle || null, ip || null]
    );
  } catch (err) {
    // Audit failures should never break the main operation
    console.error('Audit log error:', err.message);
  }
}

/**
 * Extrae la IP real del cliente (considera proxies como Railway).
 */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.ip || req.connection?.remoteAddress || 'desconocida';
}

module.exports = { logAudit, getClientIp };
