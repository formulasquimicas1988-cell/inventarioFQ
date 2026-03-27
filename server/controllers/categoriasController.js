const pool = require('../db');

// GET /api/categorias
const getAll = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        c.id,
        c.nombre,
        c.creado_en,
        COUNT(p.id) AS total_productos
      FROM categorias c
      LEFT JOIN productos p ON p.categoria_id = c.id AND p.activo = 1
      GROUP BY c.id
      ORDER BY c.nombre ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error('getAll categorias error:', err);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
};

// POST /api/categorias
const create = async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre de la categoría es requerido' });
    }
    const [result] = await pool.query(
      'INSERT INTO categorias (nombre) VALUES (?)',
      [nombre.trim()]
    );
    const [rows] = await pool.query(
      'SELECT c.*, 0 AS total_productos FROM categorias c WHERE c.id = ?',
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('create categoria error:', err);
    res.status(500).json({ error: 'Error al crear la categoría' });
  }
};

// PUT /api/categorias/:id
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre } = req.body;
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre de la categoría es requerido' });
    }
    const [result] = await pool.query(
      'UPDATE categorias SET nombre = ? WHERE id = ?',
      [nombre.trim(), id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    const [rows] = await pool.query(`
      SELECT c.*, COUNT(p.id) AS total_productos
      FROM categorias c
      LEFT JOIN productos p ON p.categoria_id = c.id AND p.activo = 1
      WHERE c.id = ?
      GROUP BY c.id
    `, [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('update categoria error:', err);
    res.status(500).json({ error: 'Error al actualizar la categoría' });
  }
};

// DELETE /api/categorias/:id
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    // Check if there are active products in this category
    const [products] = await pool.query(
      'SELECT COUNT(*) AS count FROM productos WHERE categoria_id = ? AND activo = 1',
      [id]
    );
    if (products[0].count > 0) {
      return res.status(400).json({
        error: `No se puede eliminar la categoría porque tiene ${products[0].count} producto(s) activo(s) asignado(s).`
      });
    }
    const [result] = await pool.query('DELETE FROM categorias WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    res.json({ message: 'Categoría eliminada correctamente' });
  } catch (err) {
    console.error('remove categoria error:', err);
    res.status(500).json({ error: 'Error al eliminar la categoría' });
  }
};

module.exports = { getAll, create, update, remove };
