import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads', 'noticias'),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `noticia_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const ok = ['.jpg','.jpeg','.png','.webp'].includes(path.extname(file.originalname).toLowerCase());
    cb(null, ok);
  },
});

const router = Router();
const MAX_DESTACADAS = 3;

// ── Inicialización idempotente de columnas ────────────────────────
async function initTables() {
  await pool.query(`
    ALTER TABLE noticias ADD COLUMN IF NOT EXISTS destacada TINYINT(1) NOT NULL DEFAULT 0 AFTER publicado
  `).catch(() => {});
  await pool.query(`
    CREATE TABLE IF NOT EXISTS noticia_imagenes (
      id          INT PRIMARY KEY AUTO_INCREMENT,
      noticia_id  INT NOT NULL,
      url         VARCHAR(500) NOT NULL,
      orden       INT NOT NULL DEFAULT 0,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_noticia (noticia_id, orden),
      FOREIGN KEY (noticia_id) REFERENCES noticias(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `).catch(() => {});
}
initTables();

// Reemplaza la galería de fotos de una noticia (solo si se envía el arreglo)
async function saveImagenes(noticiaId, imagenes) {
  if (!Array.isArray(imagenes)) return;
  await pool.query('DELETE FROM noticia_imagenes WHERE noticia_id = ?', [noticiaId]);
  const urls = imagenes.filter(u => typeof u === 'string' && u.trim()).slice(0, 30);
  if (urls.length === 0) return;
  await pool.query(
    'INSERT INTO noticia_imagenes (noticia_id, url, orden) VALUES ?',
    [urls.map((url, i) => [noticiaId, url.trim(), i])]
  );
}

// Cuenta destacadas excluyendo una noticia (para validar el máximo al editar)
async function countDestacadas(excludeId = 0) {
  const [[{ total }]] = await pool.query(
    'SELECT COUNT(*) AS total FROM noticias WHERE destacada = 1 AND id <> ?', [excludeId]
  );
  return total;
}

const COLS = `n.id, n.titulo, n.resumen, n.contenido, n.imagen_url,
  n.fecha, n.publicado, n.destacada, n.tipo, n.fuente_nombre, n.fuente_url, n.categoria,
  n.created_at, u.nombre AS autor`;

