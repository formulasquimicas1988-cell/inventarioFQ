-- =====================================================
-- Sistema de Inventario + Caja — Fórmulas Químicas
-- Schema MySQL (instalación limpia)
-- =====================================================

DROP TABLE IF EXISTS detalle_ventas;
DROP TABLE IF EXISTS ventas;
DROP TABLE IF EXISTS movimientos;
DROP TABLE IF EXISTS productos;
DROP TABLE IF EXISTS categorias;
DROP TABLE IF EXISTS auditoria;
DROP TABLE IF EXISTS accesos;
DROP TABLE IF EXISTS usuarios;

-- =====================================================
-- TABLA: categorias
-- =====================================================
CREATE TABLE categorias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLA: usuarios
-- =====================================================
CREATE TABLE usuarios (
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
CREATE TABLE productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  categoria_id INT,
  stock_actual INT DEFAULT 0,
  stock_minimo INT DEFAULT 0,
  unidad_medida VARCHAR(50) NOT NULL,
  -- Precios para la caja (4 niveles)
  precio_a DECIMAL(10,2) DEFAULT NULL,
  precio_b DECIMAL(10,2) DEFAULT NULL,
  precio_c DECIMAL(10,2) DEFAULT NULL,
  precio_d DECIMAL(10,2) DEFAULT NULL,
  -- Flags para la caja
  favorito TINYINT(1) DEFAULT 0,
  sin_inventario TINYINT(1) DEFAULT 0,
  descripcion_editable TINYINT(1) DEFAULT 0,
  es_grupo TINYINT(1) DEFAULT 0,
  -- Alias: si este producto comparte stock con otro
  producto_base_id INT DEFAULT NULL,
  activo TINYINT(1) DEFAULT 1,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL,
  FOREIGN KEY (producto_base_id) REFERENCES productos(id) ON DELETE SET NULL
);

-- =====================================================
-- TABLA: ventas
-- =====================================================
CREATE TABLE ventas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  nombre_cliente VARCHAR(200) DEFAULT NULL,
  total DECIMAL(10,2) NOT NULL,
  metodo_pago VARCHAR(20) NOT NULL DEFAULT 'efectivo',
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
CREATE TABLE movimientos (
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
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
  FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE SET NULL
);

-- =====================================================
-- TABLA: detalle_ventas
-- =====================================================
CREATE TABLE detalle_ventas (
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
CREATE TABLE accesos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario VARCHAR(100) NOT NULL,
  ip VARCHAR(45),
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLA: auditoria (log de acciones)
-- =====================================================
CREATE TABLE auditoria (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario VARCHAR(100),
  accion VARCHAR(50) NOT NULL,
  modulo VARCHAR(50) NOT NULL,
  detalle TEXT,
  ip VARCHAR(45),
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
