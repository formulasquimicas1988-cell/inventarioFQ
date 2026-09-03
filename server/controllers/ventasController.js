const pool = require('../db');
const { logAudit, getClientIp } = require('../lib/audit');
const { nowHN } = require('../lib/timeUtils');
const { buildSearch } = require('../lib/search');

// GET /api/ventas
const getAll = async (req, res) => {
  try {
    const { search, fecha_inicio, fecha_fin, anuladas = 'all', page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const where = [];

    if (anuladas !== 'all') {
      where.push('v.anulada = ?');
      params.push(parseInt(anuladas));
    }
    if (fecha_inicio) {
      where.push('DATE(v.fecha) >= ?');
      params.push(fecha_inicio);
    }
    if (fecha_fin) {
      where.push('DATE(v.fecha) <= ?');
      params.push(fecha_fin);
    }
    if (search && search.trim()) {
      const { clause, params: sp } = buildSearch(search, ['v.id', 'v.nombre_cliente', 'u.nombre']);
      if (clause) { where.push(clause); params.push(...sp); }
    }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM ventas v JOIN usuarios u ON v.usuario_id = u.id ${whereClause}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT v.*, u.nombre AS vendedor
       FROM ventas v
       JOIN usuarios u ON v.usuario_id = u.id
       ${whereClause}
       ORDER BY v.fecha DESC, v.id DESC
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
    console.error('ventas getAll error:', err);
    res.status(500).json({ error: 'Error al obtener ventas' });
  }
};

// GET /api/ventas/:id
const getById = async (req, res) => {
  try {
    const [ventas] = await pool.query(
      `SELECT v.*, u.nombre AS vendedor
       FROM ventas v
       JOIN usuarios u ON v.usuario_id = u.id
       WHERE v.id = ?`,
      [req.params.id]
    );
    if (ventas.length === 0) return res.status(404).json({ error: 'Venta no encontrada' });

    const [detalles] = await pool.query(
      `SELECT dv.*, p.nombre AS producto_nombre, p.codigo AS producto_codigo
       FROM detalle_ventas dv
       LEFT JOIN productos p ON dv.producto_id = p.id
       WHERE dv.venta_id = ?
       ORDER BY dv.id ASC`,
      [req.params.id]
    );

    res.json({ ...ventas[0], detalles });
  } catch (err) {
    console.error('ventas getById error:', err);
    res.status(500).json({ error: 'Error al obtener venta' });
  }
};

// POST /api/ventas — cobrar venta completa
const cobrarVenta = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { usuario_id, usuario, nombre_cliente, efectivo_recibido, items, client_uid } = req.body;

    if (!usuario_id) {
      await conn.rollback();
      return res.status(400).json({ error: 'Se requiere usuario_id. Por favor cierra sesión y vuelve a entrar.' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      await conn.rollback();
      return res.status(400).json({ error: 'El carrito está vacío' });
    }

    // Método de pago: solo se aceptan valores conocidos, por defecto efectivo.
    const METODOS_PAGO = ['efectivo', 'transferencia', 'tarjeta', 'credito'];
    const metodoPago = METODOS_PAGO.includes(req.body.metodo_pago) ? req.body.metodo_pago : 'efectivo';
    const esEfectivo = metodoPago === 'efectivo';

    // Calcular total desde los items (no confiar en el frontend)
    const total = items.reduce((sum, item) => sum + parseFloat(item.subtotal || 0), 0);
    // Efectivo y cambio solo aplican cuando el pago es en efectivo.
    const efectivo = esEfectivo && efectivo_recibido ? parseFloat(efectivo_recibido) : null;
    const cambio = efectivo != null ? Math.max(0, efectivo - total) : null;

    // Insertar venta — numero_ticket se sincroniza con el id (AUTO_INCREMENT) después del insert.
    // client_uid tiene índice UNIQUE: si el mismo cobro llega dos veces (doble clic,
    // Enter repetido o reintento tras timeout), la segunda inserción falla y se
    // devuelve la venta ya registrada en lugar de duplicarla.
    const ventaValues = [usuario_id, nombre_cliente?.trim() || null, total, efectivo, cambio, nowHN()];
    let ventaResult;
    try {
      [ventaResult] = await conn.query(
        `INSERT INTO ventas (usuario_id, nombre_cliente, total, efectivo_recibido, cambio, fecha, client_uid)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [...ventaValues, client_uid || null]
      );
    } catch (insertErr) {
      if (insertErr.code === 'ER_DUP_ENTRY' && client_uid) {
        await conn.rollback();
        const [dups] = await pool.query(
          'SELECT id, numero_ticket, total, cambio FROM ventas WHERE client_uid = ?',
          [client_uid]
        );
        if (dups.length > 0) {
          const d = dups[0];
          return res.status(200).json({
            id: d.id,
            numero_ticket: d.numero_ticket || d.id,
            total: parseFloat(d.total),
            cambio: d.cambio != null ? parseFloat(d.cambio) : null,
            duplicada: true,
          });
        }
        return res.status(409).json({ error: 'Esta venta ya fue registrada' });
      }
      if (insertErr.code === 'ER_BAD_FIELD_ERROR') {
        // columna client_uid aún no migrada
        [ventaResult] = await conn.query(
          `INSERT INTO ventas (usuario_id, nombre_cliente, total, efectivo_recibido, cambio, fecha)
           VALUES (?, ?, ?, ?, ?, ?)`,
          ventaValues
        );
      } else {
        throw insertErr;
      }
    }
    const ventaId = ventaResult.insertId;
    let numeroTicket = ventaId;
    try {
      await conn.query('UPDATE ventas SET numero_ticket = ? WHERE id = ?', [ventaId, ventaId]);
    } catch (_) { /* columna aún no migrada */ }
    try {
      await conn.query('UPDATE ventas SET metodo_pago = ? WHERE id = ?', [metodoPago, ventaId]);
    } catch (_) { /* columna aún no migrada */ }

    // Procesar cada item
    for (const item of items) {
      const { producto_id, descripcion, cantidad, precio_unitario, subtotal, sin_inventario } = item;

      // Insertar detalle
      await conn.query(
        `INSERT INTO detalle_ventas (venta_id, producto_id, descripcion, cantidad, precio_unitario, subtotal, sin_inventario)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          ventaId,
          producto_id || null,
          descripcion || '',
          parseFloat(cantidad) || 0,
          parseFloat(precio_unitario) || 0,
          parseFloat(subtotal) || 0,
          sin_inventario ? 1 : 0,
        ]
      );

      // Descontar inventario si aplica
      if (producto_id && !sin_inventario) {
        const [prods] = await conn.query(
          'SELECT id, stock_actual, producto_base_id FROM productos WHERE id = ? AND activo = 1',
          [producto_id]
        );
        if (prods.length === 0) continue; // producto eliminado, saltar

        const prod = prods[0];
        // Si tiene base, descontar del producto base
        const stockProductId = prod.producto_base_id || prod.id;

        // Bloquear la fila para evitar race condition entre 2 computadoras
        const [baseProds] = await conn.query(
          'SELECT id, stock_actual FROM productos WHERE id = ? FOR UPDATE',
          [stockProductId]
        );
        if (baseProds.length === 0) continue;

        const qty = Math.round(parseFloat(cantidad) || 0);
        if (qty <= 0) continue;

        const stockAnterior = parseInt(baseProds[0].stock_actual);

        // Validar stock suficiente
        if (stockAnterior < qty) {
          await conn.rollback();
          return res.status(409).json({
            error: `Stock insuficiente para "${descripcion}": hay ${stockAnterior} en existencia pero se pidieron ${qty}. Recarga los productos e intenta de nuevo.`,
          });
        }

        const stockResultante = stockAnterior - qty;

        await conn.query(
          'UPDATE productos SET stock_actual = ? WHERE id = ?',
          [stockResultante, stockProductId]
        );

        await conn.query(
          `INSERT INTO movimientos (producto_id, tipo, cantidad, cantidad_anterior, stock_resultante,
            cliente, notas, usuario, venta_id, fecha)
           VALUES (?, 'salida', ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            stockProductId,
            qty,
            stockAnterior,
            stockResultante,
            nombre_cliente?.trim() || 'Venta directa',
            `Venta #${ventaId}`,
            usuario || null,
            ventaId,
            nowHN(),
          ]
        );
      }
    }

    await conn.commit();

    const ip = getClientIp(req);
    await logAudit({
      usuario,
      accion: 'cobró',
      modulo: 'Venta',
      detalle: `Venta #${ventaId} — L ${total.toFixed(2)}${nombre_cliente ? ` a ${nombre_cliente}` : ''}`,
      ip,
    });

    res.status(201).json({ id: ventaId, numero_ticket: numeroTicket ?? ventaId, total, cambio });
  } catch (err) {
    await conn.rollback();
    console.error('cobrarVenta error:', err);
    res.status(500).json({ error: 'Error al procesar la venta' });
  } finally {
    conn.release();
  }
};

