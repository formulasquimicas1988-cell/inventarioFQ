-- =====================================================
-- Sistema de Inventario - Fórmulas Químicas
-- Schema MySQL
-- =====================================================

DROP TABLE IF EXISTS movimientos;
DROP TABLE IF EXISTS productos;
DROP TABLE IF EXISTS categorias;

-- =====================================================
-- TABLA: categorias
-- =====================================================
CREATE TABLE categorias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
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
  stock_actual DECIMAL(10,2) DEFAULT 0,
  stock_minimo DECIMAL(10,2) DEFAULT 0,
  unidad_medida VARCHAR(50) NOT NULL,
  activo TINYINT(1) DEFAULT 1,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL
);

-- =====================================================
-- TABLA: movimientos
-- =====================================================
CREATE TABLE movimientos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  producto_id INT NOT NULL,
  tipo ENUM('entrada','salida','ajuste','danado') NOT NULL,
  cantidad DECIMAL(10,2) NOT NULL,
  cantidad_anterior DECIMAL(10,2),
  stock_resultante DECIMAL(10,2),
  proveedor VARCHAR(200) NULL,
  cliente VARCHAR(200) NULL,
  notas TEXT,
  usuario VARCHAR(100) NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);
