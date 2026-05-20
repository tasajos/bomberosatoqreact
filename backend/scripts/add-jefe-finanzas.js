import pool from '../db.js';
await pool.query(`ALTER TABLE users MODIFY COLUMN role ENUM(
  'admin','presidente','coordinador','voluntario',
  'jefe_personal','jefe_operaciones','jefe_logistica',
  'jefe_marketing','jefe_enlaces','jefe_finanzas',
  'fundador','postulante'
) NOT NULL DEFAULT 'voluntario'`);
console.log('✅ Rol jefe_finanzas agregado.');
process.exit(0);
