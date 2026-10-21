-- Convenios interinstitucionales como documento de presidencia (correlativo CONV N° 001/AAAA).
-- El backend también lo aplica al iniciar (routes/documentosPresidencia.js). Replicar en producción:
--   mysql -u <usuario> -p yunka_atoq < scripts/25_convenios.sql
ALTER TABLE documentos_presidencia
  MODIFY COLUMN tipo ENUM('resolucion','procedimiento','protocolo','comunicado','carta','convenio') NOT NULL;
