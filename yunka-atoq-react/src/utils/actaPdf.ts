import type { Acta } from '../services/gestionApi';
import { fechaHora, generarComprobantePDF } from './voucherPdf';
import type { Comprobante, ContenidoVoucher } from './voucherPdf';

export const ESTADOS_EQUIPO: Record<string, string> = { bueno: 'Bueno', regular: 'Regular', mantenimiento: 'En mantenimiento', danado: 'Dañado', baja: 'Dado de baja' };
const estado = (e?: string | null) => (e ? ESTADOS_EQUIPO[e] ?? e : '—');
const dia = (v?: string | null) => (v ? new Date(v.length === 10 ? `${v}T12:00:00` : v).toLocaleDateString('es-BO') : '—');

/** Contenido común del acta (vista digital y PDF), con el mismo formato que los vouchers. */
export function contenidoActa(a: Acta): ContenidoVoucher {
  const equipo: [string, string][] = [['Equipo', `${a.equipo_codigo} · ${a.equipo_nombre}`], ['Tipo de equipo', a.equipo_tipo]];
  const persona: [string, string][] = [
    ['Voluntario', a.voluntario ?? '—'],
    ...(a.voluntario_ci ? [['C.I.', a.voluntario_ci] as [string, string]] : []),
    ...(a.voluntario_grado ? [['Grado', a.voluntario_grado] as [string, string]] : []),
  ];
  const solicitud = { instancia: '1 · Solicitud · Logística', nombre: a.solicitado_nombre ?? '—', fecha: fechaHora(a.solicitud_fecha), estado: 'Solicitado' };
  const autorizacion = { instancia: '2 · Autorización · Presidencia', nombre: a.autorizado_nombre ?? '—', fecha: fechaHora(a.autorizado_at), estado: 'Autorizado' };
  const copias = ['ORIGINAL · LOGÍSTICA', 'COPIA · VOLUNTARIO'];
  if (a.tipo === 'entrega') return {
    titulo: 'ACTA DE ENTREGA DE EQUIPO', estado: 'ENTREGADO', tono: 'entrega', copias,
    datos: [...equipo, ...persona, ['Estado del equipo al entregar', estado(a.estado_salida ?? a.estado_equipo)], ['Fecha límite de devolución', dia(a.fecha_devolucion)], ['Préstamo', `Nº ${a.prestamo_id}`]],
    motivoTitulo: 'Motivo del préstamo', autorizaciones: [solicitud, autorizacion],
    firmas: [{ rol: 'Entregué conforme · Logística', nombre: a.solicitado_nombre ?? '' }, { rol: 'Recibí conforme · Voluntario', nombre: a.voluntario ?? '' }, { rol: 'Vº Bº Presidencia', nombre: a.autorizado_nombre ?? '' }],
  };
  if (a.tipo === 'devolucion') {
    const atraso = a.devuelto_at && a.fecha_devolucion && a.devuelto_at.slice(0, 10) > a.fecha_devolucion.slice(0, 10);
    return {
      titulo: 'ACTA DE DEVOLUCIÓN DE EQUIPO', estado: atraso ? 'DEVUELTO CON RETRASO' : 'DEVUELTO', tono: 'devolucion', copias,
      datos: [...equipo, ...persona, ['Estado al entregar', estado(a.estado_salida)], ['Estado al devolver', estado(a.estado_devolucion)],
        ['Fecha límite de devolución', dia(a.fecha_devolucion)], ['Fecha de devolución', fechaHora(a.devuelto_at)], ['Acta de entrega', a.acta_entrega ?? '—'], ['Motivo del préstamo', a.prestamo_motivo ?? '—']],
      motivoTitulo: 'Observaciones de recepción',
      autorizaciones: [solicitud, autorizacion, { instancia: '3 · Recepción · Logística', nombre: a.devuelto_nombre ?? '—', fecha: fechaHora(a.devuelto_at), estado: 'Recibido' }],
      firmas: [{ rol: 'Entregué conforme · Voluntario', nombre: a.voluntario ?? '' }, { rol: 'Recibí conforme · Logística', nombre: a.devuelto_nombre ?? '' }],
    };
  }
  return {
    titulo: 'ACTA DE BAJA DE EQUIPO', estado: 'DADO DE BAJA', tono: 'baja', copias: [],
    datos: [...equipo, ['Estado antes de la baja', estado(a.estado_equipo)], ['Fecha de baja', fechaHora(a.fecha)], ['Registrada por', a.registrado_nombre]],
    motivoTitulo: 'Motivo de la baja',
    autorizaciones: [{ instancia: 'Baja · Jefatura de Logística', nombre: a.registrado_nombre, fecha: fechaHora(a.fecha), estado: 'Registrada' }],
    firmas: [{ rol: 'Jefatura de Logística', nombre: a.registrado_nombre }, { rol: 'Vº Bº Presidencia', nombre: '' }],
  };
}

export function comprobanteActa(a: Acta): Comprobante {
  const detalle = a.tipo === 'entrega' ? a.prestamo_motivo : a.tipo === 'devolucion' ? a.observacion_devolucion : a.motivo;
  return { codigo: a.codigo, fecha: a.fecha, rotulo: 'Acta', detalle: detalle ?? '', contenido: contenidoActa(a) };
}

export async function descargarActaPDF(a: Acta) {
  (await generarComprobantePDF(comprobanteActa(a))).save(`Acta_${a.codigo}.pdf`);
}