// PUT /api/ventas/:id/anular — solo admin
const anularVenta = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { id } = req.params;
    const { usuario, motivo } = req.body;

    const [ventas] = await conn.query('SELECT * FROM ventas WHERE id = ?', [id]);
    if (ventas.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Venta no encontrada' });
    }
    if (ventas[0].anulada) {
      await conn.rollback();
      return res.status(400).json({ error: 'La venta ya está anulada' });
    }

    // Revertir movimientos de inventario generados por esta venta (solo los no cancelados)
    const [movs] = await conn.query(
      'SELECT * FROM movimientos WHERE venta_id = ? AND (cancelado = 0 OR cancelado IS NULL)',
      [id]
    );

    for (const mov of movs) {
      // Las ventas generan movimientos tipo 'salida', revertir suma cantidad de vuelta
      let delta = 0;
      if (mov.tipo === 'salida' || mov.tipo === 'danado' || mov.tipo === 'dañado') {
        delta = parseInt(mov.cantidad);
      } else if (mov.tipo === 'entrada') {
        delta = -parseInt(mov.cantidad);
      } else if (mov.tipo === 'ajuste') {
        delta = -(parseInt(mov.stock_resultante) - parseInt(mov.cantidad_anterior));
      }
      await conn.query(
        'UPDATE productos SET stock_actual = GREATEST(stock_actual + ?, 0) WHERE id = ?',
        [delta, mov.producto_id]
      );
      await conn.query('DELETE FROM movimientos WHERE id = ?', [mov.id]);
    }

    // Eliminar también los movimientos ya cancelados vinculados a esta venta (limpieza)
    await conn.query('DELETE FROM movimientos WHERE venta_id = ? AND cancelado = 1', [id]);

    await conn.query(
      'UPDATE ventas SET anulada = 1, motivo_anulacion = ? WHERE id = ?',
      [motivo?.trim() || null, id]
    );

    await conn.commit();

    const ip = getClientIp(req);
    await logAudit({
      usuario,
      accion: 'anuló',
      modulo: 'Venta',
      detalle: `Anuló venta #${id}${motivo ? `: ${motivo}` : ''}`,
      ip,
    });

    res.json({ message: 'Venta anulada y stock restaurado correctamente' });
  } catch (err) {
    await conn.rollback();
    console.error('anularVenta error:', err);
    res.status(500).json({ error: 'Error al anular la venta' });
  } finally {
    conn.release();
  }
};

