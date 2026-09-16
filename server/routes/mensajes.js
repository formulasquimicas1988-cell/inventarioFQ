const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/mensajesController');
const requireAdmin = require('../middleware/requireAdmin');

// Listar puede cualquier usuario logueado (la página solo la ve admin en el
// menú). Crear/editar/borrar exige rol admin (usuario_id en el body).
router.get('/', ctrl.getAll);
router.post('/', requireAdmin, ctrl.create);
router.put('/:id', requireAdmin, ctrl.update);
router.delete('/:id', requireAdmin, ctrl.remove);

module.exports = router;
