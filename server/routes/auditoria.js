const express = require('express');
const router = express.Router();
const { getAuditoria } = require('../controllers/auditoriaController');

router.get('/', getAuditoria);

module.exports = router;
