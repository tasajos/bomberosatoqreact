import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads', 'operaciones'),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `op_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });

const router = Router();
const OPS_ROLES = ['admin','presidente','jefe_operaciones','coordinador'];

// ══════════════════════════════════════════════════════════════════
// OPERACIONES
// ══════════════════════════════════════════════════════════════════

// GET /api/operaciones-dpto — listar (todos los roles operativos)
router.get('/', verifyToken, requireRole(...OPS_ROLES, 'voluntario'), async (req, res) => {
  const { estado, voluntario_id, tipo, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const where = [];
  const params = [];
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
      [...params, Number(limit), offset]
    );
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM operaciones o ${wStr}`, params);
    res.json({ data: rows, total, page: Number(page), pages: Math.ceil(total/limit) });
  } catch(err) { console.error(err); res.status(500).json({ error:'Error del servidor' }); }
});

// POST /api/operaciones-dpto — registrar operación (con imagen multipart)
router.post('/', verifyToken, requireRole(...OPS_ROLES, 'voluntario'),
  upload.single('imagen_respaldo'), async (req, res) => {
  const { tipo, titulo, descripcion, lugar, fecha, duracion_horas,
          voluntario_id, oficial_responsable_id, personal_participante } = req.body;
  if (!titulo || !fecha) return res.status(400).json({ error:'Título y fecha son requeridos' });
  const imagen_url = req.file ? `/uploads/operaciones/${req.file.filename}` : '';
  try {
    const personal = personal_participante
      ? (typeof personal_participante === 'string' ? personal_participante : JSON.stringify(personal_participante))
      : '[]';
    const [r] = await pool.query(
      `INSERT INTO operaciones
       (tipo,titulo,descripcion,lugar,fecha,duracion_horas,
        voluntario_id,oficial_responsable_id,personal_participante,
        imagen_respaldo,registrado_por,estado)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,'pendiente')`,
      [tipo||'local', titulo, descripcion||'', lugar||'', fecha, duracion_horas||0,
       voluntario_id||null, oficial_responsable_id||null, personal,
       imagen_url, req.user.id]
    );
    res.status(201).json({ id: r.insertId });
  } catch(err) { console.error(err); res.status(500).json({ error:'Error del servidor' }); }
});

// PUT /api/operaciones-dpto/:id/validar — validar o rechazar
router.put('/:id/validar', verifyToken, requireRole(...OPS_ROLES), async (req, res) => {
  const { estado, puntos_asignados = 0, observacion_validacion = '' } = req.body;
  if (!['validado','rechazado'].includes(estado)) return res.status(400).json({ error:'Estado inválido' });
  try {
    await pool.query(
      `UPDATE operaciones SET estado=?,puntos_asignados=?,observacion_validacion=?,validado_por=? WHERE id=?`,
      [estado, puntos_asignados, observacion_validacion, req.user.id, req.params.id]
    );
    // Asignar puntos a TODOS los participantes si se valida
    if (estado === 'validado' && puntos_asignados > 0) {
      const [[op]] = await pool.query(
        'SELECT voluntario_id, titulo, personal_participante FROM operaciones WHERE id=?',
        [req.params.id]
      );

      // Construir lista de IDs a los que asignar puntos:
      // personal_participante + voluntario_id (si no está ya en la lista)
      let ids = new Set();
      try {
        const parsed = JSON.parse(op?.personal_participante || '[]');
        if (Array.isArray(parsed)) parsed.forEach(id => ids.add(id));
      } catch {}
      if (op?.voluntario_id) ids.add(op.voluntario_id);

      const concepto = `Operación validada: ${op?.titulo || ''}`;

      for (const vid of ids) {
        // Registrar en historial de puntos
        await pool.query(
          `INSERT INTO puntos_voluntario (voluntario_id,puntos,concepto,operacion_id,asignado_por)
           VALUES (?,?,?,?,?)`,
          [vid, puntos_asignados, concepto, req.params.id, req.user.id]
        );
        // Recalcular total_puntos desde el historial real (evita acumulación errónea)
        await pool.query(
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
    res.json({ ok: true, participantes_actualizados: true });
  } catch(err) { console.error(err); res.status(500).json({ error:'Error del servidor' }); }
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

router.get('/guardias', verifyToken, requireRole(...OPS_ROLES), async (req, res) => {
  const { fecha_desde, fecha_hasta } = req.query;
  const where = []; const params = [];
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

router.post('/guardias', verifyToken, requireRole(...OPS_ROLES), async (req, res) => {
  const { fecha, turno, voluntario_id, rol_guardia, novedades, operativos_count } = req.body;
  if (!fecha || !voluntario_id) return res.status(400).json({ error:'Fecha y voluntario requeridos' });
  try {
    const [r] = await pool.query(
      `INSERT INTO guardias (fecha,turno,voluntario_id,rol_guardia,novedades,operativos_count,registrado_por)
       VALUES (?,?,?,?,?,?,?)`,
      [fecha, turno||'diurno', voluntario_id, rol_guardia||'', novedades||'', operativos_count||0, req.user.id]
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

export default router;
