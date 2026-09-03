const pool = require('../db');
const { logAudit, getClientIp } = require('../lib/audit');
const { nowHN } = require('../lib/timeUtils');
const { buildSearch } = require('../lib/search');

// Helper: build paginated query
async function paginated(baseQuery, countQuery, params, page, limit) {
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const [countRows] = await pool.query(countQuery, params);
  const total = countRows[0].total;
  const [rows] = await pool.query(baseQuery + ` LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);
  const totalPages = Math.ceil(total / parseInt(limit)) || 1;
  return { data: rows, total, page: parseInt(page), limit: parseInt(limit), totalPages };
}

// GET /api/movimientos
const getHistorial = async (req, res) => {
  try {
    const { search, tipo, fecha_inicio, fecha_fin, page = 1, limit = 50 } = req.query;
    const params = [];
    let where = [];

    where.push('m.cancelado = 0');

    if (tipo && tipo !== 'all') {
      where.push('m.tipo = ?');
      params.push(tipo);
    }
    if (fecha_inicio) {
      where.push('DATE(m.fecha) >= ?');
      params.push(fecha_inicio);
    }
    if (fecha_fin) {
      where.push('DATE(m.fecha) <= ?');
      params.push(fecha_fin);
    }
    if (search && search.trim()) {
      const { clause, params: sp } = buildSearch(search, ['p.nombre', 'p.codigo', 'm.cliente', 'm.tipo', 'm.proveedor']);
      if (clause) { where.push(clause); params.push(...sp); }
    }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const baseQuery = `
      SELECT m.*, m.cantidad_anterior AS stock_anterior, p.nombre AS producto_nombre, p.codigo AS producto_codigo, p.unidad_medida
      FROM movimientos m
      JOIN productos p ON m.producto_id = p.id
      ${whereClause}
      ORDER BY m.fecha DESC, m.id DESC
    `;
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM movimientos m
      JOIN productos p ON m.producto_id = p.id
      ${whereClause}
    `;

    const result = await paginated(baseQuery, countQuery, params, page, limit);
    res.json(result);
  } catch (err) {
    console.error('getHistorial error:', err);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};

// GET /api/movimientos/entradas
const getEntradas = async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const params = ['entrada'];
    let where = ['m.tipo = ?', 'm.cancelado = 0'];

    if (search && search.trim()) {
      const { clause, params: sp } = buildSearch(search, ['p.nombre', 'p.codigo', 'm.proveedor']);
      if (clause) { where.push(clause); params.push(...sp); }
    }

    const whereClause = 'WHERE ' + where.join(' AND ');
  const baseQuery = `
  SELECT 
    m.id,
    m.producto_id,
    m.tipo,
    m.cantidad,
    m.cantidad_anterior,
    m.stock_resultante,
    m.proveedor,
    m.cliente,
    m.notas,
    m.usuario,
    m.cancelado,
    m.cancelado_en,
    DATE_FORMAT(m.fecha, '%Y-%m-%d %H:%i:%s') AS fecha,
    m.cantidad_anterior AS stock_anterior,
    p.nombre AS producto_nombre,
    p.codigo AS producto_codigo,
    p.unidad_medida
  FROM movimientos m
  JOIN productos p ON m.producto_id = p.id
  ${whereClause}
  ORDER BY m.fecha DESC, m.id DESC
`;
    const countQuery = `
      SELECT COUNT(*) AS total FROM movimientos m
      JOIN productos p ON m.producto_id = p.id
      ${whereClause}
    `;

    const result = await paginated(baseQuery, countQuery, params, page, limit);
    res.json(result);
  } catch (err) {
    console.error('getEntradas error:', err);
    res.status(500).json({ error: 'Error al obtener entradas' });
  }
};

