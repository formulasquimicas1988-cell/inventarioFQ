const express = require('express');
const router = express.Router();
const { getAll, getById, cobrarVenta, anularVenta, editarDetalle } = require('../controllers/ventasController');
const requireAdmin = require('../middleware/requireAdmin');

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', cobrarVenta);
router.put('/:id/anular', requireAdmin, anularVenta);
router.put('/:id/detalle/:detalleId', requireAdmin, editarDetalle);

module.exports = router;
