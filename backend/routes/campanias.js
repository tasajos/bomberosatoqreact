import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads', 'campanias'),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `campania_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const ok = ['.jpg', '.jpeg', '.png', '.webp'].includes(path.extname(file.originalname).toLowerCase());
    cb(null, ok);
  },
});

const router = Router();

// GET /api/campanias - todas las campañas, la activa primero
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, nombre, descripcion, meta, recaudado, donantes, estado, imagen_url, created_at
       FROM campanias ORDER BY estado = 'activa' DESC, created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/campanias/activa - la campaña activa actual
router.get('/activa', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, nombre, descripcion, meta, recaudado, donantes, estado, imagen_url
       FROM campanias WHERE estado = 'activa' LIMIT 1`
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Sin campaña activa' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/campanias - solo admin
router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  const { nombre, descripcion, meta, imagen_url } = req.body;
  if (!nombre || !meta) return res.status(400).json({ error: 'Nombre y meta son requeridos' });

  try {
    const [result] = await pool.query(
      `INSERT INTO campanias (nombre, descripcion, meta, recaudado, donantes, estado, imagen_url)
       VALUES (?, ?, ?, 0, 0, 'activa', ?)`,
      [nombre, descripcion || '', meta, imagen_url || null]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PUT /api/campanias/:id - actualizar campaña (admin)
router.put('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  const { nombre, descripcion, meta, recaudado, donantes, estado, imagen_url } = req.body;
  try {
    await pool.query(
      `UPDATE campanias SET nombre=?, descripcion=?, meta=?, recaudado=?, donantes=?, estado=?, imagen_url=?
       WHERE id=?`,
      [nombre, descripcion, meta, recaudado, donantes, estado, imagen_url, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/campanias/upload-image — subir imagen (admin)
router.post('/upload-image', verifyToken, requireRole('admin'), upload.single('imagen'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió imagen' });
  res.json({ url: `/uploads/campanias/${req.file.filename}` });
});

export default router;
