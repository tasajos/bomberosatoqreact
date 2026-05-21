import pool from '../db.js';

// ── Operaciones ──────────────────────────────────────────────────
await pool.query(`CREATE TABLE IF NOT EXISTS operaciones (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  tipo            ENUM('local','nacional','internacional') NOT NULL DEFAULT 'local',
  titulo          VARCHAR(200) NOT NULL,
  descripcion     TEXT,
  lugar           VARCHAR(200),
  fecha           DATETIME NOT NULL,
  duracion_horas  DECIMAL(5,2) DEFAULT 0,
  voluntario_id   INT,
  registrado_por  INT,
  validado_por    INT,
  estado          ENUM('pendiente','validado','rechazado') NOT NULL DEFAULT 'pendiente',
  puntos_asignados INT NOT NULL DEFAULT 0,
  observacion_validacion TEXT,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (voluntario_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (registrado_por) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (validado_por) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

// ── Libro de guardia ─────────────────────────────────────────────
await pool.query(`CREATE TABLE IF NOT EXISTS guardias (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  fecha           DATE NOT NULL,
  turno           ENUM('diurno','nocturno','24h') NOT NULL DEFAULT 'diurno',
  voluntario_id   INT NOT NULL,
  rol_guardia     VARCHAR(100) DEFAULT '',
  novedades       TEXT,
  operativos_count INT NOT NULL DEFAULT 0,
  registrado_por  INT,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (voluntario_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (registrado_por) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

// ── Puntos por operación ─────────────────────────────────────────
await pool.query(`CREATE TABLE IF NOT EXISTS puntos_voluntario (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  voluntario_id   INT NOT NULL,
  puntos          INT NOT NULL DEFAULT 0,
  concepto        VARCHAR(300) NOT NULL,
  operacion_id    INT,
  asignado_por    INT,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (voluntario_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (operacion_id) REFERENCES operaciones(id) ON DELETE SET NULL,
  FOREIGN KEY (asignado_por) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

// ── Méritos y antigüedad ─────────────────────────────────────────
await pool.query(`CREATE TABLE IF NOT EXISTS meritos (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  voluntario_id   INT NOT NULL,
  tipo            ENUM('merito','demerito','antiguedad') NOT NULL DEFAULT 'merito',
  titulo          VARCHAR(200) NOT NULL,
  descripcion     TEXT,
  puntos_extra    INT NOT NULL DEFAULT 0,
  fecha           DATE NOT NULL,
  registrado_por  INT,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (voluntario_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (registrado_por) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

// ── Campo total_puntos en users ──────────────────────────────────
try {
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS total_puntos INT NOT NULL DEFAULT 0 AFTER cargo_directiva`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS antiguedad_anios DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER total_puntos`);
  console.log('✅ Columnas total_puntos y antiguedad_anios agregadas a users');
} catch(e) {
  if(e.code === 'ER_DUP_FIELDNAME') console.log('ℹ️  Ya existen');
  else throw e;
}

console.log('✅ Tablas operativas creadas: operaciones, guardias, puntos_voluntario, meritos');
process.exit(0);
