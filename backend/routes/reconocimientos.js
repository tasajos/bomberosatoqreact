import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pool from '../db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'reconocimientos');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename:    (_, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    cb(null, `rec_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const ok = ['.jpg','.jpeg','.png','.webp','.pdf'].includes(
      path.extname(file.originalname).toLowerCase()
    );
    cb(null, ok);
  },
});

const router = Router();

const COLS = 'id,badge,fecha,institucion,titulo,descripcion,texto_completo,firmante,icono,img_url,activo,orden,created_at';

// GET /api/reconocimientos — público (solo activos) o todos (admin con ?all=true)
router.get('/', async (req, res) => {
  const all = req.query.all === 'true';
  const where = all ? '' : 'WHERE activo = 1';
  try {
    const [rows] = await pool.query(
      `SELECT ${COLS} FROM reconocimientos ${where} ORDER BY orden ASC`
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// GET /api/reconocimientos/:id
router.get('/:id', async (req, res) => {
  try {
    const [[row]] = await pool.query(`SELECT ${COLS} FROM reconocimientos WHERE id=?`, [req.params.id]);
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    res.json(row);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// POST /api/reconocimientos — crear (admin)
router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  const { badge, fecha, institucion, titulo, descripcion, texto_completo, firmante, icono, img_url } = req.body;
  if (!badge || !titulo || !institucion) return res.status(400).json({ error: 'Badge, título e institución son requeridos' });
  try {
    const [[{ maxOrden }]] = await pool.query('SELECT MAX(orden) as maxOrden FROM reconocimientos');
    const orden = (maxOrden ?? 0) + 1;
    const [result] = await pool.query(
      `INSERT INTO reconocimientos (badge,fecha,institucion,titulo,descripcion,texto_completo,firmante,icono,img_url,activo,orden)
       VALUES (?,?,?,?,?,?,?,?,?,1,?)`,
      [badge, fecha, institucion, titulo, descripcion||'', texto_completo||'', firmante||'', icono||'🏅', img_url||null, orden]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// PUT /api/reconocimientos/:id — actualizar (admin)
router.put('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  const { badge, fecha, institucion, titulo, descripcion, texto_completo, firmante, icono, img_url, activo, orden } = req.body;
  try {
    await pool.query(
      `UPDATE reconocimientos SET badge=?,fecha=?,institucion=?,titulo=?,descripcion=?,texto_completo=?,firmante=?,icono=?,img_url=?,activo=?,orden=?
       WHERE id=?`,
      [badge,fecha,institucion,titulo,descripcion||'',texto_completo||'',firmante||'',icono||'🏅',img_url||null,activo?1:0,orden,req.params.id]
    );
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// POST /api/reconocimientos/upload-image — subir imagen/PDF (admin)
router.post('/upload-image', verifyToken, requireRole('admin'), upload.single('imagen'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });
  res.json({ url: `/uploads/reconocimientos/${req.file.filename}` });
});

// DELETE /api/reconocimientos/:id (admin)
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const [[rec]] = await pool.query('SELECT img_url FROM reconocimientos WHERE id=?', [req.params.id]);
    if (rec?.img_url?.startsWith('/uploads/reconocimientos/')) {
      const filePath = path.join(UPLOAD_DIR, path.basename(rec.img_url));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await pool.query('DELETE FROM reconocimientos WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

export default router;
