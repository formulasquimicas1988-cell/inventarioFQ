-- Migración: precio de costo en productos
-- Ejecutar una sola vez en Railway (o local)
-- Fecha: 2026-10-03

ALTER TABLE productos
  ADD COLUMN precio_costo DECIMAL(10,2) DEFAULT NULL
  AFTER unidad_medida;
