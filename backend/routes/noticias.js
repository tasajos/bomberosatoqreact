import { Router } from 'express';
import pool from '../db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/noticias
router.get('/', async (req, res) => {
  const limit = Math.min(50, parseInt(req.query.limit) || 10);
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const offset = (page - 1) * limit;

  try {
    const [rows] = await pool.query(
      `SELECT n.id, n.titulo, n.resumen, n.imagen_url, n.fecha, u.nombre AS autor
       FROM noticias n
       LEFT JOIN users u ON n.autor_id = u.id
       WHERE n.publicado = 1
       ORDER BY n.fecha DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM noticias WHERE publicado = 1');
    res.json({ data: rows, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/noticias/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT n.*, u.nombre AS autor
       FROM noticias n
       LEFT JOIN users u ON n.autor_id = u.id
       WHERE n.id = ? AND n.publicado = 1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Noticia no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/noticias - voluntario o admin
router.post('/', verifyToken, requireRole('voluntario', 'admin'), async (req, res) => {
  const { titulo, resumen, contenido, imagen_url, fecha } = req.body;
  if (!titulo || !contenido) return res.status(400).json({ error: 'Título y contenido requeridos' });

  try {
    const [result] = await pool.query(
      `INSERT INTO noticias (titulo, resumen, contenido, imagen_url, fecha, autor_id, publicado)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [titulo, resumen || '', contenido, imagen_url || null, fecha || new Date(), req.user.id]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PUT /api/noticias/:id/publicar - solo admin
router.put('/:id/publicar', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    await pool.query('UPDATE noticias SET publicado = 1 WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

export default router;
