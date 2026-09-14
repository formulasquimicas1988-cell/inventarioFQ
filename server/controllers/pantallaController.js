const pool = require('../db');

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
         AND fecha >= NOW() - INTERVAL 5 MINUTE
       ORDER BY fecha DESC, id DESC`
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
