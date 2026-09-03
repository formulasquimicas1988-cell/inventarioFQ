const pool = require('../db');
const { logAudit, getClientIp } = require('../lib/audit');
const { nowHN } = require('../lib/timeUtils');

// GET /api/apartados
const getAll = async (req, res) => {
  try {
    const { search, fecha_inicio, fecha_fin, estado = 'all', page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const where = [];

    if (estado !== 'all') {
      where.push('a.estado = ?');
      params.push(estado);
    }
    if (fecha_inicio) {
      where.push('DATE(a.fecha) >= ?');
      params.push(fecha_inicio);
    }
    if (fecha_fin) {
      where.push('DATE(a.fecha) <= ?');
      params.push(fecha_fin);
    }
    if (search && search.trim()) {
      // Cada palabra debe aparecer en alguno de: #, cliente, teléfono, quien lo
      // creó, o dentro de los productos apartados (descripción o nombre real).
      const palabras = search.trim().split(/\s+/).filter(Boolean);
      for (const palabra of palabras) {
        const like = `%${palabra}%`;
        where.push(`(
          a.id LIKE ? OR a.nombre_cliente LIKE ? OR a.telefono LIKE ? OR u.nombre LIKE ?
          OR EXISTS (
            SELECT 1 FROM detalle_apartados da
            LEFT JOIN productos p ON da.producto_id = p.id
            WHERE da.apartado_id = a.id AND (da.descripcion LIKE ? OR p.nombre LIKE ?)
          )
        )`);
        params.push(like, like, like, like, like, like);
      }
    }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM apartados a JOIN usuarios u ON a.usuario_id = u.id ${whereClause}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT a.*, u.nombre AS creado_por
       FROM apartados a
       JOIN usuarios u ON a.usuario_id = u.id
       ${whereClause}
       ORDER BY (a.estado = 'activo') DESC, a.fecha DESC, a.id DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      data: rows,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)) || 1,
    });
  } catch (err) {
    console.error('apartados getAll error:', err);
    res.status(500).json({ error: 'Error al obtener apartados' });
  }
};

// GET /api/apartados/:id
const getById = async (req, res) => {
  try {
    const [apartados] = await pool.query(
      `SELECT a.*, u.nombre AS creado_por
       FROM apartados a
       JOIN usuarios u ON a.usuario_id = u.id
       WHERE a.id = ?`,
      [req.params.id]
    );
    if (apartados.length === 0) return res.status(404).json({ error: 'Apartado no encontrado' });

    const [detalles] = await pool.query(
      `SELECT da.*, p.nombre AS producto_nombre, p.codigo AS producto_codigo
       FROM detalle_apartados da
       LEFT JOIN productos p ON da.producto_id = p.id
       WHERE da.apartado_id = ?
       ORDER BY da.id ASC`,
      [req.params.id]
    );

    res.json({ ...apartados[0], detalles });
  } catch (err) {
    console.error('apartados getById error:', err);
    res.status(500).json({ error: 'Error al obtener apartado' });
  }
};

