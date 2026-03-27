const db   = require('../db');
const XLSX = require('xlsx');

// GET /api/productos?search=&categoria=
const getAll = async (req, res) => {
  try {
    const { search = '', categoria = '' } = req.query;
    let sql = `
      SELECT p.*, c.nombre AS categoria_nombre
      FROM productos p
      LEFT JOIN categorias c ON c.id = p.categoria_id
      WHERE p.activo = 1
    `;
    const params = [];

    if (search.trim()) {
      sql += ' AND (p.codigo LIKE ? OR p.nombre LIKE ? OR c.nombre LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s);
    }
    if (categoria) {
      sql += ' AND p.categoria_id = ?';
      params.push(categoria);
    }
    sql += ' ORDER BY p.nombre ASC';

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/productos
const create = async (req, res) => {
  const { codigo, nombre, categoria_id, stock_actual, stock_minimo, unidad_medida } = req.body;
  if (!codigo?.trim() || !nombre?.trim()) {
    return res.status(400).json({ error: 'Código y nombre son obligatorios' });
  }
  try {
    const [result] = await db.query(
      `INSERT INTO productos
        (codigo, nombre, categoria_id, stock_actual, stock_minimo, unidad_medida)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        codigo.trim(),
        nombre.trim(),
        categoria_id || null,
        parseFloat(stock_actual) || 0,
        parseFloat(stock_minimo) || 0,
        unidad_medida?.trim() || 'unidad',
      ]
    );
    const [rows] = await db.query(
      'SELECT p.*, c.nombre AS categoria_nombre FROM productos p LEFT JOIN categorias c ON c.id = p.categoria_id WHERE p.id = ?',
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Ya existe un producto con ese código' });
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/productos/:id
const update = async (req, res) => {
  const { id } = req.params;
  const { codigo, nombre, categoria_id, stock_actual, stock_minimo, unidad_medida } = req.body;
  if (!codigo?.trim() || !nombre?.trim()) {
    return res.status(400).json({ error: 'Código y nombre son obligatorios' });
  }
  try {
    await db.query(
      `UPDATE productos SET
        codigo = ?, nombre = ?, categoria_id = ?,
        stock_actual = ?, stock_minimo = ?,
        unidad_medida = ?
       WHERE id = ? AND activo = 1`,
      [
        codigo.trim(),
        nombre.trim(),
        categoria_id || null,
        parseFloat(stock_actual) || 0,
        parseFloat(stock_minimo) || 0,
        unidad_medida?.trim() || 'unidad',
        id,
      ]
    );
    const [rows] = await db.query(
      'SELECT p.*, c.nombre AS categoria_nombre FROM productos p LEFT JOIN categorias c ON c.id = p.categoria_id WHERE p.id = ?',
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Ya existe un producto con ese código' });
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/productos/:id  (borrado real)
const remove = async (req, res) => {
  const { id } = req.params;
  try {
    // Verificar si tiene movimientos
    const [movs] = await db.query(
      'SELECT COUNT(*) AS total FROM movimientos WHERE producto_id = ?',
      [id]
    );
    if (movs[0].total > 0) {
      // Borrado lógico para preservar historial
      await db.query('UPDATE productos SET activo = 0 WHERE id = ?', [id]);
      return res.json({ message: 'Producto desactivado (tiene historial de movimientos)' });
    }
    // Borrado físico si no tiene movimientos
    const [result] = await db.query('DELETE FROM productos WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ message: 'Producto eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/productos/import
const importExcel = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });
  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet    = workbook.Sheets[workbook.SheetNames[0]];
    const data     = XLSX.utils.sheet_to_json(sheet);

    let insertados = 0;
    let errores    = [];

    for (const row of data) {
      const codigo       = String(row['codigo'] || row['Código'] || row['CODIGO'] || '').trim();
      const nombre       = String(row['nombre'] || row['Nombre'] || row['NOMBRE'] || '').trim();
      const catNombre    = String(row['categoria'] || row['Categoría'] || row['CATEGORIA'] || '').trim();
      const stockActual  = parseFloat(row['stock_actual'] || row['Stock Actual'] || 0);
      const stockMinimo  = parseFloat(row['stock_minimo'] || row['Stock Mínimo'] || 0);
      const unidad       = String(row['unidad_medida'] || row['Unidad'] || 'unidad').trim();

      if (!codigo || !nombre) {
        errores.push(`Fila sin código o nombre: ${JSON.stringify(row)}`);
        continue;
      }

      let categoria_id = null;
      if (catNombre) {
        const [cats] = await db.query('SELECT id FROM categorias WHERE nombre = ?', [catNombre]);
        if (cats.length > 0) {
          categoria_id = cats[0].id;
        } else {
          // Crear categoría si no existe
          const [newCat] = await db.query('INSERT INTO categorias (nombre) VALUES (?)', [catNombre]);
          categoria_id = newCat.insertId;
        }
      }

      try {
        await db.query(
          `INSERT INTO productos (codigo, nombre, categoria_id, stock_actual, stock_minimo, unidad_medida)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             nombre = VALUES(nombre),
             categoria_id = VALUES(categoria_id),
             stock_actual = VALUES(stock_actual),
             stock_minimo = VALUES(stock_minimo),
             unidad_medida = VALUES(unidad_medida),
             activo = 1`,
          [codigo, nombre, categoria_id, stockActual, stockMinimo, unidad]
        );
        insertados++;
      } catch (rowErr) {
        errores.push(`Error en producto ${codigo}: ${rowErr.message}`);
      }
    }

    res.json({ insertados, errores, total: data.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAll, create, update, remove, importExcel };
