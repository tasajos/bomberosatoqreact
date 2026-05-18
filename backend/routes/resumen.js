import { Router } from 'express';
import pool from '../db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/resumen — vista ejecutiva completa (presidente, admin)
router.get('/', verifyToken, requireRole('admin', 'presidente'), async (req, res) => {
  try {
    const year = new Date().getFullYear();

    const [
      [voluntariosRows],
      [[operativosStat]],
      [campanias],
      [[contactoStat]],
      [jefes],
      [voluntariosPorCodigo],
      [noticiasStat],
    ] = await Promise.all([
      pool.query(
        `SELECT role, COUNT(*) as total FROM users WHERE activo=1 GROUP BY role ORDER BY total DESC`
      ),
      pool.query(
        `SELECT COUNT(*) as total_operativos,
          SUM(CASE WHEN YEAR(fecha)=? THEN 1 ELSE 0 END) as operativos_anio
         FROM operativos`, [year]
      ),
      pool.query(
        `SELECT id, nombre, meta, recaudado, donantes, estado, imagen_url
         FROM campanias WHERE estado='activa' ORDER BY created_at DESC`
      ),
      pool.query(
        `SELECT COUNT(*) as total, SUM(CASE WHEN leido=0 THEN 1 ELSE 0 END) as no_leidos
         FROM contactos`
      ),
      pool.query(
        `SELECT nombre, apellido_paterno, role, matricula, especialidad, telefono
         FROM users WHERE role IN ('jefe_operaciones','jefe_personal','jefe_logistica',
           'jefe_marketing','jefe_enlaces','coordinador','presidente')
         AND activo=1 ORDER BY role`
      ),
      pool.query(
        `SELECT codigo, COUNT(*) as total FROM users WHERE codigo != '' AND activo=1
         GROUP BY codigo ORDER BY codigo`
      ),
      pool.query(
        `SELECT COUNT(*) as total,
          SUM(CASE WHEN publicado=1 THEN 1 ELSE 0 END) as publicadas
         FROM noticias`
      ),
    ]);

    const totalVoluntarios = voluntariosRows.reduce((s, r) => s + Number(r.total), 0);

    res.json({
      voluntarios: {
        total: totalVoluntarios,
        por_rol: voluntariosRows,
        por_codigo: voluntariosPorCodigo,
      },
      operativos: {
        total: Number(operativosStat.total_operativos),
        anio: Number(operativosStat.operativos_anio),
      },
      campanias,
      contacto: {
        total: Number(contactoStat.total),
        no_leidos: Number(contactoStat.no_leidos),
      },
      jefes,
      noticias: {
        total: Number(noticiasStat.total),
        publicadas: Number(noticiasStat.publicadas),
      },
      generado_en: new Date().toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

export default router;
