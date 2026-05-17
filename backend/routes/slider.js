import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pool from '../db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'slider');

// Asegurar que el directorio existe
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = `slide_${Date.now()}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
  fileFilter: (_, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

// GET /api/slider — público, devuelve imágenes activas ordenadas
router.get('/', async (req, res) => {
  const all = req.query.all === 'true'; // admin puede pedir todas
  try {
    const where = all ? '' : 'WHERE activo = 1';
    const [rows] = await pool.query(
      `SELECT id, filename, url, caption, tag, position, activo, orden, created_at
       FROM slider_images ${where} ORDER BY orden ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/slider — subir nueva imagen (admin)
router.post('/', verifyToken, requireRole('admin'), upload.single('imagen'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió imagen' });

  const { caption = '', tag = '', position = 'center center' } = req.body;
  const url = `/uploads/slider/${req.file.filename}`;

  try {
    const [[{ maxOrden }]] = await pool.query('SELECT MAX(orden) as maxOrden FROM slider_images');
    const orden = (maxOrden ?? 0) + 1;

    const [result] = await pool.query(
      'INSERT INTO slider_images (filename, url, caption, tag, position, activo, orden) VALUES (?,?,?,?,?,1,?)',
      [req.file.filename, url, caption, tag, position, orden]
    );
    res.status(201).json({ id: result.insertId, url, caption, tag, position, orden });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PUT /api/slider/:id — actualizar caption, tag, activo, orden (admin)
router.put('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  const { caption, tag, position = 'center center', activo, orden } = req.body;
  try {
    await pool.query(
      'UPDATE slider_images SET caption=?, tag=?, position=?, activo=?, orden=? WHERE id=?',
      [caption, tag, position, activo ? 1 : 0, orden, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PUT /api/slider/reorder — actualizar orden de múltiples (admin)
router.put('/reorder/batch', verifyToken, requireRole('admin'), async (req, res) => {
  const { items } = req.body; // [{ id, orden }]
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items requerido' });
  try {
    for (const { id, orden } of items) {
      await pool.query('UPDATE slider_images SET orden=? WHERE id=?', [orden, id]);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// DELETE /api/slider/:id (admin)
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const [[img]] = await pool.query('SELECT filename, url FROM slider_images WHERE id=?', [req.params.id]);
    if (!img) return res.status(404).json({ error: 'No encontrado' });

    // Solo borrar archivo si fue subido (no es estático del frontend)
    if (img.url.startsWith('/uploads/')) {
      const filePath = path.join(UPLOAD_DIR, img.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await pool.query('DELETE FROM slider_images WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

export default router;
