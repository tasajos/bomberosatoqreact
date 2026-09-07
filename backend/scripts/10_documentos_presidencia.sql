-- ============================================================
-- Yunka Atoq · Script 10: Resoluciones, Procedimientos y Protocolos
--
-- INSTRUCCIONES:
--   Replicar en producción con:
--   mysql -u <usuario> -p yunka_atoq < scripts/10_documentos_presidencia.sql
-- ============================================================

USE yunka_atoq;

CREATE TABLE IF NOT EXISTS documentos_presidencia (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  tipo            ENUM('resolucion','procedimiento','protocolo') NOT NULL,
  numero          INT NOT NULL,
  anio            INT NOT NULL,
  titulo          VARCHAR(200) NOT NULL,
  fecha           DATE NOT NULL,
  contenido       JSON NOT NULL,
  firmante_nombre VARCHAR(150),
  firmante_cargo  VARCHAR(100) DEFAULT 'PRESIDENTE',
  creado_por      INT,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_tipo_anio_numero (tipo, anio, numero),
  FOREIGN KEY (creado_por) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS documento_presidencia_voluntarios (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  documento_id  INT NOT NULL,
  voluntario_id INT NOT NULL,
  rol           VARCHAR(100),
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_doc_vol (documento_id, voluntario_id),
  FOREIGN KEY (documento_id)  REFERENCES documentos_presidencia(id) ON DELETE CASCADE,
  FOREIGN KEY (voluntario_id) REFERENCES users(id)                  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
