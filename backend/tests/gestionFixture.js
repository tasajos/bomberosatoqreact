import mysql from 'mysql2/promise';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { crearGestion } from '../services/gestion.js';
import { crearRouterGestion } from '../routes/gestion.js';
import { crearRouterOperaciones } from '../routes/operacionesDpto.js';
import { crearRouterAuth } from '../routes/auth.js';

// Opt-in explícito. Copia solamente estructura; nunca datos del sistema real ni correos reales.
export async function fixture(port=0) {
  if(process.env.GESTION_TEST_LOCAL!=='1')throw new Error('Use GESTION_TEST_LOCAL=1 para las pruebas locales');
  const host=process.env.DB_HOST||'localhost';
  if(!['localhost','127.0.0.1','::1'].includes(host))throw new Error('Las pruebas solo permiten MySQL local');
  const config={host,port:Number(process.env.DB_PORT)||3306,user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||''};
  const admin=await mysql.createConnection({...config,database:process.env.DB_NAME||'yunka_atoq'});
  const name=`gestion_test_${process.pid}_${Date.now()}`;
  await admin.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4`);
  const pool=mysql.createPool({...config,database:name,connectionLimit:12});
  let server;
  const anterior=process.env.JWT_SECRET;
  process.env.JWT_SECRET='gestion-test-secret-only';
  async function close(){
    if(server)await new Promise(resolve=>server.close(resolve));
    await pool.end();
    if(!/^gestion_test_\d+_\d+$/.test(name))throw new Error('Base de pruebas inválida');
    await admin.query(`DROP DATABASE \`${name}\``);await admin.end();
    if(anterior===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=anterior;
  }
  try {
    for(const table of ['users','campanias','operaciones','guardias','puntos_voluntario','meritos','voluntario_documentos','documentos_presidencia','documento_presidencia_voluntarios','capacitaciones','capacitacion_inscripciones','certificados_cursos']){
      const [[row]]=await admin.query(`SHOW CREATE TABLE \`${table}\``);
      // Las columnas que agregan las migraciones de gestión se quitan: la prueba las aplica sobre la estructura original.
      const ddl=row['Create Table'].split('\n').filter(l=>!/reglamento/.test(l)).join('\n').replace(/,(\s*\n\))/,'$1');
      await pool.query(ddl);
    }
    const roles=['jefe_finanzas','presidente','voluntario','voluntario','jefe_logistica','jefe_operaciones','admin','jefe_personal'];
    const hash=await bcrypt.hash('Demo-gestion-2026',4);
    const tokens={},ids={};
    for(let i=0;i<roles.length;i++){
      const key=['finanzas','presidente','voluntario','otro','logistica','operaciones','admin','personal'][i];
      const [r]=await pool.query('INSERT INTO users (nombre,apellido_paterno,email,password_hash,role,activo) VALUES (?,?,?,?,?,1)',[`Prueba ${key}`,'Test',`${key}@example.invalid`,hash,roles[i]]);
      ids[key]=r.insertId;
      tokens[key]=jwt.sign({id:r.insertId,role:roles[i],nombre:`Prueba ${key}`},process.env.JWT_SECRET);
    }
    const gestion=crearGestion(pool);await gestion.init();
    const app=express();app.use(cors());app.use(express.json());
    app.use('/api/auth',crearRouterAuth(pool));
    app.use('/api/gestion',crearRouterGestion(pool,gestion));
    app.use('/api/operaciones-dpto',crearRouterOperaciones(pool));
    app.get('/api/campanias',async(_req,res)=>{const [r]=await pool.query('SELECT * FROM campanias');res.json(r);});
    server=app.listen(port,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
    return {pool,gestion,tokens,ids,url:`http://127.0.0.1:${server.address().port}/api`,close};
  }catch(e){await close();throw e;}
}
