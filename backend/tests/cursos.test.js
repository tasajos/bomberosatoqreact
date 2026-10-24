import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import mysql from 'mysql2/promise';
import express from 'express';
import jwt from 'jsonwebtoken';
import { verifyToken } from '../middleware/auth.js';
import { calificar, firmaValida, nombreOriginal, resumenAcademico, validarCurso, validarPreguntas, hoyBolivia } from '../services/cursos.js';
import { crearServicioCursos } from '../services/cursos.js';
import { SQL } from '../services/migracionesSql.js';
import { crearRouterCursos } from '../routes/cursos.js';

const preguntas = [
  { texto: '¿Número de emergencias?', tipo: 'unica', puntos: 1, opciones: [{ texto: '110', correcta: false }, { texto: '119', correcta: true }] },
  { texto: 'Elementos del triángulo del fuego', tipo: 'multiple', puntos: 3, opciones: [{ texto: 'Calor', correcta: true }, { texto: 'Agua' }, { texto: 'Oxígeno', correcta: true }, { texto: 'Combustible', correcta: true }] },
];
const dia = n => { const d = new Date(`${hoyBolivia()}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const cursoBase = { titulo: 'Primeros auxilios', descripcion: 'Curso básico', visibilidad: 'publico', horas: 20, fecha_inicio: dia(-1), fecha_fin: dia(10),
  costo: 0, cupo: 0, nota_minima: 51, estado: 'publicado', instructor_user_id: 2 };

test('validación de cursos, preguntas y calificación', () => {
  assert.equal(validarCurso(cursoBase).horas, 20);
  assert.throws(() => validarCurso({ ...cursoBase, fecha_fin: dia(-5) }), /anterior/);
  assert.throws(() => validarCurso({ ...cursoBase, instructor_user_id: null }), /instructor/);
  assert.throws(() => validarCurso({ ...cursoBase, instructor_cuenta_id: 3 }), /instructor/);
  assert.throws(() => validarCurso({ ...cursoBase, costo: 50 }), /pag/);
  assert.equal(validarCurso({ ...cursoBase, costo: '50.5', info_pago: 'QR en secretaría' }).costo, 50.5);
  assert.throws(() => validarPreguntas([{ ...preguntas[0], opciones: [{ texto: 'a', correcta: true }, { texto: 'b', correcta: true }] }]), /única/);
  assert.throws(() => validarPreguntas([{ ...preguntas[0], opciones: [{ texto: 'a' }, { texto: 'b' }] }]), /correcta/);
  assert.throws(() => validarPreguntas([]), /entre 1 y 100/);
  const p = validarPreguntas(preguntas);
  assert.deepEqual(calificar(p, [[1], [0, 2, 3]]).puntaje, 100);
  assert.equal(calificar(p, [[1], [0, 2]]).puntaje, 25); // la múltiple exige todas las correctas
  assert.equal(calificar(p, [[0], []]).puntaje, 0);
  assert.throws(() => calificar(p, [[0, 1], []]), /una sola/);
  assert.throws(() => calificar(p, [[5], []]), /inválida/);
  assert.throws(() => calificar(p, [[1]]), /no corresponden/);
  assert.deepEqual(resumenAcademico([], new Map(), 51, false).estado, 'sin_evaluacion');
  assert.deepEqual(resumenAcademico([1, 2], new Map([[1, 100]]), 51, false), { nota: 50, estado: 'en_curso', rendidos: 1, total: 2 });
  assert.equal(resumenAcademico([1, 2], new Map([[1, 100]]), 51, true).estado, 'reprobado');
  assert.equal(resumenAcademico([1, 2], new Map([[1, 100], [2, 2]]), 51, false).estado, 'aprobado');
  assert.ok(firmaValida('.pdf', Buffer.from('%PDF-1.7 ...')));
  assert.ok(!firmaValida('.pdf', Buffer.from('<html><script>')));
  assert.ok(firmaValida('.mp4', Buffer.from([0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d])));
  assert.equal(nombreOriginal(Buffer.from('Presentación.pptx').toString('latin1')), 'Presentación.pptx');
});

test('flujo completo de cursos online con base temporal', { skip: process.env.GESTION_TEST_LOCAL !== '1' }, async t => {
  const host = process.env.DB_HOST || 'localhost'; assert.ok(['localhost', '127.0.0.1', '::1'].includes(host));
  const config = { host, port: Number(process.env.DB_PORT) || 3306, user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '' };
  const admin = await mysql.createConnection(config), name = `cursos_test_${process.pid}_${Date.now()}`;
  await admin.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4`);
  const pool = mysql.createPool({ ...config, database: name, connectionLimit: 8 });
  const storageDir = await mkdtemp(path.join(tmpdir(), 'cursos-')), certificadosDir = await mkdtemp(path.join(tmpdir(), 'cursos-cert-'));
  const previo = process.env.JWT_SECRET; process.env.JWT_SECRET = 'pruebas-cursos'; let server;
  t.after(async () => {
    if (server) await new Promise(r => server.close(r));
    await pool.end(); assert.match(name, /^cursos_test_\d+_\d+$/); await admin.query(`DROP DATABASE \`${name}\``); await admin.end();
    await rm(storageDir, { recursive: true }); await rm(certificadosDir, { recursive: true });
    if (previo === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previo;
  });
  await pool.query(`CREATE TABLE users (id INT PRIMARY KEY, nombre VARCHAR(100), apellido_paterno VARCHAR(100), apellido_materno VARCHAR(100),
    email VARCHAR(180) UNIQUE, carnet_identidad VARCHAR(30), telefono VARCHAR(30), grado VARCHAR(60), role VARCHAR(40), activo INT) ENGINE=InnoDB`);
  await pool.query(`INSERT INTO users VALUES (1,'Pres','Test','','pres@ya.org','111','','','presidente',1),
    (2,'Iván','Instructor','','ivan@ya.org','222','','','voluntario',1),(3,'Ana','López','Mamani','ana@ya.org','333','777','','voluntario',1),
    (4,'Inactivo','X','','inactivo@ya.org','','','','voluntario',0)`);
  const correos = [];
  const servicio = crearServicioCursos({ pool, storageDir, certificadosDir, enviarCorreo: async c => { correos.push(c); return {}; } });
  // Base con el esquema anterior (solo el script 29): al iniciar se aplica el 30 y se conservan los datos.
  for (const q of SQL['29_cursos_online.sql'].split(';').map(x => x.trim()).filter(Boolean)) await pool.query(q);
  await pool.query("INSERT INTO curso_cuentas (id,nombre,apellidos,documento,email,password_hash) VALUES (50,'Vieja','Cuenta','1','vieja@mail.com','x')");
  await pool.query("INSERT INTO cursos_online (id,titulo,horas,fecha_inicio,fecha_fin,creado_por) VALUES (50,'Antiguo',1,'2026-01-01','2026-01-02',1)");
  await pool.query("INSERT INTO curso_inscripciones (curso_id,cuenta_id,estado) VALUES (50,50,'pendiente_pago')");
  await servicio.init(); await servicio.init(); // idempotente
  assert.equal((await pool.query('SELECT email_verificado v FROM curso_cuentas WHERE id=50'))[0][0].v, 1, 'las cuentas previas quedan confirmadas');
  assert.equal((await pool.query('SELECT estado FROM curso_inscripciones WHERE curso_id=50'))[0][0].estado, 'pendiente');
  await pool.query('DELETE FROM cursos_online WHERE id=50'); await pool.query('DELETE FROM curso_cuentas WHERE id=50');
  const pres = { tipo: 'usuario', id: 1, role: 'presidente' }, ivan = { tipo: 'usuario', id: 2, role: 'voluntario' }, ana = { tipo: 'usuario', id: 3, role: 'voluntario' };

  // Presidencia crea cursos con instructor interno y externo
  const curso = await servicio.crear(cursoBase, 1);
  assert.equal(curso.instructor_nombre, 'Iván Instructor'); assert.equal(curso.instructor_tipo, 'interno');
  await assert.rejects(servicio.crear({ ...cursoBase, instructor_user_id: 4 }, 1), /miembro activo/);
  const ext = await servicio.crearInstructorExterno({ nombre: 'Laura', apellidos: 'Externa', documento: 'E-1', email: 'Laura@Externa.com', institucion: 'Cruz Roja' }, 1);
  assert.ok(ext.password && ext.correo_enviado); assert.equal(correos[0].to, 'laura@externa.com'); assert.match(correos[0].texto, new RegExp(ext.password));
  await assert.rejects(servicio.crearInstructorExterno({ nombre: 'X', apellidos: 'Y', documento: '1', email: 'ana@ya.org' }, 1), /miembro/);
  const interno = await servicio.crear({ ...cursoBase, titulo: 'Rescate vertical', visibilidad: 'interno', costo: 80, info_pago: 'QR', cupo: 1,
    instructor_user_id: null, instructor_cuenta_id: ext.cuenta.id }, 1);
  assert.equal(interno.instructor_tipo, 'externo');
  const laura = { tipo: 'cuenta', id: (await servicio.ingresar('laura@externa.com', ext.password)).id };
  assert.deepEqual((await servicio.cursosDictados(laura)).map(c => c.id), [interno.id]);
  assert.equal((await servicio.resumen(ivan)).dictando, 1);

  // El instructor arma el contenido; otro voluntario no puede
  const { id: modulo } = await servicio.crearModulo(ivan, curso.id, { titulo: 'Módulo 1: Evaluación' });
  const { id: modulo2 } = await servicio.crearModulo(ivan, curso.id, { titulo: 'Módulo 2: RCP' });
  await assert.rejects(servicio.crearModulo(ana, curso.id, { titulo: 'Intruso' }), e => e.status === 403);
  await assert.rejects(servicio.crearModulo(laura, curso.id, { titulo: 'Intrusa' }), e => e.status === 403);
  await servicio.moverModulo(ivan, modulo2, 'arriba');
  assert.deepEqual((await servicio.detalleStaff(ivan, curso.id)).modulos.map(m => m.id), [modulo2, modulo]);
  const html = await servicio.crearMaterial(ivan, modulo, { titulo: 'Práctica', tipo: 'html', html: '<h1>Práctica</h1><script>1</script>' });
  await servicio.crearMaterial(ivan, modulo, { titulo: 'Video', tipo: 'enlace', url: 'https://youtu.be/abc' });
  await assert.rejects(servicio.crearMaterial(ivan, modulo, { titulo: 'Malo', tipo: 'enlace', url: 'javascript:alert(1)' }), /enlace válido/);
  const pdfPath = path.join(storageDir, 'a'.repeat(32) + '.pdf'); await writeFile(pdfPath, '%PDF-1.4\nPrueba\n');
  const pdf = await servicio.crearMaterial(ivan, modulo, { titulo: 'Manual', tipo: 'pdf' }, { path: pdfPath, originalname: 'Manual.pdf', size: 16 });
  const falso = path.join(storageDir, 'b'.repeat(32) + '.pdf'); await writeFile(falso, '<html>no es pdf</html>');
  await assert.rejects(servicio.crearMaterial(ivan, modulo, { titulo: 'Falso', tipo: 'pdf' }, { path: falso, originalname: 'falso.pdf', size: 22 }), /no corresponde/);
  assert.equal((await readdir(storageDir)).length, 1, 'el archivo rechazado se elimina');
  const exModulo = await servicio.guardarExamen(ivan, { cursoId: curso.id }, { modulo_id: modulo, titulo: 'Examen módulo 1', intentos_max: 2, publicado: true, preguntas });
  await assert.rejects(servicio.guardarExamen(ivan, { cursoId: curso.id }, { modulo_id: modulo, titulo: 'Otro', publicado: true, preguntas }), e => e.status === 409);
  const exFinal = await servicio.guardarExamen(ivan, { cursoId: curso.id }, { modulo_id: null, titulo: 'Examen final', intentos_max: 1, publicado: true, preguntas });
  await assert.rejects(servicio.guardarExamen(ivan, { cursoId: curso.id }, { titulo: 'Final 2', publicado: true, preguntas }), /examen final/);
  await servicio.guardarExamen(ivan, { cursoId: curso.id }, { modulo_id: modulo2, titulo: 'Borrador', publicado: false, preguntas });

  // Pre-registro externo: correo de confirmación, cuenta inactiva hasta confirmar y solicitud guardada para el curso elegido
  correos.length = 0;
  const datosPedro = { nombre: 'Pedro', apellidos: 'Público', documento: '999', email: 'Pedro@Mail.com', telefono: '700', password: 'secreto123', curso_id: curso.id };
  assert.deepEqual(await servicio.registrar(datosPedro), { email: 'pedro@mail.com', correo_enviado: true });
  const pendientesExternos = await servicio.listarCuentas();
  assert.equal(pendientesExternos.find(c => c.email === 'pedro@mail.com').email_verificado, false);
  assert.equal(pendientesExternos.find(c => c.email === 'pedro@mail.com').inscripciones, 1);
  const enlaceDe = c => c.texto.match(/\/cursos\/verificar\/([a-f0-9]{64})/)?.[1];
  assert.equal(correos[0].to, 'pedro@mail.com'); assert.match(correos[0].subject, /Confirma tu correo/);
  assert.match(correos[0].html, /Confirmar mi correo/); assert.match(correos[0].html, /Primeros auxilios/);
  await assert.rejects(servicio.ingresar('pedro@mail.com', 'secreto123'), e => e.status === 403 && e.codigo === 'correo_no_verificado');
  await servicio.registrar(datosPedro); // repetir el pre-registro sin confirmar reemplaza el enlace
  const viejo = enlaceDe(correos[0]), token = enlaceDe(correos[1]);
  assert.ok(token && token !== viejo);
  await assert.rejects(servicio.verificarCorreo(viejo), e => e.status === 400);
  const solicitudPedro = (await servicio.participantes(pres, curso.id)).participantes.find(p => p.tipo === 'externo');
  assert.equal(solicitudPedro.estado, 'pendiente'); assert.equal(solicitudPedro.correo_verificado, false);
  await assert.rejects(servicio.revisarInscripcion(solicitudPedro.id, { estado: 'activa' }, 1), /confirmó su correo/);
  assert.deepEqual(await servicio.reenviarVerificacion('nadie@mail.com'), { ok: true });
  await servicio.esperarCorreos();
  assert.ok(!correos.some(c => c.to?.includes?.('pres@ya.org')), 'presidencia no recibe avisos de cuentas sin confirmar');
  const sesion = await servicio.verificarCorreo(token);
  assert.ok(sesion.token); assert.equal(sesion.cuenta.email, 'pedro@mail.com');
  assert.deepEqual(await servicio.verificarCorreo(token), { ya_confirmado: true, email: 'pedro@mail.com' }, 'el enlace no vuelve a iniciar sesión');
  await servicio.esperarCorreos();
  const aviso = correos.find(c => /Nuevo participante externo/.test(c.subject));
  assert.deepEqual(aviso.to, ['pres@ya.org']); assert.match(aviso.html, /Pedro Público/); assert.match(aviso.html, /Primeros auxilios/);
  await assert.rejects(servicio.registrar(datosPedro), e => e.status === 409, 'una cuenta confirmada no se vuelve a registrar');
  await assert.rejects(servicio.registrar({ ...datosPedro, email: 'ana@ya.org' }), /miembro/);
  await assert.rejects(servicio.ingresar('pedro@mail.com', 'incorrecta'), e => e.status === 401);
  const pedro = { tipo: 'cuenta', id: sesion.cuenta.id }, inscPedro = { id: solicitudPedro.id };
  const catPedro = await servicio.catalogo(pedro);
  assert.deepEqual(catPedro.disponibles, []); assert.equal(catPedro.inscritos[0].inscripcion.estado, 'pendiente');
  assert.deepEqual((await servicio.catalogo(ana)).disponibles.map(c => c.id).sort(), [curso.id, interno.id].sort());
  assert.ok(!(await servicio.catalogo(ivan)).disponibles.some(c => c.id === curso.id), 'el instructor no ve su curso para inscribirse');
  await assert.rejects(servicio.inscribirse(pedro, interno.id), e => e.status === 403);
  await assert.rejects(servicio.inscribirse(ivan, curso.id), /dictas/);

  // Toda inscripción espera la habilitación de presidencia, que avisa por correo al participante
  correos.length = 0;
  const inscAna = await servicio.inscribirse(ana, curso.id); assert.equal(inscAna.estado, 'pendiente');
  assert.deepEqual(await servicio.inscribirse(ana, curso.id), inscAna, 'repetir la inscripción no duplica');
  assert.equal((await servicio.aula(ana, curso.id)).motivo, 'pendiente');
  await assert.rejects(servicio.contenido(ana, html.id), e => e.status === 403);
  await servicio.esperarCorreos();
  assert.equal(correos.length, 1); assert.match(correos[0].subject, /Solicitud de inscripción/); assert.deepEqual(correos[0].to, ['pres@ya.org']);
  await servicio.revisarInscripcion(inscAna.id, { estado: 'activa' }, 1);
  await servicio.revisarInscripcion(inscPedro.id, { estado: 'activa' }, 1);
  await servicio.esperarCorreos();
  const habilitado = correos.find(c => c.to === 'pedro@mail.com');
  assert.match(habilitado.subject, /habilitada/); assert.match(habilitado.html, /\/cursos\/aula\//);
  assert.match(correos.find(c => c.to === 'ana@ya.org').html, /\/voluntario\/cursos-online\//);

  // Curso con costo y cupo 1: el pago se registra mientras está pendiente y el cupo se controla al habilitar
  const pago = await servicio.inscribirse(ana, interno.id); assert.equal(pago.estado, 'pendiente');
  const otro = await servicio.inscribirse(pres, interno.id);
  await servicio.registrarPago(ana, interno.id, { pago_referencia: 'Transferencia 123' });
  await assert.rejects(servicio.registrarPago(ana, curso.id, { pago_referencia: 'x' }), /pago pendiente/);
  await servicio.revisarInscripcion(pago.id, { estado: 'activa' }, 1);
  await assert.rejects(servicio.revisarInscripcion(otro.id, { estado: 'activa' }, 1), /cupo/);
  await assert.rejects(servicio.inscribirse(ivan, interno.id), /cupos/);
  await servicio.revisarInscripcion(otro.id, { estado: 'rechazada', observacion: 'Sin cupo <b>disponible</b>' }, 1);
  await servicio.esperarCorreos();
  const rechazo = correos.find(c => /no aprobada/.test(c.subject));
  assert.match(rechazo.html, /Sin cupo &lt;b&gt;disponible/, 'los datos ingresados se escapan en el HTML');
  assert.equal((await servicio.aula(ana, interno.id)).acceso, true, 'presidencia habilitó la inscripción');

  // Aula: contenido, progreso, exámenes sin respuestas y límite de intentos
  const aula = await servicio.aula(ana, curso.id);
  assert.equal(aula.acceso, true); assert.deepEqual(aula.examenes.map(e => e.id), [exModulo.id, exFinal.id], 'el examen no publicado no aparece');
  const contenidoHtml = await servicio.contenido(ana, html.id); assert.match(contenidoHtml.html, /<script>/);
  const contenidoPdf = await servicio.contenido(ana, pdf.id); assert.match(contenidoPdf.archivo_path, /^\/cursos\/archivo\/[^/]+\/material-\d+\.pdf$/);
  assert.equal((await servicio.aula(ana, curso.id)).evaluacion.progreso.vistos, 2);
  await servicio.contenido(pedro, html.id);
  await assert.rejects(servicio.contenido({ tipo: 'usuario', id: 4, role: 'voluntario' }, html.id), e => e.status === 403, 'sin inscripción no hay contenido');
  const examen = await servicio.examenParaRendir(ana, exModulo.id);
  assert.equal(JSON.stringify(examen).includes('correcta'), false, 'las respuestas correctas no se envían');
  const intentos = await Promise.allSettled(Array.from({ length: 4 }, () => servicio.rendir(ana, exModulo.id, [[0], []])));
  assert.equal(intentos.filter(r => r.status === 'fulfilled').length, 2, 'se respeta intentos_max con envíos simultáneos');
  await assert.rejects(servicio.examenParaRendir(ana, exModulo.id), /intentos/);
  assert.equal((await servicio.rendir(ana, exFinal.id, [[1], [0, 2, 3]])).aprobado, true);
  const resultadoPedro = await servicio.rendir(pedro, exModulo.id, [[1], [0, 2, 3]]); assert.equal(resultadoPedro.puntaje, 100);
  await assert.rejects(servicio.rendir(ivan, exModulo.id, [[1], [0, 2, 3]]), /vista previa/);

  // Calificaciones: Ana rindió todo con 0 y 100 = 50 (reprobada); Pedro 100 y sin final = en curso
  let lista = await servicio.participantes(ivan, curso.id);
  const fila = id => lista.participantes.find(p => p.id === id);
  assert.equal(fila(inscAna.id).evaluacion.nota, 50); assert.equal(fila(inscAna.id).evaluacion.estado, 'reprobado');
  assert.equal(fila(inscPedro.id).evaluacion.estado, 'en_curso', 'falta el examen final');
  assert.equal(fila(inscAna.id).nombre, 'Ana López Mamani'); assert.equal(fila(inscPedro.id).tipo, 'externo');
  await assert.rejects(servicio.participantes(laura, curso.id), e => e.status === 403);
  await assert.rejects(servicio.datosCertificado(inscAna.id), /no concluyó/);
  await servicio.rendir(pedro, exFinal.id, [[1], [0, 2, 3]]);
  await servicio.actualizar(curso.id, { ...cursoBase, estado: 'finalizado' });
  lista = await servicio.participantes(pres, curso.id);
  assert.equal(fila(inscAna.id).evaluacion.estado, 'reprobado'); assert.equal(fila(inscAna.id).certificable, false);
  assert.equal(fila(inscPedro.id).evaluacion.estado, 'aprobado'); assert.equal(fila(inscPedro.id).certificable, true);
  await assert.rejects(servicio.datosCertificado(inscAna.id), /no aprobó/);
  const datos = await servicio.datosCertificado(inscPedro.id);
  assert.deepEqual([datos.participante, datos.documento, datos.modalidad, datos.temario], ['Pedro Público', '999', 'aprobacion', 'Módulo 2: RCP\nMódulo 1: Evaluación']);
  await assert.rejects(servicio.rendir(pedro, exModulo.id, [[1], []]), /fecha/);
  await assert.rejects(servicio.inscribirse({ tipo: 'usuario', id: 1, role: 'presidente' }, curso.id), /no está disponible/);
  await assert.rejects(servicio.eliminar(curso.id), /Cancelado/);

  // Certificado emitido en el módulo de certificados y vinculado a la inscripción
  await pool.query(`CREATE TABLE certificados_cursos (id INT PRIMARY KEY, numero INT, token CHAR(64), estado VARCHAR(20)) ENGINE=InnoDB`);
  await pool.query("INSERT INTO certificados_cursos VALUES (7,105,?, 'emitido')", ['c'.repeat(64)]);
  await writeFile(path.join(certificadosDir, `${'c'.repeat(64)}.pdf`), '%PDF-1.4 certificado');
  await assert.rejects(servicio.vincularCertificado(inscPedro.id, 8), /no existe/);
  await servicio.vincularCertificado(inscPedro.id, 7);
  assert.equal((await servicio.aula(pedro, curso.id)).certificado.codigo, 'CRTYA-105');
  assert.equal((await servicio.certificadoArchivo(pedro, curso.id)).nombre, 'CRTYA-105.pdf');
  await assert.rejects(servicio.certificadoArchivo(ana, curso.id), e => e.status === 404);

  // HTTP: tokens separados, permisos de presidencia y archivos firmados con rangos
  const app = express(); app.use(express.json({ limit: '3mb' })); app.use('/api/cursos', crearRouterCursos(servicio, pool));
  app.get('/api/interna', verifyToken, (_req, res) => res.json({ ok: true }));
  server = app.listen(0, '127.0.0.1'); await new Promise(r => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const pide = (ruta, token, opciones = {}) => fetch(`${base}${ruta}`, { ...opciones, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json', ...opciones.headers } });
  const login = await (await pide('/cursos/publico/ingresar', null, { method: 'POST', body: JSON.stringify({ email: 'pedro@mail.com', password: 'secreto123' }) })).json();
  assert.ok(login.token); assert.equal(login.cuenta.email, 'pedro@mail.com'); assert.equal('password_hash' in login.cuenta, false);
  assert.equal((await pide('/interna', login.token)).status, 403, 'el token externo no sirve en el resto del sistema');
  const registro = await pide('/cursos/publico/registro', null, { method: 'POST', body: JSON.stringify({ nombre: 'Rosa', apellidos: 'R', documento: '5', email: 'rosa@mail.com', telefono: '7', password: 'secreto123' }) });
  assert.equal(registro.status, 201); assert.equal('token' in await registro.json(), false, 'el registro no inicia sesión');
  const sinConfirmar = await pide('/cursos/publico/ingresar', null, { method: 'POST', body: JSON.stringify({ email: 'rosa@mail.com', password: 'secreto123' }) });
  assert.equal(sinConfirmar.status, 403); assert.equal((await sinConfirmar.json()).codigo, 'correo_no_verificado');
  assert.equal((await pide('/cursos/publico/verificar', null, { method: 'POST', body: JSON.stringify({ token: 'f'.repeat(64) }) })).status, 400);
  assert.equal((await pide('/cursos/aula', login.token)).status, 200);
  assert.equal((await pide('/cursos/gestion', login.token)).status, 403);
  const tokenAna = jwt.sign({ id: 3, role: 'presidente' }, process.env.JWT_SECRET); // rol del JWT ignorado: se lee de la BD
  assert.equal((await pide('/cursos/gestion', tokenAna)).status, 403);
  assert.equal((await pide('/cursos/aula', jwt.sign({ id: 4, role: 'voluntario' }, process.env.JWT_SECRET))).status, 403, 'usuario inactivo');
  const tokenPres = jwt.sign({ id: 1, role: 'presidente' }, process.env.JWT_SECRET);
  assert.equal((await (await pide('/cursos/gestion', tokenPres)).json()).data.length, 2);
  assert.equal((await pide('/cursos/publico', null)).status, 200);
  const publico = await (await pide('/cursos/publico', null)).json();
  assert.equal(publico.data.length, 0, 'el curso finalizado ya no se ofrece'); assert.equal(JSON.stringify(publico).includes('instructor_email'), false);
  const archivo = await fetch(`${base}${contenidoPdf.archivo_path}`, { headers: { Range: 'bytes=0-4' } });
  assert.equal(archivo.status, 206); assert.equal(archivo.headers.get('content-type'), 'application/pdf'); assert.equal(await archivo.text(), '%PDF-');
  assert.equal((await fetch(`${base}/cursos/archivo/token-falso/x.pdf`)).status, 404);
  const sinPermiso = await fetch(`${base}/cursos/modulos/${modulo}/materiales`, { method: 'POST', headers: { Authorization: `Bearer ${login.token}` }, body: (() => { const f = new FormData(); f.append('titulo', 'x'); f.append('tipo', 'pdf'); f.append('archivo', new Blob(['%PDF-1.4']), 'x.pdf'); return f; })() });
  assert.equal(sinPermiso.status, 403);
  assert.equal((await readdir(storageDir)).length, 1, 'una carga sin permiso no deja archivos');
  const tokenIvan = jwt.sign({ id: 2, role: 'voluntario' }, process.env.JWT_SECRET);
  const subida = new FormData(); subida.append('titulo', 'Diapositivas'); subida.append('tipo', 'presentacion');
  subida.append('archivo', new Blob([Buffer.from([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4])]), 'Presentación.pptx');
  const r = await fetch(`${base}/cursos/modulos/${modulo}/materiales`, { method: 'POST', headers: { Authorization: `Bearer ${tokenIvan}` }, body: subida });
  assert.equal(r.status, 200, await r.clone().text());
  const detalle = await servicio.detalleStaff(ivan, curso.id);
  assert.ok(detalle.modulos.flatMap(m => m.materiales).some(m => m.nombre_original === 'Presentación.pptx'));
  await servicio.eliminarMaterial(ivan, pdf.id);
  assert.equal((await readdir(storageDir)).length, 1, 'al eliminar el material se borra su archivo');

  // Directorio completo y eliminación de externos: permisos, cascadas y nuevo registro.
  const rutaCuentas = '/cursos/gestion/cuentas';
  for (const token of [null, login.token, tokenAna, tokenIvan]) {
    assert.equal((await pide(rutaCuentas, token)).status, token ? 403 : 401);
    assert.equal((await pide(`${rutaCuentas}/${pedro.id}`, token, { method: 'DELETE' })).status, token ? 403 : 401);
  }
  const cuentas = (await (await pide(rutaCuentas, tokenPres)).json()).data;
  assert.equal(cuentas.length, 3, 'incluye instructores y registros sin inscripción ni confirmación');
  const rosa = cuentas.find(c => c.email === 'rosa@mail.com');
  assert.equal(rosa.inscripciones, 0); assert.equal(rosa.email_verificado, false);
  assert.equal(cuentas.find(c => c.id === pedro.id).email_verificado, true);
  assert.equal(cuentas.find(c => c.id === laura.id).cursos_dictados, 1);
  for (const c of cuentas) {
    assert.equal('password_hash' in c, false); assert.equal('verificacion_hash' in c, false);
  }
  await pool.query('UPDATE curso_cuentas SET activo=0 WHERE id=?', [rosa.id]);
  assert.equal((await servicio.listarCuentas()).find(c => c.id === rosa.id).activo, false, 'también muestra cuentas inactivas');
  const instructorProtegido = await pide(`${rutaCuentas}/${laura.id}`, tokenPres, { method: 'DELETE' });
  assert.equal(instructorProtegido.status, 409); assert.match((await instructorProtegido.json()).error, /otro instructor/);
  assert.equal((await servicio.listarGestion()).find(c => c.id === interno.id).instructor_cuenta_id, laura.id);
  assert.equal((await pide(`${rutaCuentas}/invalido`, tokenPres, { method: 'DELETE' })).status, 400);
  assert.equal((await pide(`${rutaCuentas}/2147483647`, tokenPres, { method: 'DELETE' })).status, 404);
  assert.equal((await pide(`${rutaCuentas}/${pedro.id}`, tokenPres, { method: 'DELETE' })).status, 200);
  assert.equal((await pide('/cursos/aula', login.token)).status, 403, 'la sesión eliminada ya no accede');
  await assert.rejects(servicio.verificarCorreo(token), e => e.status === 400, 'el enlace antiguo queda invalidado');
  for (const tabla of ['curso_intentos', 'curso_progreso']) {
    assert.equal((await pool.query(`SELECT COUNT(*) n FROM ${tabla} WHERE inscripcion_id=?`, [inscPedro.id]))[0][0].n, 0);
  }
  assert.equal((await pool.query('SELECT COUNT(*) n FROM curso_inscripciones WHERE cuenta_id=?', [pedro.id]))[0][0].n, 0);
  assert.equal((await pool.query('SELECT COUNT(*) n FROM curso_inscripciones WHERE id=?', [inscAna.id]))[0][0].n, 1, 'conserva a los demás participantes');
  assert.equal((await pool.query('SELECT COUNT(*) n FROM certificados_cursos WHERE id=7'))[0][0].n, 1, 'conserva los certificados emitidos');
  correos.length = 0;
  await servicio.registrar({ ...datosPedro, curso_id: null });
  const nuevaSesion = await servicio.verificarCorreo(enlaceDe(correos[0]));
  assert.notEqual(nuevaSesion.cuenta.id, pedro.id, 'el mismo correo crea una cuenta nueva');
  assert.equal(await servicio.cuentaDeToken(login.token), null, 'la sesión anterior no accede a la nueva cuenta');
  assert.equal((await servicio.catalogo({ tipo: 'cuenta', id: nuevaSesion.cuenta.id })).inscritos.length, 0);
  assert.equal((await pide(`${rutaCuentas}/${rosa.id}`, tokenPres, { method: 'DELETE' })).status, 200, 'permite eliminar un registro sin confirmar');
  await servicio.actualizar(interno.id, { ...cursoBase, instructor_user_id: 2, instructor_cuenta_id: null });
  assert.equal((await pide(`${rutaCuentas}/${laura.id}`, tokenPres, { method: 'DELETE' })).status, 200, 'permite eliminar al instructor tras reemplazarlo');
  await servicio.esperarCorreos();
});
