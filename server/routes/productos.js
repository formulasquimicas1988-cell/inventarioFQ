const express = require('express');
const multer  = require('multer');
const router  = express.Router();
const ctrl    = require('../controllers/productosController');

const upload = multer({ storage: multer.memoryStorage() });

router.get('/',              ctrl.getAll);
router.post('/',             ctrl.create);
router.put('/:id',           ctrl.update);
router.delete('/:id',        ctrl.remove);
router.post('/import',       upload.single('file'), ctrl.importExcel);

module.exports = router;
