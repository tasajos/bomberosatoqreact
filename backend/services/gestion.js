import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

export function exigir(condicion, mensaje, status = 400) {
  if (!condicion) throw Object.assign(new Error(mensaje), { status });
}
export function texto(value, nombre, max = 1000) {
  exigir(typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max, `${nombre} es obligatorio (máximo ${max} caracteres)`);
  return value.trim();
}
export function monto(value) {
  exigir((typeof value === 'string' || typeof value === 'number') && /^\d{1,10}(\.\d{1,2})?$/.test(String(value)) && Number(value) > 0, 'Monto inválido: use un valor positivo con hasta dos decimales');
  return Number(value).toFixed(2);
}
export function fecha(value) {
  exigir(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value, 'Fecha inválida');
  return value;
}
export const hoyBolivia = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' }).format(new Date());
export const ESTADOS_EQUIPO = ['bueno', 'regular', 'mantenimiento', 'danado', 'baja'];
export const CONCEPTOS = ['apoyo', 'instruccion', 'capacitacion', 'viaje'];
// Conceptos de todos los movimientos. «manual» indica los que finanzas elige al registrar
// un ingreso o egreso directo; los demás los asigna el sistema según el origen.
export const CONCEPTOS_MOVIMIENTO = [
  { clave: 'donacion', nombre: 'Donación', tipo: 'ingreso', manual: true },
  { clave: 'aporte', nombre: 'Aporte institucional', tipo: 'ingreso', manual: true },
  { clave: 'actividad', nombre: 'Actividad / evento', tipo: 'ingreso', manual: true },
  { clave: 'saldo_inicial', nombre: 'Saldo inicial', tipo: 'ingreso', manual: true },
  { clave: 'otros_ingresos', nombre: 'Otros ingresos', tipo: 'ingreso', manual: true },
  { clave: 'combustible', nombre: 'Combustible', tipo: 'egreso', manual: true },
  { clave: 'mantenimiento', nombre: 'Mantenimiento', tipo: 'egreso', manual: true },
  { clave: 'equipamiento', nombre: 'Equipamiento', tipo: 'egreso', manual: true },
  { clave: 'servicios', nombre: 'Servicios básicos', tipo: 'egreso', manual: true },
  { clave: 'alimentacion', nombre: 'Alimentación', tipo: 'egreso', manual: true },
  { clave: 'otros_egresos', nombre: 'Otros egresos', tipo: 'egreso', manual: true },
  { clave: 'apoyo', nombre: 'Apoyo', tipo: 'ambos', manual: false },
  { clave: 'instruccion', nombre: 'Instrucción', tipo: 'egreso', manual: false },
  { clave: 'capacitacion', nombre: 'Capacitación', tipo: 'egreso', manual: false },
  { clave: 'viaje', nombre: 'Viaje', tipo: 'egreso', manual: false },
  { clave: 'mensualidad', nombre: 'Mensualidades', tipo: 'ingreso', manual: false },
  { clave: 'prestamo', nombre: 'Préstamo recibido', tipo: 'ingreso', manual: false },
  { clave: 'pago_deuda', nombre: 'Pago de deuda', tipo: 'egreso', manual: false },
];

const MIGRACIONES = [
  ['19_finanzas_comprobantes.sql', 'fin_movimientos', 'comprobante'],
  ['20_finanzas_mensualidades.sql', 'fin_movimientos', 'voluntario_id'],
  ['21_finanzas_deudas_conceptos.sql', 'fin_movimientos', 'deuda_id'],
  ['22_logistica_actas_tipos.sql', 'log_actas', 'codigo'],
  ['23_personal_gestion.sql', 'per_llamadas', 'codigo'],
  ['24_personal_reglamento.sql', 'per_llamadas', 'reglamento_id'],
];