// PUT /api/ventas/:id/detalle/:detalleId — solo admin
const editarDetalle = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { id, detalleId } = req.params;
    const { nuevo_producto_id, nueva_descripcion, nuevo_precio, nueva_cantidad, usuario } = req.body;

    // Validar venta activa
    const [ventas] = await conn.query('SELECT * FROM ventas WHERE id = ? AND anulada = 0', [id]);
    if (ventas.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Venta no encontrada o ya anulada' });
    }

    // Obtener detalle original
    const [detalles] = await conn.query(
      'SELECT * FROM detalle_ventas WHERE id = ? AND venta_id = ?',
      [detalleId, id]
    );
    if (detalles.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Detalle no encontrado' });
    }
    const detalle = detalles[0];

    // --- Revertir movimiento del producto VIEJO ---
    if (detalle.producto_id && !detalle.sin_inventario) {
      // Obtener base del producto viejo
      const [oldProds] = await conn.query(
        'SELECT id, producto_base_id FROM productos WHERE id = ?',
        [detalle.producto_id]
      );
      if (oldProds.length > 0) {
        const oldBaseId = oldProds[0].producto_base_id || oldProds[0].id;
        // Buscar el movimiento de esta venta para ese producto base
        const [oldMovs] = await conn.query(
          'SELECT * FROM movimientos WHERE venta_id = ? AND producto_id = ? AND (cancelado = 0 OR cancelado IS NULL) ORDER BY id DESC LIMIT 1',
          [id, oldBaseId]
        );
        if (oldMovs.length > 0) {
          const mov = oldMovs[0];
          await conn.query(
            'UPDATE productos SET stock_actual = stock_actual + ? WHERE id = ?',
            [parseInt(mov.cantidad), oldBaseId]
          );
          await conn.query('DELETE FROM movimientos WHERE id = ?', [mov.id]);
        }
      }
    }

    // --- Actualizar el detalle ---
    const nuevaCant = nueva_cantidad != null ? parseFloat(nueva_cantidad) : parseFloat(detalle.cantidad);
    const nuevoPrecio = nuevo_precio != null ? parseFloat(nuevo_precio) : parseFloat(detalle.precio_unitario);
    const nuevoSubtotal = nuevaCant * nuevoPrecio;
    const efectivoProdId = nuevo_producto_id != null ? (nuevo_producto_id || null) : detalle.producto_id;
    const nuevaDesc = nueva_descripcion != null ? nueva_descripcion : detalle.descripcion;

    await conn.query(
      `UPDATE detalle_ventas SET producto_id = ?, descripcion = ?, cantidad = ?, precio_unitario = ?, subtotal = ?
       WHERE id = ?`,
      [efectivoProdId, nuevaDesc, nuevaCant, nuevoPrecio, nuevoSubtotal, detalleId]
    );

    // --- Crear movimiento para el producto NUEVO ---
    if (efectivoProdId && !detalle.sin_inventario) {
      const [newProds] = await conn.query(
        'SELECT id, stock_actual, producto_base_id FROM productos WHERE id = ? AND activo = 1',
        [efectivoProdId]
      );
      if (newProds.length > 0) {
        const newBaseId = newProds[0].producto_base_id || newProds[0].id;
        const [newBase] = await conn.query('SELECT id, stock_actual FROM productos WHERE id = ?', [newBaseId]);
        if (newBase.length > 0) {
          const qty = Math.round(nuevaCant);
          const stockAnterior = parseInt(newBase[0].stock_actual);
          if (stockAnterior < qty) {
            await conn.rollback();
            return res.status(409).json({
              error: `Stock insuficiente: hay ${stockAnterior} en existencia pero se necesitan ${qty}.`,
            });
          }
          const stockResultante = stockAnterior - qty;
          await conn.query('UPDATE productos SET stock_actual = ? WHERE id = ?', [stockResultante, newBaseId]);
          await conn.query(
            `INSERT INTO movimientos (producto_id, tipo, cantidad, cantidad_anterior, stock_resultante,
              cliente, notas, usuario, venta_id, fecha)
             VALUES (?, 'salida', ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              newBaseId, qty, stockAnterior, stockResultante,
              ventas[0].nombre_cliente || 'Venta directa',
              `Venta #${id} (editado)`,
              usuario || null,
              id,
              nowHN(),
            ]
          );
        }
      }
    }

    // Recalcular total de la venta
    const [allDetalles] = await conn.query(
      'SELECT subtotal FROM detalle_ventas WHERE venta_id = ?',
      [id]
    );
    const newTotal = allDetalles.reduce((sum, d) => sum + parseFloat(d.subtotal), 0);
    await conn.query('UPDATE ventas SET total = ? WHERE id = ?', [newTotal, id]);

    await conn.commit();

    const ip = getClientIp(req);
    await logAudit({
      usuario,
      accion: 'editó',
      modulo: 'Venta',
      detalle: `Editó detalle #${detalleId} de venta #${id}`,
      ip,
    });

    res.json({ message: 'Detalle actualizado correctamente', total: newTotal });
  } catch (err) {
    await conn.rollback();
    console.error('editarDetalle error:', err);
    res.status(500).json({ error: 'Error al editar el detalle' });
  } finally {
    conn.release();
  }
};

