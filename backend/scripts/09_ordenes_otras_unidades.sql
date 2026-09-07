-- ============================================================
-- Órdenes de Operación: "Otras unidades empeñadas"
-- Guarda en JSON las unidades externas que apoyan la operación
-- (Ejército, Fuerza Aérea, Policía Boliviana, etc.) con su
-- cantidad, responsable y celular.
--
-- Replicar en producción:
--   mysql -u <usuario> -p yunka_atoq < scripts/09_ordenes_otras_unidades.sql
-- ============================================================

USE yunka_atoq;

ALTER TABLE ordenes_operacion
  ADD COLUMN otras_unidades TEXT NULL AFTER equipos_necesarios;
