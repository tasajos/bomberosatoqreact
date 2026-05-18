import pool from '../db.js';

const cols = [
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS contacto_nombre VARCHAR(200) DEFAULT '' AFTER telefono",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS contacto_telefono VARCHAR(30) DEFAULT '' AFTER contacto_nombre",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS codigo ENUM('VF','VC','VR','') DEFAULT '' AFTER contacto_telefono",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS matricula VARCHAR(20) DEFAULT '' AFTER codigo",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS especialidad VARCHAR(150) DEFAULT '' AFTER matricula",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS tipo_sangre ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-','') DEFAULT '' AFTER especialidad",
];

for (const sql of cols) {
  try {
    await pool.query(sql);
    console.log('✅', sql.slice(30, 80));
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') console.log('ℹ️  Ya existe');
    else throw e;
  }
}
console.log('\n✅ Columnas agregadas.');
process.exit(0);