// POST /api/ventas/:id/detalle — solo admin
const agregarDetalle = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { id } = req.params;
    const { producto_id, descripcion, cantidad, precio_unitario, sin_inventario, usuario } = req.body;

    const [ventas] = await conn.query('SELECT * FROM ventas WHERE id = ? AND anulada = 0', [id]);
    if (ventas.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Venta no encontrada o ya anulada' });
    }

    if (!descripcion?.trim() || !(parseFloat(cantidad) > 0) || !(parseFloat(precio_unitario) >= 0)) {
      await conn.rollback();
      return res.status(400).json({ error: 'Descripción, cantidad y precio son requeridos' });
    }

    const cant = parseFloat(cantidad);
    const precio = parseFloat(precio_unitario);
    const subtotal = cant * precio;
    const esInventario = !sin_inventario && producto_id;

    await conn.query(
      `INSERT INTO detalle_ventas (venta_id, producto_id, descripcion, cantidad, precio_unitario, subtotal, sin_inventario)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, producto_id || null, descripcion.trim(), cant, precio, subtotal, sin_inventario ? 1 : 0]
    );

    if (esInventario) {
      const [prods] = await conn.query(
        'SELECT id, stock_actual, producto_base_id FROM productos WHERE id = ? AND activo = 1',
        [producto_id]
      );
      if (prods.length > 0) {
        const baseId = prods[0].producto_base_id || prods[0].id;
        const [base] = await conn.query('SELECT id, stock_actual FROM productos WHERE id = ? FOR UPDATE', [baseId]);
        if (base.length > 0) {
          const qty = Math.round(cant);
          const stockAnterior = parseInt(base[0].stock_actual);
          if (stockAnterior < qty) {
            await conn.rollback();
            return res.status(409).json({
              error: `Stock insuficiente para "${descripcion}": hay ${stockAnterior} pero se necesitan ${qty}.`,
            });
          }
          const stockResultante = stockAnterior - qty;
          await conn.query('UPDATE productos SET stock_actual = ? WHERE id = ?', [stockResultante, baseId]);
          await conn.query(
            `INSERT INTO movimientos (producto_id, tipo, cantidad, cantidad_anterior, stock_resultante,
              cliente, notas, usuario, venta_id, fecha)
             VALUES (?, 'salida', ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              baseId, qty, stockAnterior, stockResultante,
              ventas[0].nombre_cliente || 'Venta directa',
              `Venta #${id} (agregado)`,
              usuario || null,
              id,
              nowHN(),
            ]
          );
        }
      }
    }

    const [allDetalles] = await conn.query('SELECT subtotal FROM detalle_ventas WHERE venta_id = ?', [id]);
    const newTotal = allDetalles.reduce((sum, d) => sum + parseFloat(d.subtotal), 0);
    await conn.query('UPDATE ventas SET total = ? WHERE id = ?', [newTotal, id]);

    await conn.commit();

    const ip = getClientIp(req);
    await logAudit({
      usuario,
      accion: 'agregó',
      modulo: 'Venta',
      detalle: `Agregó "${descripcion}" a venta #${id}`,
      ip,
    });

    res.status(201).json({ message: 'Producto agregado correctamente', total: newTotal });
  } catch (err) {
    await conn.rollback();
    console.error('agregarDetalle error:', err);
    res.status(500).json({ error: 'Error al agregar el producto' });
  } finally {
    conn.release();
  }
};

