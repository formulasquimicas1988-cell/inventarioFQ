const express = require('express');
const router = express.Router();
const { ventasRecientes, voz } = require('../controllers/pantallaController');

// Rutas PÚBLICAS (sin authMiddleware). Ver exclusión en index.js.
router.get('/ventas', ventasRecientes);
router.get('/voz', voz);

module.exports = router;
