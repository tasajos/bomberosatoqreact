import pool from '../db.js';
import { crearGestion } from '../services/gestion.js';
try {
  await crearGestion(pool).init();
  console.log('Tablas de finanzas, logística, auditoría y notificaciones listas.');
} catch(e) {
  console.error('No se pudo aplicar la migración:',e.code||e.message);process.exitCode=1;
} finally {await pool.end();}
