-- Cabecera editable de los documentos de presidencia (se guarda como JSON en configuracion).
-- Ejecutar: mysql -u <usuario> -p yunka_atoq < backend/scripts/15_cabecera_documentos.sql
USE yunka_atoq;

CREATE TABLE IF NOT EXISTS configuracion (
  clave  VARCHAR(100) PRIMARY KEY,
  valor  TEXT NOT NULL,
  label  VARCHAR(200)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
