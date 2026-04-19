-- Migración: agregar columna es_grupo a productos
-- Ejecutar una sola vez en la base de datos existente

ALTER TABLE productos
  ADD COLUMN es_grupo TINYINT(1) NOT NULL DEFAULT 0
  AFTER descripcion_editable;
