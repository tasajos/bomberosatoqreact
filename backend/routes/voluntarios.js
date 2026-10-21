import { Router } from 'express';
import pool from '../db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { notificarPostulacion } from '../mailer.js';

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
    // Notificación por correo — no bloquea la respuesta
    notificarPostulacion({ nombre, email, telefono, edad, mensaje }).catch(e =>
      console.error('Error enviando email de postulación:', e.message)
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

// Convocatoria: fechas y plazas guardadas en la tabla configuracion
const CONV_KEYS = {
  inicio: 'convocatoria_inicio',
  cierre: 'convocatoria_cierre',
  plazas: 'convocatoria_plazas',
};
const isISODate = v => /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(new Date(`${v}T00:00:00Z`).getTime());

// GET /api/voluntarios/convocatoria - público
router.get('/convocatoria', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT clave, valor FROM configuracion WHERE clave IN (?)',
      [Object.values(CONV_KEYS)]
    );
    const cfg = Object.fromEntries(rows.map(r => [r.clave, r.valor]));
    const inicio = cfg[CONV_KEYS.inicio] || '';
    const cierre = cfg[CONV_KEYS.cierre] || '';
    const plazas = cfg[CONV_KEYS.plazas] ? parseInt(cfg[CONV_KEYS.plazas], 10) : null;

    // Postulantes de la convocatoria actual (solo si hay fecha de apertura)
    let postulantes = null;
    if (isISODate(inicio)) {
      const [[{ total }]] = cierre && isISODate(cierre)
        ? await pool.query(
            'SELECT COUNT(*) AS total FROM postulaciones WHERE created_at >= ? AND created_at < DATE_ADD(?, INTERVAL 1 DAY)',
            [inicio, cierre]
          )
        : await pool.query('SELECT COUNT(*) AS total FROM postulaciones WHERE created_at >= ?', [inicio]);
      postulantes = Number(total);
    }

    res.json({ inicio, cierre, plazas: Number.isNaN(plazas) ? null : plazas, postulantes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PUT /api/voluntarios/convocatoria - admin o presidente
router.put('/convocatoria', verifyToken, requireRole('admin', 'presidente'), async (req, res) => {
  const inicio = String(req.body.inicio ?? '').trim();
  const cierre = String(req.body.cierre ?? '').trim();
  const plazasRaw = req.body.plazas;

  if (!isISODate(cierre)) return res.status(400).json({ error: 'La fecha de cierre es obligatoria (AAAA-MM-DD)' });
  if (inicio && !isISODate(inicio)) return res.status(400).json({ error: 'Fecha de apertura inválida' });
  if (inicio && inicio > cierre) return res.status(400).json({ error: 'La apertura debe ser anterior o igual al cierre' });

  let plazas = '';
  if (plazasRaw !== '' && plazasRaw != null) {
    const n = parseInt(plazasRaw, 10);
    if (Number.isNaN(n) || n < 0 || n > 9999) return res.status(400).json({ error: 'Número de plazas inválido' });
    plazas = String(n);
  }

  try {
    const values = { [CONV_KEYS.inicio]: inicio, [CONV_KEYS.cierre]: cierre, [CONV_KEYS.plazas]: plazas };
    for (const [clave, valor] of Object.entries(values)) {
      await pool.query(
        'INSERT INTO configuracion (clave, valor) VALUES (?,?) ON DUPLICATE KEY UPDATE valor=?',
        [clave, valor, valor]
      );
    }
    res.json({ ok: true });
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
