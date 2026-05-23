import { Router } from 'express';
import pool from '../db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/voluntarios - lista pública (sin datos sensibles)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.nombre, v.cargo, v.unidad, v.foto_url
       FROM users u
       JOIN voluntarios v ON v.user_id = u.id
       WHERE u.activo = 1 AND v.publico = 1
       ORDER BY v.orden ASC, u.nombre ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/voluntarios/postular - formulario público de postulación
router.post('/postular', async (req, res) => {
  const { nombre, email, telefono, edad, mensaje } = req.body;
  if (!nombre || !email) return res.status(400).json({ error: 'Nombre y email requeridos' });

  try {
    await pool.query(
      `INSERT INTO postulaciones (nombre, email, telefono, edad, mensaje) VALUES (?, ?, ?, ?, ?)`,
      [nombre, email, telefono || null, edad || null, mensaje || null]
    );
    res.status(201).json({ ok: true, mensaje: 'Postulación recibida. Te contactaremos pronto.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/voluntarios/postulaciones - admin o presidente
router.get('/postulaciones', verifyToken, requireRole('admin', 'presidente'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM postulaciones ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PATCH /api/voluntarios/postulaciones/:id/revisar
router.patch('/postulaciones/:id/revisar', verifyToken, requireRole('admin', 'presidente'), async (req, res) => {
  try {
    await pool.query(`UPDATE postulaciones SET revisado = 1 WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

export default router;
