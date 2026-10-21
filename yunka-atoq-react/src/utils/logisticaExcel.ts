import type { Equipo, ReporteLogistica } from '../services/gestionApi';
import { ESTADOS_EQUIPO } from './actaPdf';
import { AZUL, ORO, ROJO, VERDE, descargarLibro, fecha, hoja, tabla } from './excelTablas';

const DIA = 'dd/mm/yyyy';
const ESTADO_PRESTAMO: Record<string, string> = { pendiente: 'Pendiente de autorización', autorizado: 'Asignado', rechazado: 'Rechazado', devuelto: 'Devuelto' };
const ACTA: Record<string, string> = { entrega: 'Entrega', devolucion: 'Devolución', baja: 'Baja' };
const estado = (e?: string | null) => (e ? ESTADOS_EQUIPO[e] ?? e : '');

/** Situación operativa de un equipo según su estado físico y préstamo vigente. */
export function situacion(e: Equipo) {
  if (e.estado === 'baja') return 'Dado de baja';
  if (e.prestamo_estado === 'autorizado') return 'Prestado';
  if (e.prestamo_estado === 'pendiente') return 'Pendiente de autorización';
  return ['bueno', 'regular'].includes(e.estado) ? 'Disponible' : 'No disponible';
}
const diasEntre = (desde: string, hasta: string) => Math.round((Date.parse(`${hasta.slice(0, 10)}T12:00:00`) - Date.parse(`${desde.slice(0, 10)}T12:00:00`)) / 864e5);

