import { Router } from 'express';
import pool from '../db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();

// POST /api/contacto — enviar mensaje (público)
router.post('/', async (req, res) => {
  const { nombre, correo, telefono, tema, mensaje } = req.body;
  if (!nombre || !correo || !mensaje) {
    return res.status(400).json({ error: 'Nombre, correo y mensaje son requeridos' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO contactos (nombre, correo, telefono, tema, mensaje) VALUES (?,?,?,?,?)',
      [nombre, correo, telefono || null, tema || null, mensaje]
    );
    res.status(201).json({ ok: true, id: result.insertId, mensaje: 'Tu mensaje fue enviado. Te responderemos en 48 horas hábiles.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/contacto — listar solicitudes (admin)
router.get('/', verifyToken, requireRole('admin'), async (req, res) => {
  const solo_no_leidos = req.query.no_leidos === 'true';
  const where = solo_no_leidos ? 'WHERE leido = 0' : '';
  try {
    const [rows] = await pool.query(
      `SELECT id, nombre, correo, telefono, tema, mensaje, leido, created_at
       FROM contactos ${where} ORDER BY created_at DESC`
    );
    const [[{ total }]]     = await pool.query('SELECT COUNT(*) as total FROM contactos');
    const [[{ no_leidos }]] = await pool.query('SELECT COUNT(*) as no_leidos FROM contactos WHERE leido = 0');
    res.json({ data: rows, total, no_leidos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PUT /api/contacto/:id/leido — marcar como leído (admin)
router.put('/:id/leido', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    await pool.query('UPDATE contactos SET leido = 1 WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// DELETE /api/contacto/:id (admin)
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM contactos WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

export default router;
