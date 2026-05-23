import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pool from '../db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();
const ROLES = ['admin', 'presidente', 'jefe_personal', 'jefe_operaciones', 'coordinador'];

// Multer para certificados/cursos
const cursosDir = path.join(__dirname, '..', 'uploads', 'cursos');
if (!fs.existsSync(cursosDir)) fs.mkdirSync(cursosDir, { recursive: true });

const storage = multer.diskStorage({
  destination: cursosDir,
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `curso_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// ── Init tablas ───────────────────────────────────────────────────
async function initTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS capacitaciones (
      id                 INT PRIMARY KEY AUTO_INCREMENT,
      nombre             VARCHAR(200) NOT NULL,
      descripcion        TEXT,
      tipo               ENUM('interna','externa','certificacion') DEFAULT 'interna',
      institucion        VARCHAR(200),
      instructor         VARCHAR(150),
      lugar              VARCHAR(200),
      fecha              DATE,
      horas              DECIMAL(5,1) DEFAULT 0,
      cupo               INT DEFAULT 0,
      estado             ENUM('planificada','activa','cerrada') DEFAULT 'planificada',
      invitacion_abierta TINYINT(1) DEFAULT 0,
      created_at         DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  // Agregar columna institucion si no existe (migracion segura)
  await pool.query(`
    ALTER TABLE capacitaciones ADD COLUMN IF NOT EXISTS institucion VARCHAR(200) AFTER tipo
  `).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS capacitacion_inscripciones (
      id                INT PRIMARY KEY AUTO_INCREMENT,
      capacitacion_id   INT NOT NULL,
      voluntario_id     INT NOT NULL,
      estado            ENUM('inscrito','completado','ausente') DEFAULT 'inscrito',
      notas             TEXT,
      fecha_inscripcion DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_cap_vol (capacitacion_id, voluntario_id),
      FOREIGN KEY (capacitacion_id) REFERENCES capacitaciones(id) ON DELETE CASCADE,
      FOREIGN KEY (voluntario_id)   REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS voluntario_cursos (
      id            INT PRIMARY KEY AUTO_INCREMENT,
      voluntario_id INT NOT NULL,
      nombre        VARCHAR(250) NOT NULL,
      institucion   VARCHAR(200),
      tipo          ENUM('curso','certificacion','diplomado','taller','seminario') DEFAULT 'curso',
      fecha         DATE,
      horas         DECIMAL(5,1) DEFAULT 0,
      descripcion   TEXT,
      archivo_url   VARCHAR(500),
      registrado_por INT,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (voluntario_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}
initTables().catch(err => console.error('capacitaciones init:', err));

// ── CAPACITACIONES CRUD ───────────────────────────────────────────

router.get('/', verifyToken, requireRole(...ROLES), async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.*,
        COUNT(i.id) AS inscritos,
        SUM(i.estado = 'completado') AS completados
      FROM capacitaciones c
      LEFT JOIN capacitacion_inscripciones i ON i.capacitacion_id = c.id
      GROUP BY c.id ORDER BY c.fecha DESC, c.id DESC
    `);
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error del servidor' }); }
});

router.post('/', verifyToken, requireRole(...ROLES), async (req, res) => {
  const { nombre, descripcion, tipo, institucion, instructor, lugar, fecha, horas, cupo, estado } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });
  try {
    const [r] = await pool.query(
      `INSERT INTO capacitaciones (nombre,descripcion,tipo,institucion,instructor,lugar,fecha,horas,cupo,estado)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [nombre, descripcion||'', tipo||'interna', institucion||'', instructor||'',
       lugar||'', fecha||null, horas||0, cupo||0, estado||'planificada']
    );
    res.status(201).json({ id: r.insertId });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error del servidor' }); }
});

router.put('/:id', verifyToken, requireRole(...ROLES), async (req, res) => {
  const { nombre, descripcion, tipo, institucion, instructor, lugar, fecha, horas, cupo, estado, invitacion_abierta } = req.body;
  try {
    await pool.query(
      `UPDATE capacitaciones SET nombre=?,descripcion=?,tipo=?,institucion=?,instructor=?,
       lugar=?,fecha=?,horas=?,cupo=?,estado=?,invitacion_abierta=? WHERE id=?`,
      [nombre, descripcion||'', tipo||'interna', institucion||'', instructor||'',
       lugar||'', fecha||null, horas||0, cupo||0, estado||'planificada',
       invitacion_abierta?1:0, req.params.id]
    );
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error del servidor' }); }
});

router.delete('/:id', verifyToken, requireRole(...ROLES), async (req, res) => {
  try {
    await pool.query('DELETE FROM capacitaciones WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error del servidor' }); }
});

// ── INSCRIPCIONES ────────────────────────────────────────────────

router.get('/:id/inscripciones', verifyToken, requireRole(...ROLES), async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT i.*, CONCAT(u.nombre,' ',u.apellido_paterno) AS nombre_voluntario,
        u.matricula, u.codigo, u.especialidad
      FROM capacitacion_inscripciones i
      JOIN users u ON u.id = i.voluntario_id
      WHERE i.capacitacion_id = ?
      ORDER BY i.estado, nombre_voluntario
    `, [req.params.id]);
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error del servidor' }); }
});