// POST /api/apartados — crear apartado (descuenta stock como 'apartado')
const crearApartado = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { usuario_id, usuario, nombre_cliente, telefono, notas, items, client_uid } = req.body;

    if (!usuario_id) {
      await conn.rollback();
      return res.status(400).json({ error: 'Se requiere usuario_id. Por favor cierra sesión y vuelve a entrar.' });
    }
    if (!nombre_cliente || !nombre_cliente.trim()) {
      await conn.rollback();
      return res.status(400).json({ error: 'El nombre del cliente es requerido para apartar' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      await conn.rollback();
      return res.status(400).json({ error: 'El apartado está vacío' });
    }

    // Total calculado en el servidor (no confiar en el frontend)
    const total = items.reduce((sum, item) => sum + parseFloat(item.subtotal || 0), 0);

    // Insertar apartado. client_uid con índice UNIQUE previene duplicados por
    // doble clic/Enter (mismo patrón que ventas).
    const apartadoValues = [usuario_id, nombre_cliente.trim(), telefono?.trim() || null, total, notas?.trim() || null, nowHN()];
    let apartadoResult;
    try {
      [apartadoResult] = await conn.query(
        `INSERT INTO apartados (usuario_id, nombre_cliente, telefono, total, notas, fecha, client_uid)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [...apartadoValues, client_uid || null]
      );
    } catch (insertErr) {
      if (insertErr.code === 'ER_DUP_ENTRY' && client_uid) {
        await conn.rollback();
        const [dups] = await pool.query('SELECT id, total FROM apartados WHERE client_uid = ?', [client_uid]);
        if (dups.length > 0) {
          return res.status(200).json({ id: dups[0].id, total: parseFloat(dups[0].total), duplicado: true });
        }
        return res.status(409).json({ error: 'Este apartado ya fue registrado' });
      }
      throw insertErr;
    }
    const apartadoId = apartadoResult.insertId;

    // Procesar cada item: guardar detalle y descontar stock
    for (const item of items) {
      const { producto_id, descripcion, cantidad, precio_unitario, subtotal, sin_inventario } = item;

      await conn.query(
        `INSERT INTO detalle_apartados (apartado_id, producto_id, descripcion, cantidad, precio_unitario, subtotal, sin_inventario)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          apartadoId,
          producto_id || null,
          descripcion || '',
          parseFloat(cantidad) || 0,
          parseFloat(precio_unitario) || 0,
          parseFloat(subtotal) || 0,
          sin_inventario ? 1 : 0,
        ]
      );

      // Descontar inventario si aplica (igual que cobrarVenta)
      if (producto_id && !sin_inventario) {
        const [prods] = await conn.query(
          'SELECT id, stock_actual, producto_base_id FROM productos WHERE id = ? AND activo = 1',
          [producto_id]
        );
        if (prods.length === 0) continue;

        const stockProductId = prods[0].producto_base_id || prods[0].id;
        const [baseProds] = await conn.query(
          'SELECT id, stock_actual FROM productos WHERE id = ? FOR UPDATE',
          [stockProductId]
        );
        if (baseProds.length === 0) continue;

        const qty = Math.round(parseFloat(cantidad) || 0);
        if (qty <= 0) continue;

        const stockAnterior = parseInt(baseProds[0].stock_actual);
        if (stockAnterior < qty) {
          await conn.rollback();
          return res.status(409).json({
            error: `Stock insuficiente para "${descripcion}": hay ${stockAnterior} en existencia pero se apartaron ${qty}. Recarga los productos e intenta de nuevo.`,
          });
        }

        const stockResultante = stockAnterior - qty;
        await conn.query('UPDATE productos SET stock_actual = ? WHERE id = ?', [stockResultante, stockProductId]);

        await conn.query(
          `INSERT INTO movimientos (producto_id, tipo, cantidad, cantidad_anterior, stock_resultante,
            cliente, notas, usuario, apartado_id, fecha)
           VALUES (?, 'apartado', ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            stockProductId,
            qty,
            stockAnterior,
            stockResultante,
            nombre_cliente.trim(),
            `Apartado #${apartadoId}`,
            usuario || null,
            apartadoId,
            nowHN(),
          ]
        );
      }
    }

    await conn.commit();

    const ip = getClientIp(req);
    await logAudit({
      usuario,
      accion: 'apartó',
      modulo: 'Apartado',
      detalle: `Apartado #${apartadoId} — L ${total.toFixed(2)} para ${nombre_cliente.trim()}`,
      ip,
    });

    res.status(201).json({ id: apartadoId, total });
  } catch (err) {
    await conn.rollback();
    console.error('crearApartado error:', err);
    res.status(500).json({ error: 'Error al registrar el apartado' });
  } finally {
    conn.release();
  }
};

