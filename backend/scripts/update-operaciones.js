import pool from '../db.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const cols = [
  `ALTER TABLE operaciones ADD COLUMN IF NOT EXISTS oficial_responsable_id INT AFTER voluntario_id`,
  `ALTER TABLE operaciones ADD COLUMN IF NOT EXISTS personal_participante JSON AFTER oficial_responsable_id`,
  `ALTER TABLE operaciones ADD COLUMN IF NOT EXISTS imagen_respaldo VARCHAR(500) DEFAULT '' AFTER personal_participante`,
];

for (const sql of cols) {
  try { await pool.query(sql); console.log('✅', sql.slice(30,80)); }
  catch(e) { if(e.code==='ER_DUP_FIELDNAME') console.log('ℹ️ Ya existe'); else throw e; }
}

// Crear carpeta de uploads
const dir = path.join(__dirname, '..', 'uploads', 'operaciones');
if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); console.log('✅ Carpeta uploads/operaciones creada'); }

console.log('✅ Tabla operaciones actualizada.');
process.exit(0);
