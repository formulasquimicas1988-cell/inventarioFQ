const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/reportesController');

router.get('/inventario',   ctrl.exportInventario);
router.get('/movimientos',  ctrl.exportMovimientos);

module.exports = router;
