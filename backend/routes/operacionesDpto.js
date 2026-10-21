import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { fecha as validarFecha, exigir, ROLES_GUARDIA } from '../services/gestion.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads', 'operaciones'),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `op_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });

export function crearRouterOperaciones(pool) {
const router = Router();
const OPS_ROLES = ['admin','presidente','jefe_operaciones','coordinador'];
// Reglamento RO-001/25: puntos por operación según su alcance.
const PUNTOS_OPERACION = { local: 2, nacional: 10, internacional: 15 };
// Personal que puede figurar como participante (no administradores, postulantes ni bajas).
const SQL_COMPANERO = `activo=1 AND role NOT IN ('admin','postulante') AND COALESCE(estado_personal,'activo')<>'baja'`;

// GET /api/operaciones-dpto/companeros — personal que se puede etiquetar en una operación
router.get('/companeros', verifyToken, requireRole(...OPS_ROLES, 'voluntario'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, TRIM(CONCAT_WS(' ',nombre,apellido_paterno,apellido_materno)) AS nombre, matricula, grado
       FROM users WHERE ${SQL_COMPANERO} AND id<>? ORDER BY nombre, apellido_paterno`, [req.user.id]);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error:'Error del servidor' }); }
});

// GET /api/operaciones-dpto/contactos-validacion — quienes aprueban (para avisar por WhatsApp)
router.get('/contactos-validacion', verifyToken, requireRole(...OPS_ROLES, 'voluntario'), async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT TRIM(CONCAT_WS(' ',nombre,apellido_paterno)) AS nombre, role, telefono FROM users
       WHERE activo=1 AND role IN ('jefe_operaciones','presidente') AND COALESCE(telefono,'')<>''
       ORDER BY FIELD(role,'jefe_operaciones','presidente'), nombre`);
    res.json(rows.map(r => ({ nombre: r.nombre, cargo: r.role === 'presidente' ? 'Presidente' : 'Jefe de Operaciones', telefono: r.telefono })));
  } catch (err) { console.error(err); res.status(500).json({ error:'Error del servidor' }); }
});

// ══════════════════════════════════════════════════════════════════
// OPERACIONES
// ══════════════════════════════════════════════════════════════════

// GET /api/operaciones-dpto — listar (todos los roles operativos)
router.get('/', verifyToken, requireRole(...OPS_ROLES, 'voluntario'), async (req, res) => {
  const { estado, voluntario_id, tipo, page = 1, limit = 20 } = req.query;
  const pageNumber = Math.max(1, Math.floor(Number(page)||1));
  const pageLimit = Math.max(1, Math.min(200, Math.floor(Number(limit)||20)));
  const offset = (pageNumber - 1) * pageLimit;
  const where = [];
  const params = [];
  if (req.user.role === 'voluntario') { where.push('(o.voluntario_id=? OR JSON_CONTAINS(o.personal_participante, ?))'); params.push(req.user.id, String(req.user.id)); }
  if (estado)        { where.push('o.estado=?');         params.push(estado); }
  if (voluntario_id) { where.push('o.voluntario_id=?');  params.push(voluntario_id); }
  if (tipo)          { where.push('o.tipo=?');            params.push(tipo); }
  const wStr = where.length ? `WHERE ${where.join(' AND ')}` : '';
  try {
    const [rows] = await pool.query(
      `SELECT o.*,
        CONCAT(v.nombre,' ',v.apellido_paterno) AS voluntario_nombre, v.matricula,
        CONCAT(of2.nombre,' ',of2.apellido_paterno) AS oficial_nombre, of2.role AS oficial_role,
        CONCAT(r.nombre,' ',r.apellido_paterno) AS registrado_nombre,
        CONCAT(val.nombre,' ',val.apellido_paterno) AS validado_nombre
       FROM operaciones o
       LEFT JOIN users v    ON o.voluntario_id = v.id
       LEFT JOIN users of2  ON o.oficial_responsable_id = of2.id
       LEFT JOIN users r    ON o.registrado_por = r.id
       LEFT JOIN users val ON o.validado_por = val.id
       ${wStr} ORDER BY o.fecha DESC LIMIT ? OFFSET ?`,
      [...params, pageLimit, offset]
    );
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM operaciones o ${wStr}`, params);
    res.json({ data: rows, total, page: pageNumber, pages: Math.ceil(total/pageLimit) });
  } catch(err) { console.error(err); res.status(500).json({ error:'Error del servidor' }); }
});

