import { createHash, randomBytes } from 'node:crypto';
import { mkdir, open, unlink } from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sql as scriptSql } from './migracionesSql.js';
import { correoAccesoInstructor, correoNuevoExterno, correoRevision, correoSolicitud, correoVerificacion, sitio } from './cursosCorreos.js';

const fallo = (ok, mensaje, status = 400) => { if (!ok) throw Object.assign(new Error(mensaje), { status }); };
export const hoyBolivia = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' }).format(new Date());
const esFecha = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
const redondear = n => Math.round(n * 100) / 100;

function texto(v, max, nombre, requerido = true) {
  fallo(v == null || typeof v === 'string' || typeof v === 'number', `Campo inválido: ${nombre}.`);
  const t = v == null ? '' : String(v).trim();
  fallo(!requerido || t, `Complete ${nombre}.`);
  fallo(t.length <= max, `${nombre[0].toUpperCase()}${nombre.slice(1)} admite hasta ${max} caracteres.`);
  return t;
}
function numero(v, min, max, nombre) {
  const n = Number(v);
  fallo(v !== '' && v !== null && Number.isFinite(n) && n >= min && n <= max, `${nombre} debe estar entre ${min} y ${max}.`);
  return redondear(n);
}
function entero(v, min, max, nombre) {
  const n = Number(v);
  fallo(Number.isInteger(n) && n >= min && n <= max, `${nombre} debe ser un número entero entre ${min} y ${max}.`);
  return n;
}
const idOpcional = (v, nombre) => v === null || v === undefined || v === '' ? null : entero(v, 1, 2 ** 31 - 1, nombre);

// Las sesiones externas usan un secreto distinto: un token de participante externo nunca es válido en el resto del sistema.
function secreto(sufijo) {
  fallo(process.env.JWT_SECRET, 'El servidor no tiene configurado JWT_SECRET.', 500);
  return `${process.env.JWT_SECRET}:${sufijo}`;
}
export const secretoCuentas = () => process.env.CURSOS_JWT_SECRET || secreto('cursos-externos');
const secretoArchivos = () => secreto('cursos-archivos');

export const ESTADOS_CURSO = ['borrador', 'publicado', 'finalizado', 'cancelado'];
export const TIPOS_MATERIAL = ['pdf', 'presentacion', 'video', 'html', 'enlace'];
export const MAX_HTML = 2_000_000;
// Extensión permitida por tipo, su Content-Type y una comprobación de la firma del archivo.
const ARCHIVOS = {
  pdf: { '.pdf': 'application/pdf' },
  presentacion: {
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.ppsx': 'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
    '.ppt': 'application/vnd.ms-powerpoint', '.pps': 'application/vnd.ms-powerpoint',
    '.odp': 'application/vnd.oasis.opendocument.presentation',
  },
  video: { '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.webm': 'video/webm', '.ogv': 'video/ogg', '.mov': 'video/quicktime' },
};
export const extensionPermitida = (tipo, nombre) => !!ARCHIVOS[tipo]?.[path.extname(nombre || '').toLowerCase()];
export function firmaValida(ext, b) {
  const ascii = (desde, hasta) => b.subarray(desde, hasta).toString('latin1');
  if (ext === '.pdf') return ascii(0, 5) === '%PDF-';
  if (['.pptx', '.ppsx', '.odp'].includes(ext)) return b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;
  if (['.ppt', '.pps'].includes(ext)) return b.subarray(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0]));
  if (ext === '.webm') return b.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  if (ext === '.ogv') return ascii(0, 4) === 'OggS';
  return ['ftyp', 'moov', 'mdat', 'wide', 'free', 'skip'].includes(ascii(4, 8));
}

export function validarCurso(input) {
  fallo(input && typeof input === 'object', 'Datos del curso inválidos.');
  const c = {
    titulo: texto(input.titulo, 200, 'el título'),
    descripcion: texto(input.descripcion, 5000, 'la descripción', false),
    visibilidad: input.visibilidad,
    horas: numero(input.horas, 0.5, 2000, 'Las horas académicas'),
    fecha_inicio: input.fecha_inicio,
    fecha_fin: input.fecha_fin,
    costo: numero(input.costo ?? 0, 0, 100000, 'El costo'),
    info_pago: texto(input.info_pago, 1000, 'la información de pago', false),
    cupo: entero(input.cupo ?? 0, 0, 10000, 'El cupo'),
    nota_minima: numero(input.nota_minima ?? 51, 1, 100, 'La nota mínima de aprobación'),
    estado: input.estado ?? 'borrador',
    instructor_user_id: idOpcional(input.instructor_user_id, 'El instructor'),
    instructor_cuenta_id: idOpcional(input.instructor_cuenta_id, 'El instructor externo'),
  };
  fallo(['interno', 'publico'].includes(c.visibilidad), 'Indique si el curso es interno o abierto al público.');
  fallo(ESTADOS_CURSO.includes(c.estado), 'Estado del curso inválido.');
  fallo(esFecha(c.fecha_inicio) && esFecha(c.fecha_fin), 'Indique fechas válidas de inicio y fin.');
  fallo(c.fecha_fin >= c.fecha_inicio, 'La fecha de fin no puede ser anterior a la de inicio.');
  fallo((c.instructor_user_id === null) !== (c.instructor_cuenta_id === null), 'Asigne un instructor: un miembro de la fundación o un instructor externo.');
  fallo(c.costo === 0 || c.info_pago, 'Indique cómo se paga el curso (cuenta, QR o lugar de pago).');
  return c;
}

export function validarPreguntas(lista) {
  fallo(Array.isArray(lista) && lista.length >= 1 && lista.length <= 100, 'El examen debe tener entre 1 y 100 preguntas.');
  return lista.map((p, i) => {
    const n = i + 1;
    fallo(p && typeof p === 'object', `La pregunta ${n} es inválida.`);
    fallo(['unica', 'multiple'].includes(p.tipo), `Indique el tipo de la pregunta ${n}.`);
    fallo(Array.isArray(p.opciones) && p.opciones.length >= 2 && p.opciones.length <= 8, `La pregunta ${n} debe tener entre 2 y 8 opciones.`);
    const opciones = p.opciones.map((o, j) => ({ texto: texto(o?.texto, 500, `la opción ${j + 1} de la pregunta ${n}`), correcta: o?.correcta === true }));
    const correctas = opciones.filter(o => o.correcta).length;
    fallo(correctas >= 1, `Marque la respuesta correcta de la pregunta ${n}.`);
    fallo(p.tipo === 'multiple' || correctas === 1, `La pregunta ${n} es de respuesta única: marque solo una opción correcta.`);
    return { texto: texto(p.texto, 2000, `el enunciado de la pregunta ${n}`), tipo: p.tipo, puntos: entero(p.puntos ?? 1, 1, 100, `Los puntos de la pregunta ${n}`), opciones };
  });
}

// Una pregunta suma sus puntos solo si se marcan exactamente las opciones correctas. Una pregunta sin responder vale 0.
export function calificar(preguntas, respuestas) {
  fallo(Array.isArray(respuestas) && respuestas.length === preguntas.length, 'Las respuestas no corresponden al examen.');
  let total = 0, obtenido = 0;
  const detalle = preguntas.map((p, i) => {
    const r = respuestas[i];
    fallo(Array.isArray(r) && r.every(x => Number.isInteger(x) && x >= 0 && x < p.opciones.length) && new Set(r).size === r.length, `Respuesta inválida en la pregunta ${i + 1}.`);
    fallo(p.tipo === 'multiple' || r.length <= 1, `La pregunta ${i + 1} admite una sola respuesta.`);
    const correctas = p.opciones.flatMap((o, j) => o.correcta ? [j] : []);
    const ok = r.length === correctas.length && correctas.every(j => r.includes(j));
    total += p.puntos;
    if (ok) obtenido += p.puntos;
    return ok;
  });
  return { puntaje: redondear(obtenido / total * 100), correctas: detalle.filter(Boolean).length, detalle };
}

export const preguntasPublicas = preguntas => preguntas.map(p => ({ texto: p.texto, tipo: p.tipo, puntos: p.puntos, opciones: p.opciones.map(o => o.texto) }));

// Nota final: promedio de la mejor nota de cada examen publicado (los no rendidos cuentan 0).
export function resumenAcademico(examenIds, mejores, notaMinima, concluido) {
  if (!examenIds.length) return { nota: null, estado: 'sin_evaluacion', rendidos: 0, total: 0 };
  const rendidos = examenIds.filter(id => mejores.has(id)).length;
  const nota = redondear(examenIds.reduce((s, id) => s + (mejores.get(id) ?? 0), 0) / examenIds.length);
  const estado = rendidos < examenIds.length && !concluido ? 'en_curso' : nota >= notaMinima ? 'aprobado' : 'reprobado';
  return { nota, estado, rendidos, total: examenIds.length };
}
export const cursoConcluido = (curso, hoy = hoyBolivia()) => curso.estado === 'finalizado' || hoy > curso.fecha_fin;

