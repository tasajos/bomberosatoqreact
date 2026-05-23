import { Router } from 'express';
import pool from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

async function initTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS voluntario_faltas (
      id            INT PRIMARY KEY AUTO_INCREMENT,
      voluntario_id INT NOT NULL,
      fecha         DATE NOT NULL,
      motivo        TEXT,
      tipo          ENUM('injustificada','justificada') DEFAULT 'injustificada',
      registrado_por INT,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (voluntario_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS voluntario_permisos (
      id            INT PRIMARY KEY AUTO_INCREMENT,
      voluntario_id INT NOT NULL,
      fecha_inicio  DATE NOT NULL,
      fecha_fin     DATE,
      motivo        TEXT,
      aprobado      TINYINT(1) DEFAULT 0,
      registrado_por INT,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (voluntario_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS voluntario_finanzas (
      id            INT PRIMARY KEY AUTO_INCREMENT,
      voluntario_id INT NOT NULL,
      tipo          ENUM('cuota','multa','pago','ajuste') DEFAULT 'cuota',
      monto         DECIMAL(10,2) NOT NULL DEFAULT 0,
      concepto      VARCHAR(300),
      fecha         DATE NOT NULL,
      registrado_por INT,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (voluntario_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}
initTables().catch(e => console.error('voluntario init:', e));

// GET /api/voluntario/mi-perfil — dashboard del usuario logueado
router.get('/mi-perfil', verifyToken, async (req, res) => {
  const vid = req.user.id;
  try {
    const [[usuario]] = await pool.query(
      `SELECT id, nombre, apellido_paterno, apellido_materno, matricula, codigo,
              especialidad, grado, cargo_directiva, total_puntos, activo, created_at,
              telefono, email
       FROM users WHERE id=?`, [vid]
    );
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    const [[{ guardias }]] = await pool.query(
      'SELECT COUNT(*) AS guardias FROM guardias WHERE voluntario_id=?', [vid]
    );
    const [[{ operaciones }]] = await pool.query(
      `SELECT COUNT(*) AS operaciones FROM operaciones WHERE voluntario_id=? AND estado='validado'`, [vid]
    );
    const [[{ llamadas }]] = await pool.query(
      `SELECT COUNT(*) AS llamadas FROM meritos WHERE voluntario_id=? AND tipo='demerito'`, [vid]
    );
    const [[{ caps_inscritas }]] = await pool.query(
      `SELECT COUNT(*) AS caps_inscritas FROM capacitacion_inscripciones WHERE voluntario_id=?`, [vid]
    );
    const [[{ faltas }]] = await pool.query(
      `SELECT COUNT(*) AS faltas FROM voluntario_faltas WHERE voluntario_id=?`, [vid]
    ).catch(() => [[{ faltas: 0 }]]);
    const [[{ permisos }]] = await pool.query(
      `SELECT COUNT(*) AS permisos FROM voluntario_permisos WHERE voluntario_id=?`, [vid]
    ).catch(() => [[{ permisos: 0 }]]);
    const [[finanzas_row]] = await pool.query(
      `SELECT COALESCE(SUM(CASE WHEN tipo IN ('cuota','multa') THEN monto ELSE -monto END), 0) AS balance
       FROM voluntario_finanzas WHERE voluntario_id=?`, [vid]
    ).catch(() => [[{ balance: 0 }]]);

    const [guardias_recientes] = await pool.query(
      `SELECT g.id, g.fecha, g.turno, g.rol_guardia, g.novedades
       FROM guardias g WHERE g.voluntario_id=? ORDER BY g.fecha DESC LIMIT 10`, [vid]
    );

    const [llamadas_lista] = await pool.query(
      `SELECT id, titulo, descripcion, fecha, puntos_extra
       FROM meritos WHERE voluntario_id=? AND tipo='demerito' ORDER BY fecha DESC LIMIT 10`, [vid]
    );

    const [meritos_lista] = await pool.query(
      `SELECT id, titulo, descripcion, fecha, puntos_extra
       FROM meritos WHERE voluntario_id=? AND tipo='merito' ORDER BY fecha DESC LIMIT 5`, [vid]
    );

    const [caps_abiertas] = await pool.query(
      `SELECT c.id, c.nombre, c.descripcion, c.tipo, c.institucion, c.instructor,
              c.lugar, c.fecha, c.horas, c.cupo,
              COUNT(i.id) AS inscritos,
              MAX(CASE WHEN i.voluntario_id = ? THEN 1 ELSE 0 END) AS ya_inscrito
       FROM capacitaciones c
       LEFT JOIN capacitacion_inscripciones i ON i.capacitacion_id = c.id
       WHERE c.invitacion_abierta = 1 AND c.estado != 'cerrada'
       GROUP BY c.id ORDER BY c.fecha ASC LIMIT 6`, [vid]
    );

    const [caps_mis] = await pool.query(
      `SELECT i.id AS inscripcion_id, i.estado, i.notas,
              c.nombre, c.tipo AS cap_tipo, c.institucion, c.instructor, c.fecha, c.horas
       FROM capacitacion_inscripciones i
       JOIN capacitaciones c ON c.id = i.capacitacion_id
       WHERE i.voluntario_id=? ORDER BY c.fecha DESC LIMIT 5`, [vid]
    );

    res.json({
      usuario,
      stats: {
        puntos:            usuario.total_puntos || 0,
        guardias:          guardias    || 0,
        operaciones:       operaciones || 0,
        llamadas_atencion: llamadas    || 0,
        caps_inscritas:    caps_inscritas || 0,
        faltas:            faltas      || 0,
        permisos:          permisos    || 0,
        finanzas_balance:  parseFloat(finanzas_row?.balance ?? 0),
      },
      guardias_recientes,
      llamadas_lista,
      meritos_lista,
      caps_abiertas,
      caps_mis,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

export default router;
