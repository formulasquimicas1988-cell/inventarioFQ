-- =====================================================
-- MIGRACIÓN: Prevención de ventas duplicadas
-- Agrega client_uid a ventas con índice UNIQUE.
-- El frontend genera un identificador único por cobro;
-- si el mismo cobro llega dos veces (doble clic, Enter
-- repetido o reintento tras timeout), la base de datos
-- rechaza el duplicado y el servidor devuelve la venta
-- ya registrada.
-- NO ES NECESARIO EJECUTARLA A MANO: el servidor la aplica
-- automáticamente al arrancar (ver server/index.js).
-- Este archivo queda solo como referencia.
-- =====================================================

ALTER TABLE ventas ADD COLUMN IF NOT EXISTS client_uid VARCHAR(36) DEFAULT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ventas_client_uid ON ventas (client_uid);

-- =====================================================
-- NOTA: IF NOT EXISTS en ALTER/CREATE INDEX requiere
-- MySQL 8+ / MariaDB. En MySQL 5.7, verificar manualmente
-- antes de correr.
-- =====================================================
