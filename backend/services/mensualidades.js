import { exigir, hoyBolivia } from './gestion.js';

// Los periodos son meses 'YYYY-MM'; se comparan como texto.
export const esPeriodo = v => typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
export function periodo(value, nombre = 'Mes') {
  exigir(esPeriodo(value), `${nombre} inválido (use AAAA-MM)`);
  return value;
}
export function sumarMeses(p, n) {
  const [a, m] = p.split('-').map(Number), t = a * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String(t % 12 + 1).padStart(2, '0')}`;
}
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
export const nombrePeriodo = p => `${MESES[Number(p.slice(5, 7)) - 1]} ${p.slice(0, 4)}`;
const mesDe = fecha => (fecha instanceof Date ? fecha.toISOString() : String(fecha)).slice(0, 7);
// Adelantos permitidos: hasta 11 meses después del actual.
export const MESES_ADELANTO = 11;

/**
 * Estado mensual de un voluntario. Cada mes desde su inicio queda como:
 * pagado · exento · sin_cobro (sin tarifa o tarifa 0) · vencido · pendiente (mes en curso aún no vencido) · adelanto.
 */
export function calcularEstado({ voluntario, tarifas, pagos, exenciones, hoy = hoyBolivia() }) {
  const actual = hoy.slice(0, 7), dia = Number(hoy.slice(8, 10));
  const ordenadas = [...tarifas].sort((a, b) => a.desde.localeCompare(b.desde));
  const tarifaDe = p => ordenadas.filter(t => t.desde <= p).at(-1);
  const pagado = new Map(pagos.map(p => [p.periodo, p]));
  const exento = p => exenciones.find(e => e.desde <= p && (!e.hasta || p <= e.hasta));
  const primeraTarifa = ordenadas[0]?.desde;
  const inicio = voluntario.inicio ?? [mesDe(voluntario.created_at), primeraTarifa].filter(Boolean).sort().at(-1);
  const meses = [];
  if (inicio && primeraTarifa) {
    const ultimoPago = pagos.map(p => p.periodo).sort().at(-1);
    const fin = [actual, ultimoPago].filter(Boolean).sort().at(-1);
    for (let p = inicio; p <= sumarMeses(fin, MESES_ADELANTO); p = sumarMeses(p, 1)) {
      const t = tarifaDe(p), pago = pagado.get(p), ex = exento(p);
      const mes = { periodo: p, monto: t ? Number(t.monto) : 0, vence: t ? `${p}-${String(t.dia_vencimiento).padStart(2, '0')}` : null };
      if (pago) Object.assign(mes, { estado: 'pagado', monto: Number(pago.monto), comprobante: pago.comprobante, pagado_at: pago.created_at });
      else if (ex) Object.assign(mes, { estado: 'exento', motivo: ex.motivo });
      else if (!t || !mes.monto) mes.estado = 'sin_cobro';
      else if (p < actual || (p === actual && dia > t.dia_vencimiento)) mes.estado = 'vencido';
      else mes.estado = p === actual ? 'pendiente' : 'adelanto';
      // De los meses futuros solo interesan los pagados y los que pueden adelantarse.
      if (p <= actual || ['pagado', 'adelanto'].includes(mes.estado)) meses.push(mes);
    }
  }
  const vencidos = meses.filter(m => m.estado === 'vencido');
  const delMes = meses.find(m => m.periodo === actual);
  const ultimo = [...meses].reverse().find(m => m.estado === 'pagado');
  return {
    inicio, meses,
    // Orden obligatorio de cobro: primero lo más antiguo, luego el mes en curso y los adelantos.
    por_cobrar: meses.filter(m => ['vencido', 'pendiente', 'adelanto'].includes(m.estado)).map(m => ({ periodo: m.periodo, monto: m.monto, estado: m.estado })),
    meses_vencidos: vencidos.length,
    deuda: Math.round(vencidos.reduce((s, m) => s + m.monto, 0) * 100) / 100,
    mes_actual: delMes ? { periodo: delMes.periodo, estado: delMes.estado, monto: delMes.monto, vence: delMes.vence } : null,
    ultimo_pago: ultimo ? { periodo: ultimo.periodo, comprobante: ultimo.comprobante } : null,
    estado: vencidos.length ? 'debe' : 'al_dia',
  };
}

// Solo pagan mensualidad los voluntarios activos y pasivos; baja, cooperador y comisión quedan fuera.
export const ESTADOS_COBRABLES = ['activo', 'pasiva'];
export const SQL_COBRABLE = `u.activo=1 AND COALESCE(u.estado_personal,'activo') IN ('activo','pasiva')`;

export function crearMensualidades(pool) {
  const VOLUNTARIOS = `SELECT u.id,u.nombre,u.apellido_paterno,u.apellido_materno,u.carnet_identidad,u.grado,u.email,u.created_at,
    COALESCE(u.estado_personal,'activo') estado_personal,c.inicio
    FROM users u LEFT JOIN fin_mensualidad_voluntarios c ON c.voluntario_id=u.id WHERE u.role='voluntario'`;
  async function datos(db, ids) {
    const filtro = ids ? ` AND u.id IN (?)` : ` AND ${SQL_COBRABLE}`;
    const [voluntarios] = await db.query(`${VOLUNTARIOS}${filtro} ORDER BY u.nombre,u.apellido_paterno`, ids ? [ids] : []);
    if (!voluntarios.length) return { voluntarios, tarifas: [], pagos: [], exenciones: [] };
    const lista = voluntarios.map(v => v.id);
    const [[tarifas], [pagos], [exenciones]] = await Promise.all([
      db.query('SELECT desde,monto,dia_vencimiento FROM fin_mensualidad_tarifas'),
      db.query(`SELECT p.voluntario_id,p.periodo,p.monto,p.created_at,m.comprobante FROM fin_mensualidad_pagos p
        JOIN fin_movimientos m ON m.id=p.movimiento_id WHERE p.voluntario_id IN (?)`, [lista]),
      db.query('SELECT id,voluntario_id,desde,hasta,motivo,created_at FROM fin_mensualidad_exenciones WHERE voluntario_id IN (?) ORDER BY desde', [lista]),
    ]);
    return { voluntarios, tarifas, pagos, exenciones };
  }
  const nombre = v => [v.nombre, v.apellido_paterno, v.apellido_materno].filter(Boolean).join(' ');
  async function estados(db, ids, hoy) {
    const d = await datos(db, ids);
    return d.voluntarios.map(v => {
      const pagos = d.pagos.filter(p => p.voluntario_id === v.id), exenciones = d.exenciones.filter(e => e.voluntario_id === v.id);
      return { voluntario: { id: v.id, nombre: nombre(v), ci: v.carnet_identidad, grado: v.grado, email: v.email,
          estado_personal: v.estado_personal, cobrable: ESTADOS_COBRABLES.includes(v.estado_personal) },
        exenciones, configuracion: { inicio: v.inicio ?? null }, ...calcularEstado({ voluntario: v, tarifas: d.tarifas, pagos, exenciones, hoy }) };
    });
  }
  return {
    estados,
    async estado(db, id, hoy) {
      exigir(Number.isInteger(Number(id)) && Number(id) > 0, 'Voluntario no encontrado', 404);
      const [e] = await estados(db, [Number(id)], hoy);
      exigir(e, 'Voluntario no encontrado', 404); return e;
    },
  };
}
