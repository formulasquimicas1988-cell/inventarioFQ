const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fq_dev_secret_key_change_in_production';

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'No autorizado: se requiere iniciar sesión' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, nombre, rol }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sesión expirada o inválida, por favor inicia sesión nuevamente' });
  }
};

module.exports = authMiddleware;
