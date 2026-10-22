import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp,readdir,unlink,rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import mysql from 'mysql2/promise';
import express from 'express';
import jwt from 'jsonwebtoken';
import { crearServicioCredenciales, estadoCredencial, validarEmisionCredencial, vencimientoAnual } from '../services/credenciales.js';
import { crearRouterCredenciales } from '../routes/credenciales.js';

const foto=`data:image/jpeg;base64,${Buffer.concat([Buffer.from([0xff,0xd8]),Buffer.alloc(120)]).toString('base64')}`;
const input={voluntario_id:2,funcion:'Voluntario de rescate',fecha_emision:'2026-10-21',foto};
test('vigencia anual, año bisiesto y estados de verificación',()=>{
  assert.equal(vencimientoAnual('2024-02-29'),'2025-02-28');assert.equal(vencimientoAnual('2026-10-21'),'2027-10-21');
  assert.throws(()=>vencimientoAnual('2026-02-30'));
  const r={estado:'emitida',activo:1,estado_personal:'activo',fecha_vencimiento:'2027-10-21'};
  assert.equal(estadoCredencial(r,'2027-10-21'),'vigente');assert.equal(estadoCredencial(r,'2027-10-22'),'vencida');
  assert.equal(estadoCredencial({...r,activo:0}),'inactivo');assert.equal(estadoCredencial({...r,estado:'anulada'}),'anulada');
  assert.throws(()=>validarEmisionCredencial({...input,foto:'https://otra-foto'}));assert.throws(()=>validarEmisionCredencial({...input,fecha_emision:'2099-01-01'}));
});

