import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pool from '../db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.join(__dirname, '..', 'uploads', 'documentos');
fs.mkdirSync(DOCS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: DOCS_DIR,
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = path.basename(file.originalname, ext).replace(/[^a-z0-9_-]/gi, '_').slice(0, 40);
    cb(null, `doc_${Date.now()}_${safe}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

const router = Router();
const PERSONAL_ROLES = ['admin', 'presidente', 'jefe_personal', 'coordinador'];

// ══════════════════════════════════════════════════════════════════
// Tablas (se crean automáticamente si no existen)
// ══════════════════════════════════════════════════════════════════
async function initTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS instruccion_asistencia (
      id             INT PRIMARY KEY AUTO_INCREMENT,
      voluntario_id  INT NOT NULL,
      fecha          DATE NOT NULL,
      estado         ENUM('presente','falta','permiso','comision') NOT NULL DEFAULT 'presente',
      observacion    TEXT,
      registrado_por INT,
      created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_vol_fecha (voluntario_id, fecha),
      FOREIGN KEY (voluntario_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS voluntario_log (
      id             INT PRIMARY KEY AUTO_INCREMENT,
      voluntario_id  INT NOT NULL,
      accion         VARCHAR(40) NOT NULL,
      detalle        TEXT,
      registrado_por INT,
      created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (voluntario_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS voluntario_documentos (
      id             INT PRIMARY KEY AUTO_INCREMENT,
      voluntario_id  INT NOT NULL,
      nombre         VARCHAR(200) NOT NULL,
      categoria      ENUM('identidad','certificado','medico','administrativo','formacion','otro') NOT NULL DEFAULT 'otro',
      descripcion    TEXT,
      archivo_url    VARCHAR(500) NOT NULL,
      mime           VARCHAR(120),
      tamano         INT,
      registrado_por INT,
      created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (voluntario_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}
initTables().catch(e => console.error('personal init:', e));

// Registra una entrada en la bitácora del voluntario
async function logAccion(vid, accion, detalle, userId) {
  try {
    await pool.query(
      `INSERT INTO voluntario_log (voluntario_id, accion, detalle, registrado_por) VALUES (?,?,?,?)`,
      [vid, accion, detalle, userId]
    );
  } catch (e) { console.error('log:', e); }
}

// ══════════════════════════════════════════════════════════════════
// LISTA DE PERSONAL — voluntarios + postulantes con estadísticas
// ══════════════════════════════════════════════════════════════════
router.get('/', verifyToken, requireRole(...PERSONAL_ROLES), async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        u.id, u.nombre, u.apellido_paterno, u.apellido_materno,
        u.matricula, u.codigo, u.grado, u.cargo_directiva, u.especialidad,
        u.role, u.telefono, u.email, u.tipo_sangre,
        u.fecha_nacimiento, u.carnet_identidad, u.domicilio,
        u.contacto_nombre, u.contacto_telefono,
        u.total_puntos, COALESCE(u.antiguedad_anios, 0) AS antiguedad_anios,
        u.activo, u.created_at,
        (SELECT COUNT(*) FROM operaciones o WHERE o.voluntario_id = u.id AND o.estado='validado') AS ops_validadas,
        (SELECT COUNT(*) FROM meritos m WHERE m.voluntario_id = u.id AND m.tipo='merito')    AS meritos_count,
        (SELECT COUNT(*) FROM meritos m WHERE m.voluntario_id = u.id AND m.tipo='demerito')  AS demeritos_count,
        (SELECT COUNT(*) FROM instruccion_asistencia a WHERE a.voluntario_id = u.id AND a.estado='presente') AS asist_presente,
        (SELECT COUNT(*) FROM instruccion_asistencia a WHERE a.voluntario_id = u.id AND a.estado='falta')    AS asist_falta,
        (SELECT COUNT(*) FROM voluntario_documentos d WHERE d.voluntario_id = u.id) AS docs_count
      FROM users u
      WHERE u.activo = 1 AND u.role <> 'admin'
      ORDER BY
        CASE WHEN u.role = 'postulante' THEN 1 ELSE 0 END,
        u.total_puntos DESC, u.apellido_paterno ASC
    `);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// ══════════════════════════════════════════════════════════════════
// DETALLE COMPLETO DE UNA PERSONA
// ══════════════════════════════════════════════════════════════════
router.get('/:id', verifyToken, requireRole(...PERSONAL_ROLES), async (req, res) => {
  const vid = Number(req.params.id);
  if (!vid) return res.status(400).json({ error: 'ID inválido' });
  try {
    const [[usuario]] = await pool.query(`
      SELECT id, nombre, apellido_paterno, apellido_materno, fecha_nacimiento,
             carnet_identidad, domicilio, telefono, contacto_nombre, contacto_telefono,
             codigo, matricula, especialidad, tipo_sangre, grado, cargo_directiva,
             email, role, activo, total_puntos, COALESCE(antiguedad_anios,0) AS antiguedad_anios, created_at
      FROM users WHERE id=?`, [vid]
    );
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    const [meritos] = await pool.query(
      `SELECT m.*, CONCAT(r.nombre,' ',r.apellido_paterno) AS registrado_nombre
       FROM meritos m LEFT JOIN users r ON m.registrado_por = r.id
       WHERE m.voluntario_id=? ORDER BY m.fecha DESC`, [vid]
    );

    const [asistencias] = await pool.query(
      `SELECT a.*, CONCAT(r.nombre,' ',r.apellido_paterno) AS registrado_nombre
       FROM instruccion_asistencia a LEFT JOIN users r ON a.registrado_por = r.id
       WHERE a.voluntario_id=? ORDER BY a.fecha DESC`, [vid]
    );

    const [documentos] = await pool.query(
      `SELECT d.*, CONCAT(r.nombre,' ',r.apellido_paterno) AS registrado_nombre
       FROM voluntario_documentos d LEFT JOIN users r ON d.registrado_por = r.id
       WHERE d.voluntario_id=? ORDER BY d.created_at DESC`, [vid]
    );

    const [operaciones] = await pool.query(
      `SELECT o.id, o.titulo, o.tipo, o.fecha, o.estado, o.puntos_asignados, o.lugar
       FROM operaciones o
       WHERE o.voluntario_id=? OR JSON_CONTAINS(COALESCE(NULLIF(o.personal_participante,''),'[]'), CAST(? AS JSON))
       ORDER BY o.fecha DESC`, [vid, String(vid)]
    ).catch(() => [[]]);

    // Desglose detallado de puntos (de dónde sale el total)
    const [puntos_historial] = await pool.query(
      `SELECT p.id, p.puntos, p.concepto, p.operacion_id, p.created_at,
              CONCAT(a.nombre,' ',a.apellido_paterno) AS asignado_nombre
       FROM puntos_voluntario p LEFT JOIN users a ON p.asignado_por = a.id
       WHERE p.voluntario_id=? ORDER BY p.created_at DESC`, [vid]
    ).catch(() => [[]]);

    // Bitácora de cambios del voluntario
    const [log] = await pool.query(
      `SELECT l.id, l.accion, l.detalle, l.created_at,
              CONCAT(r.nombre,' ',r.apellido_paterno) AS registrado_nombre
       FROM voluntario_log l LEFT JOIN users r ON l.registrado_por = r.id
       WHERE l.voluntario_id=? ORDER BY l.created_at DESC`, [vid]
    ).catch(() => [[]]);

    // Resumen de asistencia
    const resumen = { presente: 0, falta: 0, permiso: 0, comision: 0 };
    for (const a of asistencias) resumen[a.estado] = (resumen[a.estado] || 0) + 1;

    res.json({ usuario, meritos, asistencias, documentos, operaciones, puntos_historial, log, resumen_asistencia: resumen });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// ══════════════════════════════════════════════════════════════════
// EDITAR INFORMACIÓN PERSONAL (con bitácora de cambios)
// ══════════════════════════════════════════════════════════════════
const EDITABLE = [
  ['nombre',            'Nombre'],
  ['apellido_paterno',  'Apellido paterno'],
  ['apellido_materno',  'Apellido materno'],
  ['fecha_nacimiento',  'Fecha de nacimiento'],
  ['carnet_identidad',  'Carnet de identidad'],
  ['tipo_sangre',       'Tipo de sangre'],
  ['telefono',          'Teléfono'],
  ['email',             'Correo'],
  ['domicilio',         'Domicilio'],
  ['contacto_nombre',   'Contacto de emergencia'],
  ['contacto_telefono', 'Tel. de contacto'],
  ['especialidad',      'Especialidad'],
];

router.put('/:id', verifyToken, requireRole(...PERSONAL_ROLES), async (req, res) => {
  const vid = Number(req.params.id);
  if (!vid) return res.status(400).json({ error: 'ID inválido' });
  try {
    const [[actual]] = await pool.query(
      `SELECT nombre, apellido_paterno, apellido_materno, fecha_nacimiento, carnet_identidad,
              tipo_sangre, telefono, email, domicilio, contacto_nombre, contacto_telefono, especialidad
       FROM users WHERE id=?`, [vid]
    );
    if (!actual) return res.status(404).json({ error: 'Usuario no encontrado' });

    const norm = (v) => (v === undefined || v === null ? '' : String(v).trim());
    const fechaStr = (v) => {
      if (!v) return '';
      const d = new Date(v);
      return isNaN(d) ? '' : d.toISOString().slice(0, 10);
    };

    const cambios = [];
    const sets = [];
    const params = [];
    for (const [campo, label] of EDITABLE) {
      if (!(campo in req.body)) continue;
      const nuevoRaw = campo === 'fecha_nacimiento' ? (req.body[campo] || null) : norm(req.body[campo]);
      const antesCmp  = campo === 'fecha_nacimiento' ? fechaStr(actual[campo]) : norm(actual[campo]);
      const nuevoCmp  = campo === 'fecha_nacimiento' ? fechaStr(nuevoRaw)       : nuevoRaw;
      if (antesCmp === nuevoCmp) continue;
      sets.push(`${campo}=?`);
      params.push(nuevoRaw === '' && campo === 'fecha_nacimiento' ? null : nuevoRaw);
      cambios.push(`${label}: "${antesCmp || '—'}" → "${nuevoCmp || '—'}"`);
    }

    if (!sets.length) return res.json({ ok: true, sin_cambios: true });

    params.push(vid);
    await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id=?`, params);
    await logAccion(vid, 'edicion', `Información personal actualizada — ${cambios.join(' · ')}`, req.user.id);
    res.json({ ok: true, cambios: cambios.length });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// ══════════════════════════════════════════════════════════════════
// MÉRITOS / DEMÉRITOS  (misma tabla meritos)
// ══════════════════════════════════════════════════════════════════
router.post('/:id/meritos', verifyToken, requireRole(...PERSONAL_ROLES), async (req, res) => {
  const vid = Number(req.params.id);
  const { tipo, titulo, descripcion, puntos_extra, fecha } = req.body;
  if (!vid || !titulo || !fecha) return res.status(400).json({ error: 'Datos incompletos' });
  const t = ['merito', 'demerito', 'antiguedad'].includes(tipo) ? tipo : 'merito';
  const pts = Number(puntos_extra) || 0;
  try {
    await pool.query(
      `INSERT INTO meritos (voluntario_id,tipo,titulo,descripcion,puntos_extra,fecha,registrado_por)
       VALUES (?,?,?,?,?,?,?)`,
      [vid, t, titulo, descripcion || '', pts, fecha, req.user.id]
    );
    // Demérito resta puntos, mérito suma — registramos en historial y recalculamos
    if (pts !== 0) {
      const signed = t === 'demerito' ? -Math.abs(pts) : Math.abs(pts);
      await pool.query(
        `INSERT INTO puntos_voluntario (voluntario_id,puntos,concepto,asignado_por)
         VALUES (?,?,?,?)`,
        [vid, signed, `${t === 'demerito' ? 'Demérito' : 'Mérito'}: ${titulo}`, req.user.id]
      );
      await pool.query(
        `UPDATE users u SET u.total_puntos =
           (SELECT COALESCE(SUM(p.puntos),0) FROM puntos_voluntario p WHERE p.voluntario_id=?)
         WHERE u.id=?`, [vid, vid]
      );
    }
    if (t === 'antiguedad') {
      await pool.query(`UPDATE users SET antiguedad_anios=? WHERE id=?`, [pts, vid]);
    }
    const etiqueta = t === 'demerito' ? 'Demérito' : t === 'antiguedad' ? 'Antigüedad' : 'Mérito';
    await logAccion(vid, t === 'demerito' ? 'demerito' : 'merito',
      `${etiqueta} registrado: "${titulo}"${pts ? ` (${t === 'demerito' ? '−' : '+'}${pts} pts)` : ''}`, req.user.id);
    res.status(201).json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// ══════════════════════════════════════════════════════════════════
// ASISTENCIA A INSTRUCCIÓN
// ══════════════════════════════════════════════════════════════════
router.post('/:id/asistencia', verifyToken, requireRole(...PERSONAL_ROLES), async (req, res) => {
  const vid = Number(req.params.id);
  const { fecha, estado, observacion } = req.body;
  if (!vid || !fecha) return res.status(400).json({ error: 'Fecha requerida' });
  const e = ['presente', 'falta', 'permiso', 'comision'].includes(estado) ? estado : 'presente';
  try {
    await pool.query(
      `INSERT INTO instruccion_asistencia (voluntario_id,fecha,estado,observacion,registrado_por)
       VALUES (?,?,?,?,?)
       ON DUPLICATE KEY UPDATE estado=VALUES(estado), observacion=VALUES(observacion), registrado_por=VALUES(registrado_por)`,
      [vid, fecha, e, observacion || '', req.user.id]
    );
    await logAccion(vid, 'asistencia', `Asistencia ${e} registrada para el ${fecha}`, req.user.id);
    res.status(201).json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

router.delete('/asistencia/:aid', verifyToken, requireRole(...PERSONAL_ROLES), async (req, res) => {
  try {
    await pool.query('DELETE FROM instruccion_asistencia WHERE id=?', [req.params.aid]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// ══════════════════════════════════════════════════════════════════
// FILE DEL VOLUNTARIO — documentación
// ══════════════════════════════════════════════════════════════════
router.post('/:id/documentos', verifyToken, requireRole(...PERSONAL_ROLES),
  upload.single('archivo'), async (req, res) => {
  const vid = Number(req.params.id);
  const { nombre, categoria, descripcion } = req.body;
  if (!vid || !req.file) return res.status(400).json({ error: 'Archivo requerido' });
  const archivo_url = `/uploads/documentos/${req.file.filename}`;
  const cat = ['identidad', 'certificado', 'medico', 'administrativo', 'formacion', 'otro'].includes(categoria)
    ? categoria : 'otro';
  try {
    const [r] = await pool.query(
      `INSERT INTO voluntario_documentos (voluntario_id,nombre,categoria,descripcion,archivo_url,mime,tamano,registrado_por)
       VALUES (?,?,?,?,?,?,?,?)`,
      [vid, nombre || req.file.originalname, cat, descripcion || '', archivo_url,
       req.file.mimetype, req.file.size, req.user.id]
    );
    await logAccion(vid, 'documento', `Documento agregado al file: "${nombre || req.file.originalname}" (${cat})`, req.user.id);
    res.status(201).json({ id: r.insertId, archivo_url });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

router.delete('/documentos/:did', verifyToken, requireRole(...PERSONAL_ROLES), async (req, res) => {
  try {
    const [[doc]] = await pool.query('SELECT archivo_url FROM voluntario_documentos WHERE id=?', [req.params.did]);
    if (doc?.archivo_url) {
      const fp = path.join(__dirname, '..', doc.archivo_url.replace(/^\//, ''));
      fs.promises.unlink(fp).catch(() => {});
    }
    await pool.query('DELETE FROM voluntario_documentos WHERE id=?', [req.params.did]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

export default router;
