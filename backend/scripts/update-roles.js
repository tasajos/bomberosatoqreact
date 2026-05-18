import pool from '../db.js';
await pool.query(`ALTER TABLE users MODIFY COLUMN role ENUM(
  'admin','presidente','coordinador','voluntario',
  'jefe_personal','jefe_operaciones','jefe_logistica',
  'jefe_marketing','jefe_enlaces','fundador','postulante'
) NOT NULL DEFAULT 'voluntario'`);
console.log('✅ Roles actualizados.');
const [[{total}]] = await pool.query("SELECT COUNT(*) as total FROM users");
console.log(`  ${total} usuarios en la tabla.`);
process.exit(0);