// DELETE /api/ventas/:id/detalle/:detalleId — solo admin
const eliminarDetalle = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { id, detalleId } = req.params;
    const { usuario } = req.body;

    const [ventas] = await conn.query('SELECT * FROM ventas WHERE id = ? AND anulada = 0', [id]);
    if (ventas.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Venta no encontrada o ya anulada' });
    }

    const [detalles] = await conn.query(
      'SELECT * FROM detalle_ventas WHERE id = ? AND venta_id = ?',
      [detalleId, id]
    );
    if (detalles.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Detalle no encontrado' });
    }
    const detalle = detalles[0];

    if (detalle.producto_id && !detalle.sin_inventario) {
      const [prods] = await conn.query(
        'SELECT id, producto_base_id FROM productos WHERE id = ?',
        [detalle.producto_id]
      );
      if (prods.length > 0) {
        const baseId = prods[0].producto_base_id || prods[0].id;
        const [movs] = await conn.query(
          'SELECT * FROM movimientos WHERE venta_id = ? AND producto_id = ? AND (cancelado = 0 OR cancelado IS NULL) ORDER BY id DESC LIMIT 1',
          [id, baseId]
        );
        if (movs.length > 0) {
          await conn.query(
            'UPDATE productos SET stock_actual = stock_actual + ? WHERE id = ?',
            [parseInt(movs[0].cantidad), baseId]
          );
          await conn.query('DELETE FROM movimientos WHERE id = ?', [movs[0].id]);
        }
      }
    }

    await conn.query('DELETE FROM detalle_ventas WHERE id = ?', [detalleId]);

    const [allDetalles] = await conn.query('SELECT subtotal FROM detalle_ventas WHERE venta_id = ?', [id]);
    const newTotal = allDetalles.reduce((sum, d) => sum + parseFloat(d.subtotal), 0);
    await conn.query('UPDATE ventas SET total = ? WHERE id = ?', [newTotal, id]);

    await conn.commit();

    const ip = getClientIp(req);
    await logAudit({
      usuario,
      accion: 'eliminó',
      modulo: 'Venta',
      detalle: `Eliminó detalle #${detalleId} ("${detalle.descripcion}") de venta #${id}`,
      ip,
    });

    res.json({ message: 'Producto eliminado correctamente', total: newTotal });
  } catch (err) {
    await conn.rollback();
    console.error('eliminarDetalle error:', err);
    res.status(500).json({ error: 'Error al eliminar el producto' });
  } finally {
    conn.release();
  }
};