// GET /api/noticias/destacadas — hasta 3 publicadas para el slider de inicio.
// Si no hay destacadas, devuelve las más recientes con imagen.
router.get('/destacadas', async (_req, res) => {
  try {
    let [rows] = await pool.query(
      `SELECT ${COLS} FROM noticias n LEFT JOIN users u ON n.autor_id = u.id
       WHERE n.publicado = 1 AND n.destacada = 1
       ORDER BY n.fecha DESC LIMIT ?`, [MAX_DESTACADAS]
    );
    if (rows.length === 0) {
      [rows] = await pool.query(
        `SELECT ${COLS} FROM noticias n LEFT JOIN users u ON n.autor_id = u.id
         WHERE n.publicado = 1 AND n.imagen_url IS NOT NULL AND n.imagen_url <> ''
         ORDER BY n.fecha DESC LIMIT ?`, [MAX_DESTACADAS]
      );
    }
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// GET /api/noticias — públicas o todas (admin)
router.get('/', async (req, res) => {
  const all   = req.query.all === 'true';
  const page  = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 12);
  const offset = (page - 1) * limit;
  const where  = all ? '' : 'WHERE n.publicado = 1';

  try {
    const [rows] = await pool.query(
      `SELECT ${COLS}
       FROM noticias n LEFT JOIN users u ON n.autor_id = u.id
       ${where} ORDER BY n.fecha DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM noticias n ${where}`
    );
    res.json({ data: rows, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// GET /api/noticias/:id
router.get('/:id', async (req, res) => {
  try {
    const [[row]] = await pool.query(
      `SELECT ${COLS} FROM noticias n
       LEFT JOIN users u ON n.autor_id = u.id
       WHERE n.id = ?`, [req.params.id]
    );
    if (!row) return res.status(404).json({ error: 'Noticia no encontrada' });
    const [imgs] = await pool.query(
      'SELECT url FROM noticia_imagenes WHERE noticia_id = ? ORDER BY orden, id', [row.id]
    );
    res.json({ ...row, imagenes: imgs.map(i => i.url) });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// POST /api/noticias — crear (voluntario o admin)
router.post('/', verifyToken, requireRole('voluntario', 'admin'), async (req, res) => {
  const {
    titulo, resumen, contenido, imagen_url, fecha,
    tipo = 'propia', fuente_nombre = '', fuente_url = '',
    categoria = 'General', publicado = 0, destacada = 0, imagenes,
  } = req.body;

  if (!titulo) return res.status(400).json({ error: 'El título es requerido' });
  if (tipo === 'externa' && !fuente_url) return res.status(400).json({ error: 'La URL de la fuente es requerida' });
  // Solo admin puede destacar
  const esDestacada = destacada && req.user.role === 'admin' ? 1 : 0;

  try {
    if (esDestacada && await countDestacadas() >= MAX_DESTACADAS) {
      return res.status(400).json({ error: `Máximo ${MAX_DESTACADAS} noticias destacadas. Quita una antes de destacar otra.` });
    }
    const [result] = await pool.query(
      `INSERT INTO noticias
       (titulo,resumen,contenido,imagen_url,fecha,autor_id,publicado,destacada,tipo,fuente_nombre,fuente_url,categoria)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        titulo, resumen || '', contenido || '',
        imagen_url || null,
        fecha || new Date(),
        req.user.id,
        publicado ? 1 : 0,
        esDestacada,
        tipo, fuente_nombre, fuente_url, categoria,
      ]
    );
    await saveImagenes(result.insertId, imagenes);
    res.status(201).json({ id: result.insertId });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// PUT /api/noticias/:id — editar (admin)
router.put('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  const {
    titulo, resumen, contenido, imagen_url, fecha,
    tipo, fuente_nombre, fuente_url, categoria, publicado, destacada, imagenes,
  } = req.body;
  try {
    if (destacada && await countDestacadas(req.params.id) >= MAX_DESTACADAS) {
      return res.status(400).json({ error: `Máximo ${MAX_DESTACADAS} noticias destacadas. Quita una antes de destacar otra.` });
    }
    await pool.query(
      `UPDATE noticias SET
       titulo=?,resumen=?,contenido=?,imagen_url=?,fecha=?,publicado=?,destacada=?,
       tipo=?,fuente_nombre=?,fuente_url=?,categoria=?
       WHERE id=?`,
      [
        titulo, resumen || '', contenido || '',
        imagen_url || null, fecha,
        publicado ? 1 : 0,
        destacada ? 1 : 0,
        tipo, fuente_nombre || '', fuente_url || '', categoria || 'General',
        req.params.id,
      ]
    );
    await saveImagenes(req.params.id, imagenes);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// PUT /api/noticias/:id/publicar
router.put('/:id/publicar', verifyToken, requireRole('admin'), async (req, res) => {
  const { publicado } = req.body;
  try {
    await pool.query('UPDATE noticias SET publicado=? WHERE id=?', [publicado ? 1 : 0, req.params.id]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// PUT /api/noticias/:id/destacar
router.put('/:id/destacar', verifyToken, requireRole('admin'), async (req, res) => {
  const { destacada } = req.body;
  try {
    if (destacada && await countDestacadas(req.params.id) >= MAX_DESTACADAS) {
      return res.status(400).json({ error: `Máximo ${MAX_DESTACADAS} noticias destacadas. Quita una antes de destacar otra.` });
    }
    await pool.query('UPDATE noticias SET destacada=? WHERE id=?', [destacada ? 1 : 0, req.params.id]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// POST /api/noticias/upload-image
router.post('/upload-image', verifyToken, requireRole('voluntario', 'admin'), upload.single('imagen'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió imagen' });
  res.json({ url: `/uploads/noticias/${req.file.filename}` });
});

// DELETE /api/noticias/:id (admin)
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM noticias WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

export default router;
