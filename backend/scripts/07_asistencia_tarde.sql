-- ============================================================
-- Agrega el estado 'tarde' a la asistencia de instrucción.
-- Replicar en producción:
--   mysql -u <usuario> -p yunka_atoq < scripts/07_asistencia_tarde.sql
-- ============================================================

USE yunka_atoq;

ALTER TABLE instruccion_asistencia
  MODIFY COLUMN estado
  ENUM('presente','tarde','falta','permiso','comision') NOT NULL DEFAULT 'presente';
