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
})();

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
});
