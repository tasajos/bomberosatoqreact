-- ============================================================
-- Estado del personal (situación del voluntario)
-- Valores: activo | baja | pasiva | cooperador | comision
-- Independiente de users.activo (acceso al sistema).
-- Replicar en producción:
--   mysql -u <usuario> -p yunka_atoq < scripts/08_estado_personal.sql
-- ============================================================

USE yunka_atoq;

ALTER TABLE users
  ADD COLUMN estado_personal
  ENUM('activo','baja','pasiva','cooperador','comision') NOT NULL DEFAULT 'activo'
  AFTER activo;
