-- Agrega cartas a Documentos de Presidencia.
USE yunka_atoq;

ALTER TABLE documentos_presidencia
  MODIFY COLUMN tipo ENUM('resolucion','procedimiento','protocolo','comunicado','carta') NOT NULL;
