const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/alertasController');

router.get('/criticos', ctrl.getCriticos);

module.exports = router;
