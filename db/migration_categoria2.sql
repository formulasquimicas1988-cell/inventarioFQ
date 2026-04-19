-- Migración: Segunda categoría en productos
-- Ejecutar una sola vez en Railway (o local)
-- Fecha: 2026-04-18

ALTER TABLE productos
  ADD COLUMN categoria_id_2 INT DEFAULT NULL,
  ADD CONSTRAINT fk_productos_categoria2 FOREIGN KEY (categoria_id_2) REFERENCES categorias(id) ON DELETE SET NULL;