// PUT /api/apartados/:id — editar un apartado activo (cantidades, precios,
// agregar/quitar productos, datos del cliente). Reconcilia el stock en una
// sola transacción: restaura lo reservado y vuelve a descontar según los items
// nuevos.
const actualizarApartado = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { id } = req.params;
    const { nombre_cliente, telefono, notas, items, usuario } = req.body;

    const [aps] = await conn.query('SELECT * FROM apartados WHERE id = ?', [id]);
    if (aps.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Apartado no encontrado' });
    }
    const apartado = aps[0];
    if (apartado.estado !== 'activo') {
      await conn.rollback();
      return res.status(400).json({ error: 'Solo se pueden editar apartados activos' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      await conn.rollback();
      return res.status(400).json({ error: 'El apartado debe tener al menos un producto' });
    }

    const nombreCliente = (nombre_cliente != null && nombre_cliente.trim())
      ? nombre_cliente.trim()
      : apartado.nombre_cliente;

    // 1) Restaurar el stock de los movimientos actuales del apartado y borrarlos
    const [movs] = await conn.query(
      'SELECT * FROM movimientos WHERE apartado_id = ? AND (cancelado = 0 OR cancelado IS NULL)',
      [id]
    );
    for (const mov of movs) {
      await conn.query(
        'UPDATE productos SET stock_actual = stock_actual + ? WHERE id = ?',
        [parseInt(mov.cantidad), mov.producto_id]
      );
      await conn.query('DELETE FROM movimientos WHERE id = ?', [mov.id]);
    }

    // 2) Borrar los detalles actuales
    await conn.query('DELETE FROM detalle_apartados WHERE apartado_id = ?', [id]);

    // 3) Reinsertar los items nuevos y volver a descontar stock
    const total = items.reduce((sum, item) => sum + parseFloat(item.subtotal || 0), 0);
    for (const item of items) {
      const { producto_id, descripcion, cantidad, precio_unitario, subtotal, sin_inventario } = item;

      await conn.query(
        `INSERT INTO detalle_apartados (apartado_id, producto_id, descripcion, cantidad, precio_unitario, subtotal, sin_inventario)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          producto_id || null,
          descripcion || '',
          parseFloat(cantidad) || 0,
          parseFloat(precio_unitario) || 0,
          parseFloat(subtotal) || 0,
          sin_inventario ? 1 : 0,
        ]
      );

      if (producto_id && !sin_inventario) {
        const [prods] = await conn.query(
          'SELECT id, stock_actual, producto_base_id FROM productos WHERE id = ? AND activo = 1',
          [producto_id]
        );
        if (prods.length === 0) continue;

        const stockProductId = prods[0].producto_base_id || prods[0].id;
        const [baseProds] = await conn.query(
          'SELECT id, stock_actual FROM productos WHERE id = ? FOR UPDATE',
          [stockProductId]
        );
        if (baseProds.length === 0) continue;

        const qty = Math.round(parseFloat(cantidad) || 0);
        if (qty <= 0) continue;

        const stockAnterior = parseInt(baseProds[0].stock_actual);
        if (stockAnterior < qty) {
          await conn.rollback();
          return res.status(409).json({
            error: `Stock insuficiente para "${descripcion}": hay ${stockAnterior} disponibles pero se necesitan ${qty}.`,
          });
        }

        const stockResultante = stockAnterior - qty;
        await conn.query('UPDATE productos SET stock_actual = ? WHERE id = ?', [stockResultante, stockProductId]);

        await conn.query(
          `INSERT INTO movimientos (producto_id, tipo, cantidad, cantidad_anterior, stock_resultante,
            cliente, notas, usuario, apartado_id, fecha)
           VALUES (?, 'apartado', ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            stockProductId, qty, stockAnterior, stockResultante,
            nombreCliente,
            `Apartado #${id} (editado)`,
            usuario || null,
            id,
            nowHN(),
          ]
        );
      }
    }

    // 4) Actualizar cabecera del apartado
    await conn.query(
      'UPDATE apartados SET nombre_cliente = ?, telefono = ?, notas = ?, total = ? WHERE id = ?',
      [
        nombreCliente,
        telefono !== undefined ? (telefono?.trim() || null) : apartado.telefono,
        notas !== undefined ? (notas?.trim() || null) : apartado.notas,
        total,
        id,
      ]
    );

    await conn.commit();

    const ip = getClientIp(req);
    await logAudit({
      usuario,
      accion: 'editó',
      modulo: 'Apartado',
      detalle: `Editó apartado #${id} — nuevo total L ${total.toFixed(2)}`,
      ip,
    });

    res.json({ message: 'Apartado actualizado correctamente', total });
  } catch (err) {
    await conn.rollback();
    console.error('actualizarApartado error:', err);
    res.status(500).json({ error: 'Error al actualizar el apartado' });
  } finally {
    conn.release();
  }
};

