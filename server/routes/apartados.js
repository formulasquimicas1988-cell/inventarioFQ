const express = require('express');
const router = express.Router();
const { getAll, getById, crearApartado, entregarApartado, cancelarApartado } = require('../controllers/apartadosController');
const requireCajaOrAdmin = require('../middleware/requireCajaOrAdmin');

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', crearApartado);
router.put('/:id/entregar', requireCajaOrAdmin, entregarApartado);
router.put('/:id/cancelar', cancelarApartado);

module.exports = router;