export function crearGestion(pool) {
  let ready;
  const init = () => ready ??= (async () => {
    const sql = await readFile(new URL('../scripts/18_finanzas_logistica.sql', import.meta.url), 'utf8');
    for (const sentencia of sql.split(';').map(s => s.trim()).filter(Boolean)) await pool.query(sentencia);
    // Cada script se aplica una sola vez: la columna testigo indica que ya se ejecutó.
    for (const [script, tabla, testigo] of MIGRACIONES) {
      const [[columna]] = await pool.query(`SELECT 1 existe FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?`, [tabla, testigo]);
      if (columna) continue;
      // La numeración usa una tabla temporal: debe ejecutarse en una sola conexión.
      const migracion = await readFile(new URL(`../scripts/${script}`, import.meta.url), 'utf8');
      const db = await pool.getConnection();
      try { for (const sentencia of migracion.split(';').map(s => s.trim()).filter(Boolean)) await db.query(sentencia); }
      finally { db.release(); }
    }
  })().catch(e => { ready = undefined; throw e; });

  async function saldo(db) {
    const [[s]] = await db.query(`SELECT
      (SELECT COALESCE(SUM(CASE WHEN tipo='ingreso' THEN monto ELSE -monto END),0) FROM fin_movimientos) saldo,
      (SELECT COALESCE(SUM(monto),0) FROM fin_movimientos WHERE tipo='ingreso') ingresos,
      (SELECT COALESCE(SUM(monto),0) FROM fin_movimientos WHERE tipo='egreso') egresos,
      (SELECT COALESCE(SUM(monto),0) FROM fin_reservas WHERE estado='activa') reservado,
      (SELECT COALESCE(SUM(monto),0) FROM fin_solicitudes WHERE tipo='egreso' AND estado IN ('pendiente_presidencia','autorizada')) comprometido`);
    const r = Object.fromEntries(Object.entries(s).map(([k,v]) => [k, Number(v)]));
    r.disponible = Math.round((r.saldo - r.reservado - r.comprometido) * 100) / 100;
    return r;
  }
  async function disponible(db, cantidad) {
    exigir(Math.round(Number(cantidad)*100) <= Math.round((await saldo(db)).disponible*100), 'Saldo disponible insuficiente. Revise las reservas y solicitudes comprometidas.', 409);
  }
  // Una fila común serializa decisiones monetarias y asignaciones: también funciona con varias instancias.
  async function transaccion(actor, clave, payload, fn) {
    exigir(typeof clave === 'string' && /^[a-zA-Z0-9-]{16,80}$/.test(clave), 'Se requiere una clave de operación válida');
    await init();
    const db = await pool.getConnection();
    try {
      await db.beginTransaction();
      await db.query('SELECT id FROM gestion_control WHERE id=1 FOR UPDATE');
      const huella = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
      const [[prev]] = await db.query('SELECT * FROM gestion_comandos WHERE actor_id=? AND clave=?', [actor.id, clave]);
      if (prev) {
        exigir(prev.huella === huella, 'La clave ya pertenece a otra operación', 409);
        await db.commit();
        return typeof prev.resultado === 'string' ? JSON.parse(prev.resultado) : prev.resultado;
      }
      const result = await fn(db);
      await db.query('INSERT INTO gestion_comandos (actor_id,clave,huella,resultado) VALUES (?,?,?,?)', [actor.id,clave,huella,JSON.stringify(result)]);
      await db.commit(); return result;
    } catch (e) { await db.rollback(); throw e; } finally { db.release(); }
  }
  // Se llama dentro de transaccion(): la fila de control ya está bloqueada y un rollback no deja huecos.
  async function comprobante(db) {
    await db.query('UPDATE gestion_control SET fin_correlativo=fin_correlativo+1 WHERE id=1');
    const [[c]] = await db.query('SELECT fin_correlativo n FROM gestion_control WHERE id=1');
    return `FIN${String(c.n).padStart(3, '0')}`;
  }
  // Acta de logística con correlativo LOG; también bajo el bloqueo de transaccion().
  async function acta(db, { tipo, prestamo_id = null, equipo_id, estado_equipo = null, motivo = null }, actor) {
    const [[u]] = await db.query('SELECT COALESCE(MAX(numero),0)+1 n FROM log_actas');
    const codigo = `LOG${String(u.n).padStart(3, '0')}`;
    await db.query('INSERT INTO log_actas (numero,codigo,tipo,prestamo_id,equipo_id,estado_equipo,motivo,registrado_por) VALUES (?,?,?,?,?,?,?,?)',
      [u.n, codigo, tipo, prestamo_id, equipo_id, estado_equipo, motivo, actor.id]);
    return codigo;
  }
  async function evento(db, entidad, id, accion, actor, detalle) {
    await db.query('INSERT INTO gestion_eventos (entidad,entidad_id,accion,actor_id,detalle) VALUES (?,?,?,?,?)', [entidad,id,accion,actor.id,JSON.stringify(detalle)]);
  }
  async function notificar(db, evento, departamento, voluntario, asunto, cuerpo) {
    const [usuarios] = await db.query('SELECT email FROM users WHERE (activo=1 AND role IN (?, ?)) OR id=?', [departamento,'presidente',voluntario]);
    for (const email of new Set(usuarios.map(u => u.email).filter(Boolean))) {
      await db.query('INSERT IGNORE INTO gestion_correos (evento,destinatario,asunto,cuerpo) VALUES (?,?,?,?)', [evento,email,asunto,cuerpo]);
    }
  }
  return { init, saldo, disponible, transaccion, comprobante, acta, evento, notificar };
}
