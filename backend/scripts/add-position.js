import pool from '../db.js';
try {
  await pool.query("ALTER TABLE slider_images ADD COLUMN position VARCHAR(30) NOT NULL DEFAULT 'center center' AFTER tag");
  console.log('✅ Columna position agregada');
} catch (e) {
  if (e.code === 'ER_DUP_FIELDNAME') console.log('ℹ️  Columna ya existe');
  else throw e;
}
process.exit(0);
