-- ============================================================
-- Fórmulas Químicas - Sistema de Inventario
-- Base de datos: formulasquimicas
-- Ejecutar en phpMyAdmin o MySQL CLI
-- ============================================================

CREATE DATABASE IF NOT EXISTS formulasquimicas
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE formulasquimicas;

-- ============================================================
-- TABLA: categorias
-- ============================================================
CREATE TABLE IF NOT EXISTS categorias (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: productos
-- ============================================================
CREATE TABLE IF NOT EXISTS productos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  codigo        VARCHAR(50) NOT NULL UNIQUE,
  nombre        VARCHAR(200) NOT NULL,
  categoria_id  INT,
  stock_actual  DECIMAL(10,2) DEFAULT 0,
  stock_minimo  DECIMAL(10,2) DEFAULT 0,
  unidad_medida VARCHAR(50) DEFAULT 'litro',
  activo        TINYINT(1) DEFAULT 1,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: movimientos
-- ============================================================
CREATE TABLE IF NOT EXISTS movimientos (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  producto_id       INT NOT NULL,
  tipo              ENUM('entrada','salida','ajuste','dañado') NOT NULL,
  cantidad          DECIMAL(10,2) NOT NULL,
  cantidad_anterior DECIMAL(10,2) DEFAULT 0,
  cliente           VARCHAR(200) DEFAULT NULL,
  proveedor         VARCHAR(200) DEFAULT NULL,
  motivo            TEXT,
  notas             TEXT,
  fecha             DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- DATOS DE PRUEBA: categorias
-- ============================================================
INSERT INTO categorias (nombre) VALUES
  ('Desengrasantes'),
  ('Desinfectantes'),
  ('Detergentes'),
  ('Blanqueadores'),
  ('Quitamanchas'),
  ('Ambientadores');

-- ============================================================
-- DATOS DE PRUEBA: productos (22 productos)
-- ============================================================
INSERT INTO productos (codigo, nombre, categoria_id, stock_actual, stock_minimo, unidad_medida) VALUES
  -- Desengrasantes (categoria_id = 1)
  ('DEG-001', 'Desengrasante Industrial Pro',          1, 45.00, 20.00, 'litro'),
  ('DEG-002', 'Desengrasante Multiusos Concentrado',   1,  8.00, 15.00, 'litro'),
  ('DEG-003', 'Desengrasante para Motores',            1, 22.00, 10.00, 'litro'),
  ('DEG-004', 'Desengrasante Biodegradable',           1, 30.00, 25.00, 'litro'),

  -- Desinfectantes (categoria_id = 2)
  ('DES-001', 'Desinfectante Bactericida Premium',     2, 60.00, 30.00, 'litro'),
  ('DES-002', 'Desinfectante para Pisos y Superficies',2,  5.00, 20.00, 'litro'),
  ('DES-003', 'Gel Antibacterial Industrial',          2, 40.00, 15.00, 'litro'),
  ('DES-004', 'Desinfectante para Cocinas',            2, 25.00, 20.00, 'litro'),
  ('DES-005', 'Desinfectante Clínico Concentrado',     2, 12.00, 10.00, 'litro'),

  -- Detergentes (categoria_id = 3)
  ('DET-001', 'Detergente en Polvo Industrial',        3, 80.00, 40.00, 'kg'),
  ('DET-002', 'Detergente Líquido Concentrado',        3, 35.00, 30.00, 'litro'),
  ('DET-003', 'Detergente para Lavaplatos',            3, 18.00, 25.00, 'litro'),
  ('DET-004', 'Detergente para Ropa Industrial',       3, 55.00, 20.00, 'kg'),

  -- Blanqueadores (categoria_id = 4)
  ('BLA-001', 'Blanqueador Concentrado',               4, 42.00, 20.00, 'litro'),
  ('BLA-002', 'Blanqueador Multiusos',                 4,  7.00, 15.00, 'litro'),
  ('BLA-003', 'Blanqueador para Textiles',             4, 28.00, 15.00, 'litro'),

  -- Quitamanchas (categoria_id = 5)
  ('QUI-001', 'Quitamanchas de Óxido',                5, 15.00, 10.00, 'litro'),
  ('QUI-002', 'Quitamanchas de Grasa Profesional',    5,  9.00, 12.00, 'litro'),
  ('QUI-003', 'Quitamanchas de Tintas y Colorantes',  5, 20.00,  8.00, 'litro'),

  -- Ambientadores (categoria_id = 6)
  ('AMB-001', 'Ambientador Floral Concentrado',       6, 33.00, 20.00, 'litro'),
  ('AMB-002', 'Ambientador Cítrico Industrial',       6,  4.00, 15.00, 'litro'),
  ('AMB-003', 'Ambientador Lavanda Premium',          6, 25.00, 10.00, 'litro');

-- ============================================================
-- DATOS DE PRUEBA: movimientos
-- (Aproximadamente 30 días de historial)
-- ============================================================
INSERT INTO movimientos (producto_id, tipo, cantidad, cantidad_anterior, cliente, proveedor, motivo, notas, fecha) VALUES
  -- Entradas del mes anterior
  (1,  'entrada', 30.00, 15.00, NULL, 'Distribuidora QuímicaMax', NULL, 'Pedido mensual programado', DATE_SUB(NOW(), INTERVAL 28 DAY)),
  (5,  'entrada', 50.00, 10.00, NULL, 'Insumos Industriales S.A.', NULL, 'Reposición de stock', DATE_SUB(NOW(), INTERVAL 26 DAY)),
  (10, 'entrada', 60.00, 20.00, NULL, 'QuímicosPro Distribuciones', NULL, 'Pedido especial por volumen', DATE_SUB(NOW(), INTERVAL 25 DAY)),
  (14, 'entrada', 30.00, 12.00, NULL, 'Blanqueadores del Norte', NULL, 'Stock regular', DATE_SUB(NOW(), INTERVAL 24 DAY)),
  (7,  'entrada', 25.00,  0.00, NULL, 'Insumos Industriales S.A.', NULL, 'Primera compra de gel antibacterial', DATE_SUB(NOW(), INTERVAL 23 DAY)),

  -- Salidas (semana 4)
  (1,  'salida',  8.00, 45.00, 'Hotel Gran Pasaje',       NULL, NULL, 'Pedido mensual del hotel', DATE_SUB(NOW(), INTERVAL 22 DAY)),
  (5,  'salida', 12.00, 60.00, 'Clínica Santa Rosa',      NULL, NULL, 'Suministro mensual de desinfectante', DATE_SUB(NOW(), INTERVAL 21 DAY)),
  (10, 'salida', 15.00, 80.00, 'Lavandería Industrial La Fe', NULL, NULL, 'Pedido semanal', DATE_SUB(NOW(), INTERVAL 20 DAY)),
  (7,  'salida',  5.00, 40.00, 'Restaurante El Fogón',    NULL, NULL, 'Provisión de gel para personal', DATE_SUB(NOW(), INTERVAL 20 DAY)),

  -- Salidas semana 3
  (3,  'salida',  6.00, 22.00, 'Taller Mecánico Hernández', NULL, NULL, 'Limpieza de taller mensual', DATE_SUB(NOW(), INTERVAL 18 DAY)),
  (14, 'salida',  8.00, 42.00, 'Hospital Regional Norte', NULL, NULL, 'Suministro quincenal', DATE_SUB(NOW(), INTERVAL 17 DAY)),
  (11, 'salida', 10.00, 35.00, 'Hotel Gran Pasaje',       NULL, NULL, 'Uso en lavandería del hotel', DATE_SUB(NOW(), INTERVAL 16 DAY)),
  (20, 'salida',  5.00, 33.00, 'Clínica Santa Rosa',      NULL, NULL, 'Ambientadores para clínica', DATE_SUB(NOW(), INTERVAL 15 DAY)),

  -- Entradas semana 3
  (2,  'entrada', 20.00,  0.00, NULL, 'Distribuidora QuímicaMax', NULL, 'Reposición urgente de stock crítico', DATE_SUB(NOW(), INTERVAL 14 DAY)),
  (6,  'entrada', 25.00,  0.00, NULL, 'Insumos Industriales S.A.', NULL, 'Reposición urgente', DATE_SUB(NOW(), INTERVAL 14 DAY)),
  (12, 'entrada', 30.00,  0.00, NULL, 'QuímicosPro Distribuciones', NULL, 'Reposición de stock bajo', DATE_SUB(NOW(), INTERVAL 13 DAY)),

  -- Salidas semana 2
  (1,  'salida',  5.00, 37.00, 'Supermercado Central',    NULL, NULL, 'Limpieza de instalaciones', DATE_SUB(NOW(), INTERVAL 12 DAY)),
  (5,  'salida',  8.00, 48.00, 'Escuela Técnica Municipal', NULL, NULL, 'Protocolo de sanitización', DATE_SUB(NOW(), INTERVAL 11 DAY)),
  (4,  'salida',  7.00, 30.00, 'Empresa Alimentaria BASA', NULL, NULL, 'Limpieza de líneas de producción', DATE_SUB(NOW(), INTERVAL 10 DAY)),
  (17, 'salida',  4.00, 15.00, 'Ferrería Industrial López', NULL, NULL, 'Limpieza de metales', DATE_SUB(NOW(), INTERVAL 9 DAY)),
  (13, 'salida',  5.00, 55.00, 'Hotel Gran Pasaje',       NULL, NULL, 'Lavandería hotel', DATE_SUB(NOW(), INTERVAL 8 DAY)),

  -- Ajustes de inventario
  (9,  'ajuste',  3.00, 15.00, NULL, NULL, 'Corrección por derrame accidental', 'Producto dañado durante manipulación', DATE_SUB(NOW(), INTERVAL 10 DAY)),
  (16, 'ajuste',  2.00, 30.00, NULL, NULL, 'Merma por vencimiento parcial', 'Lote antiguo dado de baja', DATE_SUB(NOW(), INTERVAL 7 DAY)),

  -- Entradas esta semana
  (19, 'entrada', 15.00,  5.00, NULL, 'Distribuidora QuímicaMax', NULL, 'Reposición de stock', DATE_SUB(NOW(), INTERVAL 5 DAY)),
  (21, 'entrada', 20.00,  0.00, NULL, 'Aromas & Cía.', NULL, 'Primer pedido del proveedor', DATE_SUB(NOW(), INTERVAL 4 DAY)),
  (8,  'entrada', 20.00,  5.00, NULL, 'Insumos Industriales S.A.', NULL, 'Reposición mensual', DATE_SUB(NOW(), INTERVAL 3 DAY)),

  -- Salidas recientes
  (5,  'salida',  6.00, 40.00, 'Centro Comercial Plaza Norte', NULL, NULL, 'Sanitización de local', DATE_SUB(NOW(), INTERVAL 3 DAY)),
  (10, 'salida', 12.00, 65.00, 'Lavandería Industrial La Fe',  NULL, NULL, 'Pedido semanal', DATE_SUB(NOW(), INTERVAL 2 DAY)),
  (1,  'salida',  3.00, 32.00, 'Taller Mecánico Hernández',    NULL, NULL, 'Limpieza de equipo', DATE_SUB(NOW(), INTERVAL 1 DAY)),
  (22, 'salida',  2.00, 25.00, 'Hotel Gran Pasaje',            NULL, NULL, 'Ambientadores habitaciones premium', DATE_SUB(NOW(), INTERVAL 1 DAY)),
  (7,  'salida',  4.00, 35.00, 'Hospital Regional Norte',      NULL, NULL, 'Suministro de gel antibacterial', NOW());
