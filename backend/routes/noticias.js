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

const COLS = `n.id, n.titulo, n.resumen, n.contenido, n.imagen_url,
  n.fecha, n.publicado, n.tipo, n.fuente_nombre, n.fuente_url, n.categoria,
  n.created_at, u.nombre AS autor`;

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
    res.json(row);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// POST /api/noticias — crear (voluntario o admin)
router.post('/', verifyToken, requireRole('voluntario', 'admin'), async (req, res) => {
  const {
    titulo, resumen, contenido, imagen_url, fecha,
    tipo = 'propia', fuente_nombre = '', fuente_url = '',
    categoria = 'General', publicado = 0,
  } = req.body;

  if (!titulo) return res.status(400).json({ error: 'El título es requerido' });
  if (tipo === 'externa' && !fuente_url) return res.status(400).json({ error: 'La URL de la fuente es requerida' });

  try {
    const [result] = await pool.query(
      `INSERT INTO noticias
       (titulo,resumen,contenido,imagen_url,fecha,autor_id,publicado,tipo,fuente_nombre,fuente_url,categoria)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        titulo, resumen || '', contenido || '',
        imagen_url || null,
        fecha || new Date(),
        req.user.id,
        publicado ? 1 : 0,
        tipo, fuente_nombre, fuente_url, categoria,
      ]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// PUT /api/noticias/:id — editar (admin)
router.put('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  const {
    titulo, resumen, contenido, imagen_url, fecha,
    tipo, fuente_nombre, fuente_url, categoria, publicado,
  } = req.body;
  try {
    await pool.query(
      `UPDATE noticias SET
       titulo=?,resumen=?,contenido=?,imagen_url=?,fecha=?,publicado=?,
       tipo=?,fuente_nombre=?,fuente_url=?,categoria=?
       WHERE id=?`,
      [
        titulo, resumen || '', contenido || '',
        imagen_url || null, fecha,
        publicado ? 1 : 0,
        tipo, fuente_nombre || '', fuente_url || '', categoria || 'General',
        req.params.id,
      ]
    );
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