// GET /api/movimientos/salidas
const getSalidas = async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const params = ['salida'];
    let where = ['m.tipo = ?', 'm.cancelado = 0'];

    if (search && search.trim()) {
      const { clause, params: sp } = buildSearch(search, ['p.nombre', 'p.codigo', 'm.cliente']);
      if (clause) { where.push(clause); params.push(...sp); }
    }

    const whereClause = 'WHERE ' + where.join(' AND ');
    const baseQuery = `
      SELECT m.*, m.cantidad_anterior AS stock_anterior, p.nombre AS producto_nombre, p.codigo AS producto_codigo, p.unidad_medida
      FROM movimientos m
      JOIN productos p ON m.producto_id = p.id
      ${whereClause}
      ORDER BY m.fecha DESC, m.id DESC
    `;
    const countQuery = `
      SELECT COUNT(*) AS total FROM movimientos m
      JOIN productos p ON m.producto_id = p.id
      ${whereClause}
    `;

    const result = await paginated(baseQuery, countQuery, params, page, limit);
    res.json(result);
  } catch (err) {
    console.error('getSalidas error:', err);
    res.status(500).json({ error: 'Error al obtener salidas' });
  }
};

// GET /api/movimientos/ajustes
const getAjustes = async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const params = ['ajuste'];
    let where = ['m.tipo = ?', 'm.cancelado = 0'];

    if (search && search.trim()) {
      const { clause, params: sp } = buildSearch(search, ['p.nombre', 'p.codigo']);
      if (clause) { where.push(clause); params.push(...sp); }
    }

    const whereClause = 'WHERE ' + where.join(' AND ');
    const baseQuery = `
      SELECT m.*, m.cantidad_anterior AS stock_anterior, p.nombre AS producto_nombre, p.codigo AS producto_codigo, p.unidad_medida
      FROM movimientos m
      JOIN productos p ON m.producto_id = p.id
      ${whereClause}
      ORDER BY m.fecha DESC, m.id DESC
    `;
    const countQuery = `
      SELECT COUNT(*) AS total FROM movimientos m
      JOIN productos p ON m.producto_id = p.id
      ${whereClause}
    `;

    const result = await paginated(baseQuery, countQuery, params, page, limit);
    res.json(result);
  } catch (err) {
    console.error('getAjustes error:', err);
    res.status(500).json({ error: 'Error al obtener ajustes' });
  }
};

// POST /api/movimientos/entrada
const createEntrada = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { producto_id, cantidad, proveedor, notas, fecha, usuario } = req.body;

    if (!producto_id) return res.status(400).json({ error: 'El producto es requerido' });
    const qty = parseInt(cantidad);
    if (!qty || qty <= 0) return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' });

    // Get current stock
    const [products] = await conn.query('SELECT id, stock_actual, nombre FROM productos WHERE id = ? AND activo = 1', [producto_id]);
    if (products.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });

    const stockAnterior = parseInt(products[0].stock_actual);
    const stockResultante = stockAnterior + qty;

    // Update stock
    await conn.query('UPDATE productos SET stock_actual = ? WHERE id = ?', [stockResultante, producto_id]);

    // Insert movement
    const [result] = await conn.query(
      `INSERT INTO movimientos (producto_id, tipo, cantidad, cantidad_anterior, stock_resultante, proveedor, notas, usuario, fecha)
       VALUES (?, 'entrada', ?, ?, ?, ?, ?, ?, ?)`,
   [
  producto_id,
  qty,
  stockAnterior,
  stockResultante,
  proveedor || null,
  notas || null,
  usuario || null,
fecha || nowHN()
]
    );

    await conn.commit();

    const [rows] = await pool.query(
      `SELECT m.*, p.nombre AS producto_nombre, p.codigo AS producto_codigo, p.unidad_medida
       FROM movimientos m JOIN productos p ON m.producto_id = p.id WHERE m.id = ?`,
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    await conn.rollback();
    console.error('createEntrada error:', err);
    res.status(500).json({ error: 'Error al registrar entrada' });
  } finally {
    conn.release();
  }
};

