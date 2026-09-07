-- ============================================================
-- Yunka Atoq · Script 11: Agrega el tipo "comunicado" a Documentos de Presidencia
--
-- INSTRUCCIONES:
--   mysql -u <usuario> -p yunka_atoq < scripts/11_documentos_comunicado.sql
-- ============================================================

USE yunka_atoq;

ALTER TABLE documentos_presidencia
  MODIFY COLUMN tipo ENUM('resolucion','procedimiento','protocolo','comunicado') NOT NULL;
