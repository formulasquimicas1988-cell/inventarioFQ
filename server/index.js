require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

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

// API Routes
app.use('/api/categorias', require('./routes/categorias'));
app.use('/api/productos', require('./routes/productos'));
app.use('/api/movimientos', require('./routes/movimientos'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/reportes', require('./routes/reportes'));
app.use('/api/alertas', require('./routes/alertas'));

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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
});
