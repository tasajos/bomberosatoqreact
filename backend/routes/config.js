import { Router } from 'express';
import pool from '../db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/config — obtener toda la configuración (público)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT clave, valor, label FROM configuracion');
    const config = Object.fromEntries(rows.map(r => [r.clave, r.valor]));
    res.json(config);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PUT /api/config — actualizar claves (admin)
router.put('/', verifyToken, requireRole('admin'), async (req, res) => {
  const updates = req.body; // { clave: valor, ... }
  try {
    for (const [clave, valor] of Object.entries(updates)) {
      await pool.query(
        'INSERT INTO configuracion (clave, valor) VALUES (?,?) ON DUPLICATE KEY UPDATE valor=?',
        [clave, String(valor), String(valor)]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

export default router;