// POST /api/movimientos/salida
const createSalida = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { producto_id, cantidad, cliente, notas, fecha, usuario } = req.body;

    if (!producto_id) return res.status(400).json({ error: 'El producto es requerido' });
    const qty = parseInt(cantidad);
    if (!qty || qty <= 0) return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' });
    if (!cliente || !cliente.trim()) return res.status(400).json({ error: 'El cliente es requerido' });

    // Get current stock. Si el producto comparte stock con un base, descontar del base
    const [products] = await conn.query('SELECT id, stock_actual, nombre, producto_base_id FROM productos WHERE id = ? AND activo = 1', [producto_id]);
    if (products.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });

    const stockProductId = products[0].producto_base_id || products[0].id;
    const [baseProducts] = await conn.query('SELECT id, stock_actual FROM productos WHERE id = ? FOR UPDATE', [stockProductId]);
    if (baseProducts.length === 0) return res.status(404).json({ error: 'Producto base no encontrado' });

    const stockAnterior = parseInt(baseProducts[0].stock_actual);
    if (qty > stockAnterior) {
      await conn.rollback();
      return res.status(400).json({
        error: `Stock insuficiente. Stock actual: ${stockAnterior}. Cantidad solicitada: ${qty}`
      });
    }

    const stockResultante = stockAnterior - qty;

    // Update stock del producto correcto (base o propio)
    await conn.query('UPDATE productos SET stock_actual = ? WHERE id = ?', [stockResultante, stockProductId]);

    // Insert movement vinculado al producto cuyo stock se actualizó
    const [result] = await conn.query(
      `INSERT INTO movimientos (producto_id, tipo, cantidad, cantidad_anterior, stock_resultante, cliente, notas, usuario, fecha)
       VALUES (?, 'salida', ?, ?, ?, ?, ?, ?, ?)`,
      [stockProductId, qty, stockAnterior, stockResultante, cliente.trim(), notas || null, usuario || null, nowHN()]
    );

    await conn.commit();

    const [rows] = await pool.query(
      `SELECT m.*, p.nombre AS producto_nombre, p.codigo AS producto_codigo, p.unidad_medida
       FROM movimientos m JOIN productos p ON m.producto_id = p.id WHERE m.id = ?`,
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    await conn.rollback();
    console.error('createSalida error:', err);
    res.status(500).json({ error: 'Error al registrar salida' });
  } finally {
    conn.release();
  }
};

// POST /api/movimientos/ajuste
const createAjuste = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { producto_id, nueva_cantidad, notas, fecha, usuario } = req.body;

    if (!producto_id) return res.status(400).json({ error: 'El producto es requerido' });
    const newQty = parseInt(nueva_cantidad);
    if (newQty === undefined || newQty === null || isNaN(newQty) || newQty < 0) {
      return res.status(400).json({ error: 'La nueva cantidad debe ser mayor o igual a 0' });
    }
    if (!notas || !notas.trim()) return res.status(400).json({ error: 'Las notas son requeridas para ajustes' });

    // Obtener el producto y verificar si tiene producto_base_id (comparte stock con otro)
    const [products] = await conn.query('SELECT id, stock_actual, producto_base_id FROM productos WHERE id = ? AND activo = 1', [producto_id]);
    if (products.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });

    // Si el producto apunta a un base, el stock real está en el base (igual que cobrarVenta)
    const stockProductId = products[0].producto_base_id || products[0].id;

    // Leer stock con FOR UPDATE para evitar condiciones de carrera
    const [baseProducts] = await conn.query('SELECT id, stock_actual FROM productos WHERE id = ? FOR UPDATE', [stockProductId]);
    if (baseProducts.length === 0) return res.status(404).json({ error: 'Producto base no encontrado' });

    const stockAnterior = parseInt(baseProducts[0].stock_actual);
    const diferencia = Math.abs(newQty - stockAnterior);

    // Update stock to new absolute value sobre el producto correcto
    await conn.query('UPDATE productos SET stock_actual = ? WHERE id = ?', [newQty, stockProductId]);

    // Insert movement vinculado al producto cuyo stock se actualizó
    const [result] = await conn.query(
      `INSERT INTO movimientos (producto_id, tipo, cantidad, cantidad_anterior, stock_resultante, notas, usuario, fecha)
       VALUES (?, 'ajuste', ?, ?, ?, ?, ?, ?)`,
      [stockProductId, diferencia, stockAnterior, newQty, notas.trim(), usuario || null, fecha || nowHN()]
    );

    await conn.commit();

    const [rows] = await pool.query(
      `SELECT m.*, p.nombre AS producto_nombre, p.codigo AS producto_codigo, p.unidad_medida
       FROM movimientos m JOIN productos p ON m.producto_id = p.id WHERE m.id = ?`,
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    await conn.rollback();
    console.error('createAjuste error:', err);
    res.status(500).json({ error: 'Error al registrar ajuste' });
  } finally {
    conn.release();
  }
};

