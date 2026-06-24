import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();

const COLS = `id, nombre, apellido_paterno, apellido_materno, fecha_nacimiento,
  carnet_identidad, domicilio, telefono, contacto_nombre, contacto_telefono,
  codigo, matricula, especialidad, tipo_sangre, grado, cargo_directiva,
  email, role, activo, created_at`;

// POST /api/admin/users/recalculate-points — recalcula total_puntos de todos (admin)
router.post('/recalculate-points', verifyToken, requireRole('admin','presidente'), async (req, res) => {
  try {
    await pool.query(`
      UPDATE users u
      SET u.total_puntos = (
        SELECT COALESCE(SUM(p.puntos), 0)
        FROM puntos_voluntario p
        WHERE p.voluntario_id = u.id
      )
    `);
    res.json({ ok: true });
  } catch(err) { console.error(err); res.status(500).json({ error:'Error del servidor' }); }
});

// GET /api/admin/users — admin ve todos, presidente solo activos
router.get('/', verifyToken, requireRole('admin','presidente'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ${COLS} FROM users ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// GET /api/admin/users/next-matricula?codigo=VF
router.get('/next-matricula', verifyToken, requireRole('admin'), async (req, res) => {
  const { codigo } = req.query;
  if (!codigo || !['VF','VC','VR'].includes(codigo)) {
    return res.status(400).json({ error: 'Código inválido' });
  }
  try {
    // Obtener todas las matrículas del código para calcular el máximo número
    const [rows] = await pool.query(
      `SELECT matricula FROM users WHERE codigo = ? AND matricula REGEXP ?`,
      [codigo, `^${codigo}-[0-9]+$`]
    );
    let max = 0;
    for (const { matricula } of rows) {
      const num = parseInt(matricula.split('-')[1], 10);
      if (!isNaN(num) && num > max) max = num;
    }
    const next = String(max + 1).padStart(3, '0');
    res.json({ matricula: `${codigo}-${next}`, siguiente: max + 1 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/admin/users/:id
router.get('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const [[row]] = await pool.query(`SELECT ${COLS} FROM users WHERE id=?`, [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(row);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// POST /api/admin/users — crear usuario
router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  const {
    nombre, apellido_paterno = '', apellido_materno = '',
    fecha_nacimiento, carnet_identidad = '', domicilio = '',
    telefono = '', contacto_nombre = '', contacto_telefono = '',
    codigo = '', matricula = '', especialidad = '', tipo_sangre = '',
    email, password, role = 'voluntario',
  } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'Nombre, correo y contraseña son requeridos' });
  }

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
    if (existing.length > 0) return res.status(409).json({ error: 'El correo ya está registrado' });

    const hash = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      `INSERT INTO users (nombre, apellido_paterno, apellido_materno, fecha_nacimiento,
        carnet_identidad, domicilio, telefono, contacto_nombre, contacto_telefono,
        codigo, matricula, especialidad, tipo_sangre, email, password_hash, role, activo)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`,
      [nombre, apellido_paterno, apellido_materno, fecha_nacimiento || null,
       carnet_identidad, domicilio, telefono, contacto_nombre, contacto_telefono,
       codigo, matricula, especialidad, tipo_sangre, email, hash, role]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// PUT /api/admin/users/:id — editar usuario (actualización parcial:
// solo se modifican los campos presentes en el body; el resto queda intacto,
// por eso editar un dato ya no borra el grado/cargo ni la contraseña).
router.put('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  const b = req.body || {};

  // Columnas editables de texto/escalares que se actualizan tal cual.
  const TEXT_COLS = [
    'nombre', 'apellido_paterno', 'apellido_materno',
    'carnet_identidad', 'domicilio', 'telefono', 'contacto_nombre', 'contacto_telefono',
    'codigo', 'matricula', 'especialidad', 'tipo_sangre', 'grado', 'cargo_directiva',
    'email', 'role',
  ];

  const sets = [];
  const params = [];

  for (const col of TEXT_COLS) {
    if (b[col] !== undefined) { sets.push(`${col}=?`); params.push(b[col]); }
  }
  if (b.fecha_nacimiento !== undefined) {
    sets.push('fecha_nacimiento=?'); params.push(b.fecha_nacimiento || null);
  }
  if (b.activo !== undefined) {
    sets.push('activo=?'); params.push(b.activo ? 1 : 0);
  }
  // La contraseña solo se cambia si llega y no está vacía.
  if (typeof b.password === 'string' && b.password.trim() !== '') {
    const hash = await bcrypt.hash(b.password, 12);
    sets.push('password_hash=?'); params.push(hash);
  }

  if (sets.length === 0) return res.json({ ok: true, sin_cambios: true });

  try {
    params.push(req.params.id);
    await pool.query(`UPDATE users SET ${sets.join(',')} WHERE id=?`, params);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// PATCH /api/admin/users/:id/grado — presidente puede actualizar grado y cargo
router.patch('/:id/grado', verifyToken, requireRole('admin','presidente'), async (req, res) => {
  const { grado = '', cargo_directiva = '' } = req.body;
  try {
    await pool.query(
      'UPDATE users SET grado=?, cargo_directiva=? WHERE id=?',
      [grado, cargo_directiva, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// DELETE /api/admin/users/:id
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });
  }
  try {
    await pool.query('DELETE FROM users WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

export default router;