router.post('/:id/inscripciones', verifyToken, requireRole(...ROLES), async (req, res) => {
  const { voluntario_id, notas } = req.body;
  if (!voluntario_id) return res.status(400).json({ error: 'voluntario_id requerido' });
  try {
    const [r] = await pool.query(
      `INSERT IGNORE INTO capacitacion_inscripciones (capacitacion_id,voluntario_id,notas) VALUES (?,?,?)`,
      [req.params.id, voluntario_id, notas||'']
    );
    res.status(201).json({ id: r.insertId });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error del servidor' }); }
});

router.put('/inscripciones/:id', verifyToken, requireRole(...ROLES), async (req, res) => {
  const { estado, notas } = req.body;
  try {
    await pool.query('UPDATE capacitacion_inscripciones SET estado=?,notas=? WHERE id=?', [estado, notas||'', req.params.id]);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error del servidor' }); }
});

router.delete('/inscripciones/:id', verifyToken, requireRole(...ROLES), async (req, res) => {
  try {
    await pool.query('DELETE FROM capacitacion_inscripciones WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error del servidor' }); }
});

// Publicar invitación abierta — solo activa el flag, no auto-inscribe
router.post('/:id/invitar-todos', verifyToken, requireRole(...ROLES), async (req, res) => {
  try {
    await pool.query('UPDATE capacitaciones SET invitacion_abierta=1 WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error del servidor' }); }
});

// Cerrar invitación abierta
router.post('/:id/cerrar-invitacion', verifyToken, requireRole(...ROLES), async (req, res) => {
  try {
    await pool.query('UPDATE capacitaciones SET invitacion_abierta=0 WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error del servidor' }); }
});

// GET /api/capacitaciones/abiertas — capacitaciones con invitación abierta (todos los roles)
router.get('/abiertas', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.*,
        COUNT(i.id) AS inscritos,
        MAX(CASE WHEN i.voluntario_id = ? THEN 1 ELSE 0 END) AS ya_inscrito
      FROM capacitaciones c
      LEFT JOIN capacitacion_inscripciones i ON i.capacitacion_id = c.id
      WHERE c.invitacion_abierta = 1 AND c.estado != 'cerrada'
      GROUP BY c.id
      ORDER BY c.fecha ASC
    `, [req.user.id]);
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error del servidor' }); }
});

// POST /api/capacitaciones/:id/inscribirse — auto-inscripción del usuario logueado
router.post('/:id/inscribirse', verifyToken, async (req, res) => {
  try {
    const [[cap]] = await pool.query('SELECT id,invitacion_abierta,estado FROM capacitaciones WHERE id=?', [req.params.id]);
    if (!cap) return res.status(404).json({ error: 'Capacitación no encontrada' });
    if (!cap.invitacion_abierta) return res.status(403).json({ error: 'Esta capacitación no tiene invitación abierta' });
    await pool.query(
      'INSERT IGNORE INTO capacitacion_inscripciones (capacitacion_id,voluntario_id) VALUES (?,?)',
      [req.params.id, req.user.id]
    );
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error del servidor' }); }
});

// DELETE /api/capacitaciones/:id/desinscribirse — el usuario se quita a sí mismo
router.delete('/:id/desinscribirse', verifyToken, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM capacitacion_inscripciones WHERE capacitacion_id=? AND voluntario_id=?',
      [req.params.id, req.user.id]
    );
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error del servidor' }); }
});

// ── CURSOS EXTERNOS DEL VOLUNTARIO ───────────────────────────────

// GET /api/capacitaciones/voluntario/:id/cursos
router.get('/voluntario/:id/cursos', verifyToken, requireRole(...ROLES), async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM voluntario_cursos WHERE voluntario_id=? ORDER BY fecha DESC, id DESC',
      [req.params.id]
    );
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error del servidor' }); }
});

// POST /api/capacitaciones/voluntario/:id/cursos  (multipart con archivo opcional)
router.post('/voluntario/:id/cursos', verifyToken, requireRole(...ROLES),
  upload.single('archivo'), async (req, res) => {
    const { nombre, institucion, tipo, fecha, horas, descripcion } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre del curso es obligatorio' });
    const archivo_url = req.file ? `/uploads/cursos/${req.file.filename}` : null;
    try {
      const [r] = await pool.query(
        `INSERT INTO voluntario_cursos
          (voluntario_id,nombre,institucion,tipo,fecha,horas,descripcion,archivo_url,registrado_por)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [req.params.id, nombre, institucion||'', tipo||'curso',
         fecha||null, horas||0, descripcion||'', archivo_url, req.user.id]
      );
      res.status(201).json({ id: r.insertId });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Error del servidor' }); }
  }
);

