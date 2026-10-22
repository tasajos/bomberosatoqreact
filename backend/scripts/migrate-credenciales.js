import { fileURLToPath } from 'node:url';
import pool from '../db.js';
import { crearServicioCredenciales } from '../services/credenciales.js';
try {
  await crearServicioCredenciales({pool,storageDir:fileURLToPath(new URL('../storage/credenciales/',import.meta.url))}).init();
  console.log('Registro de credenciales listo.');
}catch(e){console.error('No se pudo preparar el registro:',e.code||e.message);process.exitCode=1;}
finally{await pool.end();}
