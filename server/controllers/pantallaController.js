const pool = require('../db');

// Hora de Honduras (UTC-6) de hace 5 minutos, como string MySQL DATETIME.
// Se calcula en Node (process.env.TZ = America/Tegucigalpa) para usar el MISMO
// reloj con el que se guarda ventas.fecha (nowHN), y NO el NOW() de MySQL, que
// en Railway corre en UTC y dejaría el filtro siempre vacío.
const pad2 = n => String(n).padStart(2, '0');
function fmtHN(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ` +
         `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}
function ahoraHN() { return fmtHN(new Date()); }
function hace5MinHN() { return fmtHN(new Date(Date.now() - 5 * 60 * 1000)); }

// GET /api/pantalla-tk9x2/ventas
// PÚBLICO (sin auth). Devuelve las ventas de los últimos 5 minutos, más
// recientes primero, SIN precios ni montos de ningún tipo. Los tickets
// desaparecen solos al pasar los 5 min porque simplemente dejan de venir.
const ventasRecientes = async (req, res) => {
  try {
    const [ventas] = await pool.query(
      `SELECT id, numero_ticket, nombre_cliente,
              TIMESTAMPDIFF(SECOND, fecha, ?) AS segundos
       FROM ventas
       WHERE anulada = 0
         AND fecha >= ?
       ORDER BY fecha DESC, id DESC`,
      [ahoraHN(), hace5MinHN()]
    );

    if (ventas.length === 0) return res.json({ ventas: [] });

    const ids = ventas.map(v => v.id);
    const [detalles] = await pool.query(
      `SELECT venta_id, descripcion, cantidad
       FROM detalle_ventas
       WHERE venta_id IN (?)
       ORDER BY id ASC`,
      [ids]
    );

    const productosPorVenta = {};
    for (const d of detalles) {
      (productosPorVenta[d.venta_id] ||= []).push({
        descripcion: d.descripcion,
        cantidad: Number(d.cantidad),
      });
    }

    res.json({
      ventas: ventas.map(v => ({
        id: v.id,
        numero_ticket: v.numero_ticket,
        nombre_cliente: v.nombre_cliente || null,
        segundos: Math.max(0, Number(v.segundos) || 0),
        productos: productosPorVenta[v.id] || [],
      })),
    });
  } catch (err) {
    console.error('pantalla ventasRecientes error:', err);
    res.status(500).json({ error: 'Error al obtener ventas' });
  }
};

// GET /api/pantalla-tk9x2/mensajes — PÚBLICO. Mensajes activos de la cinta.
const mensajesPublicos = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT texto FROM mensajes_pantalla WHERE activo = 1 ORDER BY orden ASC, id ASC'
    );
    res.json({ mensajes: rows.map(r => r.texto) });
  } catch (err) {
    console.error('pantalla mensajes error:', err);
    res.status(500).json({ error: 'Error al obtener mensajes' });
  }
};

module.exports = { ventasRecientes, mensajesPublicos };