test('emisión, PDF inmutable, QR público, renovación, anulación y acceso por rol',{skip:process.env.GESTION_TEST_LOCAL!=='1'},async t=>{
  const host=process.env.DB_HOST||'localhost';assert.ok(['localhost','127.0.0.1','::1'].includes(host));
  const config={host,port:Number(process.env.DB_PORT)||3306,user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||''};
  const admin=await mysql.createConnection(config),name=`credenciales_test_${process.pid}_${Date.now()}`;
  await admin.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4`);
  const pool=mysql.createPool({...config,database:name,connectionLimit:8});
  const storageDir=await mkdtemp(path.join(tmpdir(),'credenciales-'));
  const previo=process.env.JWT_SECRET;process.env.JWT_SECRET='pruebas-credenciales';let server;
  t.after(async()=>{
    if(server)await new Promise(r=>server.close(r));await pool.end();assert.match(name,/^credenciales_test_\d+_\d+$/);await admin.query(`DROP DATABASE \`${name}\``);await admin.end();
    for(const file of await readdir(storageDir)){assert.match(file,/^[a-f0-9]{64}\.pdf$/);await unlink(path.join(storageDir,file));}await rmdir(storageDir);
    if(previo===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=previo;
  });
  await pool.query(`CREATE TABLE users(id INT PRIMARY KEY,nombre VARCHAR(100),apellido_paterno VARCHAR(100),apellido_materno VARCHAR(100),codigo VARCHAR(30),matricula VARCHAR(40),tipo_sangre VARCHAR(10),especialidad VARCHAR(200),grado VARCHAR(60),cargo_directiva VARCHAR(60),role VARCHAR(40),activo INT,estado_personal VARCHAR(30)) ENGINE=InnoDB`);
  await pool.query('CREATE TABLE voluntarios(user_id INT PRIMARY KEY,foto_url VARCHAR(200)) ENGINE=InnoDB');
  await pool.query("INSERT INTO users VALUES (1,'Presidente','Test','','','',NULL,NULL,'','presidente','presidente',1,'activo'),(2,'Ana María','López','Mamani','VF','VF-001','O+','Rescate','vol_1ro','','voluntario',1,'activo')");
  const servicio=crearServicioCredenciales({pool,storageDir});await servicio.init();
  const clave=randomUUID();
  const results=await Promise.all(Array.from({length:5},()=>servicio.reservar(input,clave,1)));
  assert.equal(new Set(results.map(r=>r.id)).size,1);const r=results[0];assert.equal(r.fecha_vencimiento,'2027-10-21');
  await assert.rejects(servicio.reservar({...input,funcion:'Otra función'},clave,1),e=>e.status===409);
  await assert.rejects(servicio.reservar(input,randomUUID(),1),e=>e.status===409);
  const token=r.verificacion_path.split('/').pop();await assert.rejects(servicio.publico(token),e=>e.status===404);
  const pdf=Buffer.from('%PDF-1.4\n'+'Credencial de pruebas\n'.repeat(20));
  await assert.rejects(servicio.guardarPDF(r.id,Buffer.from('inválido')),e=>e.status===400);
  await servicio.guardarPDF(r.id,pdf);await servicio.guardarPDF(r.id,pdf);
  await assert.rejects(servicio.guardarPDF(r.id,Buffer.concat([pdf,Buffer.from('cambio')])),e=>e.status===409);
  const redisenado=Buffer.concat([pdf,Buffer.from('\nDiseño sin código impreso')]);
  const actualizado=await servicio.guardarPDF(r.id,redisenado,2);
  assert.equal(actualizado.codigo,r.codigo);assert.equal(actualizado.id,r.id);
  assert.equal(actualizado.verificacion_path,r.verificacion_path);assert.equal(actualizado.diseno_version,2);
  assert.equal(actualizado.fecha_emision,r.fecha_emision);assert.equal(actualizado.fecha_vencimiento,r.fecha_vencimiento);
  for(let i=0;i<3;i++){const archivo=await servicio.original(r.id);assert.equal(archivo.nombre,`${r.codigo}.pdf`);}
  assert.equal((await servicio.listar()).length,1,'Descargar o actualizar el diseño no crea emisiones');
  await assert.rejects(servicio.guardarPDF(r.id,pdf,2),e=>e.status===409);
  const ficha=await servicio.publico(token);assert.equal(ficha.nombre,'Ana María López Mamani');assert.equal(ficha.tipo_sangre,'O+');
  assert.equal(ficha.estado,'vigente');for(const campo of ['email','telefono','carnet_identidad','domicilio','voluntario_id','token'])assert.equal(campo in ficha,false);
  const renovada=await servicio.reservar(input,randomUUID(),1);await servicio.guardarPDF(renovada.id,pdf);
  assert.equal((await servicio.publico(token)).estado,'reemplazada');
  await servicio.anular(renovada.id,'Extravío de la credencial',1);
  assert.equal((await servicio.publico(renovada.verificacion_path.split('/').pop())).estado,'anulada');
  const app=express();app.use(express.json({limit:'600kb'}));app.use('/api/credenciales',crearRouterCredenciales(servicio,pool));
  server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}/api/credenciales`;
  const pub=await fetch(`${base}/publico/${token}`);assert.equal(pub.status,200);assert.equal(pub.headers.get('cache-control'),'private, no-store');
  assert.equal((await fetch(`${base}/voluntarios`)).status,401);
  const voluntario=jwt.sign({id:2,role:'presidente'},process.env.JWT_SECRET); // JWT viejo / rol cambiado en BD.
  assert.equal((await fetch(`${base}/voluntarios`,{headers:{Authorization:`Bearer ${voluntario}`}})).status,403);
  const presidente=jwt.sign({id:1,role:'presidente'},process.env.JWT_SECRET);
  const descarga=await fetch(`${base}/${r.id}/pdf`,{headers:{Authorization:`Bearer ${presidente}`}});assert.equal(descarga.status,200);assert.match(descarga.headers.get('content-type'),/pdf/);
  assert.equal((await fetch(`${base}/publico/${'f'.repeat(64)}`)).status,404);
  await pool.query("UPDATE users SET especialidad='' WHERE id=2");
  const sinEspecialidades=await servicio.reservar(input,randomUUID(),1);assert.equal(sinEspecialidades.datos.especialidad,'');
  await pool.query("UPDATE users SET tipo_sangre='' WHERE id=2");await assert.rejects(servicio.reservar(input,randomUUID(),1),/sangre/);
});
