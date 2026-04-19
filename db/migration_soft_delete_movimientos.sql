-- Migración: Soft-delete en movimientos
-- Ejecutar en Railway (o local) una sola vez
-- Fecha: 2026-04-17

ALTER TABLE movimientos
  ADD COLUMN cancelado TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN cancelado_en DATETIME NULL;