const parsear = v => typeof v === 'string' ? JSON.parse(v) : v;
const NOMBRE_USUARIO = "TRIM(CONCAT_WS(' ',u.nombre,NULLIF(u.apellido_paterno,''),NULLIF(u.apellido_materno,'')))";
const NOMBRE_CUENTA = "TRIM(CONCAT_WS(' ',k.nombre,k.apellidos))";
const CURSO_SQL = `SELECT c.id,c.titulo,c.descripcion,c.visibilidad,c.instructor_user_id,c.instructor_cuenta_id,c.horas,
  DATE_FORMAT(c.fecha_inicio,'%Y-%m-%d') fecha_inicio,DATE_FORMAT(c.fecha_fin,'%Y-%m-%d') fecha_fin,c.costo,c.info_pago,c.cupo,
  c.nota_minima,c.estado,c.created_at,
  CASE WHEN u.id IS NOT NULL THEN ${NOMBRE_USUARIO} WHEN k.id IS NOT NULL THEN ${NOMBRE_CUENTA} END instructor_nombre,
  IF(c.instructor_cuenta_id IS NULL,'interno','externo') instructor_tipo,k.institucion instructor_institucion,k.email instructor_email,
  (SELECT COUNT(*) FROM curso_inscripciones i WHERE i.curso_id=c.id AND i.estado='activa') inscritos,
  (SELECT COUNT(*) FROM curso_inscripciones i WHERE i.curso_id=c.id AND i.estado='pendiente') pendientes,
  (SELECT COUNT(*) FROM curso_modulos d WHERE d.curso_id=c.id) modulos
  FROM cursos_online c LEFT JOIN users u ON u.id=c.instructor_user_id LEFT JOIN curso_cuentas k ON k.id=c.instructor_cuenta_id`;
const hidratarCurso = r => ({ ...r, horas: Number(r.horas), costo: Number(r.costo), nota_minima: Number(r.nota_minima),
  cupo: Number(r.cupo), inscritos: Number(r.inscritos), pendientes: Number(r.pendientes), modulos: Number(r.modulos) });
// Lo que ve un participante o el público: sin datos de contacto del instructor ni identificadores internos.
const cursoPublico = c => ({ id: c.id, titulo: c.titulo, descripcion: c.descripcion, visibilidad: c.visibilidad, horas: c.horas,
  fecha_inicio: c.fecha_inicio, fecha_fin: c.fecha_fin, costo: c.costo, info_pago: c.info_pago, cupo: c.cupo,
  inscritos: c.inscritos, nota_minima: c.nota_minima, estado: c.estado, instructor_nombre: c.instructor_nombre,
  instructor_institucion: c.instructor_institucion, modulos: c.modulos });
const hidratarExamen = e => ({ id: e.id, curso_id: e.curso_id, modulo_id: e.modulo_id, titulo: e.titulo, instrucciones: e.instrucciones,
  intentos_max: e.intentos_max, publicado: !!e.publicado, preguntas: parsear(e.preguntas), intentos: Number(e.intentos ?? 0) });
const cuentaPublica = k => ({ id: k.id, nombre: k.nombre, apellidos: k.apellidos, email: k.email, documento: k.documento,
  telefono: k.telefono, institucion: k.institucion, es_instructor: !!k.es_instructor });

export const esGestion = a => a?.tipo === 'usuario' && ['presidente', 'admin'].includes(a.role);
export const esInstructorDe = (a, c) => a.tipo === 'usuario' ? c.instructor_user_id === a.id : c.instructor_cuenta_id === a.id;
const columnaActor = a => a.tipo === 'usuario' ? 'user_id' : 'cuenta_id';
const correoValido = v => typeof v === 'string' && v.length <= 180 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const passwordTemporal = () => randomBytes(9).toString('base64url');
// multer entrega el nombre original decodificado como latin1; los navegadores lo envían en UTF-8.
export function nombreOriginal(nombre) {
  const utf8 = Buffer.from(nombre, 'latin1').toString('utf8');
  return (utf8.includes('�') ? nombre : utf8).slice(0, 255);
}

const HORAS_VERIFICACION = 48;
const huella = token => createHash('sha256').update(token).digest('hex');
const PORTALES = { presidente: '/presidente', voluntario: '/voluntario', jefe_finanzas: '/finanzas', jefe_logistica: '/logistica',
  jefe_personal: '/personal', jefe_operaciones: '/operaciones', coordinador: '/operaciones' };
const enlaceAula = (tipo, role, cursoId) => tipo === 'externo' ? `${sitio()}/cursos/aula/${cursoId}`
  : PORTALES[role] ? `${sitio()}${PORTALES[role]}/cursos-online/${cursoId}` : `${sitio()}/login`;
const sentencias = nombre => scriptSql(nombre).split(';').map(s => s.trim()).filter(Boolean);

