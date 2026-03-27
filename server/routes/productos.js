const express = require('express');
const router = express.Router();
const multer = require('multer');
const ctrl = require('../controllers/productosController');

const upload = multer({ storage: multer.memoryStorage() });

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/importar/excel', upload.single('file'), ctrl.importarExcel);

module.exports = router;
