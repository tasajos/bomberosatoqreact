import pool from '../db.js';
await pool.query(`ALTER TABLE operaciones ADD COLUMN IF NOT EXISTS clasificacion_ro ENUM(
  'voluntario_operativo','voluntario_cooperador','voluntario_asimilado','voluntario_fundador'
) DEFAULT 'voluntario_operativo' AFTER tipo`);
console.log('✅ Campo clasificacion_ro agregado a operaciones.');
process.exit(0);
