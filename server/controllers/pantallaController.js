const pool = require('../db');
const { execFile } = require('child_process');

// ── Voz "Ticket N" generada con espeak-ng (offline, sin servicios externos) ──
// El Silk del Fire TV no tiene voz propia, así que el servidor genera el WAV
// y la tele solo lo reproduce (reproducir audio sí funciona en Silk).
const cacheVoz = new Map(); // clave -> Buffer WAV
const MAX_CACHE = 500;

function espeak(args) {
  return new Promise((resolve, reject) => {
    execFile('espeak-ng', args, { encoding: 'buffer', maxBuffer: 10 * 1024 * 1024 },
      (err, stdout) => (err ? reject(err) : resolve(stdout)));
  });
}

async function generarWav(texto) {
  // -s: velocidad · -a: volumen · --stdout: WAV a stdout
  const base = ['-s', '150', '-a', '200', '--stdout', texto];
  try {
    // Voz MBROLA en español: mucho más natural que espeak a secas
    return await espeak(['-v', 'mb-es2', ...base]);
  } catch {
    // Fallback si mb-es2 no está disponible: voz espeak básica (robótica pero funciona)
    return await espeak(['-v', 'es', ...base]);
  }
}

// GET /api/pantalla-tk9x2/voz?n=132   |   ?activado=1
const voz = async (req, res) => {
  try {
    let texto, clave;
    if (req.query.activado) {
      texto = 'Sonido activado';
      clave = 'activado';
    } else {
      const n = parseInt(req.query.n, 10);
      if (!Number.isInteger(n) || n < 0 || n > 9999999) {
        return res.status(400).json({ error: 'n inválido' });
      }
      texto = `Ticket ${n}`;
      clave = `t${n}`;
    }

    let wav = cacheVoz.get(clave);
    if (!wav) {
      wav = await generarWav(texto);
      if (cacheVoz.size >= MAX_CACHE) cacheVoz.clear();
      cacheVoz.set(clave, wav);
    }
    res.set('Content-Type', 'audio/wav');
    // no-store: la tele siempre pide la voz fresca (evita reproducir una voz
    // vieja cacheada tras cambiar el motor). El caché en memoria del server
    // mantiene la velocidad.
    res.set('Cache-Control', 'no-store');
    res.send(wav);
  } catch (err) {
    console.error('pantalla voz error:', err.message);
    res.status(500).json({ error: 'No se pudo generar la voz' });
  }
};

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

module.exports = { ventasRecientes, voz };
