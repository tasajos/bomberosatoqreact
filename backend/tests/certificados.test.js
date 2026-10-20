import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { mkdtemp, readdir, unlink, rmdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import mysql from 'mysql2/promise';
import express from 'express';
import jwt from 'jsonwebtoken';
import { crearServicioCertificados, validarDatosCertificado } from '../services/certificados.js';
import { crearRouterCertificados } from '../routes/certificados.js';

const datos = {
  participante:'Participante de prueba', documento:'YA-001', curso:'Curso de rescate', modalidad:'participacion', horas:'24',
  fechaInicio:'2026-10-19',fechaFin:'2026-10-20',fechaEmision:'2026-10-20',lugar:'Cochabamba',
  presidente:'Presidente de prueba', cargoPresidente:'Presidente', instructor:'Instructor de prueba', cargoInstructor:'Instructor',
  temario:'Seguridad en la escena\nTécnicas de rescate\nPráctica supervisada',incluirQR:true,codigo:'',
};

test('rechaza certificados incompletos, fechas inexistentes y horas inválidas', () => {
  for (const caso of [{...datos,temario:''},{...datos,fechaFin:'2026-02-30'},{...datos,horas:'NaN'},
    {...datos,horas:'0'},{...datos,fechaEmision:'2026-10-19'},{...datos,incluirQR:'sí'}]) {
    assert.throws(()=>validarDatosCertificado(caso), e=>e.status === 400);
  }
  assert.equal(validarDatosCertificado(datos).participante,datos.participante);
});

// Usa únicamente una instancia de pruebas indicada explícitamente; crea su propia base desechable.
test('correlativo, reintentos, ficha pública y descarga autenticada del original', {skip:!process.env.CERTIFICADOS_TEST_MYSQL}, async t => {
  const admin = await mysql.createConnection(process.env.CERTIFICADOS_TEST_MYSQL);
  const db = `certificados_test_${process.pid}_${Date.now()}`;
  assert.match(db,/^certificados_test_\d+_\d+$/);
  await admin.query(`CREATE DATABASE \`${db}\` CHARACTER SET utf8mb4`);
  const url = new URL(process.env.CERTIFICADOS_TEST_MYSQL); url.pathname=`/${db}`;
  const pool = mysql.createPool({ uri:url.toString(),connectionLimit:8 });
  const storageDir = await mkdtemp(path.join(tmpdir(),'certificados-test-'));
  const anterior = process.env.JWT_SECRET;
  process.env.JWT_SECRET='clave-exclusiva-de-pruebas';
  let server;
  t.after(async()=>{
    if (server) await new Promise(resolve=>server.close(resolve));
    await pool.end(); await admin.query(`DROP DATABASE \`${db}\``); await admin.end();
    for (const nombre of await readdir(storageDir)) { assert.match(nombre,/^[a-f0-9]{64}\.pdf$/); await unlink(path.join(storageDir,nombre)); }
    await rmdir(storageDir);
    if (anterior === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET=anterior;
  });
  const servicio = crearServicioCertificados({pool,storageDir});
  await servicio.init();
  const claves = Array.from({length:12},()=>randomUUID());
  const registros = await Promise.all(claves.map(clave=>servicio.reservar(datos,clave,1)));
  assert.deepEqual(registros.map(r=>r.numero).sort((a,b)=>a-b),Array.from({length:12},(_,i)=>100+i));
  assert.equal(new Set(registros.map(r=>r.descarga_path)).size,12);
  const repetidos = await Promise.all(Array.from({length:6},()=>servicio.reservar(datos,claves[0],1)));
  assert.ok(repetidos.every(r=>r.id===registros[0].id));
  await assert.rejects(servicio.reservar({...datos,curso:'Otro curso'},claves[0],1),e=>e.status===409);
  const otraInstancia = crearServicioCertificados({pool,storageDir});
  const siguiente = await otraInstancia.reservar(datos,randomUUID(),1);
  assert.equal(siguiente.codigo,'CRTYA-112');
  const token = registros[0].verificacion_path.split('/').pop();
  await assert.rejects(servicio.publico(token),e=>e.status===404);
  const buffer=Buffer.from('%PDF-1.4\n'+ 'PDF DE PRUEBA\n'.repeat(20));
  await assert.rejects(servicio.guardarPDF(registros[0].id,buffer,2),e=>e.status===403);
  await assert.rejects(servicio.guardarPDF(registros[0].id,Buffer.from('inválido'),1),e=>e.status===400);
  const publicado = await servicio.guardarPDF(registros[0].id,buffer,1);
  assert.equal(publicado.estado,'emitido');
  assert.equal((await servicio.guardarPDF(publicado.id,buffer,1)).id,publicado.id);
  await assert.rejects(servicio.guardarPDF(publicado.id,Buffer.concat([buffer,Buffer.from('cambio')]),1),e=>e.status===409);
  const original=await servicio.publico(token);
  assert.equal(original.sha256,createHash('sha256').update(buffer).digest('hex'));
  const tokenPendiente = registros[1].verificacion_path.split('/').pop();
  await writeFile(path.join(storageDir,`${tokenPendiente}.pdf`),Buffer.from('escritura interrumpida'));
  assert.equal((await servicio.guardarPDF(registros[1].id,buffer,1)).estado,'emitido');
  const app=express();app.use(express.json());app.use('/api/certificados',crearRouterCertificados(servicio));
  server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  const base=`http://127.0.0.1:${server.address().port}/api/certificados`;
  assert.equal((await fetch(base)).status,401);
  const voluntario=jwt.sign({id:2,role:'voluntario'},process.env.JWT_SECRET);
  assert.equal((await fetch(base,{headers:{Authorization:`Bearer ${voluntario}`}})).status,403);
  const presidente=jwt.sign({id:1,role:'presidente'},process.env.JWT_SECRET);
  const respuesta=await fetch(base,{headers:{Authorization:`Bearer ${presidente}`}});
  assert.equal((await respuesta.json()).data.length,13);
  const ficha=await fetch(`${base}/publico/${token}`);
  assert.equal(ficha.status,200);
  const publico=await ficha.json();
  assert.equal(publico.codigo,publicado.codigo);
  assert.equal(publico.participante,datos.participante);
  assert.equal(publico.temario,datos.temario);
  for (const campo of ['documento','archivo','sha256','descarga_path','datos','creado_por','token']) assert.ok(!(campo in publico));
  assert.equal((await fetch(`${base}/${publicado.id}/pdf`)).status,401);
  assert.equal((await fetch(`${base}/${publicado.id}/pdf`,{headers:{Authorization:`Bearer ${voluntario}`}})).status,403);
  const descarga=await fetch(`${base}/${publicado.id}/pdf`,{headers:{Authorization:`Bearer ${presidente}`}});
  assert.equal(descarga.status,200);
  assert.match(descarga.headers.get('content-disposition'),/attachment/);
  assert.deepEqual(Buffer.from(await descarga.arrayBuffer()),buffer);
  const antiguo=await fetch(`${base}/publico/${token}/descargar`,{redirect:'manual'});
  assert.equal(antiguo.status,303);
  assert.ok(antiguo.headers.get('location').endsWith(publicado.verificacion_path));
  assert.equal(antiguo.headers.get('content-disposition'),null);
  assert.equal((await fetch(`${base}/publico/${'0'.repeat(64)}`)).status,404);
  assert.equal((await fetch(`${base}/publico/${'0'.repeat(64)}/descargar`)).status,404);
});