// POST /api/operaciones-dpto — registrar operación (con imagen multipart)
router.post('/', verifyToken, requireRole(...OPS_ROLES, 'voluntario'),
  upload.single('imagen_respaldo'), async (req, res) => {
  const { tipo, titulo, descripcion, lugar, fecha, duracion_horas,
          voluntario_id, oficial_responsable_id, personal_participante } = req.body;
  if (!titulo || !fecha) return res.status(400).json({ error:'Título y fecha son requeridos' });
  if (typeof titulo !== 'string' || titulo.trim().length > 200 || !titulo.trim() ||
      !['local','nacional','internacional'].includes(tipo||'local') ||
      !Number.isFinite(Number(duracion_horas||0)) || Number(duracion_horas||0)<0 || Number(duracion_horas||0)>999.99 ||
      typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(fecha) || isNaN(Date.parse(fecha))) {
    return res.status(400).json({error:'Revise el título, tipo, fecha y duración de la operación'});
  }
  try { validarFecha(fecha.slice(0,10)); } catch { return res.status(400).json({error:'Fecha inválida'}); }
  const imagen_url = req.file ? `/uploads/operaciones/${req.file.filename}` : '';
  try {
    let personal = personal_participante
      ? (typeof personal_participante === 'string' ? personal_participante : JSON.stringify(personal_participante))
      : '[]';
    // El voluntario figura siempre como participante y puede etiquetar a compañeros activos.
    if (req.user.role === 'voluntario') {
      let etiquetas = req.body.participantes ?? [];
      if (typeof etiquetas === 'string') { try { etiquetas = JSON.parse(etiquetas); } catch { etiquetas = null; } }
      if (!Array.isArray(etiquetas) || etiquetas.length > 50 || !etiquetas.every(id => Number.isInteger(Number(id)) && Number(id) > 0))
        return res.status(400).json({ error: 'Participantes inválidos' });
      const ids = [...new Set(etiquetas.map(Number).filter(id => id !== req.user.id))];
      if (ids.length) {
        const [validos] = await pool.query(`SELECT id FROM users WHERE id IN (?) AND ${SQL_COMPANERO}`, [ids]);
        if (validos.length !== ids.length) return res.status(400).json({ error: 'Solo puede etiquetar a personal activo de la institución' });
      }
      personal = JSON.stringify([req.user.id, ...ids]);
    }
    const [r] = await pool.query(
      `INSERT INTO operaciones
       (tipo,titulo,descripcion,lugar,fecha,duracion_horas,
        voluntario_id,oficial_responsable_id,personal_participante,
        imagen_respaldo,registrado_por,estado)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,'pendiente')`,
      [tipo||'local', titulo, descripcion||'', lugar||'', fecha, duracion_horas||0,
       req.user.role === 'voluntario' ? req.user.id : voluntario_id||null, oficial_responsable_id||null,
       personal,
       imagen_url, req.user.id]
    );
    res.status(201).json({ id: r.insertId });
  } catch(err) { console.error(err); res.status(500).json({ error:'Error del servidor' }); }
});

