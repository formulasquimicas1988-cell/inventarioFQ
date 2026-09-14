const pool = require('../db');

// Hora de Honduras (UTC-6) de hace 5 minutos, como string MySQL DATETIME.
// Se calcula en Node (process.env.TZ = America/Tegucigalpa) para usar el MISMO
// reloj con el que se guarda ventas.fecha (nowHN), y NO el NOW() de MySQL, que
// en Railway corre en UTC y dejaría el filtro siempre vacío.
function hace5MinHN() {
  const d = new Date(Date.now() - 5 * 60 * 1000);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
         `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// GET /api/pantalla-tk9x2/ventas
// PÚBLICO (sin auth). Devuelve las ventas de los últimos 5 minutos, más
// recientes primero, SIN precios ni montos de ningún tipo. Los tickets
// desaparecen solos al pasar los 5 min porque simplemente dejan de venir.
const ventasRecientes = async (req, res) => {
  try {
    const [ventas] = await pool.query(
      `SELECT id, numero_ticket, nombre_cliente, fecha
       FROM ventas
       WHERE anulada = 0
         AND fecha >= ?
       ORDER BY fecha DESC, id DESC`,
      [hace5MinHN()]
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
        productos: productosPorVenta[v.id] || [],
      })),
    });
  } catch (err) {
    console.error('pantalla ventasRecientes error:', err);
    res.status(500).json({ error: 'Error al obtener ventas' });
  }
};

module.exports = { ventasRecientes };