// GET /api/movimientos/danados
const getDanados = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const params = ['danado'];
    let where = ['m.tipo = ?', 'm.cancelado = 0'];

    if (search && search.trim()) {
      const { clause, params: sp } = buildSearch(search, ['p.nombre', 'p.codigo', 'm.notas']);
      if (clause) { where.push(clause); params.push(...sp); }
    }

    const whereClause = 'WHERE ' + where.join(' AND ');
    const baseQuery = `
      SELECT m.*, m.cantidad_anterior AS stock_anterior, p.nombre AS producto_nombre, p.codigo AS producto_codigo, p.unidad_medida
      FROM movimientos m
      JOIN productos p ON m.producto_id = p.id
      ${whereClause}
      ORDER BY m.fecha DESC, m.id DESC
    `;
    const countQuery = `
      SELECT COUNT(*) AS total FROM movimientos m
      JOIN productos p ON m.producto_id = p.id
      ${whereClause}
    `;

    const result = await paginated(baseQuery, countQuery, params, page, limit);
    res.json(result);
  } catch (err) {
    console.error('getDanados error:', err);
    res.status(500).json({ error: 'Error al obtener productos dañados' });
  }
};

// POST /api/movimientos/danado
const createDanado = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { producto_id, cantidad, notas, fecha, usuario } = req.body;

    if (!producto_id) return res.status(400).json({ error: 'El producto es requerido' });
    const qty = parseInt(cantidad);
    if (!qty || qty <= 0) return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' });
    if (!notas || !notas.trim()) return res.status(400).json({ error: 'El motivo del daño es requerido' });

    const [products] = await conn.query('SELECT id, stock_actual, producto_base_id FROM productos WHERE id = ? AND activo = 1', [producto_id]);
    if (products.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });

    const stockProductId = products[0].producto_base_id || products[0].id;
    const [baseProducts] = await conn.query('SELECT id, stock_actual FROM productos WHERE id = ? FOR UPDATE', [stockProductId]);
    if (baseProducts.length === 0) return res.status(404).json({ error: 'Producto base no encontrado' });

    const stockAnterior = parseInt(baseProducts[0].stock_actual);
    if (qty > stockAnterior) {
      await conn.rollback();
      return res.status(400).json({
        error: `Stock insuficiente. Stock actual: ${stockAnterior}. Cantidad dañada: ${qty}`
      });
    }

    const stockResultante = stockAnterior - qty;
    await conn.query('UPDATE productos SET stock_actual = ? WHERE id = ?', [stockResultante, stockProductId]);

    const [result] = await conn.query(
      `INSERT INTO movimientos (producto_id, tipo, cantidad, cantidad_anterior, stock_resultante, notas, usuario, fecha)
       VALUES (?, 'danado', ?, ?, ?, ?, ?, ?)`,
      [stockProductId, qty, stockAnterior, stockResultante, notas.trim(), usuario || null, nowHN()]
    );

    await conn.commit();

    const [rows] = await pool.query(
      `SELECT m.*, m.cantidad_anterior AS stock_anterior, p.nombre AS producto_nombre, p.codigo AS producto_codigo, p.unidad_medida
       FROM movimientos m JOIN productos p ON m.producto_id = p.id WHERE m.id = ?`,
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    await conn.rollback();
    console.error('createDanado error:', err);
    res.status(500).json({ error: 'Error al registrar producto dañado' });
  } finally {
    conn.release();
  }
};

