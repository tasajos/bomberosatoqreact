import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pool from '../db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '..', 'uploads', 'ordenes');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `orden_${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });

const router = Router();
const OPS_ROLES = ['admin', 'presidente', 'jefe_operaciones', 'coordinador'];

// ── Inicialización idempotente de tablas ──────────────────────────
async function initTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ordenes_operacion (
      id                     INT PRIMARY KEY AUTO_INCREMENT,
      titulo                 VARCHAR(200) NOT NULL,
      descripcion            TEXT,
      nivel_dificultad       ENUM('baja','media','alta','critica') NOT NULL DEFAULT 'media',
      equipos_necesarios     TEXT,
      voluntarios_requeridos INT NOT NULL DEFAULT 0,
      direccion              VARCHAR(255),
      lat                    DECIMAL(10,7),
      lng                    DECIMAL(10,7),
      estado                 ENUM('activa','en_curso','finalizada','cancelada') NOT NULL DEFAULT 'activa',
      creado_por             INT,
      created_at             DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at             DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (creado_por) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `).catch(() => {});
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orden_operacion_imagenes (
      id          INT PRIMARY KEY AUTO_INCREMENT,
      orden_id    INT NOT NULL,
      url         VARCHAR(255) NOT NULL,
      descripcion VARCHAR(255),
      lat         DECIMAL(10,7),
      lng         DECIMAL(10,7),
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (orden_id) REFERENCES ordenes_operacion(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `).catch(() => {});
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orden_operacion_voluntarios (
      id            INT PRIMARY KEY AUTO_INCREMENT,
      orden_id      INT NOT NULL,
      voluntario_id INT NOT NULL,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_orden_vol (orden_id, voluntario_id),
      FOREIGN KEY (orden_id)      REFERENCES ordenes_operacion(id) ON DELETE CASCADE,
      FOREIGN KEY (voluntario_id) REFERENCES users(id)             ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `).catch(() => {});
}
initTables();

// Adjunta imágenes y conteo de inscritos a una fila de orden
async function hidratarOrden(orden, userId) {
  const [imgs] = await pool.query(
    'SELECT id, url, descripcion, lat, lng FROM orden_operacion_imagenes WHERE orden_id=? ORDER BY id',
    [orden.id]
  );
  const [vols] = await pool.query(
    `SELECT ov.voluntario_id, ov.created_at,
            CONCAT(u.nombre,' ',u.apellido_paterno) AS nombre,
            u.matricula, u.codigo, u.especialidad
     FROM orden_operacion_voluntarios ov
     JOIN users u ON ov.voluntario_id = u.id
     WHERE ov.orden_id=? ORDER BY ov.created_at`,
    [orden.id]
  );
  return {
    ...orden,
    imagenes: imgs,
    voluntarios: vols,
    inscritos: vols.length,
    ya_inscrito: userId ? vols.some(v => v.voluntario_id === userId) : false,
  };
}

// ══════════════════════════════════════════════════════════════════
// LISTAR — visible para todos los usuarios autenticados
// ══════════════════════════════════════════════════════════════════
router.get('/', verifyToken, async (req, res) => {
  const { estado } = req.query;
  const where = [];
  const params = [];
  if (estado) { where.push('o.estado=?'); params.push(estado); }
  const wStr = where.length ? `WHERE ${where.join(' AND ')}` : '';
  try {
    const [rows] = await pool.query(
      `SELECT o.*, CONCAT(c.nombre,' ',c.apellido_paterno) AS creado_nombre
       FROM ordenes_operacion o
       LEFT JOIN users c ON o.creado_por = c.id
       ${wStr} ORDER BY FIELD(o.estado,'activa','en_curso','finalizada','cancelada'), o.created_at DESC`,
      params
    );
    const data = await Promise.all(rows.map(r => hidratarOrden(r, req.user.id)));
    res.json({ data });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// DETALLE
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const [[orden]] = await pool.query(
      `SELECT o.*, CONCAT(c.nombre,' ',c.apellido_paterno) AS creado_nombre
       FROM ordenes_operacion o
       LEFT JOIN users c ON o.creado_por = c.id
       WHERE o.id=?`,
      [req.params.id]
    );
    if (!orden) return res.status(404).json({ error: 'Orden no encontrada' });
    res.json(await hidratarOrden(orden, req.user.id));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// ══════════════════════════════════════════════════════════════════
// CREAR — solo roles operativos (presidencia / operaciones)
// Multipart: campos + imagenes[] (archivos) + imagenes_meta (JSON con lat/lng/desc por imagen)
// ══════════════════════════════════════════════════════════════════
router.post('/', verifyToken, requireRole(...OPS_ROLES), upload.array('imagenes', 12), async (req, res) => {
  const {
    titulo, descripcion, nivel_dificultad, equipos_necesarios,
    voluntarios_requeridos, direccion, lat, lng, estado, imagenes_meta,
  } = req.body;
  if (!titulo) return res.status(400).json({ error: 'El título es requerido' });
  try {
    const [r] = await pool.query(
      `INSERT INTO ordenes_operacion
        (titulo,descripcion,nivel_dificultad,equipos_necesarios,
         voluntarios_requeridos,direccion,lat,lng,estado,creado_por)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        titulo, descripcion || '', nivel_dificultad || 'media', equipos_necesarios || '',
        Number(voluntarios_requeridos) || 0, direccion || '',
        lat ? Number(lat) : null, lng ? Number(lng) : null,
        estado || 'activa', req.user.id,
      ]
    );
    const ordenId = r.insertId;

    // Metadatos de imágenes (posición sobre el mapa) — mismo orden que los archivos
    let meta = [];
    try { meta = JSON.parse(imagenes_meta || '[]'); } catch { meta = []; }

    if (req.files?.length) {
      for (let i = 0; i < req.files.length; i++) {
        const f = req.files[i];
        const m = meta[i] || {};
        await pool.query(
          `INSERT INTO orden_operacion_imagenes (orden_id,url,descripcion,lat,lng) VALUES (?,?,?,?,?)`,
          [
            ordenId, `/uploads/ordenes/${f.filename}`, m.descripcion || '',
            m.lat != null ? Number(m.lat) : null,
            m.lng != null ? Number(m.lng) : null,
          ]
        );
      }
    }
    res.status(201).json({ id: ordenId });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// ACTUALIZAR datos (sin tocar imágenes)