export function crearServicioCursos({ pool, storageDir, certificadosDir, enviarCorreo = null }) {
  let ready;
  const init = () => ready ??= (async () => {
    for (const q of sentencias('29_cursos_online.sql')) await pool.query(q);
    // Script 30 (habilitación y confirmación de correo): se aplica solo si falta, porque reescribe la tabla de inscripciones.
    const [[col]] = await pool.query("SELECT COUNT(*) n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='curso_cuentas' AND COLUMN_NAME='verificacion_expira'");
    const [[estado]] = await pool.query("SELECT COLUMN_TYPE t FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='curso_inscripciones' AND COLUMN_NAME='estado'");
    if (!Number(col.n) || String(estado.t).includes('pendiente_pago')) {
      for (const q of sentencias('30_cursos_aprobacion.sql')) {
        try { await pool.query(q); } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') throw e; }
      }
    }
    await mkdir(storageDir, { recursive: true });
  })().catch(e => { ready = undefined; throw e; });

  // Los avisos no detienen la operación: un fallo de SMTP se registra y el trámite continúa.
  const envios = new Set();
  function enSegundoPlano(promesa) {
    const p = promesa.catch(e => console.error('Cursos · correo:', e.message)).finally(() => envios.delete(p));
    envios.add(p);
  }
  async function mandar(destino, correo) {
    if (!enviarCorreo || !destino || (Array.isArray(destino) && !destino.length)) return false;
    return (await enviarCorreo({ to: destino, subject: correo.asunto, texto: correo.texto, html: correo.html })) !== null; // null: SMTP sin configurar
  }
  async function correosPresidencia() {
    const [rows] = await pool.query("SELECT email FROM users WHERE role='presidente' AND activo=1 AND email<>''");
    if (rows.length) return rows.map(r => r.email);
    return process.env.NOTIFY_EMAIL ? [process.env.NOTIFY_EMAIL] : [];
  }
  async function inscripcionConParticipante(id) {
    const [[i]] = await pool.query(`SELECT i.id,i.curso_id,i.estado,i.observacion,i.pago_referencia,u.role,IF(i.user_id IS NULL,'externo','interno') tipo,
      CASE WHEN u.id IS NOT NULL THEN ${NOMBRE_USUARIO} ELSE ${NOMBRE_CUENTA} END nombre,COALESCE(u.nombre,k.nombre) nombre_corto,COALESCE(u.email,k.email) email
      FROM curso_inscripciones i LEFT JOIN users u ON u.id=i.user_id LEFT JOIN curso_cuentas k ON k.id=i.cuenta_id WHERE i.id=?`, [id]);
    return i;
  }
  const borrarArchivos = nombres => Promise.all(nombres.filter(Boolean).map(n => unlink(path.join(storageDir, path.basename(n))).catch(() => {})));

  async function transaccion(fn) {
    await init();
    const db = await pool.getConnection();
    try { await db.beginTransaction(); const r = await fn(db); await db.commit(); return r; }
    catch (e) { await db.rollback(); throw e; }
    finally { db.release(); }
  }
  async function obtenerCurso(id, db = pool) {
    await init();
    const [[c]] = await db.query(`${CURSO_SQL} WHERE c.id=?`, [Number(id) || 0]);
    fallo(c, 'Curso no encontrado.', 404);
    return hidratarCurso(c);
  }
  async function cursoStaff(actor, cursoId) {
    const curso = await obtenerCurso(cursoId);
    fallo(esGestion(actor) || esInstructorDe(actor, curso), 'No eres instructor de este curso.', 403);
    return curso;
  }
  async function moduloStaff(actor, moduloId) {
    await init();
    const [[m]] = await pool.query('SELECT * FROM curso_modulos WHERE id=?', [Number(moduloId) || 0]);
    fallo(m, 'Módulo no encontrado.', 404);
    return { modulo: m, curso: await cursoStaff(actor, m.curso_id) };
  }
  async function materialConCurso(materialId) {
    await init();
    const [[m]] = await pool.query('SELECT m.*,d.curso_id FROM curso_materiales m JOIN curso_modulos d ON d.id=m.modulo_id WHERE m.id=?', [Number(materialId) || 0]);
    fallo(m, 'Material no encontrado.', 404);
    return m;
  }
  async function inscripcionDe(actor, cursoId, db = pool, bloquear = false) {
    const [[i]] = await db.query(`SELECT * FROM curso_inscripciones WHERE curso_id=? AND ${columnaActor(actor)}=?${bloquear ? ' FOR UPDATE' : ''}`, [cursoId, actor.id]);
    return i || null;
  }
  // Un participante accede al contenido con inscripción activa desde la fecha de inicio. El instructor y presidencia, siempre.
  function motivoSinAcceso(curso, insc, hoy = hoyBolivia()) {
    if (!insc) return 'no_inscrito';
    if (curso.estado === 'cancelado') return 'cancelado';
    if (curso.estado === 'borrador') return 'no_publicado';
    if (insc.estado !== 'activa') return insc.estado;
    if (hoy < curso.fecha_inicio) return 'no_inicia';
    return null;
  }
  async function accesoContenido(actor, cursoId) {
    const curso = await obtenerCurso(cursoId);
    if (esGestion(actor) || esInstructorDe(actor, curso)) return { curso, insc: null, staff: true };
    const insc = await inscripcionDe(actor, curso.id);
    const motivo = motivoSinAcceso(curso, insc);
    fallo(!motivo, motivo === 'no_inicia' ? `El curso inicia el ${curso.fecha_inicio}.` : 'No tienes acceso a este contenido.', 403);
    return { curso, insc, staff: false };
  }
  const examenesAbiertos = (curso, hoy = hoyBolivia()) => curso.estado === 'publicado' && hoy >= curso.fecha_inicio && hoy <= curso.fecha_fin;

  async function evaluaciones(curso, inscIds) {
    const [examenes] = await pool.query('SELECT id,modulo_id,titulo,intentos_max FROM curso_examenes WHERE curso_id=? AND publicado=1 ORDER BY modulo_id IS NULL,id', [curso.id]);
    const [intentos] = inscIds.length ? await pool.query(`SELECT inscripcion_id,examen_id,MAX(puntaje) mejor,COUNT(*) n
      FROM curso_intentos WHERE inscripcion_id IN (?) GROUP BY inscripcion_id,examen_id`, [inscIds]) : [[]];
    const [vistos] = inscIds.length ? await pool.query(`SELECT p.inscripcion_id,COUNT(*) n FROM curso_progreso p
      JOIN curso_materiales m ON m.id=p.material_id WHERE p.inscripcion_id IN (?) GROUP BY p.inscripcion_id`, [inscIds]) : [[]];
    const [[{ materiales }]] = await pool.query('SELECT COUNT(*) materiales FROM curso_materiales m JOIN curso_modulos d ON d.id=m.modulo_id WHERE d.curso_id=?', [curso.id]);
    const ids = examenes.map(e => e.id), concluido = cursoConcluido(curso);
    const porInscripcion = new Map(inscIds.map(id => [id, { mejores: new Map(), usados: new Map(), vistos: 0 }]));
    for (const r of intentos) { const p = porInscripcion.get(r.inscripcion_id); p.mejores.set(r.examen_id, Number(r.mejor)); p.usados.set(r.examen_id, Number(r.n)); }
    for (const r of vistos) porInscripcion.get(r.inscripcion_id).vistos = Number(r.n);
    const de = id => {
      const p = porInscripcion.get(id);
      return { ...resumenAcademico(ids, p.mejores, curso.nota_minima, concluido), notas: Object.fromEntries(p.mejores),
        intentos: Object.fromEntries(p.usados), progreso: { vistos: p.vistos, total: Number(materiales) } };
    };
    return { examenes, concluido, de };
  }
  async function certificados(ids) {
    const lista = ids.filter(Boolean);
    if (!lista.length) return new Map();
    try {
      const [rows] = await pool.query("SELECT id,numero,token,estado FROM certificados_cursos WHERE id IN (?) AND estado='emitido'", [lista]);
      return new Map(rows.map(r => [r.id, { id: r.id, codigo: `CRTYA-${r.numero}`, token: r.token, verificacion_path: `/certificados/verificar/${r.token}` }]));
    } catch (e) { if (e.code === 'ER_NO_SUCH_TABLE') return new Map(); throw e; }
  }
  const certificable = (inscripcion, evaluacion, concluido) => concluido && inscripcion.estado === 'activa' && ['aprobado', 'sin_evaluacion'].includes(evaluacion.estado);

  async function mover(tabla, padre, id, direccion) {
    fallo(['arriba', 'abajo'].includes(direccion), 'Dirección inválida.');
    return transaccion(async db => {
      const [[actual]] = await db.query(`SELECT id,${padre} padre,orden FROM ${tabla} WHERE id=? FOR UPDATE`, [id]);
      const [hermanos] = await db.query(`SELECT id,orden FROM ${tabla} WHERE ${padre}=? ORDER BY orden,id FOR UPDATE`, [actual.padre]);
      const pos = hermanos.findIndex(h => h.id === actual.id), destino = direccion === 'arriba' ? pos - 1 : pos + 1;
      if (!hermanos[destino]) return { ok: true };
      // Se renumera la lista completa para que órdenes repetidos no impidan el intercambio.
      [hermanos[pos], hermanos[destino]] = [hermanos[destino], hermanos[pos]];
      for (const [i, h] of hermanos.entries()) await db.query(`UPDATE ${tabla} SET orden=? WHERE id=?`, [i + 1, h.id]);
      return { ok: true };
    });
  }

  return {
    init,
    directorio: storageDir,
    // Se comprueba antes de recibir un archivo para no aceptar cargas de quien no dicta el curso.
    permisoModulo: async (actor, moduloId) => { await moduloStaff(actor, moduloId); },
    /** Espera los correos enviados en segundo plano (pruebas y cierre ordenado). */
    esperarCorreos: () => Promise.all([...envios]),

    // ── Sesiones de cuentas externas ──
    firmarSesion: cuenta => jwt.sign({ cid: cuenta.id, tipo: 'cuenta' }, secretoCuentas(), { expiresIn: process.env.CURSOS_JWT_EXPIRES_IN || '7d' }),
    async cuentaDeToken(token) {
      let datos;
      try { datos = jwt.verify(token, secretoCuentas()); } catch { return null; }
      if (datos?.tipo !== 'cuenta') return null;
      await init();
      const [[k]] = await pool.query('SELECT * FROM curso_cuentas WHERE id=? AND activo=1 AND email_verificado=1', [datos.cid]);
      return k ? cuentaPublica(k) : null;
    },
    // Pre-registro: la cuenta queda inactiva hasta que la persona confirma su correo con el enlace enviado.
    // Si eligió un curso, su solicitud de inscripción se guarda y presidencia podrá habilitarla tras la confirmación.
    async registrar(input) {
      fallo(input && typeof input === 'object', 'Datos de inscripción inválidos.');
      const email = texto(input.email, 180, 'el correo electrónico').toLowerCase();
      fallo(correoValido(email), 'Ingrese un correo electrónico válido.');
      fallo(typeof input.password === 'string' && input.password.length >= 8 && input.password.length <= 72, 'La contraseña debe tener entre 8 y 72 caracteres.');
      const [nombre, apellidos, documento, telefono, institucion] = [texto(input.nombre, 120, 'el nombre'), texto(input.apellidos, 160, 'los apellidos'),
        texto(input.documento, 40, 'el documento de identidad'), texto(input.telefono, 40, 'el teléfono'), texto(input.institucion, 200, 'la institución', false)];
      const cursoId = idOpcional(input.curso_id, 'El curso');
      await init();
      const [[miembro]] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
      fallo(!miembro, 'Este correo pertenece a un miembro de la fundación. Ingrese con sus credenciales institucionales.', 409);
      let curso = null;
      if (cursoId) {
        curso = await obtenerCurso(cursoId).catch(() => null);
        fallo(curso && curso.estado === 'publicado' && curso.visibilidad === 'publico' && hoyBolivia() <= curso.fecha_fin, 'El curso elegido ya no está disponible para inscripción.', 409);
      }
      const [[existente]] = await pool.query('SELECT id,email_verificado FROM curso_cuentas WHERE email=?', [email]);
      fallo(!existente || !existente.email_verificado, 'Ya existe una cuenta con este correo. Ingrese con su contraseña.', 409);
      const hash = await bcrypt.hash(input.password, 12), token = randomBytes(32).toString('hex');
      let id = existente?.id;
      if (existente) {
        // Un pre-registro sin confirmar se puede repetir (correo perdido o datos mal escritos): se reemplazan sus datos y el enlace.
        await pool.query(`UPDATE curso_cuentas SET nombre=?,apellidos=?,documento=?,telefono=?,institucion=?,password_hash=?,verificacion_hash=?,
          verificacion_expira=DATE_ADD(NOW(),INTERVAL ${HORAS_VERIFICACION} HOUR) WHERE id=?`, [nombre, apellidos, documento, telefono, institucion, hash, huella(token), id]);
      } else {
        try {
          const [r] = await pool.query(`INSERT INTO curso_cuentas (nombre,apellidos,documento,email,telefono,institucion,password_hash,email_verificado,verificacion_hash,verificacion_expira)
            VALUES (?,?,?,?,?,?,?,0,?,DATE_ADD(NOW(),INTERVAL ${HORAS_VERIFICACION} HOUR))`, [nombre, apellidos, documento, email, telefono, institucion, hash, huella(token)]);
          id = r.insertId;
        } catch (e) { fallo(e.code !== 'ER_DUP_ENTRY', 'Ya existe una cuenta con este correo. Ingrese con su contraseña.', 409); throw e; }
      }
      if (curso) await this.inscribirse({ tipo: 'cuenta', id }, curso.id, {}, { avisar: false });
      return { email, correo_enviado: await this.enviarVerificacion({ nombre, email }, token, curso?.titulo) };
    },
    async enviarVerificacion(cuenta, token, curso) {
      const enlace = `${sitio()}/cursos/verificar/${token}`;
      try {
        const enviado = await mandar(cuenta.email, correoVerificacion({ nombre: cuenta.nombre, enlace, horas: HORAS_VERIFICACION, curso }));
        if (!enviado && process.env.NODE_ENV !== 'production') console.info(`Cursos · SMTP sin configurar. Enlace de confirmación de ${cuenta.email}: ${enlace}`);
        return enviado;
      } catch (e) { console.error('Cursos · correo de confirmación:', e.message); return false; }
    },
    // Respuesta idéntica exista o no la cuenta: no revela qué correos están registrados.
    async reenviarVerificacion(email) {
      const correo = typeof email === 'string' ? email.trim().toLowerCase() : '';
      if (!correoValido(correo)) return { ok: true };
      await init();
      const [[k]] = await pool.query('SELECT id,nombre,email FROM curso_cuentas WHERE email=? AND activo=1 AND email_verificado=0', [correo]);
      if (k) {
        const token = randomBytes(32).toString('hex');
        await pool.query(`UPDATE curso_cuentas SET verificacion_hash=?,verificacion_expira=DATE_ADD(NOW(),INTERVAL ${HORAS_VERIFICACION} HOUR) WHERE id=?`, [huella(token), k.id]);
        const [[pendiente]] = await pool.query("SELECT c.titulo FROM curso_inscripciones i JOIN cursos_online c ON c.id=i.curso_id WHERE i.cuenta_id=? AND i.estado='pendiente' ORDER BY i.id DESC LIMIT 1", [k.id]);
        await this.enviarVerificacion(k, token, pendiente?.titulo);
      }
      return { ok: true };
    },
    // El enlace inicia sesión solo la primera vez; luego indica que el correo ya está confirmado.
    async verificarCorreo(token) {
      fallo(typeof token === 'string' && /^[a-f0-9]{64}$/.test(token), 'El enlace de confirmación no es válido.', 400);
      await init();
      const [[k]] = await pool.query('SELECT *,verificacion_expira<NOW() vencido FROM curso_cuentas WHERE verificacion_hash=? AND activo=1', [huella(token)]);
      fallo(k, 'El enlace de confirmación no es válido. Solicita uno nuevo desde “Ingresar”.', 400);
      if (k.email_verificado) return { ya_confirmado: true, email: k.email };
      fallo(!Number(k.vencido), 'El enlace de confirmación venció. Solicita uno nuevo desde “Ingresar”.', 410);
      const [r] = await pool.query('UPDATE curso_cuentas SET email_verificado=1 WHERE id=? AND email_verificado=0', [k.id]);
      if (!r.affectedRows) return { ya_confirmado: true, email: k.email };
      enSegundoPlano(this.avisarNuevoExterno(k.id));
      const cuenta = cuentaPublica({ ...k, email_verificado: 1 });
      return { token: this.firmarSesion(cuenta), cuenta };
    },
    async avisarNuevoExterno(cuentaId) {
      const [[k]] = await pool.query('SELECT * FROM curso_cuentas WHERE id=?', [cuentaId]);
      const [cursos] = await pool.query("SELECT c.id,c.titulo,c.costo FROM curso_inscripciones i JOIN cursos_online c ON c.id=i.curso_id WHERE i.cuenta_id=? AND i.estado='pendiente'", [cuentaId]);
      const enlace = `${sitio()}/presidente/cursos${cursos.length === 1 ? `/${cursos[0].id}` : ''}`;
      await mandar(await correosPresidencia(), correoNuevoExterno({ cuenta: k, cursos, enlace }));
    },
    async ingresar(email, password) {
      fallo(typeof email === 'string' && typeof password === 'string' && email && password, 'Ingrese su correo y contraseña.');
      await init();
      const [[k]] = await pool.query('SELECT * FROM curso_cuentas WHERE email=? AND activo=1', [email.trim().toLowerCase()]);
      fallo(k && await bcrypt.compare(password, k.password_hash), 'Correo o contraseña incorrectos.', 401);
      if (!k.email_verificado) throw Object.assign(new Error('Tu cuenta aún no está activa: confirma tu correo con el enlace que te enviamos.'), { status: 403, codigo: 'correo_no_verificado' });
      return cuentaPublica(k);
    },
    async cambiarPassword(actor, actual, nueva) {
      fallo(actor.tipo === 'cuenta', 'Solo las cuentas externas cambian su contraseña aquí.', 403);
      fallo(typeof nueva === 'string' && nueva.length >= 8 && nueva.length <= 72, 'La nueva contraseña debe tener entre 8 y 72 caracteres.');
      const [[k]] = await pool.query('SELECT password_hash FROM curso_cuentas WHERE id=?', [actor.id]);
      fallo(typeof actual === 'string' && await bcrypt.compare(actual, k.password_hash), 'La contraseña actual no es correcta.', 400);
      await pool.query('UPDATE curso_cuentas SET password_hash=? WHERE id=?', [await bcrypt.hash(nueva, 12), actor.id]);
      return { ok: true };
    },

    // ── Público ──
    async catalogoPublico() {
      await init();
      const [rows] = await pool.query(`${CURSO_SQL} WHERE c.estado='publicado' AND c.visibilidad='publico' AND c.fecha_fin>=? ORDER BY c.fecha_inicio,c.id`, [hoyBolivia()]);
      return rows.map(r => cursoPublico(hidratarCurso(r)));
    },
    async detallePublico(id) {
      const curso = await obtenerCurso(id);
      fallo(curso.estado === 'publicado' && curso.visibilidad === 'publico', 'Curso no encontrado.', 404);
      const [modulos] = await pool.query('SELECT titulo,descripcion FROM curso_modulos WHERE curso_id=? ORDER BY orden,id', [curso.id]);
      return { ...cursoPublico(curso), temario: modulos };
    },

    // ── Presidencia ──
    async listarCuentas() {
      await init();
      const [rows] = await pool.query(`SELECT k.id,k.nombre,k.apellidos,k.email,k.documento,k.telefono,k.institucion,
        k.es_instructor,k.activo,k.email_verificado,DATE_FORMAT(k.created_at,'%Y-%m-%d %H:%i:%s') created_at,
        (SELECT COUNT(*) FROM curso_inscripciones i WHERE i.cuenta_id=k.id) inscripciones,
        (SELECT COUNT(*) FROM cursos_online c WHERE c.instructor_cuenta_id=k.id) cursos_dictados
        FROM curso_cuentas k ORDER BY k.created_at DESC,k.id DESC`);
      return rows.map(k => ({ ...cuentaPublica(k), activo: !!k.activo, email_verificado: !!k.email_verificado,
        created_at: k.created_at, inscripciones: Number(k.inscripciones), cursos_dictados: Number(k.cursos_dictados) }));
    },
    async eliminarCuenta(cuentaId) {
      const id = entero(cuentaId, 1, 2 ** 31 - 1, 'El usuario externo');
      await init();
      try {
        // Las claves foráneas eliminan inscripciones, intentos y progreso en la misma operación.
        // Un instructor asignado debe reemplazarse primero para conservar sus cursos.
        const [r] = await pool.query('DELETE FROM curso_cuentas WHERE id=?', [id]);
        fallo(r.affectedRows, 'Usuario externo no encontrado.', 404);
      } catch (e) {
        fallo(e.code !== 'ER_ROW_IS_REFERENCED_2', 'Este usuario es instructor de cursos. Asigne otro instructor en esos cursos antes de eliminarlo.', 409);
        throw e;
      }
      return { ok: true };
    },
    async listarGestion() {
      await init();
      const [rows] = await pool.query(`${CURSO_SQL} ORDER BY c.fecha_inicio DESC,c.id DESC`);
      return rows.map(hidratarCurso);
    },
    async opciones() {
      await init();
      const [usuarios] = await pool.query(`SELECT u.id,${NOMBRE_USUARIO} nombre,u.role,u.grado FROM users u
        WHERE u.activo=1 AND u.role<>'postulante' ORDER BY u.apellido_paterno,u.nombre`);
      const [externos] = await pool.query("SELECT * FROM curso_cuentas WHERE es_instructor=1 AND activo=1 ORDER BY apellidos,nombre");
      return { usuarios, externos: externos.map(cuentaPublica) };
    },
    async crear(input, actorId) {
      const c = validarCurso(input);
      await init();
      await this.verificarInstructor(c);
      const [r] = await pool.query(`INSERT INTO cursos_online (titulo,descripcion,visibilidad,instructor_user_id,instructor_cuenta_id,horas,
        fecha_inicio,fecha_fin,costo,info_pago,cupo,nota_minima,estado,creado_por) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [c.titulo, c.descripcion, c.visibilidad, c.instructor_user_id, c.instructor_cuenta_id, c.horas, c.fecha_inicio, c.fecha_fin,
        c.costo, c.info_pago, c.cupo, c.nota_minima, c.estado, actorId]);
      return obtenerCurso(r.insertId);
    },
    async verificarInstructor(c) {
      if (c.instructor_user_id) {
        const [[u]] = await pool.query("SELECT id FROM users WHERE id=? AND activo=1 AND role<>'postulante'", [c.instructor_user_id]);
        fallo(u, 'El instructor seleccionado no es un miembro activo.');
      } else {
        const [[k]] = await pool.query('SELECT id FROM curso_cuentas WHERE id=? AND activo=1 AND es_instructor=1', [c.instructor_cuenta_id]);
        fallo(k, 'El instructor externo seleccionado no existe o está inactivo.');
      }
    },
    async actualizar(id, input) {
      const c = validarCurso(input);
      await obtenerCurso(id);
      await this.verificarInstructor(c);
      await pool.query(`UPDATE cursos_online SET titulo=?,descripcion=?,visibilidad=?,instructor_user_id=?,instructor_cuenta_id=?,horas=?,
        fecha_inicio=?,fecha_fin=?,costo=?,info_pago=?,cupo=?,nota_minima=?,estado=? WHERE id=?`,
      [c.titulo, c.descripcion, c.visibilidad, c.instructor_user_id, c.instructor_cuenta_id, c.horas, c.fecha_inicio, c.fecha_fin,
        c.costo, c.info_pago, c.cupo, c.nota_minima, c.estado, id]);
      return obtenerCurso(id);
    },
    async eliminar(id) {
      const curso = await obtenerCurso(id);
      const [[{ n }]] = await pool.query('SELECT COUNT(*) n FROM curso_inscripciones WHERE curso_id=?', [curso.id]);
      fallo(!Number(n), 'El curso tiene participantes inscritos. Cámbielo a "Cancelado" en lugar de eliminarlo.', 409);
      const [archivos] = await pool.query('SELECT m.archivo FROM curso_materiales m JOIN curso_modulos d ON d.id=m.modulo_id WHERE d.curso_id=?', [curso.id]);
      await pool.query('DELETE FROM cursos_online WHERE id=?', [curso.id]);
      await borrarArchivos(archivos.map(a => a.archivo));
      return { ok: true };
    },
    async crearInstructorExterno(input, actorId) {
      fallo(input && typeof input === 'object', 'Datos del instructor inválidos.');
      const email = texto(input.email, 180, 'el correo electrónico').toLowerCase();
      fallo(correoValido(email), 'Ingrese un correo electrónico válido.');
      const datos = [texto(input.nombre, 120, 'el nombre'), texto(input.apellidos, 160, 'los apellidos'), texto(input.documento, 40, 'el documento de identidad'),
        email, texto(input.telefono, 40, 'el teléfono', false), texto(input.institucion, 200, 'la institución', false)];
      await init();
      const [[miembro]] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
      fallo(!miembro, 'Este correo pertenece a un miembro de la fundación: asígnelo como instructor interno.', 409);
      const [[existente]] = await pool.query('SELECT * FROM curso_cuentas WHERE email=?', [email]);
      if (existente) {
        // Un participante externo ya registrado pasa a ser también instructor y conserva su contraseña.
        // Presidencia lo registra con ese correo: queda confirmado aunque su pre-registro estuviera pendiente.
        await pool.query('UPDATE curso_cuentas SET es_instructor=1,activo=1,email_verificado=1 WHERE id=?', [existente.id]);
        return { cuenta: cuentaPublica({ ...existente, es_instructor: 1 }), password: null, existente: true };
      }
      const password = passwordTemporal();
      const [r] = await pool.query(`INSERT INTO curso_cuentas (nombre,apellidos,documento,email,telefono,institucion,password_hash,es_instructor,email_verificado,creado_por)
        VALUES (?,?,?,?,?,?,?,1,1,?)`, [...datos, await bcrypt.hash(password, 12), actorId]);
      const [[k]] = await pool.query('SELECT * FROM curso_cuentas WHERE id=?', [r.insertId]);
      const correo = await this.enviarAcceso(k, password);
      return { cuenta: cuentaPublica(k), password, existente: false, correo_enviado: correo };
    },
    async restablecerPassword(cuentaId) {
      await init();
      const [[k]] = await pool.query('SELECT * FROM curso_cuentas WHERE id=?', [Number(cuentaId) || 0]);
      fallo(k, 'Cuenta no encontrada.', 404);
      const password = passwordTemporal();
      await pool.query('UPDATE curso_cuentas SET password_hash=?,activo=1 WHERE id=?', [await bcrypt.hash(password, 12), k.id]);
      return { password, correo_enviado: await this.enviarAcceso(k, password) };
    },
    async enviarAcceso(k, password) {
      try {
        return await mandar(k.email, correoAccesoInstructor({ nombre: k.nombre, email: k.email, password, enlace: `${sitio()}/cursos/ingresar` }));
      } catch (e) { console.error('Cursos · correo de acceso:', e.message); return false; }
    },
    // Presidencia habilita, rechaza o da de baja. Una cuenta externa solo se habilita con el correo confirmado.
    async revisarInscripcion(id, input, actorId) {
      fallo(['activa', 'rechazada', 'retirada'].includes(input?.estado), 'Estado de inscripción inválido.');
      const observacion = texto(input.observacion, 500, 'la observación', false);
      await init();
      const [[base]] = await pool.query('SELECT curso_id FROM curso_inscripciones WHERE id=?', [Number(id) || 0]);
      fallo(base, 'Inscripción no encontrada.', 404);
      const cambio = await transaccion(async db => {
        // Mismo orden de bloqueo que la inscripción (curso y luego inscripción) para no cruzarse con ella.
        const [[c]] = await db.query('SELECT id,cupo FROM cursos_online WHERE id=? FOR UPDATE', [base.curso_id]);
        const [[i]] = await db.query('SELECT i.*,k.email_verificado FROM curso_inscripciones i LEFT JOIN curso_cuentas k ON k.id=i.cuenta_id WHERE i.id=? FOR UPDATE', [Number(id)]);
        if (input.estado === 'activa' && i.estado !== 'activa') {
          fallo(!i.cuenta_id || i.email_verificado, 'El participante aún no confirmó su correo electrónico. Podrás habilitarlo cuando lo confirme.', 409);
          if (Number(c.cupo) > 0) {
            const [[{ n }]] = await db.query("SELECT COUNT(*) n FROM curso_inscripciones WHERE curso_id=? AND estado='activa'", [c.id]);
            fallo(Number(n) < Number(c.cupo), 'El curso ya completó su cupo de participantes habilitados.', 409);
          }
        }
        await db.query('UPDATE curso_inscripciones SET estado=?,observacion=?,revisado_por=?,revisado_at=NOW() WHERE id=?', [input.estado, observacion || null, actorId, i.id]);
        return i.estado !== input.estado;
      });
      if (cambio) enSegundoPlano(this.avisarRevision(Number(id)));
      return { ok: true };
    },
    async avisarRevision(inscripcionId) {
      const i = await inscripcionConParticipante(inscripcionId), curso = await obtenerCurso(i.curso_id);
      await mandar(i.email, correoRevision({ nombre: i.nombre_corto, curso, estado: i.estado, observacion: i.observacion, enlace: enlaceAula(i.tipo, i.role, curso.id) }));
    },
    async avisarSolicitud(inscripcionId) {
      const i = await inscripcionConParticipante(inscripcionId), curso = await obtenerCurso(i.curso_id);
      await mandar(await correosPresidencia(), correoSolicitud({ participante: i.nombre, tipo: i.tipo, email: i.email, curso,
        referencia: i.pago_referencia, enlace: `${sitio()}/presidente/cursos/${curso.id}` }));
    },
    async datosCertificado(inscripcionId) {
      await init();
      const [[i]] = await pool.query(`SELECT i.*,CASE WHEN u.id IS NOT NULL THEN ${NOMBRE_USUARIO} ELSE ${NOMBRE_CUENTA} END nombre,
        COALESCE(NULLIF(u.carnet_identidad,''),k.documento,'') documento FROM curso_inscripciones i
        LEFT JOIN users u ON u.id=i.user_id LEFT JOIN curso_cuentas k ON k.id=i.cuenta_id WHERE i.id=?`, [Number(inscripcionId) || 0]);
      fallo(i, 'Inscripción no encontrada.', 404);
      const curso = await obtenerCurso(i.curso_id);
      const ev = await evaluaciones(curso, [i.id]), evaluacion = ev.de(i.id);
      fallo(ev.concluido, 'El curso aún no concluyó. La certificación se habilita al finalizar el curso.', 409);
      fallo(certificable(i, evaluacion, true), 'El participante no aprobó el curso.', 409);
      const [modulos] = await pool.query('SELECT titulo FROM curso_modulos WHERE curso_id=? ORDER BY orden,id', [curso.id]);
      // Un curso finalizado antes de su fecha de fin se certifica con la fecha real de cierre (la emisión no puede ser anterior).
      const hoy = hoyBolivia(), fechaFin = curso.fecha_fin > hoy ? hoy : curso.fecha_fin;
      return { inscripcion_id: i.id, participante: i.nombre, documento: i.documento, curso: curso.titulo,
        modalidad: evaluacion.estado === 'aprobado' ? 'aprobacion' : 'participacion', horas: String(curso.horas),
        fechaInicio: curso.fecha_inicio > fechaFin ? fechaFin : curso.fecha_inicio, fechaFin, instructor: curso.instructor_nombre || '',
        temario: modulos.map(m => m.titulo).join('\n').slice(0, 6000), nota: evaluacion.nota };
    },
    async vincularCertificado(inscripcionId, certificadoId) {
      await init();
      const id = entero(certificadoId, 1, 2 ** 31 - 1, 'El certificado');
      fallo((await certificados([id])).has(id), 'El certificado no existe o aún no fue emitido.', 409);
      const [r] = await pool.query('UPDATE curso_inscripciones SET certificado_id=? WHERE id=?', [id, Number(inscripcionId) || 0]);
      fallo(r.affectedRows, 'Inscripción no encontrada.', 404);
      return { ok: true };
    },

    // ── Instructor (o presidencia) ──
    async cursosDictados(actor) {
      await init();
      const [rows] = await pool.query(`${CURSO_SQL} WHERE c.${actor.tipo === 'usuario' ? 'instructor_user_id' : 'instructor_cuenta_id'}=?
        AND c.estado<>'cancelado' ORDER BY c.fecha_inicio DESC`, [actor.id]);
      return rows.map(hidratarCurso);
    },
    async detalleStaff(actor, cursoId) {
      const curso = await cursoStaff(actor, cursoId);
      const [modulos] = await pool.query('SELECT id,titulo,descripcion,orden FROM curso_modulos WHERE curso_id=? ORDER BY orden,id', [curso.id]);
      const [materiales] = await pool.query(`SELECT m.id,m.modulo_id,m.titulo,m.tipo,m.nombre_original,m.tamano,m.url,m.orden,
        CHAR_LENGTH(m.html) html_largo FROM curso_materiales m JOIN curso_modulos d ON d.id=m.modulo_id WHERE d.curso_id=? ORDER BY m.orden,m.id`, [curso.id]);
      const [examenes] = await pool.query(`SELECT e.*,(SELECT COUNT(*) FROM curso_intentos i WHERE i.examen_id=e.id) intentos
        FROM curso_examenes e WHERE e.curso_id=? ORDER BY e.modulo_id IS NULL,e.id`, [curso.id]);
      return { curso, gestion: esGestion(actor), modulos: modulos.map(m => ({ ...m, materiales: materiales.filter(x => x.modulo_id === m.id) })),
        examenes: examenes.map(hidratarExamen) };
    },
    async crearModulo(actor, cursoId, input) {
      const curso = await cursoStaff(actor, cursoId);
      const titulo = texto(input?.titulo, 200, 'el título del módulo'), descripcion = texto(input?.descripcion, 3000, 'la descripción', false);
      const [[{ orden }]] = await pool.query('SELECT COALESCE(MAX(orden),0)+1 orden FROM curso_modulos WHERE curso_id=?', [curso.id]);
      const [r] = await pool.query('INSERT INTO curso_modulos (curso_id,titulo,descripcion,orden) VALUES (?,?,?,?)', [curso.id, titulo, descripcion, orden]);
      return { id: r.insertId };
    },
    async actualizarModulo(actor, moduloId, input) {
      const { modulo } = await moduloStaff(actor, moduloId);
      await pool.query('UPDATE curso_modulos SET titulo=?,descripcion=? WHERE id=?',
        [texto(input?.titulo, 200, 'el título del módulo'), texto(input?.descripcion, 3000, 'la descripción', false), modulo.id]);
      return { ok: true };
    },
    async eliminarModulo(actor, moduloId) {
      const { modulo } = await moduloStaff(actor, moduloId);
      const [[{ n }]] = await pool.query('SELECT COUNT(*) n FROM curso_intentos i JOIN curso_examenes e ON e.id=i.examen_id WHERE e.modulo_id=?', [modulo.id]);
      fallo(!Number(n), 'El examen de este módulo ya tiene intentos registrados. No se puede eliminar el módulo.', 409);
      const [archivos] = await pool.query('SELECT archivo FROM curso_materiales WHERE modulo_id=?', [modulo.id]);
      await pool.query('DELETE FROM curso_modulos WHERE id=?', [modulo.id]);
      await borrarArchivos(archivos.map(a => a.archivo));
      return { ok: true };
    },
    async moverModulo(actor, moduloId, direccion) {
      const { modulo } = await moduloStaff(actor, moduloId);
      return mover('curso_modulos', 'curso_id', modulo.id, direccion);
    },
    async crearMaterial(actor, moduloId, input, file) {
      try {
        const { modulo } = await moduloStaff(actor, moduloId);
        const titulo = texto(input?.titulo, 200, 'el título del material');
        fallo(TIPOS_MATERIAL.includes(input?.tipo), 'Tipo de material inválido.');
        const m = { titulo, tipo: input.tipo, archivo: null, nombre_original: null, tamano: null, url: null, html: null };
        if (['pdf', 'presentacion', 'video'].includes(m.tipo)) {
          fallo(file, 'Adjunte el archivo del material.');
          const ext = path.extname(file.originalname).toLowerCase();
          fallo(extensionPermitida(m.tipo, file.originalname), `Formato no permitido. Use: ${Object.keys(ARCHIVOS[m.tipo]).join(', ')}.`);
          const fh = await open(file.path, 'r');
          const cabecera = Buffer.alloc(16);
          try { await fh.read(cabecera, 0, 16, 0); } finally { await fh.close(); }
          fallo(firmaValida(ext, cabecera), 'El contenido del archivo no corresponde a su formato.');
          Object.assign(m, { archivo: path.basename(file.path), nombre_original: nombreOriginal(file.originalname), tamano: file.size });
        } else if (m.tipo === 'html') {
          fallo(!file, 'El contenido HTML se envía como texto.');
          fallo(typeof input.html === 'string' && input.html.trim() && input.html.length <= MAX_HTML, 'Pegue o cargue el contenido HTML (máximo 2 MB).');
          m.html = input.html;
        } else {
          fallo(!file, 'Un enlace no lleva archivo adjunto.');
          m.url = this.validarEnlace(input.url);
        }
        const [[{ orden }]] = await pool.query('SELECT COALESCE(MAX(orden),0)+1 orden FROM curso_materiales WHERE modulo_id=?', [modulo.id]);
        const [r] = await pool.query('INSERT INTO curso_materiales (modulo_id,titulo,tipo,archivo,nombre_original,tamano,url,html,orden) VALUES (?,?,?,?,?,?,?,?,?)',
          [modulo.id, m.titulo, m.tipo, m.archivo, m.nombre_original, m.tamano, m.url, m.html, orden]);
        return { id: r.insertId };
      } catch (e) { if (file?.path) await unlink(file.path).catch(() => {}); throw e; }
    },
    validarEnlace(url) {
      const t = texto(url, 500, 'el enlace');
      let u;
      try { u = new URL(t); } catch { u = null; }
      fallo(u && ['http:', 'https:'].includes(u.protocol), 'Ingrese un enlace válido que empiece con https://');
      return u.href;
    },
    async actualizarMaterial(actor, materialId, input) {
      const m = await materialConCurso(materialId);
      await cursoStaff(actor, m.curso_id);
      const titulo = texto(input?.titulo, 200, 'el título del material');
      let { html, url } = m;
      if (m.tipo === 'html' && input.html !== undefined) {
        fallo(typeof input.html === 'string' && input.html.trim() && input.html.length <= MAX_HTML, 'El contenido HTML no puede quedar vacío (máximo 2 MB).');
        html = input.html;
      }
      if (m.tipo === 'enlace' && input.url !== undefined) url = this.validarEnlace(input.url);
      await pool.query('UPDATE curso_materiales SET titulo=?,html=?,url=? WHERE id=?', [titulo, html, url, m.id]);
      return { ok: true };
    },
    async eliminarMaterial(actor, materialId) {
      const m = await materialConCurso(materialId);
      await cursoStaff(actor, m.curso_id);
      await pool.query('DELETE FROM curso_materiales WHERE id=?', [m.id]);
      await borrarArchivos([m.archivo]);
      return { ok: true };
    },
    async moverMaterial(actor, materialId, direccion) {
      const m = await materialConCurso(materialId);
      await cursoStaff(actor, m.curso_id);
      return mover('curso_materiales', 'modulo_id', m.id, direccion);
    },
    async guardarExamen(actor, { cursoId, examenId }, input) {
      let previo = null;
      if (examenId) {
        await init();
        [[previo]] = await pool.query('SELECT * FROM curso_examenes WHERE id=?', [Number(examenId) || 0]);
        fallo(previo, 'Examen no encontrado.', 404);
        cursoId = previo.curso_id;
      }
      const curso = await cursoStaff(actor, cursoId);
      fallo(input && typeof input === 'object', 'Datos del examen inválidos.');
      const e = { modulo_id: idOpcional(input.modulo_id, 'El módulo'), titulo: texto(input.titulo, 200, 'el título del examen'),
        instrucciones: texto(input.instrucciones, 3000, 'las instrucciones', false), intentos_max: entero(input.intentos_max ?? 2, 1, 10, 'Los intentos permitidos'),
        publicado: input.publicado === true ? 1 : 0, preguntas: validarPreguntas(input.preguntas) };
      return transaccion(async db => {
        await db.query('SELECT id FROM cursos_online WHERE id=? FOR UPDATE', [curso.id]);
        if (e.modulo_id) {
          const [[m]] = await db.query('SELECT id FROM curso_modulos WHERE id=? AND curso_id=?', [e.modulo_id, curso.id]);
          fallo(m, 'El módulo no pertenece a este curso.');
        }
        const [[otro]] = await db.query(`SELECT id FROM curso_examenes WHERE curso_id=? AND ${e.modulo_id ? 'modulo_id=?' : 'modulo_id IS NULL'} AND id<>?`,
          e.modulo_id ? [curso.id, e.modulo_id, previo?.id ?? 0] : [curso.id, previo?.id ?? 0]);
        fallo(!otro, e.modulo_id ? 'Este módulo ya tiene un examen. Edítelo en lugar de crear otro.' : 'El curso ya tiene un examen final.', 409);
        const valores = [e.modulo_id, e.titulo, e.instrucciones, e.intentos_max, e.publicado, JSON.stringify(e.preguntas)];
        if (previo) {
          await db.query('UPDATE curso_examenes SET modulo_id=?,titulo=?,instrucciones=?,intentos_max=?,publicado=?,preguntas=? WHERE id=?', [...valores, previo.id]);
          return { id: previo.id };
        }
        const [r] = await db.query('INSERT INTO curso_examenes (curso_id,modulo_id,titulo,instrucciones,intentos_max,publicado,preguntas) VALUES (?,?,?,?,?,?,?)', [curso.id, ...valores]);
        return { id: r.insertId };
      });
    },
    async eliminarExamen(actor, examenId) {
      await init();
      const [[e]] = await pool.query('SELECT e.id,e.curso_id,(SELECT COUNT(*) FROM curso_intentos i WHERE i.examen_id=e.id) n FROM curso_examenes e WHERE e.id=?', [Number(examenId) || 0]);
      fallo(e, 'Examen no encontrado.', 404);
      await cursoStaff(actor, e.curso_id);
      fallo(!Number(e.n), 'El examen ya tiene intentos registrados. Despublíquelo en lugar de eliminarlo para conservar las notas.', 409);
      await pool.query('DELETE FROM curso_examenes WHERE id=?', [e.id]);
      return { ok: true };
    },
    async participantes(actor, cursoId) {
      const curso = await cursoStaff(actor, cursoId);
      const [rows] = await pool.query(`SELECT i.id,i.estado,i.pago_referencia,i.observacion,i.certificado_id,i.created_at,
        IF(i.user_id IS NULL,'externo','interno') tipo,
        CASE WHEN u.id IS NOT NULL THEN ${NOMBRE_USUARIO} ELSE ${NOMBRE_CUENTA} END nombre,
        COALESCE(NULLIF(u.carnet_identidad,''),k.documento,'') documento,COALESCE(u.email,k.email) email,
        COALESCE(NULLIF(u.telefono,''),k.telefono,'') telefono,k.institucion,IF(i.cuenta_id IS NULL,1,k.email_verificado) correo_verificado
        FROM curso_inscripciones i LEFT JOIN users u ON u.id=i.user_id LEFT JOIN curso_cuentas k ON k.id=i.cuenta_id
        WHERE i.curso_id=? ORDER BY i.estado='pendiente' DESC,nombre`, [curso.id]);
      const ev = await evaluaciones(curso, rows.map(r => r.id));
      const certs = await certificados(rows.map(r => r.certificado_id));
      return { curso, concluido: ev.concluido, examenes: ev.examenes,
        participantes: rows.map(r => {
          const evaluacion = ev.de(r.id);
          return { ...r, correo_verificado: !!Number(r.correo_verificado), evaluacion, certificable: certificable(r, evaluacion, ev.concluido), certificado: certs.get(r.certificado_id) ?? null };
        }) };
    },

    // ── Participantes (voluntarios y cuentas externas) ──
    async resumen(actor) {
      return { dictando: (await this.cursosDictados(actor)).length };
    },
    async catalogo(actor) {
      await init();
      const hoy = hoyBolivia(), col = columnaActor(actor);
      const [disponibles] = await pool.query(`${CURSO_SQL} WHERE c.estado='publicado' AND c.fecha_fin>=?
        ${actor.tipo === 'cuenta' ? "AND c.visibilidad='publico'" : ''}
        AND NOT EXISTS (SELECT 1 FROM curso_inscripciones x WHERE x.curso_id=c.id AND x.${col}=?)
        AND NOT (c.${actor.tipo === 'usuario' ? 'instructor_user_id' : 'instructor_cuenta_id'} <=> ?)
        ORDER BY c.fecha_inicio,c.id`, [hoy, actor.id, actor.id]);
      const [inscripciones] = await pool.query(`SELECT id,curso_id,estado,pago_referencia,observacion,certificado_id FROM curso_inscripciones WHERE ${col}=? ORDER BY id DESC`, [actor.id]);
      const [cursos] = inscripciones.length ? await pool.query(`${CURSO_SQL} WHERE c.id IN (?) AND c.estado<>'borrador'`, [inscripciones.map(i => i.curso_id)]) : [[]];
      const porId = new Map(cursos.map(c => [c.id, hidratarCurso(c)]));
      const mis = [];
      for (const i of inscripciones) {
        const curso = porId.get(i.curso_id);
        if (!curso) continue;
        const ev = await evaluaciones(curso, [i.id]);
        mis.push({ curso: cursoPublico(curso), inscripcion: { id: i.id, estado: i.estado, pago_referencia: i.pago_referencia, observacion: i.observacion },
          evaluacion: ev.de(i.id), concluido: ev.concluido, certificado: !!i.certificado_id });
      }
      return { disponibles: disponibles.map(c => cursoPublico(hidratarCurso(c))), inscritos: mis };
    },
    // Toda inscripción queda pendiente hasta que presidencia la habilite. El cupo se controla al habilitar.
    async inscribirse(actor, cursoId, input = {}, { avisar = true } = {}) {
      const referencia = texto(input.pago_referencia, 200, 'la referencia del pago', false);
      const r = await transaccion(async db => {
        const [[c]] = await db.query("SELECT *,DATE_FORMAT(fecha_fin,'%Y-%m-%d') fin FROM cursos_online WHERE id=? FOR UPDATE", [Number(cursoId) || 0]);
        fallo(c && c.estado === 'publicado', 'El curso no está disponible para inscripción.', 409);
        fallo(hoyBolivia() <= c.fin, 'El curso ya concluyó.', 409);
        fallo(actor.tipo === 'usuario' || c.visibilidad === 'publico', 'Este curso es exclusivo para miembros de la fundación.', 403);
        fallo(!esInstructorDe(actor, c), 'No puedes inscribirte en un curso que dictas.', 409);
        const previa = await inscripcionDe(actor, c.id, db, true);
        if (previa && ['activa', 'pendiente'].includes(previa.estado)) return { id: previa.id, estado: previa.estado, nueva: false };
        fallo(!previa || previa.estado === 'retirada', 'Tu inscripción fue rechazada. Comunícate con la fundación.', 409);
        if (Number(c.cupo) > 0) {
          const [[{ n }]] = await db.query("SELECT COUNT(*) n FROM curso_inscripciones WHERE curso_id=? AND estado='activa'", [c.id]);
          fallo(Number(n) < Number(c.cupo), 'No quedan cupos disponibles en este curso.', 409);
        }
        if (previa) {
          await db.query("UPDATE curso_inscripciones SET estado='pendiente',pago_referencia=?,observacion=NULL,revisado_por=NULL,revisado_at=NULL WHERE id=?", [referencia || null, previa.id]);
          return { id: previa.id, estado: 'pendiente', nueva: true };
        }
        const [ins] = await db.query(`INSERT INTO curso_inscripciones (curso_id,${columnaActor(actor)},estado,pago_referencia) VALUES (?,?,'pendiente',?)`, [c.id, actor.id, referencia || null]);
        return { id: ins.insertId, estado: 'pendiente', nueva: true };
      });
      if (r.nueva && avisar) enSegundoPlano(this.avisarSolicitud(r.id));
      return { id: r.id, estado: r.estado };
    },
    async registrarPago(actor, cursoId, input) {
      const referencia = texto(input?.pago_referencia, 200, 'la referencia del pago');
      await init();
      const [r] = await pool.query(`UPDATE curso_inscripciones i JOIN cursos_online c ON c.id=i.curso_id SET i.pago_referencia=?
        WHERE i.curso_id=? AND i.${columnaActor(actor)}=? AND i.estado='pendiente' AND c.costo>0`, [referencia, Number(cursoId) || 0, actor.id]);
      fallo(r.affectedRows, 'No tienes una inscripción con pago pendiente en este curso.', 409);
      return { ok: true };
    },
    async aula(actor, cursoId) {
      const curso = await obtenerCurso(cursoId);
      const staff = esGestion(actor) || esInstructorDe(actor, curso);
      const insc = await inscripcionDe(actor, curso.id);
      fallo(staff || (insc && curso.estado !== 'borrador'), 'No estás inscrito en este curso.', 403);
      const motivo = staff ? null : motivoSinAcceso(curso, insc);
      const [modulos] = await pool.query('SELECT id,titulo,descripcion FROM curso_modulos WHERE curso_id=? ORDER BY orden,id', [curso.id]);
      const [materiales] = await pool.query(`SELECT m.id,m.modulo_id,m.titulo,m.tipo FROM curso_materiales m JOIN curso_modulos d ON d.id=m.modulo_id
        WHERE d.curso_id=? ORDER BY m.orden,m.id`, [curso.id]);
      const ev = await evaluaciones(curso, insc ? [insc.id] : []);
      const evaluacion = insc ? ev.de(insc.id) : null;
      const [vistos] = insc ? await pool.query('SELECT material_id FROM curso_progreso WHERE inscripcion_id=?', [insc.id]) : [[]];
      const visto = new Set(vistos.map(v => v.material_id));
      const cert = insc ? (await certificados([insc.certificado_id])).get(insc.certificado_id) ?? null : null;
      return {
        curso: cursoPublico(curso), vista_previa: staff && !insc, acceso: !motivo, motivo,
        inscripcion: insc && { id: insc.id, estado: insc.estado, pago_referencia: insc.pago_referencia, observacion: insc.observacion },
        modulos: modulos.map(m => ({ ...m, materiales: materiales.filter(x => x.modulo_id === m.id).map(x => ({ id: x.id, titulo: x.titulo, tipo: x.tipo, visto: visto.has(x.id) })) })),
        examenes: ev.examenes.map(e => ({ id: e.id, modulo_id: e.modulo_id, titulo: e.titulo, intentos_max: e.intentos_max,
          intentos: evaluacion?.intentos[e.id] ?? 0, mejor: evaluacion?.notas[e.id] ?? null })),
        examenes_abiertos: examenesAbiertos(curso), concluido: ev.concluido, evaluacion,
        certificado: cert && { codigo: cert.codigo, verificacion_path: cert.verificacion_path },
      };
    },
    async contenido(actor, materialId) {
      const m = await materialConCurso(materialId);
      const { insc } = await accesoContenido(actor, m.curso_id);
      if (insc) await pool.query('INSERT IGNORE INTO curso_progreso (inscripcion_id,material_id) VALUES (?,?)', [insc.id, m.id]);
      const r = { id: m.id, titulo: m.titulo, tipo: m.tipo, nombre_original: m.nombre_original, tamano: m.tamano };
      if (m.tipo === 'html') r.html = m.html;
      else if (m.tipo === 'enlace') r.url = m.url;
      // La ruta termina con la extensión: el visor de Office la usa para reconocer la presentación.
      else r.archivo_path = `/cursos/archivo/${jwt.sign({ m: m.id }, secretoArchivos(), { expiresIn: '6h' })}/material-${m.id}${path.extname(m.archivo).toLowerCase()}`;
      return r;
    },
    // Enlace firmado y temporal: permite reproducir video con rangos y abrir presentaciones en el visor de Office.
    async archivo(token) {
      let datos;
      try { datos = jwt.verify(token, secretoArchivos()); } catch { datos = null; }
      fallo(datos?.m, 'El enlace del archivo expiró. Vuelva a abrir el material.', 404);
      const m = await materialConCurso(datos.m);
      fallo(m.archivo, 'Archivo no disponible.', 404);
      const ext = path.extname(m.archivo).toLowerCase();
      return { ruta: path.join(storageDir, path.basename(m.archivo)), tipo: ARCHIVOS[m.tipo]?.[ext] || 'application/octet-stream',
        nombre: m.nombre_original || `material${ext}`, enLinea: m.tipo !== 'presentacion' };
    },
    async examenParaRendir(actor, examenId) {
      await init();
      const [[e]] = await pool.query('SELECT * FROM curso_examenes WHERE id=? AND publicado=1', [Number(examenId) || 0]);
      fallo(e, 'Examen no disponible.', 404);
      const { curso, insc, staff } = await accesoContenido(actor, e.curso_id);
      const examen = hidratarExamen(e);
      const base = { id: examen.id, titulo: examen.titulo, instrucciones: examen.instrucciones, intentos_max: examen.intentos_max, preguntas: preguntasPublicas(examen.preguntas) };
      if (staff) return { ...base, intentos_usados: 0, vista_previa: true };
      fallo(examenesAbiertos(curso), 'Los exámenes se rinden entre la fecha de inicio y fin del curso.', 409);
      const [[{ n }]] = await pool.query('SELECT COUNT(*) n FROM curso_intentos WHERE examen_id=? AND inscripcion_id=?', [e.id, insc.id]);
      fallo(Number(n) < examen.intentos_max, 'Ya usaste todos los intentos de este examen.', 409);
      return { ...base, intentos_usados: Number(n), vista_previa: false };
    },
    async rendir(actor, examenId, respuestas) {
      await init();
      const [[e]] = await pool.query('SELECT * FROM curso_examenes WHERE id=? AND publicado=1', [Number(examenId) || 0]);
      fallo(e, 'Examen no disponible.', 404);
      const { curso, insc, staff } = await accesoContenido(actor, e.curso_id);
      fallo(!staff, 'La vista previa del instructor no registra intentos.', 409);
      fallo(examenesAbiertos(curso), 'Los exámenes se rinden entre la fecha de inicio y fin del curso.', 409);
      const examen = hidratarExamen(e);
      const resultado = calificar(examen.preguntas, respuestas);
      return transaccion(async db => {
        // El bloqueo de la inscripción serializa envíos simultáneos y respeta el límite de intentos.
        await db.query('SELECT id FROM curso_inscripciones WHERE id=? FOR UPDATE', [insc.id]);
        const [[{ n }]] = await db.query('SELECT COUNT(*) n FROM curso_intentos WHERE examen_id=? AND inscripcion_id=?', [e.id, insc.id]);
        fallo(Number(n) < examen.intentos_max, 'Ya usaste todos los intentos de este examen.', 409);
        await db.query('INSERT INTO curso_intentos (examen_id,inscripcion_id,numero,respuestas,puntaje) VALUES (?,?,?,?,?)',
          [e.id, insc.id, Number(n) + 1, JSON.stringify(respuestas), resultado.puntaje]);
        return { puntaje: resultado.puntaje, correctas: resultado.correctas, total: examen.preguntas.length,
          aprobado: resultado.puntaje >= curso.nota_minima, nota_minima: curso.nota_minima,
          intento: Number(n) + 1, intentos_restantes: examen.intentos_max - Number(n) - 1 };
      });
    },
    async certificadoArchivo(actor, cursoId) {
      const curso = await obtenerCurso(cursoId);
      const insc = await inscripcionDe(actor, curso.id);
      const cert = insc ? (await certificados([insc.certificado_id])).get(insc.certificado_id) : null;
      fallo(cert, 'Tu certificado aún no fue emitido.', 404);
      return { ruta: path.join(certificadosDir, `${cert.token}.pdf`), nombre: `${cert.codigo}.pdf` };
    },
  };
}
