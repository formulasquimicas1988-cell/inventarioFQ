const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/movimientosController');

router.get('/', ctrl.getHistorial);
router.get('/entradas', ctrl.getEntradas);
router.get('/salidas', ctrl.getSalidas);
router.get('/ajustes', ctrl.getAjustes);
router.get('/danados', ctrl.getDanados);
router.post('/entrada', ctrl.createEntrada);
router.post('/salida', ctrl.createSalida);
router.post('/ajuste', ctrl.createAjuste);
router.post('/danado', ctrl.createDanado);
router.delete('/:id/cancelar', ctrl.cancelarMovimiento);

module.exports = router;