// PUT /api/operaciones-dpto/:id/validar — validar o rechazar
router.put('/:id/validar', verifyToken, requireRole(...OPS_ROLES), async (req, res) => {
  const { estado, observacion_validacion = '', participantes } = req.body;
  if (!['validado','rechazado'].includes(estado)) return res.status(400).json({ error:'Estado inválido' });
  if (participantes !== undefined && (!Array.isArray(participantes) || !participantes.every(id => Number.isInteger(Number(id)) && Number(id) > 0)))
    return res.status(400).json({ error:'Participantes inválidos' });
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    const [[op]] = await conn.query('SELECT estado, tipo, voluntario_id, titulo, personal_participante FROM operaciones WHERE id=? FOR UPDATE',[req.params.id]);
    exigir(op,'Operación no encontrada',404);
    exigir(op.estado==='pendiente','La operación ya fue validada o rechazada',409);
    // Participantes registrados: personal_participante + voluntario responsable.
    const registrados = new Set();
    try {
      const parsed = typeof op.personal_participante === 'string' ? JSON.parse(op.personal_participante || '[]') : op.personal_participante || [];
      if (Array.isArray(parsed)) parsed.forEach(id => { if(Number.isInteger(Number(id)) && Number(id)>0) registrados.add(Number(id)); });
    } catch {}
    if (op.voluntario_id) registrados.add(Number(op.voluntario_id));
    // Quien valida puede confirmar solo a una parte de los etiquetados (no agregar nuevos).
    const confirmados = participantes ? [...new Set(participantes.map(Number))] : [...registrados];
    exigir(confirmados.every(id => registrados.has(id)), 'Solo se pueden confirmar participantes registrados en la operación');
    exigir(estado === 'rechazado' || confirmados.length > 0, 'Confirme al menos un participante');
    // Puntos según el Reglamento RO-001/25: no se escriben a mano.
    const puntos_asignados = estado === 'validado' ? PUNTOS_OPERACION[op.tipo] ?? PUNTOS_OPERACION.local : 0;
    await conn.query(
      `UPDATE operaciones SET estado=?,puntos_asignados=?,observacion_validacion=?,validado_por=?,personal_participante=? WHERE id=?`,
      [estado, puntos_asignados, observacion_validacion, req.user.id, JSON.stringify(estado === 'validado' ? confirmados : [...registrados]), req.params.id]
    );
    // Asignar puntos a los participantes confirmados si se valida
    if (estado === 'validado' && puntos_asignados > 0) {
      const ids = new Set(confirmados);
      const concepto = `Operación validada: ${op.titulo || ''}`;

      for (const vid of ids) {
        // Registrar en historial de puntos
        await conn.query(
          `INSERT INTO puntos_voluntario (voluntario_id,puntos,concepto,operacion_id,asignado_por)
           VALUES (?,?,?,?,?)`,
          [vid, puntos_asignados, concepto, req.params.id, req.user.id]
        );
        // Recalcular total_puntos desde el historial real (evita acumulación errónea)
        await conn.query(
          `UPDATE users u
           SET u.total_puntos = (
             SELECT COALESCE(SUM(p.puntos), 0)
             FROM puntos_voluntario p
             WHERE p.voluntario_id = ?
           )
           WHERE u.id = ?`,
          [vid, vid]
        );
      }
    }
    await conn.commit();
    res.json({ ok: true, puntos_asignados, participantes: estado === 'validado' ? confirmados.length : 0 });
  } catch(err) { if(conn) await conn.rollback(); console.error(err.message); res.status(err.status||500).json({ error:err.status?err.message:'Error del servidor' }); }
  finally { if(conn)conn.release(); }
});

