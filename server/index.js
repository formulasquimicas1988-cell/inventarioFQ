require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const path       = require('path');

const categoriasRouter   = require('./routes/categorias');
const productosRouter    = require('./routes/productos');
const movimientosRouter  = require('./routes/movimientos');
const dashboardRouter    = require('./routes/dashboard');
const reportesRouter     = require('./routes/reportes');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middlewares ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Rutas ────────────────────────────────────────────────────
app.use('/api/categorias',  categoriasRouter);
app.use('/api/productos',   productosRouter);
app.use('/api/movimientos', movimientosRouter);
app.use('/api/dashboard',   dashboardRouter);
app.use('/api/reportes',    reportesRouter);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date() }));

// ── Archivos estáticos en producción ─────────────────────────
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../client/dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

// ── Manejo de errores ────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Error interno del servidor' });
});

// ── Inicio ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
