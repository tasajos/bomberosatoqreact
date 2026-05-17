import { Router } from 'express';
import pool from '../db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();

const parse = row => ({
  ...row,
  capacidades: typeof row.capacidades === 'string' ? JSON.parse(row.capacidades) : (row.capacidades ?? []),
  tags:        typeof row.tags        === 'string' ? JSON.parse(row.tags)        : (row.tags        ?? []),
});

// GET /api/servicios — público
router.get('/', async (req, res) => {
  const all = req.query.all === 'true';
  const where = all ? '' : 'WHERE activo = 1';
  try {
    const [rows] = await pool.query(
      `SELECT id,numero,titulo,descripcion,icono,capacidades,tags,activo,orden,created_at
       FROM servicios ${where} ORDER BY orden ASC`
    );
    res.json(rows.map(parse));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// GET /api/servicios/:id
router.get('/:id', async (req, res) => {
  try {
    const [[row]] = await pool.query('SELECT * FROM servicios WHERE id=?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    res.json(parse(row));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// POST /api/servicios — crear (admin)
router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  const { numero, titulo, descripcion, icono, capacidades, tags } = req.body;
  if (!titulo) return res.status(400).json({ error: 'El título es requerido' });
  try {
    const [[{ maxOrden }]] = await pool.query('SELECT MAX(orden) as maxOrden FROM servicios');
    const orden = (maxOrden ?? 0) + 1;
    const [result] = await pool.query(
      `INSERT INTO servicios (numero,titulo,descripcion,icono,capacidades,tags,activo,orden)
       VALUES (?,?,?,?,?,?,1,?)`,
      [
        numero || '01', titulo, descripcion || '', icono || 'default',
        JSON.stringify(capacidades ?? []),
        JSON.stringify(tags ?? ['24/7','Voluntario','Sin costo']),
        orden,
      ]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// PUT /api/servicios/:id — actualizar (admin)
router.put('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  const { numero, titulo, descripcion, icono, capacidades, tags, activo, orden } = req.body;
  try {
    await pool.query(
      `UPDATE servicios SET numero=?,titulo=?,descripcion=?,icono=?,capacidades=?,tags=?,activo=?,orden=?
       WHERE id=?`,
      [
        numero, titulo, descripcion || '', icono || 'default',
        JSON.stringify(capacidades ?? []),
        JSON.stringify(tags ?? []),
        activo ? 1 : 0, orden, req.params.id,
      ]
    );
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// DELETE /api/servicios/:id (admin)
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM servicios WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

export default router;
