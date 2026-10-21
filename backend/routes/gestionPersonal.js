import bcrypt from 'bcryptjs';
import { requireRole } from '../middleware/auth.js';
import { exigir, texto, fecha, hoyBolivia } from '../services/gestion.js';

// Jefatura de personal. Mismo patrón que finanzas y logística: mutaciones idempotentes en
// transacción bloqueada, auditoría en gestion_eventos y bitácora visible en voluntario_log.
export const CODIGOS = { VF: 'Voluntario Fundador', VC: 'Voluntario Colaborador', VR: 'Voluntario Regular' };
export const ESTADOS_PERSONAL = ['activo', 'pasiva', 'cooperador', 'comision', 'baja'];
const ESTADO_LABEL = { activo: 'Activo', pasiva: 'Pasivo', cooperador: 'Cooperador', comision: 'En comisión', baja: 'Baja' };
const ASISTENCIA = ['presente', 'tarde', 'falta', 'permiso', 'comision'];
const SANGRE = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ''];
// [columna, etiqueta, máximo, obligatorio]
export const CAMPOS = [
  ['nombre', 'Nombre', 120, true], ['apellido_paterno', 'Apellido paterno', 100, true], ['apellido_materno', 'Apellido materno', 100],
  ['carnet_identidad', 'Carnet de identidad', 30, true], ['fecha_nacimiento', 'Fecha de nacimiento'], ['tipo_sangre', 'Tipo de sangre'],
  ['telefono', 'Teléfono', 30], ['email', 'Correo', 180, true], ['domicilio', 'Domicilio', 300],
  ['contacto_nombre', 'Contacto de emergencia', 200], ['contacto_telefono', 'Teléfono de contacto', 30], ['especialidad', 'Especialidad', 150],
];
const NOMBRE = t => `TRIM(CONCAT_WS(' ',${t}.nombre,${t}.apellido_paterno,${t}.apellido_materno))`;
const fechaTxt = v => (v instanceof Date ? v.toISOString().slice(0, 10) : v ? String(v).slice(0, 10) : '');

