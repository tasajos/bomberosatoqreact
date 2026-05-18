import { Router } from 'express';
import pool from '../db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();

// POST /api/suscriptores — suscribirse (público)
router.post('/', async (req, res) => {
  const { email, fuente = 'noticias' } = req.body;
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Email inválido' });

  try {
    await pool.query(
      'INSERT INTO suscriptores (email, fuente) VALUES (?,?) ON DUPLICATE KEY UPDATE activo=1, fuente=?',
      [email.toLowerCase().trim(), fuente, fuente]
    );
    res.status(201).json({ ok: true, mensaje: '¡Suscripción confirmada! Te avisaremos cada mes.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/suscriptores — listar (admin)
router.get('/', verifyToken, requireRole('admin'), async (req, res) => {
  const solo_activos = req.query.activos === 'true';
  const where = solo_activos ? 'WHERE activo = 1' : '';
  try {
    const [rows] = await pool.query(
      `SELECT id, email, activo, fuente, created_at FROM suscriptores ${where} ORDER BY created_at DESC`
    );
    const [[{ total }]]   = await pool.query('SELECT COUNT(*) as total FROM suscriptores');
    const [[{ activos }]] = await pool.query('SELECT COUNT(*) as activos FROM suscriptores WHERE activo=1');
    res.json({ data: rows, total, activos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// DELETE /api/suscriptores/:id — dar de baja (admin)
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    await pool.query('UPDATE suscriptores SET activo=0 WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

export default router;
