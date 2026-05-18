import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pool from '../db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'galeria');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename:    (_, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `gal_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const ok = ['.jpg','.jpeg','.png','.webp','.gif'].includes(
      path.extname(file.originalname).toLowerCase()
    );
    cb(null, ok);
  },
});

const router = Router();
const COLS = 'id,src,label,category,source_type,activo,orden,created_at';

// GET /api/galeria
router.get('/', async (req, res) => {
  const all = req.query.all === 'true';
  const where = all ? '' : 'WHERE activo = 1';
  try {
    const [rows] = await pool.query(
      `SELECT ${COLS} FROM galeria ${where} ORDER BY orden ASC`
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// POST /api/galeria — crear por URL (admin)
router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  const { src, label, category } = req.body;
  if (!src) return res.status(400).json({ error: 'src es requerido' });
  try {
    const [[{ max }]] = await pool.query('SELECT MAX(orden) as max FROM galeria');
    const orden = (max ?? 0) + 1;
    const [result] = await pool.query(
      'INSERT INTO galeria (src,label,category,source_type,activo,orden) VALUES (?,?,?,?,1,?)',
      [src, label || '', category || 'General', 'url', orden]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// POST /api/galeria/upload — subir archivo (admin)
router.post('/upload', verifyToken, requireRole('admin'), upload.single('imagen'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió imagen' });
  const { label, category } = req.body;
  const src = `/uploads/galeria/${req.file.filename}`;
  try {
    const [[{ max }]] = await pool.query('SELECT MAX(orden) as max FROM galeria');
    const orden = (max ?? 0) + 1;
    const [result] = await pool.query(
      'INSERT INTO galeria (src,label,category,source_type,activo,orden) VALUES (?,?,?,?,1,?)',
      [src, label || '', category || 'General', 'upload', orden]
    );
    res.status(201).json({ id: result.insertId, src });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// PUT /api/galeria/:id
router.put('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  const { label, category, activo, orden } = req.body;
  try {
    await pool.query(
      'UPDATE galeria SET label=?,category=?,activo=?,orden=? WHERE id=?',
      [label, category, activo ? 1 : 0, orden, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// DELETE /api/galeria/:id
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const [[img]] = await pool.query('SELECT src,source_type FROM galeria WHERE id=?', [req.params.id]);
    if (img?.source_type === 'upload' && img.src.startsWith('/uploads/galeria/')) {
      const filePath = path.join(UPLOAD_DIR, path.basename(img.src));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await pool.query('DELETE FROM galeria WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

export default router;
