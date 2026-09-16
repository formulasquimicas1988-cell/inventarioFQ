const pool = require('../db');
const { logAudit, getClientIp } = require('../lib/audit');

// GET /api/mensajes — lista todos (activos e inactivos) para el panel admin
const getAll = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, texto, activo, orden, creado_en FROM mensajes_pantalla ORDER BY orden ASC, id ASC'
    );
    res.json(rows);
  } catch (err) {
    console.error('getAll mensajes error:', err);
    res.status(500).json({ error: 'Error al obtener mensajes' });
  }
};

// POST /api/mensajes
const create = async (req, res) => {
  try {
    const { texto, activo = 1, orden = 0 } = req.body;
    if (!texto || !texto.trim()) {
      return res.status(400).json({ error: 'El texto del mensaje es requerido' });
    }
    const [result] = await pool.query(
      'INSERT INTO mensajes_pantalla (texto, activo, orden) VALUES (?, ?, ?)',
      [texto.trim().slice(0, 500), activo ? 1 : 0, parseInt(orden) || 0]
    );
    const ip = getClientIp(req);
    await logAudit({ usuario: req.body?.usuario, accion: 'creó', modulo: 'Pantalla TV', detalle: `Creó mensaje "${texto.trim().slice(0, 60)}"`, ip });
    res.status(201).json({ id: result.insertId, texto: texto.trim(), activo: activo ? 1 : 0, orden: parseInt(orden) || 0 });
  } catch (err) {
    console.error('create mensaje error:', err);
    res.status(500).json({ error: 'Error al crear el mensaje' });
  }
};

// PUT /api/mensajes/:id  (permite editar texto, activo y/o orden)
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { texto, activo, orden } = req.body;

    const campos = [];
    const valores = [];
    if (texto !== undefined) {
      if (!texto || !texto.trim()) return res.status(400).json({ error: 'El texto no puede estar vacío' });
      campos.push('texto = ?'); valores.push(texto.trim().slice(0, 500));
    }
    if (activo !== undefined) { campos.push('activo = ?'); valores.push(activo ? 1 : 0); }
    if (orden !== undefined) { campos.push('orden = ?'); valores.push(parseInt(orden) || 0); }
    if (campos.length === 0) return res.status(400).json({ error: 'Nada que actualizar' });

    valores.push(id);
    const [result] = await pool.query(
      `UPDATE mensajes_pantalla SET ${campos.join(', ')} WHERE id = ?`,
      valores
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Mensaje no encontrado' });

    const ip = getClientIp(req);
    await logAudit({ usuario: req.body?.usuario, accion: 'editó', modulo: 'Pantalla TV', detalle: `Editó mensaje ID ${id}`, ip });
    res.json({ message: 'Mensaje actualizado' });
  } catch (err) {
    console.error('update mensaje error:', err);
    res.status(500).json({ error: 'Error al actualizar el mensaje' });
  }
};

// DELETE /api/mensajes/:id
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM mensajes_pantalla WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Mensaje no encontrado' });
    const ip = getClientIp(req);
    await logAudit({ usuario: req.body?.usuario, accion: 'eliminó', modulo: 'Pantalla TV', detalle: `Eliminó mensaje ID ${id}`, ip });
    res.json({ message: 'Mensaje eliminado' });
  } catch (err) {
    console.error('remove mensaje error:', err);
    res.status(500).json({ error: 'Error al eliminar el mensaje' });
  }
};

module.exports = { getAll, create, update, remove };
