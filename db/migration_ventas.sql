-- =====================================================
-- MIGRACIÓN: Módulo Caja/Ventas
-- Ejecutar sobre base de datos existente (no borra datos)
-- =====================================================

-- 1. Agregar rol a usuarios
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS rol ENUM('admin','caja','almacen') NOT NULL DEFAULT 'almacen';

-- 2. Agregar campos de caja a productos
ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_a DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_b DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_c DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_d DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS favorito TINYINT(1) DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS sin_inventario TINYINT(1) DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS descripcion_editable TINYINT(1) DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS producto_base_id INT DEFAULT NULL;

-- FK para producto_base_id (solo si no existe)
ALTER TABLE productos ADD CONSTRAINT fk_producto_base
  FOREIGN KEY (producto_base_id) REFERENCES productos(id) ON DELETE SET NULL;

-- 3. Crear tabla ventas
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

-- Si la tabla ya existía, agregar la columna
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS numero_ticket INT NOT NULL DEFAULT 1;

-- 4. Agregar venta_id a movimientos
ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS venta_id INT DEFAULT NULL;
ALTER TABLE movimientos ADD CONSTRAINT fk_movimiento_venta
  FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE SET NULL;

-- 5. Crear tabla detalle_ventas
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
-- NOTA: ADD COLUMN IF NOT EXISTS requiere MySQL 8+.
-- En MySQL 5.7, verificar manualmente antes de correr.
-- =====================================================
