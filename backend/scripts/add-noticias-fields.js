import pool from '../db.js';

const alterations = [
  "ALTER TABLE noticias ADD COLUMN IF NOT EXISTS tipo ENUM('propia','externa') NOT NULL DEFAULT 'propia' AFTER publicado",
  "ALTER TABLE noticias ADD COLUMN IF NOT EXISTS fuente_nombre VARCHAR(200) DEFAULT '' AFTER tipo",
  "ALTER TABLE noticias ADD COLUMN IF NOT EXISTS fuente_url VARCHAR(500) DEFAULT '' AFTER fuente_nombre",
  "ALTER TABLE noticias ADD COLUMN IF NOT EXISTS categoria VARCHAR(80) NOT NULL DEFAULT 'General' AFTER fuente_url",
];

for (const sql of alterations) {
  try {
    await pool.query(sql);
    console.log('✅', sql.slice(0, 60));
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') console.log('ℹ️  Ya existe:', sql.slice(30, 60));
    else throw e;
  }
}

const [cols] = await pool.query("SHOW COLUMNS FROM noticias");
console.log('\nColumnas actuales:', cols.map(c => c.Field).join(', '));
process.exit(0);