// DELETE /api/movimientos/:id/cancelar
const cancelarMovimiento = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query('SELECT * FROM movimientos WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Movimiento no encontrado' });
    }

    const mov = rows[0];

    if (mov.cancelado) {
      await conn.rollback();
      return res.status(400).json({ error: 'Este movimiento ya fue cancelado' });
    }

    if (mov.venta_id) {
      await conn.rollback();
      return res.status(400).json({ error: 'Este movimiento pertenece a una venta. Para revertirlo, anule la venta correspondiente.' });
    }

    if (mov.apartado_id) {
      await conn.rollback();
      return res.status(400).json({ error: 'Este movimiento pertenece a un apartado. Para revertirlo, cancele el apartado correspondiente.' });
    }

    // Calcular el delta inverso según el tipo de movimiento
    let delta = 0;
    if (mov.tipo === 'salida' || mov.tipo === 'danado' || mov.tipo === 'dañado') {
      delta = parseInt(mov.cantidad); // salida/dañado restó, cancelar suma
    } else if (mov.tipo === 'entrada') {
      delta = -parseInt(mov.cantidad); // entrada sumó, cancelar resta
    } else if (mov.tipo === 'ajuste') {
      const stockRes = parseInt(mov.stock_resultante);
      const stockAnt = parseInt(mov.cantidad_anterior);
      if (isNaN(stockRes) || isNaN(stockAnt)) {
        await conn.rollback();
        return res.status(400).json({ error: 'Este ajuste no puede cancelarse porque no tiene datos de stock anteriores registrados' });
      }
      delta = -(stockRes - stockAnt); // revertir la diferencia del ajuste
    } else {
      await conn.rollback();
      return res.status(400).json({ error: 'Tipo de movimiento no reconocido' });
    }

    // Aplicar delta inverso al stock actual (no restaurar foto antigua).
    // Bloquear la fila y verificar que la reversión no deje el stock en negativo.
    const [curProd] = await conn.query('SELECT stock_actual FROM productos WHERE id = ? FOR UPDATE', [mov.producto_id]);
    if (curProd.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'El producto de este movimiento ya no existe' });
    }
    const stockNuevo = parseInt(curProd[0].stock_actual) + delta;
    if (stockNuevo < 0) {
      await conn.rollback();
      return res.status(400).json({
        error: `No se puede cancelar este ${mov.tipo}: dejaría el stock en ${stockNuevo}. ` +
               `Las unidades ya fueron vendidas o movidas. Registra un ajuste manual en su lugar.`
      });
    }
    await conn.query('UPDATE productos SET stock_actual = ? WHERE id = ?', [stockNuevo, mov.producto_id]);

    // Soft-delete: marcar como cancelado (no borrar)
    await conn.query('UPDATE movimientos SET cancelado = 1, cancelado_en = NOW() WHERE id = ?', [req.params.id]);

    await conn.commit();

    const ip = getClientIp(req);
    const usuario = req.body?.usuario || req.query?.usuario || null;
    await logAudit({ usuario, accion: 'canceló', modulo: 'Movimiento', detalle: `Canceló ${mov.tipo} ID ${mov.id} de producto ID ${mov.producto_id} (cantidad: ${mov.cantidad})`, ip });

    res.json({ message: 'Movimiento cancelado y stock restaurado correctamente' });
  } catch (err) {
    await conn.rollback();
    console.error('cancelarMovimiento error:', err);
    res.status(500).json({ error: 'Error al cancelar el movimiento' });
  } finally {
    conn.release();
  }
};

module.exports = { getHistorial, getEntradas, getSalidas, getAjustes, getDanados, createEntrada, createSalida, createAjuste, createDanado, cancelarMovimiento };
