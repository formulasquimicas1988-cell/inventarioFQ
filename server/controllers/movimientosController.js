const db = require('../db');

// GET /api/movimientos?tipo=&search=&from=&to=&producto_id=
const getAll = async (req, res) => {
  try {
    const { tipo = '', search = '', from = '', to = '', producto_id = '' } = req.query;
    let sql = `
      SELECT m.*, p.nombre AS producto_nombre, p.codigo AS producto_codigo,
             p.unidad_medida, c.nombre AS categoria_nombre
      FROM movimientos m
      JOIN productos p ON p.id = m.producto_id
      LEFT JOIN categorias c ON c.id = p.categoria_id
      WHERE 1=1
    `;
    const params = [];

    if (tipo) {
      sql += ' AND m.tipo = ?';
      params.push(tipo);
    }
    if (producto_id) {
      sql += ' AND m.producto_id = ?';
      params.push(producto_id);
    }
    if (search.trim()) {
      sql += ' AND (p.nombre LIKE ? OR p.codigo LIKE ? OR m.cliente LIKE ? OR m.proveedor LIKE ? OR m.tipo LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s, s);
    }
    if (from) {
      sql += ' AND m.fecha >= ?';
      params.push(from);
    }
    if (to) {
      sql += ' AND m.fecha <= ?';
      params.push(to + ' 23:59:59');
    }
    sql += ' ORDER BY m.fecha DESC LIMIT 500';

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/movimientos
const create = async (req, res) => {
  const { producto_id, tipo, cantidad, cliente, proveedor, motivo, notas, fecha } = req.body;

  if (!producto_id || !tipo || !cantidad) {
    return res.status(400).json({ error: 'Producto, tipo y cantidad son obligatorios' });
  }
  if (!['entrada', 'salida', 'ajuste', 'dañado'].includes(tipo)) {
    return res.status(400).json({ error: 'Tipo inválido' });
  }
  if (tipo === 'salida' && !cliente?.trim()) {
    return res.status(400).json({ error: 'El cliente es obligatorio para las salidas' });
  }
  if (tipo === 'ajuste' && !motivo?.trim()) {
    return res.status(400).json({ error: 'El motivo es obligatorio para los ajustes' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Obtener stock actual con lock
    const [productos] = await conn.query(
      'SELECT stock_actual FROM productos WHERE id = ? AND activo = 1 FOR UPDATE',
      [producto_id]
    );
    if (!productos.length) {
      await conn.rollback();
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const stockActual = parseFloat(productos[0].stock_actual);
    const cant        = parseFloat(cantidad);
    let   nuevoStock;

    if (tipo === 'entrada') {
      nuevoStock = stockActual + cant;
    } else if (tipo === 'salida' || tipo === 'dañado') {
      if (cant > stockActual) {
        await conn.rollback();
        return res.status(400).json({
          error: `Stock insuficiente. Stock actual: ${stockActual}, solicitado: ${cant}`
        });
      }
      nuevoStock = stockActual - cant;
    } else {
      // ajuste: cant es el nuevo valor del stock
      nuevoStock = cant;
    }

    // Actualizar stock
    await conn.query('UPDATE productos SET stock_actual = ? WHERE id = ?', [nuevoStock, producto_id]);

    // Calcular cantidad a registrar
    const cantidadRegistrada = tipo === 'ajuste'
      ? Math.abs(nuevoStock - stockActual)
      : cant;

    // Registrar movimiento
    const fechaMovimiento = fecha ? new Date(fecha) : new Date();
    const [result] = await conn.query(
      `INSERT INTO movimientos
         (producto_id, tipo, cantidad, cantidad_anterior, cliente, proveedor, motivo, notas, fecha)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        producto_id,
        tipo,
        tipo === 'ajuste' ? cant : cantidadRegistrada,
        stockActual,
        tipo === 'salida' ? cliente?.trim() : null,
        tipo === 'entrada' ? proveedor?.trim() || null : null,
        motivo?.trim() || null,
        notas?.trim() || null,
        fechaMovimiento,
      ]
    );

    await conn.commit();

    const [rows] = await db.query(
      `SELECT m.*, p.nombre AS producto_nombre, p.codigo AS producto_codigo,
              p.unidad_medida, p.stock_actual AS stock_resultante
       FROM movimientos m
       JOIN productos p ON p.id = m.producto_id
       WHERE m.id = ?`,
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
};

// DELETE /api/movimientos/:id
const remove = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM movimientos WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Movimiento no encontrado' });
    res.json({ message: 'Movimiento eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAll, create, remove };