// PUT /api/apartados/:id/entregar — el cliente paga completo y se lleva la mercadería.
// El stock ya se descontó al apartar; aquí NO se vuelve a descontar: se genera la
// venta y se reconvierten los movimientos 'apartado' en 'salida' de esa venta.
const entregarApartado = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { id } = req.params;
    const { usuario_id, usuario, efectivo_recibido } = req.body;

    const [apartados] = await conn.query('SELECT * FROM apartados WHERE id = ?', [id]);
    if (apartados.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Apartado no encontrado' });
    }
    const apartado = apartados[0];
    if (apartado.estado === 'entregado') {
      await conn.rollback();
      return res.status(400).json({ error: 'Este apartado ya fue entregado' });
    }
    if (apartado.estado === 'cancelado') {
      await conn.rollback();
      return res.status(400).json({ error: 'Este apartado está cancelado' });
    }

    const [detalles] = await conn.query('SELECT * FROM detalle_apartados WHERE apartado_id = ?', [id]);
    if (detalles.length === 0) {
      await conn.rollback();
      return res.status(400).json({ error: 'El apartado no tiene productos' });
    }

    // Método de pago: solo valores conocidos, por defecto efectivo.
    const METODOS_PAGO = ['efectivo', 'transferencia', 'tarjeta', 'credito'];
    const metodoPago = METODOS_PAGO.includes(req.body.metodo_pago) ? req.body.metodo_pago : 'efectivo';
    const esEfectivo = metodoPago === 'efectivo';

    const ventaUsuarioId = usuario_id || apartado.usuario_id;
    const total = parseFloat(apartado.total);
    // Efectivo y cambio solo aplican cuando el pago es en efectivo.
    const efectivo = esEfectivo && efectivo_recibido != null && efectivo_recibido !== '' ? parseFloat(efectivo_recibido) : null;
    const cambio = efectivo != null ? Math.max(0, efectivo - total) : null;

    // Crear la venta (sin tocar stock: ya fue descontado al apartar)
    const [ventaResult] = await conn.query(
      `INSERT INTO ventas (usuario_id, nombre_cliente, total, efectivo_recibido, cambio, fecha)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [ventaUsuarioId, apartado.nombre_cliente, total, efectivo, cambio, nowHN()]
    );
    const ventaId = ventaResult.insertId;
    try {
      await conn.query('UPDATE ventas SET numero_ticket = ? WHERE id = ?', [ventaId, ventaId]);
    } catch (_) { /* columna aún no migrada */ }
    try {
      await conn.query('UPDATE ventas SET metodo_pago = ? WHERE id = ?', [metodoPago, ventaId]);
    } catch (_) { /* columna aún no migrada */ }

    // Copiar los items del apartado a la venta
    for (const d of detalles) {
      await conn.query(
        `INSERT INTO detalle_ventas (venta_id, producto_id, descripcion, cantidad, precio_unitario, subtotal, sin_inventario)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [ventaId, d.producto_id, d.descripcion, d.cantidad, d.precio_unitario, d.subtotal, d.sin_inventario]
      );
    }

    // Reconvertir los movimientos de apartado en salidas de esta venta (stock intacto)
    await conn.query(
      `UPDATE movimientos
       SET tipo = 'salida', venta_id = ?, notas = CONCAT(COALESCE(notas, ''), ' → entregado (Venta #', ?, ')')
       WHERE apartado_id = ? AND (cancelado = 0 OR cancelado IS NULL)`,
      [ventaId, ventaId, id]
    );

    // Cerrar el apartado
    await conn.query(
      'UPDATE apartados SET estado = ?, venta_id = ?, fecha_entrega = ? WHERE id = ?',
      ['entregado', ventaId, nowHN(), id]
    );

    await conn.commit();

    const ip = getClientIp(req);
    await logAudit({
      usuario,
      accion: 'entregó',
      modulo: 'Apartado',
      detalle: `Entregó apartado #${id} — Venta #${ventaId} — L ${total.toFixed(2)}`,
      ip,
    });

    res.json({
      message: 'Apartado entregado y venta registrada',
      venta_id: ventaId,
      numero_ticket: ventaId,
      total,
      efectivo,
      cambio,
    });
  } catch (err) {
    await conn.rollback();
    console.error('entregarApartado error:', err);
    res.status(500).json({ error: 'Error al entregar el apartado' });
  } finally {
    conn.release();
  }
};

// PUT /api/apartados/:id/cancelar — libera la reserva y restaura el stock
const cancelarApartado = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { id } = req.params;
    const { usuario, motivo } = req.body;

    const [apartados] = await conn.query('SELECT * FROM apartados WHERE id = ?', [id]);
    if (apartados.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Apartado no encontrado' });
    }
    const apartado = apartados[0];
    if (apartado.estado === 'entregado') {
      await conn.rollback();
      return res.status(400).json({ error: 'Este apartado ya fue entregado. Para revertirlo, anule la venta correspondiente.' });
    }
    if (apartado.estado === 'cancelado') {
      await conn.rollback();
      return res.status(400).json({ error: 'Este apartado ya está cancelado' });
    }

    // Restaurar stock de cada movimiento del apartado y marcarlo cancelado
    const [movs] = await conn.query(
      'SELECT * FROM movimientos WHERE apartado_id = ? AND (cancelado = 0 OR cancelado IS NULL)',
      [id]
    );
    for (const mov of movs) {
      await conn.query(
        'UPDATE productos SET stock_actual = stock_actual + ? WHERE id = ?',
        [parseInt(mov.cantidad), mov.producto_id]
      );
      await conn.query('UPDATE movimientos SET cancelado = 1, cancelado_en = NOW() WHERE id = ?', [mov.id]);
    }

    await conn.query(
      'UPDATE apartados SET estado = ?, motivo_cancelacion = ?, fecha_cancelacion = ? WHERE id = ?',
      ['cancelado', motivo?.trim() || null, nowHN(), id]
    );

    await conn.commit();

    const ip = getClientIp(req);
    await logAudit({
      usuario,
      accion: 'canceló',
      modulo: 'Apartado',
      detalle: `Canceló apartado #${id}${motivo ? `: ${motivo}` : ''} — stock restaurado`,
      ip,
    });

    res.json({ message: 'Apartado cancelado y stock restaurado correctamente' });
  } catch (err) {
    await conn.rollback();
    console.error('cancelarApartado error:', err);
    res.status(500).json({ error: 'Error al cancelar el apartado' });
  } finally {
    conn.release();
  }
};

module.exports = { getAll, getById, crearApartado, actualizarApartado, entregarApartado, cancelarApartado };
