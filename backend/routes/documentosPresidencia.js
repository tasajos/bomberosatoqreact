import { Router } from 'express';
import pool from '../db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();
const DOC_ROLES = ['admin', 'presidente'];
const TIPOS = ['resolucion', 'procedimiento', 'protocolo'];
const PREFIJOS = { resolucion: 'RES', procedimiento: 'PROC', protocolo: 'PROT' };

// ── Inicialización idempotente de tablas ──────────────────────────
async function initTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS documentos_presidencia (
      id              INT PRIMARY KEY AUTO_INCREMENT,
      tipo            ENUM('resolucion','procedimiento','protocolo') NOT NULL,
      numero          INT NOT NULL,
      anio            INT NOT NULL,
      titulo          VARCHAR(200) NOT NULL,
      fecha           DATE NOT NULL,
      contenido       JSON NOT NULL,
      firmante_nombre VARCHAR(150),
      firmante_cargo  VARCHAR(100) DEFAULT 'PRESIDENTE',
      creado_por      INT,
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_tipo_anio_numero (tipo, anio, numero),
      FOREIGN KEY (creado_por) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `).catch(() => {});
  await pool.query(`
    CREATE TABLE IF NOT EXISTS documento_presidencia_voluntarios (
      id            INT PRIMARY KEY AUTO_INCREMENT,
      documento_id  INT NOT NULL,
      voluntario_id INT NOT NULL,
      rol           VARCHAR(100),
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_doc_vol (documento_id, voluntario_id),
      FOREIGN KEY (documento_id)  REFERENCES documentos_presidencia(id) ON DELETE CASCADE,
      FOREIGN KEY (voluntario_id) REFERENCES users(id)                  ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `).catch(() => {});
}
initTables();

function codigoCompleto(doc) {
  return `${PREFIJOS[doc.tipo]} N° ${String(doc.numero).padStart(3, '0')}/${doc.anio}`;
}

// Adjunta voluntarios relacionados y código correlativo a una fila
async function hidratarDocumento(doc) {
  const [vols] = await pool.query(
    `SELECT dv.voluntario_id, dv.rol,
            CONCAT(u.nombre,' ',u.apellido_paterno) AS nombre,
            u.matricula, u.codigo, u.especialidad, u.cargo_directiva
     FROM documento_presidencia_voluntarios dv
     JOIN users u ON dv.voluntario_id = u.id
     WHERE dv.documento_id=? ORDER BY dv.created_at`,
    [doc.id]
  );
  let contenido = doc.contenido;
  if (typeof contenido === 'string') {
    try { contenido = JSON.parse(contenido); } catch { contenido = {}; }
  }
  return { ...doc, contenido, voluntarios: vols, codigo_completo: codigoCompleto(doc) };
}

// ══════════════════════════════════════════════════════════════════
// LISTAR — ?tipo=resolucion|procedimiento|protocolo (requerido)
// ══════════════════════════════════════════════════════════════════
router.get('/', verifyToken, async (req, res) => {
  const { tipo } = req.query;
  if (!TIPOS.includes(tipo)) return res.status(400).json({ error: 'Tipo inválido' });
  try {
    const [rows] = await pool.query(
      `SELECT d.*, CONCAT(c.nombre,' ',c.apellido_paterno) AS creado_nombre
       FROM documentos_presidencia d
       LEFT JOIN users c ON d.creado_por = c.id
       WHERE d.tipo=? ORDER BY d.anio DESC, d.numero DESC`,
      [tipo]
    );
    const data = await Promise.all(rows.map(hidratarDocumento));
    res.json({ data });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// DETALLE
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const [[doc]] = await pool.query(
      `SELECT d.*, CONCAT(c.nombre,' ',c.apellido_paterno) AS creado_nombre
       FROM documentos_presidencia d
       LEFT JOIN users c ON d.creado_por = c.id
       WHERE d.id=?`,
      [req.params.id]
    );
    if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });
    res.json(await hidratarDocumento(doc));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// ══════════════════════════════════════════════════════════════════
// CREAR — asigna número correlativo por tipo+año dentro de una transacción
// ══════════════════════════════════════════════════════════════════
router.post('/', verifyToken, requireRole(...DOC_ROLES), async (req, res) => {
  const {
    tipo, titulo, fecha, contenido,
    firmante_nombre, firmante_cargo, voluntarios,
  } = req.body;
  if (!TIPOS.includes(tipo)) return res.status(400).json({ error: 'Tipo inválido' });
  if (!titulo || !fecha) return res.status(400).json({ error: 'Título y fecha son requeridos' });

  const anio = new Date(fecha).getFullYear();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[ultimo]] = await conn.query(
      'SELECT numero FROM documentos_presidencia WHERE tipo=? AND anio=? ORDER BY numero DESC LIMIT 1 FOR UPDATE',
      [tipo, anio]
    );
    const numero = (ultimo?.numero || 0) + 1;

    const [r] = await conn.query(
      `INSERT INTO documentos_presidencia
        (tipo,numero,anio,titulo,fecha,contenido,firmante_nombre,firmante_cargo,creado_por)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        tipo, numero, anio, titulo, fecha,
        JSON.stringify(contenido || {}),
        firmante_nombre || '', firmante_cargo || 'PRESIDENTE', req.user.id,
      ]
    );
    const docId = r.insertId;

    const lista = Array.isArray(voluntarios) ? voluntarios : [];
    for (const v of lista) {
      await conn.query(
        'INSERT IGNORE INTO documento_presidencia_voluntarios (documento_id,voluntario_id,rol) VALUES (?,?,?)',
        [docId, v.voluntario_id, v.rol || null]
      );
    }

    await conn.commit();
    res.status(201).json({ id: docId, numero, anio });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  } finally {
    conn.release();
  }
});

// ══════════════════════════════════════════════════════════════════
// ACTUALIZAR — no recalcula numero/anio
// ══════════════════════════════════════════════════════════════════
router.put('/:id', verifyToken, requireRole(...DOC_ROLES), async (req, res) => {
  const { titulo, fecha, contenido, firmante_nombre, firmante_cargo, voluntarios } = req.body;
  if (!titulo || !fecha) return res.status(400).json({ error: 'Título y fecha son requeridos' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `UPDATE documentos_presidencia SET
        titulo=?, fecha=?, contenido=?, firmante_nombre=?, firmante_cargo=?
       WHERE id=?`,
      [titulo, fecha, JSON.stringify(contenido || {}), firmante_nombre || '', firmante_cargo || 'PRESIDENTE', req.params.id]
    );

    await conn.query('DELETE FROM documento_presidencia_voluntarios WHERE documento_id=?', [req.params.id]);
    const lista = Array.isArray(voluntarios) ? voluntarios : [];
    for (const v of lista) {
      await conn.query(
        'INSERT IGNORE INTO documento_presidencia_voluntarios (documento_id,voluntario_id,rol) VALUES (?,?,?)',
        [req.params.id, v.voluntario_id, v.rol || null]
      );
    }

    await conn.commit();
    res.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  } finally {
    conn.release();
  }
});

// ELIMINAR
router.delete('/:id', verifyToken, requireRole(...DOC_ROLES), async (req, res) => {
  try {
    await pool.query('DELETE FROM documentos_presidencia WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

export default router;
