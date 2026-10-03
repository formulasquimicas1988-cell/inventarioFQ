const pool = require('../db');
const XLSX = require('xlsx');
const { logAudit, getClientIp } = require('../lib/audit');
const { buildSearch } = require('../lib/search');

// El precio de costo es información confidencial: solo el admin lo ve y lo edita.
// authMiddleware deja el usuario del token en req.user = { id, nombre, rol }.
const esAdmin = (req) => req.user?.rol === 'admin';

// Quita precio_costo de las filas que se devuelven a un usuario no admin
const ocultarCosto = (req, rows) => {
  if (esAdmin(req)) return rows;
  for (const row of rows) delete row.precio_costo;
  return rows;
};

// GET /api/productos
const getAll = async (req, res) => {
  try {
    const { search, categoria_id, activo = '1', page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    let where = [];

    // activo filter
    if (activo !== 'all') {
      where.push('p.activo = ?');
      params.push(parseInt(activo));
    }

    // search filter (varias palabras, cualquier orden)
    if (search && search.trim()) {
      const { clause, params: sp } = buildSearch(search, ['p.codigo', 'p.nombre', 'c.nombre', 'c2.nombre']);
      if (clause) { where.push(clause); params.push(...sp); }
    }

    // categoria filter (busca en categoria_id o categoria_id_2)
    if (categoria_id && categoria_id !== 'all') {
      where.push('(p.categoria_id = ? OR p.categoria_id_2 = ?)');
      params.push(parseInt(categoria_id), parseInt(categoria_id));
    }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM productos p
       LEFT JOIN categorias c ON p.categoria_id = c.id
       LEFT JOIN categorias c2 ON p.categoria_id_2 = c2.id
       ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT p.*, c.nombre AS categoria_nombre, c2.nombre AS categoria_nombre_2
       FROM productos p
       LEFT JOIN categorias c ON p.categoria_id = c.id
       LEFT JOIN categorias c2 ON p.categoria_id_2 = c2.id
       ${whereClause}
       ORDER BY p.nombre ASC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const totalPages = Math.ceil(total / parseInt(limit)) || 1;
    res.json({ data: ocultarCosto(req, rows), total, page: parseInt(page), limit: parseInt(limit), totalPages });
  } catch (err) {
    console.error('getAll productos error:', err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
};

// GET /api/productos/:id
const getById = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, c.nombre AS categoria_nombre, c2.nombre AS categoria_nombre_2
       FROM productos p
       LEFT JOIN categorias c ON p.categoria_id = c.id
       LEFT JOIN categorias c2 ON p.categoria_id_2 = c2.id
       WHERE p.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(ocultarCosto(req, rows)[0]);
  } catch (err) {
    console.error('getById producto error:', err);
    res.status(500).json({ error: 'Error al obtener producto' });
  }
};

// POST /api/productos
const create = async (req, res) => {
  try {
    const { codigo, nombre, categoria_id, categoria_id_2, stock_actual, stock_minimo, unidad_medida,
            precio_costo, precio_a, precio_b, precio_c, precio_d,
            favorito, sin_inventario, descripcion_editable, es_grupo, producto_base_id } = req.body;

    if (!codigo || !codigo.trim()) return res.status(400).json({ error: 'El código es requerido' });
    if (!nombre || !nombre.trim()) return res.status(400).json({ error: 'El nombre es requerido' });
    if (!unidad_medida || !unidad_medida.trim()) return res.status(400).json({ error: 'La unidad de medida es requerida' });

    // Check duplicate codigo
    const [existing] = await pool.query('SELECT id FROM productos WHERE codigo = ?', [codigo.trim()]);
    if (existing.length > 0) {
      return res.status(400).json({ error: `Ya existe un producto con el código ${codigo.trim()}` });
    }

    const [result] = await pool.query(
      `INSERT INTO productos (codigo, nombre, categoria_id, categoria_id_2, stock_actual, stock_minimo, unidad_medida,
        precio_costo, precio_a, precio_b, precio_c, precio_d,
        favorito, sin_inventario, descripcion_editable, es_grupo, producto_base_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        codigo.trim(),
        nombre.trim(),
        categoria_id || null,
        categoria_id_2 || null,
        parseInt(stock_actual) || 0,
        parseInt(stock_minimo) || 0,
        unidad_medida.trim(),
        esAdmin(req) && precio_costo != null && precio_costo !== '' ? parseFloat(precio_costo) : null,
        precio_a != null && precio_a !== '' ? parseFloat(precio_a) : null,
        precio_b != null && precio_b !== '' ? parseFloat(precio_b) : null,
        precio_c != null && precio_c !== '' ? parseFloat(precio_c) : null,
        precio_d != null && precio_d !== '' ? parseFloat(precio_d) : null,
        favorito ? 1 : 0,
        sin_inventario ? 1 : 0,
        descripcion_editable ? 1 : 0,
        es_grupo ? 1 : 0,
        producto_base_id || null,
      ]
    );

    const productoId = result.insertId;
    const stockInicial = parseInt(stock_actual) || 0;
    const { usuario } = req.body;
    const ip = getClientIp(req);
    const { nowHN } = require('../lib/timeUtils');
    
   await pool.query(
  `INSERT INTO movimientos (producto_id, tipo, cantidad, cantidad_anterior, stock_resultante, notas, usuario, fecha)
   VALUES (?, 'entrada', ?, 0, ?, 'Stock inicial', ?, ?)`,
  [productoId, stockInicial, stockInicial, usuario || null, nowHN()]
);

    await logAudit({ usuario, accion: 'creó', modulo: 'Producto', detalle: `Creó producto "${nombre.trim()}" (${codigo.trim()}) con stock inicial ${stockInicial}`, ip });

    const [rows] = await pool.query(
      `SELECT p.*, c.nombre AS categoria_nombre, c2.nombre AS categoria_nombre_2
       FROM productos p
       LEFT JOIN categorias c ON p.categoria_id = c.id
       LEFT JOIN categorias c2 ON p.categoria_id_2 = c2.id
       WHERE p.id = ?`,
      [productoId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('create producto error:', err);
    res.status(500).json({ error: 'Error al crear producto' });
  }
};

// PUT /api/productos/:id
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo, nombre, categoria_id, categoria_id_2, stock_minimo, unidad_medida,
            precio_costo, precio_a, precio_b, precio_c, precio_d,
            favorito, sin_inventario, descripcion_editable, es_grupo, producto_base_id } = req.body;

    if (!codigo || !codigo.trim()) return res.status(400).json({ error: 'El código es requerido' });
    if (!nombre || !nombre.trim()) return res.status(400).json({ error: 'El nombre es requerido' });
    if (!unidad_medida || !unidad_medida.trim()) return res.status(400).json({ error: 'La unidad de medida es requerida' });

    // Check duplicate codigo excluding self
    const [existing] = await pool.query('SELECT id FROM productos WHERE codigo = ? AND id != ?', [codigo.trim(), id]);
    if (existing.length > 0) {
      return res.status(400).json({ error: `Ya existe otro producto con el código ${codigo.trim()}` });
    }

    // El precio de costo solo lo cambia el admin, y solo si lo envía: así los
    // formularios que no lo incluyen (ej. editar precios desde la caja) no lo borran
    const editaCosto = esAdmin(req) && Object.prototype.hasOwnProperty.call(req.body, 'precio_costo');

    // NOTE: stock_actual is NOT updated here — only via movements
    const [result] = await pool.query(
      `UPDATE productos SET codigo = ?, nombre = ?, categoria_id = ?, categoria_id_2 = ?, stock_minimo = ?, unidad_medida = ?,
        ${editaCosto ? 'precio_costo = ?,' : ''}
        precio_a = ?, precio_b = ?, precio_c = ?, precio_d = ?,
        favorito = ?, sin_inventario = ?, descripcion_editable = ?, es_grupo = ?, producto_base_id = ?
       WHERE id = ?`,
      [
        codigo.trim(),
        nombre.trim(),
        categoria_id || null,
        categoria_id_2 || null,
        parseInt(stock_minimo) || 0,
        unidad_medida.trim(),
        ...(editaCosto ? [precio_costo != null && precio_costo !== '' ? parseFloat(precio_costo) : null] : []),
        precio_a != null && precio_a !== '' ? parseFloat(precio_a) : null,
        precio_b != null && precio_b !== '' ? parseFloat(precio_b) : null,
        precio_c != null && precio_c !== '' ? parseFloat(precio_c) : null,
        precio_d != null && precio_d !== '' ? parseFloat(precio_d) : null,
        favorito ? 1 : 0,
        sin_inventario ? 1 : 0,
        descripcion_editable ? 1 : 0,
        es_grupo ? 1 : 0,
        producto_base_id || null,
        id
      ]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Producto no encontrado' });

    const ip = getClientIp(req);
    const { usuario } = req.body;
    await logAudit({ usuario, accion: 'editó', modulo: 'Producto', detalle: `Editó producto "${nombre.trim()}" (${codigo.trim()})`, ip });

    const [rows] = await pool.query(
      `SELECT p.*, c.nombre AS categoria_nombre, c2.nombre AS categoria_nombre_2
       FROM productos p
       LEFT JOIN categorias c ON p.categoria_id = c.id
       LEFT JOIN categorias c2 ON p.categoria_id_2 = c2.id
       WHERE p.id = ?`,
      [id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('update producto error:', err);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
};

// DELETE /api/productos/:id (soft delete)
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('UPDATE productos SET activo = 0 WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Producto no encontrado' });

    const ip = getClientIp(req);
    const usuario = req.body?.usuario || req.query?.usuario || null;
    await logAudit({ usuario, accion: 'eliminó', modulo: 'Producto', detalle: `Desactivó producto ID ${id}`, ip });

    res.json({ message: 'Producto desactivado correctamente' });
  } catch (err) {
    console.error('remove producto error:', err);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
};

// POST /api/productos/importar/excel
const importarExcel = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!data.length) return res.status(400).json({ error: 'El archivo Excel está vacío' });

    const puedeImportarCosto = esAdmin(req);

    let insertados = 0;
    let actualizados = 0;
    const errores = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2;

      // Support Spanish and English column names
      const codigo = (row['codigo'] || row['Codigo'] || row['CODIGO'] || row['code'] || '').toString().trim();
      const nombre = (row['nombre'] || row['Nombre'] || row['NOMBRE'] || row['name'] || '').toString().trim();
      const categoriaName = (row['categoria'] || row['Categoria'] || row['CATEGORIA'] || row['category'] || '').toString().trim();
      const stockActual = parseInt(row['stock_actual'] || row['Stock Actual'] || row['stock actual'] || row['stock'] || 0) || 0;
      const stockMinimo = parseInt(row['stock_minimo'] || row['Stock Minimo'] || row['stock minimo'] || row['min_stock'] || 0) || 0;
      const unidad = (row['unidad_medida'] || row['Unidad'] || row['UNIDAD'] || row['unit'] || '').toString().trim();
      // La columna de costo del Excel solo se toma en cuenta si importa un admin
      const costoRaw = puedeImportarCosto
        ? (row['precio_costo'] || row['Precio Costo'] || row['precio costo'] || row['costo'] || row['Costo'] || row['cost'] || '').toString().trim()
        : '';
      const precioCosto = costoRaw !== '' && !isNaN(parseFloat(costoRaw)) ? parseFloat(costoRaw) : null;
      if (!codigo) { errores.push(`Fila ${rowNum}: código vacío`); continue; }
      if (!nombre) { errores.push(`Fila ${rowNum}: nombre vacío`); continue; }
      if (!unidad) { errores.push(`Fila ${rowNum}: unidad de medida vacía`); continue; }

      // Find or skip categoria
      let categoriaId = null;
      if (categoriaName) {
        const [cats] = await pool.query('SELECT id FROM categorias WHERE nombre = ?', [categoriaName]);
        if (cats.length > 0) categoriaId = cats[0].id;
      }

      try {
        const [existing] = await pool.query('SELECT id FROM productos WHERE codigo = ?', [codigo]);
        if (existing.length > 0) {
          // El costo solo se actualiza si la fila del Excel lo trae
          await pool.query(
            `UPDATE productos SET nombre = ?, categoria_id = ?, stock_minimo = ?, unidad_medida = ?,
             ${precioCosto != null ? 'precio_costo = ?,' : ''} activo = 1
             WHERE codigo = ?`,
            precioCosto != null
              ? [nombre, categoriaId, stockMinimo, unidad, precioCosto, codigo]
              : [nombre, categoriaId, stockMinimo, unidad, codigo]
          );
          actualizados++;
        } else {
          await pool.query(
            `INSERT INTO productos (codigo, nombre, categoria_id, stock_actual, stock_minimo, unidad_medida, precio_costo)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [codigo, nombre, categoriaId, stockActual, stockMinimo, unidad, precioCosto]
          );
          insertados++;
        }
      } catch (rowErr) {
        errores.push(`Fila ${rowNum} (${codigo}): ${rowErr.message}`);
      }
    }

    res.json({
      message: `Importación completada: ${insertados} insertados, ${actualizados} actualizados`,
      insertados,
      actualizados,
      errores
    });
  } catch (err) {
    console.error('importarExcel error:', err);
    res.status(500).json({ error: 'Error al procesar el archivo Excel' });
  }
};

module.exports = { getAll, getById, create, update, remove, importarExcel };
