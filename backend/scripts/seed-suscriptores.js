import pool from '../db.js';

await pool.query(`CREATE TABLE IF NOT EXISTS suscriptores (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(200) NOT NULL UNIQUE,
  activo     TINYINT(1)   NOT NULL DEFAULT 1,
  fuente     VARCHAR(80)  NOT NULL DEFAULT 'noticias',
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

console.log('✅ Tabla suscriptores lista.');
process.exit(0);
