const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/dashboardController');

router.get('/stats', ctrl.getStats);
router.get('/movimientos-recientes', ctrl.getMovimientosRecientes);
router.get('/grafica-mes', ctrl.getGraficaMes);
router.get('/top-salidas', ctrl.getTopSalidas);
router.get('/menos-salidas', ctrl.getMenosSalidas);

module.exports = router;
