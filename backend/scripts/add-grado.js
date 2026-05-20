import pool from '../db.js';

const cols = [
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS grado VARCHAR(60) DEFAULT '' AFTER tipo_sangre`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS cargo_directiva VARCHAR(80) DEFAULT '' AFTER grado`,
];

for (const sql of cols) {
  try { await pool.query(sql); console.log('✅', sql.slice(30,70)); }
  catch(e) { if(e.code==='ER_DUP_FIELDNAME') console.log('ℹ️ Ya existe'); else throw e; }
}
process.exit(0);
