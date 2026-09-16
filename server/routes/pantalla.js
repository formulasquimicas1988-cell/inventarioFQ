const express = require('express');
const router = express.Router();
const { ventasRecientes } = require('../controllers/pantallaController');

// Ruta PÚBLICA (sin authMiddleware). Ver exclusión en index.js.
router.get('/ventas', ventasRecientes);

module.exports = router;
