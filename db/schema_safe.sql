-- =====================================================
-- Sistema de Inventario + Caja — Fórmulas Químicas
-- Schema MySQL (migración segura — NO borra datos)
-- =====================================================

-- =====================================================
-- TABLA: categorias
-- =====================================================
CREATE TABLE IF NOT EXISTS categorias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLA: usuarios
-- =====================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol ENUM('admin','caja','almacen') NOT NULL DEFAULT 'almacen',
  activo TINYINT(1) DEFAULT 1,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLA: productos
-- =====================================================
CREATE TABLE IF NOT EXISTS productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  categoria_id INT,
  stock_actual INT DEFAULT 0,
  stock_minimo INT DEFAULT 0,
  unidad_medida VARCHAR(50) NOT NULL,
  precio_a DECIMAL(10,2) DEFAULT NULL,
  precio_b DECIMAL(10,2) DEFAULT NULL,
  precio_c DECIMAL(10,2) DEFAULT NULL,
  precio_d DECIMAL(10,2) DEFAULT NULL,
  favorito TINYINT(1) DEFAULT 0,
  sin_inventario TINYINT(1) DEFAULT 0,
  descripcion_editable TINYINT(1) DEFAULT 0,
  es_grupo TINYINT(1) DEFAULT 0,
  producto_base_id INT DEFAULT NULL,
  activo TINYINT(1) DEFAULT 1,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL,
  FOREIGN KEY (producto_base_id) REFERENCES productos(id) ON DELETE SET NULL
);

-- =====================================================
-- TABLA: ventas
-- =====================================================
CREATE TABLE IF NOT EXISTS ventas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero_ticket INT NOT NULL DEFAULT 1,
  usuario_id INT NOT NULL,
  nombre_cliente VARCHAR(200) DEFAULT NULL,
  total DECIMAL(10,2) NOT NULL,
  efectivo_recibido DECIMAL(10,2) DEFAULT NULL,
  cambio DECIMAL(10,2) DEFAULT NULL,
  anulada TINYINT(1) DEFAULT 0,
  motivo_anulacion TEXT DEFAULT NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- =====================================================
-- TABLA: movimientos
-- =====================================================
CREATE TABLE IF NOT EXISTS movimientos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  producto_id INT NOT NULL,
  tipo ENUM('entrada','salida','ajuste','danado') NOT NULL,
  cantidad INT NOT NULL,
  cantidad_anterior INT,
  stock_resultante INT,
  proveedor VARCHAR(200) NULL,
  cliente VARCHAR(200) NULL,
  notas TEXT,
  usuario VARCHAR(100) NULL,
  venta_id INT DEFAULT NULL,
  cancelado TINYINT(1) NOT NULL DEFAULT 0,
  cancelado_en DATETIME NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
  FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE SET NULL
);

-- =====================================================
-- TABLA: detalle_ventas
-- =====================================================
CREATE TABLE IF NOT EXISTS detalle_ventas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  venta_id INT NOT NULL,
  producto_id INT DEFAULT NULL,
  descripcion VARCHAR(255) NOT NULL,
  cantidad DECIMAL(10,2) NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  sin_inventario TINYINT(1) DEFAULT 0,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL
);

-- =====================================================
-- TABLA: accesos (log de logins)
-- =====================================================
CREATE TABLE IF NOT EXISTS accesos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario VARCHAR(100) NOT NULL,
  ip VARCHAR(45),
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLA: auditoria (log de acciones)
-- =====================================================
CREATE TABLE IF NOT EXISTS auditoria (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario VARCHAR(100),
  accion VARCHAR(50) NOT NULL,
  modulo VARCHAR(50) NOT NULL,
  detalle TEXT,
  ip VARCHAR(45),
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- COLUMNAS ADICIONALES
-- Nota: Si alguna columna ya existe, dará error
-- "Duplicate column name" — puedes ignorarlo,
-- significa que ya estaba y no se necesitaba agregar.
-- =====================================================
ALTER TABLE productos ADD COLUMN categoria_id_2 INT DEFAULT NULL;
ALTER TABLE productos ADD COLUMN es_grupo TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE productos ADD COLUMN precio_a DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE productos ADD COLUMN precio_b DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE productos ADD COLUMN precio_c DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE productos ADD COLUMN precio_d DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE productos ADD COLUMN favorito TINYINT(1) DEFAULT 0;
ALTER TABLE productos ADD COLUMN sin_inventario TINYINT(1) DEFAULT 0;
ALTER TABLE productos ADD COLUMN descripcion_editable TINYINT(1) DEFAULT 0;
ALTER TABLE productos ADD COLUMN producto_base_id INT DEFAULT NULL;
ALTER TABLE usuarios ADD COLUMN rol ENUM('admin','caja','almacen') NOT NULL DEFAULT 'almacen';
ALTER TABLE movimientos ADD COLUMN venta_id INT DEFAULT NULL;
ALTER TABLE movimientos ADD COLUMN cancelado TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE movimientos ADD COLUMN cancelado_en DATETIME NULL;
ALTER TABLE ventas ADD COLUMN numero_ticket INT NOT NULL DEFAULT 1;