router.put('/:id', verifyToken, requireRole(...OPS_ROLES), async (req, res) => {
  const {
    titulo, descripcion, nivel_dificultad, equipos_necesarios,
    voluntarios_requeridos, direccion, lat, lng, estado,
  } = req.body;
  try {
    await pool.query(
      `UPDATE ordenes_operacion SET
        titulo=?,descripcion=?,nivel_dificultad=?,equipos_necesarios=?,
        voluntarios_requeridos=?,direccion=?,lat=?,lng=?,estado=?
       WHERE id=?`,
      [
        titulo, descripcion || '', nivel_dificultad || 'media', equipos_necesarios || '',
        Number(voluntarios_requeridos) || 0, direccion || '',
        lat ? Number(lat) : null, lng ? Number(lng) : null,
        estado || 'activa', req.params.id,
      ]
    );
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// CAMBIAR estado
router.patch('/:id/estado', verifyToken, requireRole(...OPS_ROLES), async (req, res) => {
  const { estado } = req.body;
  if (!['activa', 'en_curso', 'finalizada', 'cancelada'].includes(estado))
    return res.status(400).json({ error: 'Estado inválido' });
  try {
    await pool.query('UPDATE ordenes_operacion SET estado=? WHERE id=?', [estado, req.params.id]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// ELIMINAR
router.delete('/:id', verifyToken, requireRole(...OPS_ROLES), async (req, res) => {
  try {
    await pool.query('DELETE FROM ordenes_operacion WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// ══════════════════════════════════════════════════════════════════
// INSCRIBIRSE / DESINSCRIBIRSE — cualquier usuario autenticado
// ══════════════════════════════════════════════════════════════════
router.post('/:id/inscribir', verifyToken, async (req, res) => {
  try {
    const [[orden]] = await pool.query('SELECT estado FROM ordenes_operacion WHERE id=?', [req.params.id]);
    if (!orden) return res.status(404).json({ error: 'Orden no encontrada' });
    if (!['activa', 'en_curso'].includes(orden.estado))
      return res.status(400).json({ error: 'La orden ya no admite inscripciones' });
    await pool.query(
      'INSERT IGNORE INTO orden_operacion_voluntarios (orden_id,voluntario_id) VALUES (?,?)',
      [req.params.id, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

router.delete('/:id/inscribir', verifyToken, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM orden_operacion_voluntarios WHERE orden_id=? AND voluntario_id=?',
      [req.params.id, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

export default router;