// DELETE /api/capacitaciones/voluntario/cursos/:id
router.delete('/voluntario/cursos/:id', verifyToken, requireRole(...ROLES), async (req, res) => {
  try {
    const [[curso]] = await pool.query('SELECT archivo_url FROM voluntario_cursos WHERE id=?', [req.params.id]);
    if (curso?.archivo_url) {
      const filePath = path.join(__dirname, '..', curso.archivo_url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await pool.query('DELETE FROM voluntario_cursos WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error del servidor' }); }
});

// ── FILE COMPLETO DEL VOLUNTARIO ─────────────────────────────────

router.get('/voluntario/:id/perfil', verifyToken, requireRole(...ROLES), async (req, res) => {
  const vid = req.params.id;
  try {
    const [[usuario]] = await pool.query(
      `SELECT id,nombre,apellido_paterno,matricula,codigo,especialidad,grado,
              cargo_directiva,total_puntos,activo,created_at
       FROM users WHERE id=?`, [vid]
    );
    if (!usuario) return res.status(404).json({ error: 'Voluntario no encontrado' });

    const [[{ guardias }]]    = await pool.query('SELECT COUNT(*) AS guardias FROM guardias WHERE voluntario_id=?', [vid]);
    const [[{ operaciones }]] = await pool.query(`SELECT COUNT(*) AS operaciones FROM operaciones WHERE voluntario_id=? AND estado='validado'`, [vid]);
    const [[{ apoyos }]]      = await pool.query(`SELECT COUNT(*) AS apoyos FROM operaciones WHERE voluntario_id=? AND tipo='apoyo'`, [vid]);
    const [[{ puntos_acum }]] = await pool.query('SELECT COALESCE(SUM(puntos),0) AS puntos_acum FROM puntos_voluntario WHERE voluntario_id=?', [vid]);

    const [meritos]   = await pool.query(`SELECT * FROM meritos WHERE voluntario_id=? AND tipo='merito'   ORDER BY fecha DESC LIMIT 20`, [vid]);
    const [sanciones] = await pool.query(`SELECT * FROM meritos WHERE voluntario_id=? AND tipo='demerito' ORDER BY fecha DESC LIMIT 20`, [vid]);

    const [capacitaciones] = await pool.query(`
      SELECT i.*, c.nombre AS cap_nombre, c.tipo AS cap_tipo,
        c.institucion AS cap_institucion, c.instructor, c.fecha AS cap_fecha, c.horas
      FROM capacitacion_inscripciones i
      JOIN capacitaciones c ON c.id = i.capacitacion_id
      WHERE i.voluntario_id = ?
      ORDER BY c.fecha DESC
    `, [vid]);

    const [cursos_externos] = await pool.query(
      'SELECT * FROM voluntario_cursos WHERE voluntario_id=? ORDER BY fecha DESC', [vid]
    );

    res.json({
      usuario,
      stats: {
        guardias:     guardias     || 0,
        operaciones:  operaciones  || 0,
        apoyos:       apoyos       || 0,
        puntos:       usuario.total_puntos || puntos_acum || 0,
      },
      meritos,
      sanciones,
      capacitaciones,
      cursos_externos,
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error del servidor' }); }
});

export default router;