// DELETE /api/operaciones-dpto/:id
router.delete('/:id', verifyToken, requireRole(...OPS_ROLES), async (req, res) => {
  try {
    await pool.query('DELETE FROM operaciones WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch(err) { console.error(err); res.status(500).json({ error:'Error del servidor' }); }
});

// ══════════════════════════════════════════════════════════════════
// LIBRO DE GUARDIA
// ══════════════════════════════════════════════════════════════════

router.get('/guardias', verifyToken, requireRole(...OPS_ROLES, 'voluntario'), async (req, res) => {
  const { fecha_desde, fecha_hasta } = req.query;
  const where = []; const params = [];
  if (req.user.role === 'voluntario') { where.push('g.voluntario_id=?'); params.push(req.user.id); }
  if (fecha_desde) { where.push('g.fecha >= ?'); params.push(fecha_desde); }
  if (fecha_hasta) { where.push('g.fecha <= ?'); params.push(fecha_hasta); }
  const wStr = where.length ? `WHERE ${where.join(' AND ')}` : '';
  try {
    const [rows] = await pool.query(
      `SELECT g.*, CONCAT(v.nombre,' ',v.apellido_paterno) AS voluntario_nombre,
        v.matricula, v.codigo,
        CONCAT(r.nombre,' ',r.apellido_paterno) AS registrado_nombre
       FROM guardias g
       LEFT JOIN users v ON g.voluntario_id = v.id
       LEFT JOIN users r ON g.registrado_por = r.id
       ${wStr} ORDER BY g.fecha DESC, g.turno`,
      params
    );
    res.json(rows);
  } catch(err) { console.error(err); res.status(500).json({ error:'Error del servidor' }); }
});

router.post('/guardias', verifyToken, requireRole(...OPS_ROLES, 'voluntario'), async (req, res) => {
  const { fecha, turno, voluntario_id, rol_guardia, novedades, operativos_count } = req.body;
  const voluntarioId = req.user.role === 'voluntario' ? req.user.id : voluntario_id;
  if (!fecha || !voluntarioId) return res.status(400).json({ error:'Fecha y voluntario requeridos' });
  try { validarFecha(fecha); } catch { return res.status(400).json({error:'Fecha inválida'}); }
  if (rol_guardia && !ROLES_GUARDIA.includes(rol_guardia)) return res.status(400).json({ error:`Rol de guardia inválido. Opciones: ${ROLES_GUARDIA.join(', ')}` });
  if (!['diurno','nocturno','24h'].includes(turno || 'diurno')) return res.status(400).json({error:'Turno inválido'});
  try {
    const [r] = await pool.query(
      `INSERT INTO guardias (fecha,turno,voluntario_id,rol_guardia,novedades,operativos_count,registrado_por)
       VALUES (?,?,?,?,?,?,?)`,
      [fecha, turno||'diurno', voluntarioId, rol_guardia||'', novedades||'', operativos_count||0, req.user.id]
    );
    res.status(201).json({ id: r.insertId });
  } catch(err) { console.error(err); res.status(500).json({ error:'Error del servidor' }); }
});

router.delete('/guardias/:id', verifyToken, requireRole(...OPS_ROLES), async (req, res) => {
  try {
    await pool.query('DELETE FROM guardias WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch(err) { console.error(err); res.status(500).json({ error:'Error del servidor' }); }
});

// ══════════════════════════════════════════════════════════════════
// PUNTOS Y MÉRITOS
// ══════════════════════════════════════════════════════════════════

router.get('/puntos/:voluntario_id', verifyToken, requireRole(...OPS_ROLES), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, CONCAT(a.nombre,' ',a.apellido_paterno) AS asignado_nombre
       FROM puntos_voluntario p LEFT JOIN users a ON p.asignado_por=a.id
       WHERE p.voluntario_id=? ORDER BY p.created_at DESC`,
      [req.params.voluntario_id]
    );
    const [[user]] = await pool.query('SELECT total_puntos FROM users WHERE id=?', [req.params.voluntario_id]);
    res.json({ historial: rows, total: user?.total_puntos ?? 0 });
  } catch(err) { console.error(err); res.status(500).json({ error:'Error del servidor' }); }
});

router.post('/puntos', verifyToken, requireRole(...OPS_ROLES), async (req, res) => {
  const { voluntario_id, puntos, concepto } = req.body;
  if (!voluntario_id || !puntos || !concepto) return res.status(400).json({ error:'Datos incompletos' });
  try {
    await pool.query(
      `INSERT INTO puntos_voluntario (voluntario_id,puntos,concepto,asignado_por) VALUES (?,?,?,?)`,
      [voluntario_id, puntos, concepto, req.user.id]
    );
    await pool.query(`UPDATE users SET total_puntos=total_puntos+? WHERE id=?`, [puntos, voluntario_id]);
    res.status(201).json({ ok: true });
  } catch(err) { console.error(err); res.status(500).json({ error:'Error del servidor' }); }
});

// ══════════════════════════════════════════════════════════════════
// MÉRITOS / ANTIGÜEDAD
// ══════════════════════════════════════════════════════════════════

router.get('/meritos', verifyToken, requireRole(...OPS_ROLES), async (req, res) => {
  const { voluntario_id } = req.query;
  const where = voluntario_id ? 'WHERE m.voluntario_id=?' : '';
  const params = voluntario_id ? [voluntario_id] : [];
  try {
    const [rows] = await pool.query(
      `SELECT m.*, CONCAT(v.nombre,' ',v.apellido_paterno) AS voluntario_nombre, v.matricula,
        CONCAT(r.nombre,' ',r.apellido_paterno) AS registrado_nombre
       FROM meritos m
       LEFT JOIN users v ON m.voluntario_id=v.id
       LEFT JOIN users r ON m.registrado_por=r.id
       ${where} ORDER BY m.fecha DESC`,
      params
    );
    res.json(rows);
  } catch(err) { console.error(err); res.status(500).json({ error:'Error del servidor' }); }
});

router.post('/meritos', verifyToken, requireRole(...OPS_ROLES), async (req, res) => {
  const { voluntario_id, tipo, titulo, descripcion, puntos_extra, fecha } = req.body;
  if (!voluntario_id || !titulo || !fecha) return res.status(400).json({ error:'Datos incompletos' });
  try {
    await pool.query(
      `INSERT INTO meritos (voluntario_id,tipo,titulo,descripcion,puntos_extra,fecha,registrado_por)
       VALUES (?,?,?,?,?,?,?)`,
      [voluntario_id, tipo||'merito', titulo, descripcion||'', puntos_extra||0, fecha, req.user.id]
    );
    if ((puntos_extra||0) > 0) {
      await pool.query(`UPDATE users SET total_puntos=total_puntos+? WHERE id=?`, [puntos_extra, voluntario_id]);
    }
    // Actualizar antigüedad si aplica
    if (tipo === 'antiguedad') {
      await pool.query(`UPDATE users SET antiguedad_anios=? WHERE id=?`, [puntos_extra, voluntario_id]);
    }
    res.status(201).json({ ok: true });
  } catch(err) { console.error(err); res.status(500).json({ error:'Error del servidor' }); }
});

// GET /api/operaciones-dpto/por-voluntario/:id — todas las operaciones donde participó (responsable o participante)
router.get('/por-voluntario/:id', verifyToken, requireRole(...OPS_ROLES), async (req, res) => {
  const vid = Number(req.params.id);
  if (!vid) return res.status(400).json({ error: 'ID inválido' });
  try {
    const [rows] = await pool.query(
      `SELECT o.*,
         CONCAT(v.nombre,' ',v.apellido_paterno) AS voluntario_nombre, v.matricula,
         CONCAT(of2.nombre,' ',of2.apellido_paterno) AS oficial_nombre
       FROM operaciones o
       LEFT JOIN users v   ON o.voluntario_id = v.id
       LEFT JOIN users of2 ON o.oficial_responsable_id = of2.id
       WHERE o.voluntario_id = ?
          OR (o.personal_participante IS NOT NULL
              AND o.personal_participante != ''
              AND JSON_CONTAINS(o.personal_participante, ?))
       ORDER BY o.fecha DESC`,
      [vid, String(vid)]
    );
    res.json({ data: rows });
  } catch(err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// GET /api/operaciones-dpto/voluntarios-ranking — ranking completo de voluntarios con stats
router.get('/voluntarios-ranking', verifyToken, requireRole(...OPS_ROLES), async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT u.id, u.nombre, u.apellido_paterno, u.matricula, u.codigo,
             u.grado, u.cargo_directiva, u.especialidad,
             u.total_puntos, COALESCE(u.antiguedad_anios, 0) AS antiguedad_anios,
             (SELECT COUNT(*) FROM operaciones o WHERE o.voluntario_id = u.id AND o.estado='validado') AS ops_validadas,
             (SELECT COUNT(*) FROM meritos m WHERE m.voluntario_id = u.id AND m.tipo='merito')    AS meritos_count,
             (SELECT COUNT(*) FROM meritos m WHERE m.voluntario_id = u.id AND m.tipo='demerito')  AS demeritos_count
      FROM users u
      WHERE u.activo = 1
      ORDER BY u.total_puntos DESC, u.nombre ASC
    `);
    res.json(rows);
  } catch(err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// GET /api/operaciones-dpto/resumen — dashboard ejecutivo del departamento
router.get('/resumen', verifyToken, requireRole(...OPS_ROLES), async (req, res) => {
  try {
    const year = new Date().getFullYear();
    const [[ops]]   = await pool.query(`SELECT COUNT(*) as total, SUM(CASE WHEN estado='validado' THEN 1 ELSE 0 END) as validadas, SUM(CASE WHEN estado='pendiente' THEN 1 ELSE 0 END) as pendientes FROM operaciones WHERE YEAR(fecha)=?`, [year]);
    const [[gds]]   = await pool.query(`SELECT COUNT(*) as total FROM guardias WHERE YEAR(fecha)=?`, [year]);
    const [[pts]]   = await pool.query(`SELECT SUM(puntos) as total FROM puntos_voluntario`);
    const [top5]    = await pool.query(`SELECT u.id,u.nombre,u.apellido_paterno,u.matricula,u.total_puntos FROM users u WHERE u.activo=1 ORDER BY u.total_puntos DESC LIMIT 5`);
    const [recOps]  = await pool.query(`SELECT o.*, CONCAT(v.nombre,' ',v.apellido_paterno) AS voluntario_nombre FROM operaciones o LEFT JOIN users v ON o.voluntario_id=v.id ORDER BY o.fecha DESC LIMIT 5`);
    res.json({
      operaciones: { total: ops.total, validadas: ops.validadas, pendientes: ops.pendientes },
      guardias: { total: gds.total },
      puntos_totales: pts.total ?? 0,
      top5_puntos: top5,
      recientes: recOps,
    });
  } catch(err) { console.error(err); res.status(500).json({ error:'Error del servidor' }); }
});

return router;
}
export default crearRouterOperaciones(pool);
