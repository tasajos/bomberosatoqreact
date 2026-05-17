-- Script 04: Tabla reconocimientos
USE yunka_atoq;

CREATE TABLE IF NOT EXISTS reconocimientos (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  badge       VARCHAR(80)   NOT NULL,
  fecha       VARCHAR(60)   NOT NULL,
  institucion VARCHAR(300)  NOT NULL,
  titulo      VARCHAR(300)  NOT NULL,
  descripcion TEXT,
  texto_completo LONGTEXT,
  firmante    VARCHAR(300),
  icono       VARCHAR(10)   DEFAULT '🏅',
  img_url     VARCHAR(500),
  activo      TINYINT(1)    NOT NULL DEFAULT 1,
  orden       INT           NOT NULL DEFAULT 99,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
