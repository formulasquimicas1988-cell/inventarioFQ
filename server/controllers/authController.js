const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getClientIp } = require('../lib/audit');

const JWT_SECRET = process.env.JWT_SECRET || 'fq_dev_secret_key_change_in_production';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h';

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { nombre, password } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }
    if (!password) {
      return res.status(400).json({ error: 'La contraseña es requerida' });
    }

    const [rows] = await pool.query(
      'SELECT * FROM usuarios WHERE LOWER(nombre) = LOWER(?) AND activo = 1',
      [nombre.trim()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const usuario = rows[0];
    const passwordOk = await bcrypt.compare(password, usuario.password_hash);

    if (!passwordOk) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const ip = getClientIp(req);
    await pool.query(
      'INSERT INTO accesos (usuario, ip) VALUES (?, ?)',
      [usuario.nombre, ip]
    );

    const token = jwt.sign(
      { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol || 'almacen' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    res.json({
      success: true,
      usuario: usuario.nombre,
      id: usuario.id,
      rol: usuario.rol || 'almacen',
      token,
    });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
};

// GET /api/auth/accesos
const getAccesos = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM accesos');
    const [rows] = await pool.query(
      'SELECT * FROM accesos ORDER BY fecha DESC LIMIT ? OFFSET ?',
      [parseInt(limit), offset]
    );
    res.json({ data: rows, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) || 1 });
  } catch (err) {
    console.error('getAccesos error:', err);
    res.status(500).json({ error: 'Error al obtener accesos' });
  }
};

// GET /api/auth/usuarios
const getUsuarios = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre, rol, activo, creado_en FROM usuarios ORDER BY nombre ASC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

module.exports = { login, getAccesos, getUsuarios };
