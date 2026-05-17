import { Router } from 'express';
import pool from '../db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/operativos - público, paginado
router.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 10);
  const offset = (page - 1) * limit;

  try {
    const [rows] = await pool.query(
      `SELECT id, tipo, descripcion, fecha, estado, unidad, created_at
       FROM operativos ORDER BY fecha DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM operativos');
    res.json({ data: rows, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/operativos/stats - estadísticas públicas
router.get('/stats', async (req, res) => {
  try {
    const year = new Date().getFullYear();
    const [[stats]] = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM operativos WHERE YEAR(fecha) = ?) AS operativos_anio,
        (SELECT COUNT(*) FROM users WHERE role = 'voluntario' AND activo = 1) AS voluntarios_activos
      `,
      [year]
    );
    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/operativos - requiere voluntario o admin
router.post('/', verifyToken, requireRole('voluntario', 'admin'), async (req, res) => {
  const { tipo, descripcion, fecha, estado, unidad } = req.body;
  if (!tipo || !fecha) return res.status(400).json({ error: 'Tipo y fecha son requeridos' });

  try {
    const [result] = await pool.query(
      'INSERT INTO operativos (tipo, descripcion, fecha, estado, unidad, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [tipo, descripcion || '', fecha, estado || 'cerrado', unidad || '', req.user.id]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// DELETE /api/operativos/:id - solo admin
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM operativos WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

export default router;