/** Valor normalizado de un campo personal; '' representa vacío. */
function valorCampo([col, label, max, obligatorio], raw) {
  const v = raw === undefined || raw === null ? '' : String(raw).trim();
  if (obligatorio) exigir(v, `${label} es obligatorio`);
  if (col === 'fecha_nacimiento') return v ? fecha(v) : '';
  if (col === 'tipo_sangre') { exigir(SANGRE.includes(v), 'Tipo de sangre inválido'); return v; }
  if (col === 'email' && v) exigir(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Correo inválido');
  exigir(v.length <= max, `${label}: máximo ${max} caracteres`);
  return v;
}

/** Siguiente matrícula de la serie (VF-001, VC-001, VR-001…), igual que la administración de usuarios. */
export async function siguienteMatricula(db, codigo) {
  const [rows] = await db.query('SELECT matricula FROM users WHERE codigo=? AND matricula REGEXP ?', [codigo, `^${codigo}-[0-9]+$`]);
  const max = rows.reduce((m, r) => Math.max(m, parseInt(r.matricula.split('-')[1], 10) || 0), 0);
  return `${codigo}-${String(max + 1).padStart(3, '0')}`;
}

export function registrarPersonal(router, { pool, servicio, get, post, audit }) {
  const jefe = requireRole('jefe_personal', 'presidente');
  // Bitácora del voluntario (la misma que muestra presidencia) dentro de la transacción.
  const bitacora = (db, req, vid, accion, detalle) =>
    db.query('INSERT INTO voluntario_log (voluntario_id,accion,detalle,registrado_por) VALUES (?,?,?,?)', [vid, accion, detalle, req.user.id]);
  async function persona(db, id) {
    const [[p]] = await db.query(`SELECT u.*,COALESCE(u.estado_personal,'activo') estado,${NOMBRE('u')} nombre_completo FROM users u WHERE u.id=? AND u.role<>'admin'`, [Number(id) || 0]);
    exigir(p, 'Persona no encontrada', 404); return p;
  }

  // ── Lista general ──
  router.get('/personal', jefe, get(async () => {
    const [rows] = await pool.query(`SELECT u.id,u.nombre,u.apellido_paterno,u.apellido_materno,${NOMBRE('u')} nombre_completo,u.codigo,u.matricula,u.grado,
      u.cargo_directiva,u.role,u.email,u.telefono,u.carnet_identidad,COALESCE(u.estado_personal,'activo') estado,u.activo,u.total_puntos,u.created_at,
      (SELECT COUNT(*) FROM instruccion_asistencia a WHERE a.voluntario_id=u.id AND a.estado IN ('presente','tarde')) asist_presentes,
      (SELECT COUNT(*) FROM instruccion_asistencia a WHERE a.voluntario_id=u.id AND a.estado='falta') asist_faltas,
      (SELECT COUNT(*) FROM per_llamadas l WHERE l.voluntario_id=u.id) llamadas,
      (SELECT COUNT(*) FROM meritos m WHERE m.voluntario_id=u.id AND m.tipo='merito') meritos,
      (SELECT COUNT(*) FROM meritos m WHERE m.voluntario_id=u.id AND m.tipo='demerito') demeritos,
      (SELECT COUNT(*) FROM voluntario_documentos d WHERE d.voluntario_id=u.id) documentos,
      (SELECT c.destino FROM per_comisiones c WHERE c.voluntario_id=u.id AND c.estado='activa' LIMIT 1) comision_destino
      FROM users u WHERE u.role<>'admin'
      ORDER BY FIELD(COALESCE(u.estado_personal,'activo'),'activo','comision','pasiva','cooperador','baja'), u.role='postulante', FIELD(u.codigo,'VF','VC','VR',''), u.matricula, u.nombre`);
    return { codigos: CODIGOS, personal: rows };
  }));

  // ── Alta de personal con matrícula correlativa ──
  router.post('/personal', jefe, post(async (req, db) => {
    const datos = Object.fromEntries(CAMPOS.map(c => [c[0], valorCampo(c, req.body[c[0]])]));
    exigir(CODIGOS[req.body.codigo], 'Seleccione el código (VF, VC o VR)');
    const estado = req.body.estado || 'activo';
    exigir(['activo', 'pasiva', 'cooperador'].includes(estado), 'Estado inicial inválido');
    exigir(typeof req.body.password === 'string' && req.body.password.length >= 8, 'La contraseña inicial debe tener al menos 8 caracteres');
    const [[existe]] = await db.query('SELECT id FROM users WHERE email=?', [datos.email]);
    exigir(!existe, 'El correo ya está registrado', 409);
    const matricula = await siguienteMatricula(db, req.body.codigo);
    const hash = await bcrypt.hash(req.body.password, 12);
    const cols = Object.keys(datos);
    const [r] = await db.query(`INSERT INTO users (${cols.join(',')},codigo,matricula,estado_personal,password_hash,role,activo) VALUES (${cols.map(() => '?').join(',')},?,?,?,?,'voluntario',1)`,
      [...cols.map(c => c === 'fecha_nacimiento' ? (datos[c] || null) : datos[c]), req.body.codigo, matricula, estado, hash]);
    await bitacora(db, req, r.insertId, 'alta', `Alta de personal con matrícula ${matricula} (${CODIGOS[req.body.codigo]}) · estado ${ESTADO_LABEL[estado]}`);
    await audit(db, req, 'personal', r.insertId, 'alta', { ...datos, codigo: req.body.codigo, matricula, estado });
    return { id: r.insertId, matricula };
  }));

  // ── Edición de datos con detalle antes → después ──
  router.post('/personal/:id/datos', jefe, post(async (req, db) => {
    const p = await persona(db, req.params.id);
    const cambios = [], sets = [], params = [];
    for (const c of CAMPOS) {
      if (!(c[0] in req.body)) continue;
      const nuevo = valorCampo(c, req.body[c[0]]), antes = c[0] === 'fecha_nacimiento' ? fechaTxt(p[c[0]]) : (p[c[0]] ?? '');
      if (String(antes) === nuevo) continue;
      if (c[0] === 'email') { const [[otro]] = await db.query('SELECT id FROM users WHERE email=? AND id<>?', [nuevo, p.id]); exigir(!otro, 'El correo ya está registrado', 409); }
      sets.push(`${c[0]}=?`); params.push(c[0] === 'fecha_nacimiento' && !nuevo ? null : nuevo);
      cambios.push(`${c[1]}: "${antes || '—'}" → "${nuevo || '—'}"`);
    }
    if (!sets.length) return { ok: true, cambios: 0 };
    await db.query(`UPDATE users SET ${sets.join(',')} WHERE id=?`, [...params, p.id]);
    await bitacora(db, req, p.id, 'edicion', `Datos actualizados — ${cambios.join(' · ')}`);
    await audit(db, req, 'personal', p.id, 'edicion', { cambios });
    return { ok: true, cambios: cambios.length };
  }));

  // ── Cambio de código: nueva matrícula correlativa en la serie elegida ──
  router.post('/personal/:id/codigo', jefe, post(async (req, db) => {
    const p = await persona(db, req.params.id);
    exigir(CODIGOS[req.body.codigo], 'Seleccione el código (VF, VC o VR)');
    exigir(p.codigo !== req.body.codigo || !p.matricula, 'La persona ya tiene ese código', 409);
    const motivo = texto(req.body.motivo, 'Motivo del cambio de código', 500);
    const matricula = await siguienteMatricula(db, req.body.codigo);
    await db.query('UPDATE users SET codigo=?,matricula=? WHERE id=?', [req.body.codigo, matricula, p.id]);
    await bitacora(db, req, p.id, 'codigo', `Código: ${p.matricula || 'sin matrícula'} → ${matricula} (${CODIGOS[req.body.codigo]}) — ${motivo}`);
    await audit(db, req, 'personal', p.id, 'codigo', { anterior: p.matricula, matricula, motivo });
    return { ok: true, matricula };
  }));

  // ── Estado del personal (la comisión tiene su propio flujo) ──
  router.post('/personal/:id/estado', jefe, post(async (req, db) => {
    const p = await persona(db, req.params.id);
    exigir(['activo', 'pasiva', 'cooperador', 'baja'].includes(req.body.estado), 'Estado inválido');
    exigir(p.estado !== 'comision', 'Finalice primero la comisión activa', 409);
    exigir(p.estado !== req.body.estado, 'La persona ya tiene ese estado', 409);
    const motivo = texto(req.body.motivo, 'Motivo del cambio de estado', 500);
    await db.query('UPDATE users SET estado_personal=? WHERE id=?', [req.body.estado, p.id]);
    await bitacora(db, req, p.id, 'estado', `Estado: ${ESTADO_LABEL[p.estado]} → ${ESTADO_LABEL[req.body.estado]} — ${motivo}`);
    await audit(db, req, 'personal', p.id, 'estado', { anterior: p.estado, nuevo: req.body.estado, motivo });
    return { ok: true };
  }));

  // ── Comisiones ──
  router.get('/personal/comisiones', jefe, get(async () => {
    const [rows] = await pool.query(`SELECT c.*,${NOMBRE('u')} persona,u.matricula,u.grado,${NOMBRE('r')} creado_nombre,${NOMBRE('f')} finalizada_nombre
      FROM per_comisiones c JOIN users u ON u.id=c.voluntario_id JOIN users r ON r.id=c.creado_por LEFT JOIN users f ON f.id=c.finalizada_por
      ORDER BY c.estado='finalizada', c.desde DESC, c.id DESC`);
    return rows;
  }));
  router.post('/personal/:id/comisiones', jefe, post(async (req, db) => {
    const p = await persona(db, req.params.id);
    exigir(['activo', 'pasiva', 'cooperador'].includes(p.estado), p.estado === 'comision' ? 'La persona ya está en comisión' : 'No se puede comisionar a personal dado de baja', 409);
    const motivo = texto(req.body.motivo, 'Motivo de la comisión'), destino = texto(req.body.destino, 'Destino o institución', 200);
    const desde = fecha(req.body.desde), hasta = req.body.hasta ? fecha(req.body.hasta) : null;
    exigir(!hasta || hasta >= desde, 'La fecha de fin debe ser posterior al inicio');
    const [r] = await db.query('INSERT INTO per_comisiones (voluntario_id,motivo,destino,desde,hasta,estado_anterior,creado_por) VALUES (?,?,?,?,?,?,?)', [p.id, motivo, destino, desde, hasta, p.estado, req.user.id]);
    await db.query("UPDATE users SET estado_personal='comision' WHERE id=?", [p.id]);
    await bitacora(db, req, p.id, 'comision', `Pasa a comisión en ${destino} desde ${desde}${hasta ? ` hasta ${hasta}` : ''} — ${motivo}`);
    await audit(db, req, 'comision', r.insertId, 'asignada', { voluntario_id: p.id, destino, desde, hasta, motivo });
    return { id: r.insertId };
  }));
  router.post('/personal/comisiones/:id/finalizar', jefe, post(async (req, db) => {
    const [[c]] = await db.query('SELECT * FROM per_comisiones WHERE id=?', [req.params.id]);
    exigir(c, 'Comisión no encontrada', 404); exigir(c.estado === 'activa', 'La comisión ya fue finalizada', 409);
    const observacion = texto(req.body.observacion, 'Observación de cierre');
    await db.query("UPDATE per_comisiones SET estado='finalizada',finalizada_por=?,finalizada_at=NOW(),observacion_cierre=? WHERE id=?", [req.user.id, observacion, c.id]);
    // Se restaura el estado previo solo si nadie lo cambió durante la comisión.
    await db.query("UPDATE users SET estado_personal=? WHERE id=? AND estado_personal='comision'", [c.estado_anterior, c.voluntario_id]);
    await bitacora(db, req, c.voluntario_id, 'comision', `Finaliza comisión en ${c.destino}; vuelve a estado ${ESTADO_LABEL[c.estado_anterior] ?? c.estado_anterior} — ${observacion}`);
    await audit(db, req, 'comision', c.id, 'finalizada', { observacion });
    return { ok: true };
  }));

  // ── Reglamento de méritos y deméritos: catálogo de artículos con su puntaje ──
  router.get('/personal/reglamento', requireRole('jefe_personal', 'presidente', 'voluntario'), get(async () =>
    (await pool.query('SELECT * FROM per_reglamento ORDER BY tipo, activo DESC, codigo, puntos DESC, descripcion'))[0]));
  function articulo(body) {
    exigir(['merito', 'demerito'].includes(body.tipo), 'Tipo inválido');
    const codigo = texto(body.codigo, 'Artículo o código del reglamento', 40), descripcion = texto(body.descripcion, 'Descripción', 300);
    const puntos = Number(body.puntos);
    exigir(Number.isInteger(puntos) && puntos >= 0 && puntos <= 1000, 'Puntos inválidos (entero de 0 a 1000)');
    const gravedad = body.tipo === 'demerito' ? body.gravedad : null;
    exigir(body.tipo === 'merito' || ['leve', 'grave', 'muy_grave'].includes(gravedad), 'Seleccione la gravedad de la falta');
    const sancion = body.sancion ? texto(body.sancion, 'Sanción', 300) : null;
    return { tipo: body.tipo, codigo, descripcion, gravedad, puntos, sancion };
  }
  router.post('/personal/reglamento', jefe, post(async (req, db) => {
    const a = articulo(req.body);
    const [r] = await db.query('INSERT INTO per_reglamento (tipo,codigo,descripcion,gravedad,puntos,sancion,creado_por) VALUES (?,?,?,?,?,?,?)', [a.tipo, a.codigo, a.descripcion, a.gravedad, a.puntos, a.sancion, req.user.id]);
    await audit(db, req, 'reglamento', r.insertId, 'creado', a); return { id: r.insertId };
  }));
  // Modificar un artículo solo afecta registros futuros: los anteriores conservan sus puntos.
  router.post('/personal/reglamento/:id', jefe, post(async (req, db) => {
    const [[actual]] = await db.query('SELECT * FROM per_reglamento WHERE id=?', [req.params.id]);
    exigir(actual, 'Artículo no encontrado', 404);
    const a = articulo({ ...req.body, tipo: actual.tipo });
    await db.query('UPDATE per_reglamento SET codigo=?,descripcion=?,gravedad=?,puntos=?,sancion=? WHERE id=?', [a.codigo, a.descripcion, a.gravedad, a.puntos, a.sancion, actual.id]);
    await audit(db, req, 'reglamento', actual.id, 'modificado', { antes: actual, despues: a }); return { ok: true };
  }));
  router.post('/personal/reglamento/:id/estado', jefe, post(async (req, db) => {
    exigir(typeof req.body.activo === 'boolean', 'Estado inválido');
    const [r] = await db.query('UPDATE per_reglamento SET activo=? WHERE id=?', [req.body.activo ? 1 : 0, req.params.id]);
    exigir(r.affectedRows, 'Artículo no encontrado', 404);
    await audit(db, req, 'reglamento', Number(req.params.id), req.body.activo ? 'activado' : 'desactivado'); return { ok: true };
  }));
  async function itemReglamento(db, id, tipo) {
    const [[it]] = await db.query('SELECT * FROM per_reglamento WHERE id=? AND activo=1', [Number(id) || 0]);
    exigir(it && (!tipo || it.tipo === tipo), tipo === 'demerito' ? 'Seleccione una falta vigente del reglamento' : 'Seleccione un artículo vigente del reglamento');
    return it;
  }
  async function aplicarPuntos(db, req, vid, puntos, concepto) {
    if (!puntos) return;
    await db.query('INSERT INTO puntos_voluntario (voluntario_id,puntos,concepto,asignado_por) VALUES (?,?,?,?)', [vid, puntos, concepto, req.user.id]);
    await db.query('UPDATE users SET total_puntos=(SELECT COALESCE(SUM(puntos),0) FROM puntos_voluntario WHERE voluntario_id=?) WHERE id=?', [vid, vid]);
  }

  // ── Llamadas de atención (correlativo LLA); pueden citar una falta del reglamento ──
  const LLAMADAS = `SELECT l.*,${NOMBRE('u')} persona,u.matricula,u.grado,u.carnet_identidad,${NOMBRE('r')} registrado_nombre,
    rg.codigo reglamento_codigo,rg.descripcion reglamento_descripcion,rg.sancion reglamento_sancion
    FROM per_llamadas l JOIN users u ON u.id=l.voluntario_id JOIN users r ON r.id=l.registrado_por LEFT JOIN per_reglamento rg ON rg.id=l.reglamento_id`;
  router.get('/personal/llamadas', jefe, get(async () => (await pool.query(`${LLAMADAS} ORDER BY l.numero DESC`))[0]));
  router.get('/personal/llamadas/:codigo', requireRole('jefe_personal', 'presidente', 'voluntario'), get(async req => {
    const [[l]] = await pool.query(`${LLAMADAS} WHERE l.codigo=?`, [String(req.params.codigo).toUpperCase()]);
    // El voluntario solo consulta los memorándums dirigidos a él.
    exigir(l && (req.user.role !== 'voluntario' || l.voluntario_id === req.user.id), 'Llamada de atención no encontrada', 404); return l;
  }));
  router.post('/personal/:id/llamadas', jefe, post(async (req, db) => {
    const p = await persona(db, req.params.id);
    exigir(['verbal', 'escrita'].includes(req.body.tipo), 'Tipo inválido');
    const falta = req.body.reglamento_id ? await itemReglamento(db, req.body.reglamento_id, 'demerito') : null;
    // Con una falta del reglamento, gravedad y puntos salen del artículo.
    const gravedad = falta ? falta.gravedad ?? 'leve' : req.body.gravedad;
    exigir(['leve', 'grave', 'muy_grave'].includes(gravedad), 'Seleccione la gravedad o una falta del reglamento');
    const motivo = req.body.motivo ? texto(req.body.motivo, 'Motivo', 200) : falta ? falta.descripcion.slice(0, 200) : texto(req.body.motivo, 'Motivo', 200);
    const descripcion = texto(req.body.descripcion, 'Descripción de los hechos', 3000), dia = fecha(req.body.fecha);
    exigir(dia <= hoyBolivia(), 'La fecha no puede ser futura');
    const puntos = falta ? falta.puntos : Number(req.body.puntos || 0);
    exigir(Number.isInteger(puntos) && puntos >= 0 && puntos <= 1000, 'Puntos a descontar inválidos');
    const [[u]] = await db.query('SELECT COALESCE(MAX(numero),0)+1 n FROM per_llamadas');
    const codigo = `LLA${String(u.n).padStart(3, '0')}`;
    await db.query('INSERT INTO per_llamadas (numero,codigo,voluntario_id,tipo,gravedad,motivo,descripcion,fecha,puntos,reglamento_id,registrado_por) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [u.n, codigo, p.id, req.body.tipo, gravedad, motivo, descripcion, dia, puntos, falta?.id ?? null, req.user.id]);
    await aplicarPuntos(db, req, p.id, -puntos, `Llamada de atención ${codigo}: ${motivo}`);
    const cita = falta ? ` · ${falta.codigo}` : '';
    await bitacora(db, req, p.id, 'llamada', `Llamada de atención ${codigo} (${req.body.tipo}, ${gravedad.replace('_', ' ')}${cita}): ${motivo}${puntos ? ` · −${puntos} pts` : ''}`);
    await servicio.notificar(db, `llamada:${codigo}`, 'jefe_personal', p.id, `Llamada de atención ${codigo}`,
      `Personal: ${p.nombre_completo}\nFecha: ${dia}\nMotivo: ${motivo}${falta ? `\nFalta según reglamento: ${falta.codigo} · ${falta.descripcion}` : ''}\nTipo: ${req.body.tipo} · Gravedad: ${gravedad.replace('_', ' ')}\nPuede ver el memorándum en su file y presentar su descargo ante la Jefatura de Personal.`);
    await audit(db, req, 'llamada', u.n, 'registrada', { ...req.body, codigo, gravedad, puntos });
    return { ok: true, comprobante: codigo };
  }));

  // ── Méritos y deméritos según el reglamento (misma tabla que presidencia) ──
  router.post('/personal/:id/meritos', jefe, post(async (req, db) => {
    const p = await persona(db, req.params.id);
    const it = await itemReglamento(db, req.body.reglamento_id);
    const descripcion = texto(req.body.descripcion, 'Descripción de los hechos', 2000), dia = fecha(req.body.fecha);
    exigir(dia <= hoyBolivia(), 'La fecha no puede ser futura');
    const demerito = it.tipo === 'demerito', titulo = `${it.codigo} · ${it.descripcion}`.slice(0, 200);
    const [r] = await db.query('INSERT INTO meritos (voluntario_id,tipo,titulo,descripcion,puntos_extra,fecha,registrado_por,reglamento_id) VALUES (?,?,?,?,?,?,?,?)',
      [p.id, it.tipo, titulo, descripcion, it.puntos, dia, req.user.id, it.id]);
    await aplicarPuntos(db, req, p.id, demerito ? -it.puntos : it.puntos, `${demerito ? 'Demérito' : 'Mérito'}: ${titulo}`);
    await bitacora(db, req, p.id, it.tipo, `${demerito ? 'Demérito' : 'Mérito'} registrado según ${titulo}${it.puntos ? ` (${demerito ? '−' : '+'}${it.puntos} pts)` : ''}`);
    await audit(db, req, 'merito', r.insertId, it.tipo, { voluntario_id: p.id, reglamento_id: it.id, puntos: it.puntos, descripcion });
    return { id: r.insertId };
  }));

  // ── Asistencia: llamar lista, corregir y reporte ──
  router.get('/personal/asistencia', jefe, get(async req => {
    const dia = req.query.fecha ? fecha(String(req.query.fecha)) : hoyBolivia();
    // Se llama lista al personal activo y en comisión (este último se marca «comisión»).
    const [personal] = await pool.query(`SELECT u.id,${NOMBRE('u')} nombre_completo,u.matricula,u.codigo,u.grado,COALESCE(u.estado_personal,'activo') estado,
      (SELECT c.destino FROM per_comisiones c WHERE c.voluntario_id=u.id AND c.estado='activa' LIMIT 1) comision_destino
      FROM users u WHERE u.activo=1 AND u.role NOT IN ('admin','postulante') AND COALESCE(u.estado_personal,'activo') IN ('activo','comision')
      ORDER BY FIELD(u.codigo,'VF','VC','VR',''), u.matricula, u.nombre`);
    const [registros] = await pool.query(`SELECT a.id,a.voluntario_id,a.estado,a.observacion,a.created_at,${NOMBRE('r')} registrado_nombre,
      ${NOMBRE('u')} nombre_completo,u.matricula,u.grado FROM instruccion_asistencia a JOIN users u ON u.id=a.voluntario_id
      LEFT JOIN users r ON r.id=a.registrado_por WHERE a.fecha=? ORDER BY u.matricula`, [dia]);
    return { fecha: dia, personal, registros };
  }));
  router.post('/personal/asistencia', jefe, post(async (req, db) => {
    const dia = fecha(req.body.fecha);
    exigir(dia <= hoyBolivia(), 'No se puede registrar asistencia de una fecha futura');
    const registros = req.body.registros;
    exigir(Array.isArray(registros) && registros.length > 0 && registros.length <= 500, 'La lista está vacía');
    let registrados = 0, omitidos = 0;
    for (const r of registros) {
      exigir(ASISTENCIA.includes(r.estado), 'Estado de asistencia inválido');
      const p = await persona(db, r.voluntario_id);
      const obs = r.observacion ? texto(r.observacion, 'Observación', 500) : '';
      // Un registro por persona y día: lo ya registrado se corrige individualmente.
      const [ins] = await db.query('INSERT IGNORE INTO instruccion_asistencia (voluntario_id,fecha,estado,observacion,registrado_por) VALUES (?,?,?,?,?)', [p.id, dia, r.estado, obs, req.user.id]);
      if (ins.affectedRows) { registrados++; await bitacora(db, req, p.id, 'asistencia', `Asistencia ${r.estado} registrada para el ${dia}`); }
      else omitidos++;
    }
    await audit(db, req, 'asistencia', 0, 'lista', { fecha: dia, registrados, omitidos });
    return { ok: true, registrados, omitidos };
  }));
  router.post('/personal/asistencia/:id/corregir', jefe, post(async (req, db) => {
    const [[a]] = await db.query('SELECT * FROM instruccion_asistencia WHERE id=?', [req.params.id]);
    exigir(a, 'Registro no encontrado', 404);
    exigir(ASISTENCIA.includes(req.body.estado), 'Estado de asistencia inválido');
    exigir(a.estado !== req.body.estado, 'El registro ya tiene ese estado', 409);
    const motivo = texto(req.body.motivo, 'Motivo de la corrección', 500);
    await db.query('UPDATE instruccion_asistencia SET estado=?,observacion=? WHERE id=?', [req.body.estado, motivo, a.id]);
    await bitacora(db, req, a.voluntario_id, 'asistencia', `Asistencia del ${fechaTxt(a.fecha)} corregida: ${a.estado} → ${req.body.estado} — ${motivo}`);
    await audit(db, req, 'asistencia', a.id, 'corregida', { anterior: a.estado, nuevo: req.body.estado, motivo });
    return { ok: true };
  }));
  router.get('/personal/asistencia/reporte', jefe, get(async req => {
    const desde = req.query.desde ? fecha(String(req.query.desde)) : `${hoyBolivia().slice(0, 7)}-01`, hasta = req.query.hasta ? fecha(String(req.query.hasta)) : hoyBolivia();
    exigir(desde <= hasta, 'La fecha inicial debe ser anterior a la final');
    const [detalle] = await pool.query(`SELECT a.fecha,a.estado,a.observacion,a.voluntario_id,${NOMBRE('u')} nombre_completo,u.matricula,u.grado,
      COALESCE(u.estado_personal,'activo') estado_personal FROM instruccion_asistencia a JOIN users u ON u.id=a.voluntario_id
      WHERE a.fecha BETWEEN ? AND ? ORDER BY a.fecha,u.matricula`, [desde, hasta]);
    const personas = new Map(), dias = new Map();
    for (const d of detalle) {
      const k = d.voluntario_id, dia = fechaTxt(d.fecha);
      const p = personas.get(k) ?? { voluntario_id: k, nombre_completo: d.nombre_completo, matricula: d.matricula, grado: d.grado, estado_personal: d.estado_personal, presente: 0, tarde: 0, falta: 0, permiso: 0, comision: 0 };
      p[d.estado]++; personas.set(k, p);
      const x = dias.get(dia) ?? { fecha: dia, presente: 0, tarde: 0, falta: 0, permiso: 0, comision: 0 };
      x[d.estado]++; dias.set(dia, x);
    }
    // Asistencia efectiva: presentes y tardanzas sobre los días exigibles (sin permisos ni comisiones).
    const porcentaje = x => { const base = x.presente + x.tarde + x.falta; return base ? Math.round((x.presente + x.tarde) / base * 1000) / 10 : null; };
    return { desde, hasta, personas: [...personas.values()].map(p => ({ ...p, porcentaje: porcentaje(p) })).sort((a, b) => (a.porcentaje ?? 101) - (b.porcentaje ?? 101)),
      dias: [...dias.values()].map(d => ({ ...d, porcentaje: porcentaje(d) })), detalle: detalle.map(d => ({ ...d, fecha: fechaTxt(d.fecha) })) };
  }));

  // ── Bitácora general de cambios ──
  router.get('/personal/bitacora', jefe, get(async req => {
    const cond = [], params = [];
    if (req.query.voluntario_id) { cond.push('l.voluntario_id=?'); params.push(Number(req.query.voluntario_id) || 0); }
    if (req.query.accion) { cond.push('l.accion=?'); params.push(String(req.query.accion)); }
    if (req.query.desde) { cond.push('l.created_at>=?'); params.push(`${fecha(String(req.query.desde))} 00:00:00`); }
    if (req.query.hasta) { cond.push('l.created_at<=?'); params.push(`${fecha(String(req.query.hasta))} 23:59:59`); }
    const [rows] = await pool.query(`SELECT l.id,l.voluntario_id,l.accion,l.detalle,l.created_at,${NOMBRE('u')} persona,u.matricula,${NOMBRE('r')} registrado_nombre,r.role registrado_rol
      FROM voluntario_log l JOIN users u ON u.id=l.voluntario_id LEFT JOIN users r ON r.id=l.registrado_por
      ${cond.length ? `WHERE ${cond.join(' AND ')}` : ''} ORDER BY l.id DESC LIMIT 500`, params);
    return rows;
  }));

  // ── File completo: lo consulta la jefatura y, sin la bitácora interna, el propio voluntario ──
  async function armarFile(idPersona, interno) {
    const p = await persona(pool, idPersona);
    const id = p.id, opcional = q => q.catch(() => [[]]);
    const [[comisiones], [llamadas], [meritos], [asistencias], [documentos], [certificados], [resoluciones], [capacitaciones], [cursos], [equipos], [bitacoraRows], [[actividad]]] = await Promise.all([
      pool.query(`SELECT c.*,${NOMBRE('r')} creado_nombre FROM per_comisiones c JOIN users r ON r.id=c.creado_por WHERE c.voluntario_id=? ORDER BY c.desde DESC`, [id]),
      pool.query(`SELECT l.*,${NOMBRE('r')} registrado_nombre,rg.codigo reglamento_codigo,rg.descripcion reglamento_descripcion FROM per_llamadas l JOIN users r ON r.id=l.registrado_por LEFT JOIN per_reglamento rg ON rg.id=l.reglamento_id WHERE l.voluntario_id=? ORDER BY l.fecha DESC`, [id]),
      pool.query(`SELECT m.*,${NOMBRE('r')} registrado_nombre,rg.codigo reglamento_codigo,rg.gravedad reglamento_gravedad,rg.sancion reglamento_sancion FROM meritos m LEFT JOIN users r ON r.id=m.registrado_por LEFT JOIN per_reglamento rg ON rg.id=m.reglamento_id WHERE m.voluntario_id=? ORDER BY m.fecha DESC`, [id]),
      pool.query(`SELECT a.id,a.fecha,a.estado,a.observacion,${NOMBRE('r')} registrado_nombre FROM instruccion_asistencia a LEFT JOIN users r ON r.id=a.registrado_por WHERE a.voluntario_id=? ORDER BY a.fecha DESC`, [id]),
      pool.query(`SELECT d.id,d.nombre,d.categoria,d.descripcion,d.archivo_url,d.mime,d.tamano,d.created_at,${NOMBRE('r')} registrado_nombre FROM voluntario_documentos d LEFT JOIN users r ON r.id=d.registrado_por WHERE d.voluntario_id=? ORDER BY d.created_at DESC`, [id]),
      // Certificados emitidos por la institución: se vinculan por carnet de identidad o nombre del participante.
      opcional(pool.query(`SELECT c.numero,c.emitido_at,JSON_UNQUOTE(JSON_EXTRACT(c.datos,'$.curso')) curso,JSON_UNQUOTE(JSON_EXTRACT(c.datos,'$.horas')) horas
        FROM certificados_cursos c WHERE c.estado='emitido' AND ((?<>'' AND JSON_UNQUOTE(JSON_EXTRACT(c.datos,'$.documento')) LIKE CONCAT('%',?,'%'))
        OR JSON_UNQUOTE(JSON_EXTRACT(c.datos,'$.participante'))=?) ORDER BY c.numero DESC`, [p.carnet_identidad || '', p.carnet_identidad || '', p.nombre_completo])),
      opcional(pool.query(`SELECT d.id,d.tipo,d.numero,d.anio,d.titulo,d.fecha,v.rol FROM documentos_presidencia d JOIN documento_presidencia_voluntarios v ON v.documento_id=d.id WHERE v.voluntario_id=? ORDER BY d.fecha DESC`, [id])),
      opcional(pool.query(`SELECT c.nombre,c.tipo,c.fecha,c.horas,i.estado FROM capacitacion_inscripciones i JOIN capacitaciones c ON c.id=i.capacitacion_id WHERE i.voluntario_id=? ORDER BY c.fecha DESC`, [id])),
      opcional(pool.query('SELECT nombre,institucion,tipo,fecha,horas,archivo_url FROM voluntario_cursos WHERE voluntario_id=? ORDER BY fecha DESC', [id])),
      opcional(pool.query(`SELECT p.id,p.estado,p.fecha_devolucion,p.created_at,e.codigo,e.nombre,e.tipo FROM log_prestamos p JOIN log_equipos e ON e.id=p.equipo_id WHERE p.voluntario_id=? ORDER BY p.id DESC`, [id])),
      interno ? pool.query(`SELECT l.id,l.accion,l.detalle,l.created_at,${NOMBRE('r')} registrado_nombre FROM voluntario_log l LEFT JOIN users r ON r.id=l.registrado_por WHERE l.voluntario_id=? ORDER BY l.id DESC LIMIT 300`, [id]) : [[]],
      opcional(pool.query(`SELECT (SELECT COUNT(*) FROM operaciones o WHERE o.voluntario_id=? AND o.estado='validado') operaciones,
        (SELECT COUNT(*) FROM guardias g WHERE g.voluntario_id=?) guardias`, [id, id])),
    ]);
    const resumen = { presente: 0, tarde: 0, falta: 0, permiso: 0, comision: 0 };
    for (const a of asistencias) resumen[a.estado]++;
    const { password_hash, ...datos } = p;
    return { persona: { ...datos, fecha_nacimiento: fechaTxt(p.fecha_nacimiento) }, codigos: CODIGOS, comisiones, llamadas, meritos,
      asistencia: { resumen, registros: asistencias }, documentos, certificados: certificados.map(c => ({ ...c, codigo: `CRTYA-${c.numero}` })),
      resoluciones, capacitaciones, cursos, equipos, actividad: actividad ?? { operaciones: 0, guardias: 0 }, bitacora: bitacoraRows };
  }
  router.get('/personal/:id/file', jefe, get(req => armarFile(req.params.id, true)));
  router.get('/mi-file-completo', requireRole('voluntario'), get(req => armarFile(req.user.id, false)));
}
