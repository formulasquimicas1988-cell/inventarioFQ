const express = require('express');
const router = express.Router();
const { ventasRecientes, mensajesPublicos } = require('../controllers/pantallaController');

// Rutas PÚBLICAS (sin authMiddleware). Ver exclusión en index.js.
router.get('/ventas', ventasRecientes);
router.get('/mensajes', mensajesPublicos);

module.exports = router;
