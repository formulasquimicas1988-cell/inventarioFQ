// Fijar zona horaria antes de cualquier require para que
// Node.js y mysql2 usen siempre Tegucigalpa (UTC-6, sin cambio de horario)
process.env.TZ = 'America/Tegucigalpa';
console.log('TZ fix v2');

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authMiddleware = require('./middleware/authMiddleware');

const app = express();

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:3001'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, same-origin)
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', true); // Para obtener IP real detrás de Railway/proxies

// Proteger todas las rutas /api/* excepto login y health
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth') || req.path === '/health') return next();
  authMiddleware(req, res, next);
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/categorias', require('./routes/categorias'));
app.use('/api/productos', require('./routes/productos'));
app.use('/api/movimientos', require('./routes/movimientos'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/reportes', require('./routes/reportes'));
app.use('/api/alertas', require('./routes/alertas'));
app.use('/api/auditoria', require('./routes/auditoria'));
app.use('/api/ventas', require('./routes/ventas'));
app.use('/api/apartados', require('./routes/apartados'));

// Health check (must be before the SPA catch-all)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Inventario Fórmulas Químicas' });
});

// Serve React frontend in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../client/dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Migración automática al arrancar: columna client_uid en ventas (previene
// ventas duplicadas). Es idempotente: si la columna/índice ya existen no hace
// nada, y si falla el servidor sigue funcionando igual que antes.
const pool = require('./db');
(async () => {
  try {
    await pool.query('ALTER TABLE ventas ADD COLUMN client_uid VARCHAR(36) DEFAULT NULL');
    console.log('✔ Migración: columna client_uid agregada a ventas');
  } catch (err) {
    if (err.code !== 'ER_DUP_FIELDNAME') {
      console.error('Migración client_uid (columna):', err.message);
    }
  }
  try {
    await pool.query('CREATE UNIQUE INDEX idx_ventas_client_uid ON ventas (client_uid)');
    console.log('✔ Migración: índice único idx_ventas_client_uid creado');
  } catch (err) {
    if (err.code !== 'ER_DUP_KEYNAME') {
      console.error('Migración client_uid (índice):', err.message);
    }
  }

  // ── Migración: sección de Apartados ──────────────────────────────────────
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS apartados (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        nombre_cliente VARCHAR(255) NOT NULL,
        telefono VARCHAR(50) DEFAULT NULL,
        estado VARCHAR(20) NOT NULL DEFAULT 'activo',
        total DECIMAL(12,2) NOT NULL DEFAULT 0,
        notas TEXT DEFAULT NULL,
        venta_id INT DEFAULT NULL,
        motivo_cancelacion VARCHAR(255) DEFAULT NULL,
        fecha DATETIME NOT NULL,
        fecha_entrega DATETIME DEFAULT NULL,
        fecha_cancelacion DATETIME DEFAULT NULL,
        client_uid VARCHAR(36) DEFAULT NULL,
        UNIQUE KEY idx_apartados_client_uid (client_uid),
        KEY idx_apartados_estado (estado)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS detalle_apartados (
        id INT AUTO_INCREMENT PRIMARY KEY,
        apartado_id INT NOT NULL,
        producto_id INT DEFAULT NULL,
        descripcion VARCHAR(255) NOT NULL DEFAULT '',
        cantidad DECIMAL(12,2) NOT NULL DEFAULT 0,
        precio_unitario DECIMAL(12,2) NOT NULL DEFAULT 0,
        subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
        sin_inventario TINYINT(1) NOT NULL DEFAULT 0,
        KEY idx_detalle_apartados_apartado (apartado_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✔ Migración: tablas apartados / detalle_apartados listas');
  } catch (err) {
    console.error('Migración apartados (tablas):', err.message);
  }

  // Columna apartado_id en movimientos (idempotente)
  try {
    await pool.query('ALTER TABLE movimientos ADD COLUMN apartado_id INT DEFAULT NULL');
    console.log('✔ Migración: columna apartado_id agregada a movimientos');
  } catch (err) {
    if (err.code !== 'ER_DUP_FIELDNAME') {
      console.error('Migración apartado_id (columna):', err.message);
    }
  }

  // Columna metodo_pago en ventas (efectivo por defecto). Idempotente.
  try {
    await pool.query("ALTER TABLE ventas ADD COLUMN metodo_pago VARCHAR(20) NOT NULL DEFAULT 'efectivo'");
    console.log('✔ Migración: columna metodo_pago agregada a ventas');
  } catch (err) {
    if (err.code !== 'ER_DUP_FIELDNAME') {
      console.error('Migración metodo_pago (columna):', err.message);
    }
  }

  // Asegurar que movimientos.tipo acepte 'apartado' (si es ENUM, ampliarlo a VARCHAR)
  try {
    const [cols] = await pool.query(
      `SELECT DATA_TYPE FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'movimientos' AND COLUMN_NAME = 'tipo'`
    );
    if (cols.length && cols[0].DATA_TYPE.toLowerCase() === 'enum') {
      await pool.query("ALTER TABLE movimientos MODIFY COLUMN tipo VARCHAR(20) NOT NULL");
      console.log('✔ Migración: movimientos.tipo convertido a VARCHAR (acepta apartado)');
    }
  } catch (err) {
    console.error('Migración movimientos.tipo:', err.message);
  }
})();

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
});
