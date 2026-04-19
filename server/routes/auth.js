const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { login, getAccesos, getUsuarios } = require('../controllers/authController');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  message: { error: 'Demasiados intentos fallidos. Espera 15 minutos e intenta de nuevo.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, login);
router.get('/accesos', getAccesos);
router.get('/usuarios', getUsuarios);

module.exports = router;
