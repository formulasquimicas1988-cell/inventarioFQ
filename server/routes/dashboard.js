const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/dashboardController');

router.get('/stats',            ctrl.getStats);
router.get('/movimientos-recientes', ctrl.getMovimientosRecientes);
router.get('/chart-data',       ctrl.getChartData);
router.get('/top-salidas',      ctrl.getTopSalidas);
router.get('/menos-salidas',    ctrl.getMenosSalidas);
router.get('/alertas-count',    ctrl.getAlertasCount);

module.exports = router;