export async function construirReporteLogistica(r: ReporteLogistica) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Yunka Atoq · Logística';
  wb.created = new Date();
  const periodo = r.desde || r.hasta
    ? `Periodo: ${r.desde ? fecha(r.desde)!.toLocaleDateString('es-BO') : 'inicio'} al ${r.hasta ? fecha(r.hasta)!.toLocaleDateString('es-BO') : 'hoy'}`
    : 'Periodo: todos los registros';
  const sub = `${periodo} · generado el ${new Date(r.generado).toLocaleString('es-BO')}`;
  const actual = `Estado al ${new Date(r.generado).toLocaleDateString('es-BO')}`;
  const vencidos = r.equipos.filter(e => e.prestamo_estado === 'autorizado' && e.fecha_devolucion && e.fecha_devolucion.slice(0, 10) < r.hoy);
  const conRetraso = r.prestamos.filter(p => p.devuelto_at && p.devuelto_at.slice(0, 10) > p.fecha_devolucion.slice(0, 10));
  const cuenta = <T,>(l: T[], f: (x: T) => boolean) => l.filter(f).length;

  // Resumen
  const res = hoja(wb, 'Resumen', 'Bomberos Voluntarios Yunka Atoq · Reporte de logística', sub, ORO);
  res.getColumn(1).width = 40; res.getColumn(2).width = 14;
  const bloque = (fila: number, titulo: string, datos: [string, number][]) => {
    res.getCell(`A${fila}`).value = titulo; res.getCell(`A${fila}`).font = { bold: true, color: { argb: AZUL } };
    datos.forEach(([k, v], i) => { res.getCell(`A${fila + 1 + i}`).value = k; res.getCell(`B${fila + 1 + i}`).value = v; res.getCell(`B${fila + 1 + i}`).font = { bold: true }; });
    return fila + datos.length + 2;
  };
  let f = bloque(4, `Inventario (${actual.toLowerCase()})`, [
    ['Equipos en servicio (sin bajas)', cuenta(r.equipos, e => e.estado !== 'baja')], ['Disponibles', cuenta(r.equipos, e => situacion(e) === 'Disponible')],
    ['Prestados', cuenta(r.equipos, e => situacion(e) === 'Prestado')], ['Pendientes de autorización', cuenta(r.equipos, e => situacion(e) === 'Pendiente de autorización')],
    ['En mantenimiento', cuenta(r.equipos, e => e.estado === 'mantenimiento')], ['Dañados', cuenta(r.equipos, e => e.estado === 'danado')],
    ['Dados de baja', cuenta(r.equipos, e => e.estado === 'baja')], ['Préstamos vencidos sin devolver', vencidos.length],
  ]);
  f = bloque(f, 'Préstamos del periodo', [
    ['Solicitados', r.prestamos.length], ['Autorizados (asignados o devueltos)', cuenta(r.prestamos, p => ['autorizado', 'devuelto'].includes(p.estado))],
    ['Rechazados', cuenta(r.prestamos, p => p.estado === 'rechazado')], ['Devueltos', cuenta(r.prestamos, p => p.estado === 'devuelto')], ['Devueltos con retraso', conRetraso.length],
  ]);
  f = bloque(f, 'Actas emitidas en el periodo', [['Entregas', cuenta(r.actas, a => a.tipo === 'entrega')], ['Devoluciones', cuenta(r.actas, a => a.tipo === 'devolucion')], ['Bajas', cuenta(r.actas, a => a.tipo === 'baja')]]);
  res.getCell(`A${f}`).value = 'Distribución por tipo y estado'; res.getCell(`A${f}`).font = { bold: true, color: { argb: AZUL } };
  const tipos = [...new Set(r.equipos.map(e => e.tipo))].sort();
  tabla(res, f + 1, [{ titulo: 'Tipo', ancho: 40 }, { titulo: 'Total', ancho: 14, formato: '0' }, { titulo: 'Disponibles', ancho: 12, formato: '0' }, { titulo: 'Prestados', ancho: 12, formato: '0' }, { titulo: 'Bueno', ancho: 10, formato: '0' }, { titulo: 'Regular', ancho: 10, formato: '0' }, { titulo: 'Mantenimiento', ancho: 14, formato: '0' }, { titulo: 'Dañado', ancho: 10, formato: '0' }, { titulo: 'Baja', ancho: 10, formato: '0' }],
    tipos.map(t => { const l = r.equipos.filter(e => e.tipo === t); return [t, l.length, cuenta(l, e => situacion(e) === 'Disponible'), cuenta(l, e => situacion(e) === 'Prestado'), ...['bueno', 'regular', 'mantenimiento', 'danado', 'baja'].map(s => cuenta(l, e => e.estado === s))]; }));

  // Inventario completo
  const inv = hoja(wb, 'Inventario', 'Inventario de equipos', actual, VERDE);
  tabla(inv, 4, [{ titulo: 'Código', ancho: 14 }, { titulo: 'Equipo', ancho: 30 }, { titulo: 'Tipo', ancho: 18 }, { titulo: 'Estado físico', ancho: 16 }, { titulo: 'Situación', ancho: 22 }, { titulo: 'Asignado a', ancho: 28 }, { titulo: 'Devolución', ancho: 12, formato: DIA }, { titulo: 'Observaciones', ancho: 40 }, { titulo: 'Acta de baja', ancho: 12 }],
    r.equipos.map(e => [e.codigo, e.nombre, e.tipo, estado(e.estado), situacion(e), e.asignado_a || '', fecha(e.fecha_devolucion), e.observaciones || '', e.acta_baja ?? '']));

  // Préstamos del periodo
  const pre = hoja(wb, 'Préstamos', 'Préstamos de equipos', sub, AZUL);
  tabla(pre, 4, [{ titulo: 'Nº', ancho: 6 }, { titulo: 'Equipo', ancho: 30 }, { titulo: 'Tipo', ancho: 16 }, { titulo: 'Voluntario', ancho: 28 }, { titulo: 'C.I.', ancho: 12 }, { titulo: 'Solicitado', ancho: 17 }, { titulo: 'Autorizado por', ancho: 22 }, { titulo: 'Autorizado', ancho: 17 }, { titulo: 'Fecha límite', ancho: 12, formato: DIA }, { titulo: 'Devuelto', ancho: 17 }, { titulo: 'Estado', ancho: 22 }, { titulo: 'Estado al salir', ancho: 14 }, { titulo: 'Estado al volver', ancho: 14 }, { titulo: 'Acta entrega', ancho: 12 }, { titulo: 'Acta devolución', ancho: 14 }, { titulo: 'Motivo', ancho: 40 }],
    r.prestamos.map(p => [p.id, `${p.equipo_codigo} · ${p.equipo_nombre}`, p.equipo_tipo, p.voluntario, p.voluntario_ci ?? '', fecha(p.created_at), p.autorizado_nombre ?? '', fecha(p.autorizado_at), fecha(p.fecha_devolucion.slice(0, 10)), fecha(p.devuelto_at),
      ESTADO_PRESTAMO[p.estado] ?? p.estado, estado(p.estado_salida), estado(p.estado_devolucion), p.acta_entrega ?? '', p.acta_devolucion ?? '', p.rechazo_motivo ? `${p.motivo} · Rechazo: ${p.rechazo_motivo}` : p.motivo]));

  // Vencidos al día de hoy
  const ven = hoja(wb, 'Vencidos', 'Préstamos vencidos sin devolver', actual, ROJO);
  tabla(ven, 4, [{ titulo: 'Código', ancho: 14 }, { titulo: 'Equipo', ancho: 30 }, { titulo: 'Tipo', ancho: 18 }, { titulo: 'Voluntario', ancho: 28 }, { titulo: 'Fecha límite', ancho: 12, formato: DIA }, { titulo: 'Días de retraso', ancho: 14, formato: '0' }],
    vencidos.map(e => [e.codigo, e.nombre, e.tipo, e.asignado_a ?? '', fecha(e.fecha_devolucion!.slice(0, 10)), diasEntre(e.fecha_devolucion!, r.hoy)]));

  // Actas emitidas
  const act = hoja(wb, 'Actas', 'Actas de entrega, devolución y baja', sub, ORO);
  tabla(act, 4, [{ titulo: 'Acta', ancho: 10 }, { titulo: 'Tipo', ancho: 12 }, { titulo: 'Fecha', ancho: 17 }, { titulo: 'Equipo', ancho: 30 }, { titulo: 'Tipo de equipo', ancho: 16 }, { titulo: 'Voluntario', ancho: 28 }, { titulo: 'Estado del equipo', ancho: 16 }, { titulo: 'Registrada por', ancho: 24 }, { titulo: 'Motivo / observaciones', ancho: 44 }],
    r.actas.map(a => [a.codigo, ACTA[a.tipo] ?? a.tipo, fecha(a.created_at), `${a.equipo_codigo} · ${a.equipo_nombre}`, a.equipo_tipo, a.voluntario ?? '', estado(a.estado_equipo), a.registrado_nombre, a.motivo ?? '']));

  // Equipos por voluntario
  const vol = hoja(wb, 'Por voluntario', 'Equipos por voluntario', `${actual} · préstamos del periodo`, VERDE);
  const nombres = [...new Set([...r.equipos.filter(e => e.prestamo_estado === 'autorizado' && e.asignado_a).map(e => e.asignado_a!), ...r.prestamos.map(p => p.voluntario)])].sort();
  tabla(vol, 4, [{ titulo: 'Voluntario', ancho: 30 }, { titulo: 'Equipos asignados hoy', ancho: 20, formato: '0' }, { titulo: 'Detalle de equipos asignados', ancho: 50 }, { titulo: 'Préstamos en el periodo', ancho: 20, formato: '0' }, { titulo: 'Devoluciones con retraso', ancho: 22, formato: '0' }, { titulo: 'Vencidos hoy', ancho: 14, formato: '0' }],
    nombres.map(v => {
      const asignados = r.equipos.filter(e => e.prestamo_estado === 'autorizado' && e.asignado_a === v);
      return [v, asignados.length, asignados.map(e => `${e.codigo} ${e.nombre}`).join(', '), cuenta(r.prestamos, p => p.voluntario === v), cuenta(conRetraso, p => p.voluntario === v), cuenta(vencidos, e => e.asignado_a === v)];
    }));
  return wb;
}

export async function descargarReporteLogistica(r: ReporteLogistica) {
  await descargarLibro(await construirReporteLogistica(r), `logistica_yunka_atoq_${r.desde ?? 'inicio'}_${r.hasta ?? r.hoy}.xlsx`);
}
