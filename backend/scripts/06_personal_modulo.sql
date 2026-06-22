-- ============================================================
-- Módulo de Personal (vista presidencial / jefatura de personal)
-- Tablas: asistencia a instrucción, file documental y bitácora.
-- Replicar en producción ejecutando este script sobre la BD yunka_atoq.
--   mysql -u <usuario> -p yunka_atoq < scripts/06_personal_modulo.sql
-- ============================================================

USE yunka_atoq;

-- ── Asistencia a días de instrucción ──────────────────────────────
-- Estados: presente | falta | permiso | comision
-- Único por (voluntario, fecha): re-registrar el mismo día actualiza.
CREATE TABLE IF NOT EXISTS instruccion_asistencia (
  id             INT PRIMARY KEY AUTO_INCREMENT,
  voluntario_id  INT NOT NULL,
  fecha          DATE NOT NULL,
  estado         ENUM('presente','falta','permiso','comision') NOT NULL DEFAULT 'presente',
  observacion    TEXT,
  registrado_por INT,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_vol_fecha (voluntario_id, fecha),
  FOREIGN KEY (voluntario_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Bitácora de cambios por voluntario ────────────────────────────
-- accion: edicion | merito | demerito | asistencia | documento | grado
CREATE TABLE IF NOT EXISTS voluntario_log (
  id             INT PRIMARY KEY AUTO_INCREMENT,
  voluntario_id  INT NOT NULL,
  accion         VARCHAR(40) NOT NULL,
  detalle        TEXT,
  registrado_por INT,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (voluntario_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── File documental del voluntario ────────────────────────────────
-- Los archivos se guardan en backend/uploads/documentos/
-- categoria: identidad | certificado | medico | administrativo | formacion | otro
CREATE TABLE IF NOT EXISTS voluntario_documentos (
  id             INT PRIMARY KEY AUTO_INCREMENT,
  voluntario_id  INT NOT NULL,
  nombre         VARCHAR(200) NOT NULL,
  categoria      ENUM('identidad','certificado','medico','administrativo','formacion','otro') NOT NULL DEFAULT 'otro',
  descripcion    TEXT,
  archivo_url    VARCHAR(500) NOT NULL,
  mime           VARCHAR(120),
  tamano         INT,
  registrado_por INT,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (voluntario_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
