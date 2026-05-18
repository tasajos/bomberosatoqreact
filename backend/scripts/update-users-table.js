import pool from '../db.js';

const alterations = [
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS apellido_paterno VARCHAR(100) DEFAULT '' AFTER nombre",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS apellido_materno VARCHAR(100) DEFAULT '' AFTER apellido_paterno",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE AFTER apellido_materno",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS carnet_identidad VARCHAR(30) DEFAULT '' AFTER fecha_nacimiento",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS domicilio VARCHAR(300) DEFAULT '' AFTER carnet_identidad",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS telefono VARCHAR(30) DEFAULT '' AFTER domicilio",
  `ALTER TABLE users MODIFY COLUMN role ENUM(
    'admin','voluntario','jefe_personal','jefe_operaciones',
    'jefe_logistica','jefe_marketing','jefe_enlaces','fundador'
  ) NOT NULL DEFAULT 'voluntario'`,
];

for (const sql of alterations) {
  try {
    await pool.query(sql);
    console.log('✅', sql.slice(0, 70));
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') console.log('ℹ️  Ya existe:', sql.slice(30, 60));
    else { console.error('❌', e.message); }
  }
}

const [cols] = await pool.query("SHOW COLUMNS FROM users");
console.log('\nColumnas:', cols.map(c => c.Field).join(', '));
process.exit(0);
