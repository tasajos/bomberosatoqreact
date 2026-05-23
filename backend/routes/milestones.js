import { Router } from 'express';
import pool from '../db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();

const SEED = [
  { orden:  1, fecha_label: '2023 · Nacimiento',                      titulo: 'Nacimiento',                          descripcion: 'Un grupo de voluntarios con pasión por el servicio se reúne para formar las bases de lo que se convertiría la Fundación Yunka Atoq.' },
  { orden:  2, fecha_label: '2023 · Primer apoyo oficial',             titulo: 'Primer apoyo oficial',                descripcion: 'Realizamos nuestro primer apoyo exitoso, consolidando al equipo y definiendo nuestro propósito de servicio.' },
  { orden:  3, fecha_label: '5 Ago 2023 · Laguna Corani',              titulo: 'Laguna Corani',                       descripcion: 'Participación de apoyo y prácticas en espacios confinados. Instrucción y capacitación en espacios confinados en Laguna Corani.' },
  { orden:  4, fecha_label: '16 Sep 2023 · CPI · S130 · S190',        titulo: 'Certificación CPI · S130 · S190',     descripcion: 'Inicio de capacitación y certificación en los cursos CPI, S130 y S190 en conjunto con otras unidades de bomberos voluntarios.' },
  { orden:  5, fecha_label: '5 May 2024 · Desafío de la Mochila',     titulo: 'Desafío de la Mochila',               descripcion: 'Nuestros bomberos voluntarios participan del Desafío de la Mochila, prueba física de resistencia y capacidad operativa.' },
  { orden:  6, fecha_label: '12 Sep 2024 · Río Blanco, Santa Cruz',   titulo: '2da Emergencia Nacional — Chiquitanía', descripcion: 'Fuerza de tarea conjunta combatiendo incendios forestales en Río Blanco, Santa Cruz — Chiquitanía.' },
  { orden:  7, fecha_label: '20 Sep 2024 · Riberalta, Beni',          titulo: '3ra Patrulla — Beni',                 descripcion: 'La 3ra Patrulla de Bomberos Voluntarios Yunka Atoq rumbo al Beni con insumos esenciales para el combate de incendios forestales.' },
  { orden:  8, fecha_label: '18 Dic 2024 · Reconocimiento UCB',       titulo: 'Reconocimiento UCB Cochabamba',       descripcion: 'Reconocimiento de la Fundación Sedes Sapientiae y la UCB Cochabamba por las operaciones de sofocación en el Oriente Boliviano.' },
  { orden:  9, fecha_label: '18 Abr 2025 · Muro de la Voluntad',      titulo: 'Plaqueta Muro de la Voluntad',        descripcion: 'Plaqueta de reconocimiento en el Muro de la Voluntad en Viernes Santo, símbolo de unidad, sacrificio y compromiso con Cochabamba.' },
  { orden: 10, fecha_label: '11 Jul 2025 · Asamblea Legislativa',     titulo: 'Reconocimiento Asamblea Legislativa', descripcion: 'Reconocimiento institucional en la 2da Convención Nacional de Voluntariados en Bolivia, Asamblea Legislativa Plurinacional.' },
  { orden: 11, fecha_label: '18 Jul 2025 · Personería Jurídica',      titulo: 'Personería Jurídica',                 descripcion: 'La Fundación de Voluntarios de Salvamento, Rescate y Protección Ambiental Yunka Atoq obtiene oficialmente su Personería Jurídica.' },
];

async function initTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS milestones (
      id          INT PRIMARY KEY AUTO_INCREMENT,
      orden       INT NOT NULL DEFAULT 0,
      fecha_label VARCHAR(200) NOT NULL,
      titulo      VARCHAR(300) NOT NULL,
      descripcion TEXT,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM milestones');
  if (n === 0) {
    for (const m of SEED) {
      await pool.query(
        'INSERT INTO milestones (orden, fecha_label, titulo, descripcion) VALUES (?,?,?,?)',
        [m.orden, m.fecha_label, m.titulo, m.descripcion]
      );
    }
    console.log('milestones: tabla sembrada con', SEED.length, 'hitos');
  }
}
initTable().catch(e => console.error('milestones init:', e));

// GET /api/milestones — público
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM milestones ORDER BY orden ASC, id ASC');
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error del servidor' }); }
});

// POST — admin/presidente
router.post('/', verifyToken, requireRole('admin', 'presidente'), async (req, res) => {
  const { fecha_label, titulo, descripcion, orden } = req.body;
  if (!fecha_label || !titulo) return res.status(400).json({ error: 'fecha_label y titulo son requeridos' });
  try {
    const [r] = await pool.query(
      'INSERT INTO milestones (orden, fecha_label, titulo, descripcion) VALUES (?,?,?,?)',
      [orden ?? 0, fecha_label, titulo, descripcion || null]
    );
    res.status(201).json({ id: r.insertId });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error del servidor' }); }
});

// PUT /:id
router.put('/:id', verifyToken, requireRole('admin', 'presidente'), async (req, res) => {
  const { fecha_label, titulo, descripcion, orden } = req.body;
  try {
    await pool.query(
      'UPDATE milestones SET orden=?, fecha_label=?, titulo=?, descripcion=? WHERE id=?',
      [orden ?? 0, fecha_label, titulo, descripcion || null, req.params.id]
    );
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error del servidor' }); }
});

// DELETE /:id
router.delete('/:id', verifyToken, requireRole('admin', 'presidente'), async (req, res) => {
  try {
    await pool.query('DELETE FROM milestones WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error del servidor' }); }
});

export default router;