// PUT /api/ventas/:id/metodo-pago — cambiar cómo se pagó una venta ya registrada
// (p. ej. un crédito que el cliente vuelve a pagar). No crea otro módulo: solo
// actualiza la etiqueta del método en la venta.
const actualizarMetodoPago = async (req, res) => {
  try {
    const { id } = req.params;
    const METODOS_PAGO = ['efectivo', 'transferencia', 'tarjeta', 'credito'];
    if (!METODOS_PAGO.includes(req.body.metodo_pago)) {
      return res.status(400).json({ error: 'Método de pago no válido' });
    }
    const metodoPago = req.body.metodo_pago;

    const [ventas] = await pool.query('SELECT id, anulada, metodo_pago, total FROM ventas WHERE id = ?', [id]);
    if (ventas.length === 0) return res.status(404).json({ error: 'Venta no encontrada' });
    if (ventas[0].anulada) return res.status(400).json({ error: 'No se puede cambiar el método de una venta anulada' });

    const anterior = ventas[0].metodo_pago || 'efectivo';

    // El efectivo/cambio solo tiene sentido si el pago quedó en efectivo. Si mandan
    // el efectivo recibido, se guarda y se calcula el cambio a devolver.
    if (metodoPago === 'efectivo') {
      const total = parseFloat(ventas[0].total || 0);
      const efectivo = req.body.efectivo_recibido != null && req.body.efectivo_recibido !== ''
        ? parseFloat(req.body.efectivo_recibido)
        : null;
      const cambio = efectivo != null ? Math.max(0, efectivo - total) : null;
      await pool.query('UPDATE ventas SET metodo_pago = ?, efectivo_recibido = ?, cambio = ? WHERE id = ?', [metodoPago, efectivo, cambio, id]);
    } else {
      await pool.query('UPDATE ventas SET metodo_pago = ?, efectivo_recibido = NULL, cambio = NULL WHERE id = ?', [metodoPago, id]);
    }

    const ip = getClientIp(req);
    await logAudit({
      usuario: req.body?.usuario || null,
      accion: 'cambió método de pago',
      modulo: 'Venta',
      detalle: `Venta #${id}: ${anterior} → ${metodoPago}`,
      ip,
    });

    res.json({ message: 'Método de pago actualizado', metodo_pago: metodoPago });
  } catch (err) {
    console.error('actualizarMetodoPago error:', err);
    res.status(500).json({ error: 'Error al actualizar el método de pago' });
  }
};

module.exports = { getAll, getById, cobrarVenta, anularVenta, editarDetalle, agregarDetalle, eliminarDetalle, actualizarMetodoPago };
