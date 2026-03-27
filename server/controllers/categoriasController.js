const db = require('../db');

// GET /api/categorias
const getAll = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.*, COUNT(p.id) AS total_productos
      FROM categorias c
      LEFT JOIN productos p ON p.categoria_id = c.id AND p.activo = 1
      GROUP BY c.id
      ORDER BY c.nombre ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/categorias
const create = async (req, res) => {
  const { nombre } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });
  try {
    const [result] = await db.query(
      'INSERT INTO categorias (nombre) VALUES (?)',
      [nombre.trim()]
    );
    const [rows] = await db.query('SELECT * FROM categorias WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Ya existe una categoría con ese nombre' });
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/categorias/:id
const update = async (req, res) => {
  const { id } = req.params;
  const { nombre } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });
  try {
    await db.query(
      'UPDATE categorias SET nombre = ? WHERE id = ?',
      [nombre.trim(), id]
    );
    const [rows] = await db.query('SELECT * FROM categorias WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Categoría no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/categorias/:id
const remove = async (req, res) => {
  const { id } = req.params;
  try {
    const [products] = await db.query(
      'SELECT COUNT(*) AS total FROM productos WHERE categoria_id = ? AND activo = 1',
      [id]
    );
    if (products[0].total > 0) {
      return res.status(400).json({
        error: `No se puede eliminar: tiene ${products[0].total} producto(s) asociado(s)`
      });
    }
    const [result] = await db.query('DELETE FROM categorias WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Categoría no encontrada' });
    res.json({ message: 'Categoría eliminada correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAll, create, update, remove };
