import type { PersonaLista, ReporteAsistencia } from '../services/gestionApi';
import { ASISTENCIA } from './personalPdf';
import { AZUL, ORO, ROJO, VERDE, descargarLibro, fecha, hoja, tabla } from './excelTablas';

export const ESTADO_PERSONA: Record<string, string> = { activo: 'Activo', pasiva: 'Pasivo', cooperador: 'Cooperador', comision: 'En comisión', baja: 'Baja' };
const PCT = '0.0"%"';
const conteo = ['presente', 'tarde', 'falta', 'permiso', 'comision'] as const;

export async function construirReporteAsistencia(r: ReporteAsistencia) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Yunka Atoq · Personal';
  const sub = `Del ${fecha(r.desde)!.toLocaleDateString('es-BO')} al ${fecha(r.hasta)!.toLocaleDateString('es-BO')} · asistencia efectiva = (presente + tarde) / (presente + tarde + falta)`;
  const encabezado = conteo.map(c => ({ titulo: ASISTENCIA[c], ancho: 11, formato: '0' }));
  const per = hoja(wb, 'Por persona', 'Reporte de asistencia por persona', sub, VERDE);
  tabla(per, 4, [{ titulo: 'Matrícula', ancho: 12 }, { titulo: 'Nombre completo', ancho: 32 }, { titulo: 'Grado', ancho: 16 }, { titulo: 'Estado', ancho: 13 }, ...encabezado, { titulo: '% asistencia', ancho: 13, formato: PCT }],
    r.personas.map(p => [p.matricula || '', p.nombre_completo, p.grado || '', ESTADO_PERSONA[p.estado_personal] ?? p.estado_personal, ...conteo.map(c => p[c]), p.porcentaje]));
  const dias = hoja(wb, 'Por día', 'Asistencia por día', sub, AZUL);
  tabla(dias, 4, [{ titulo: 'Fecha', ancho: 14, formato: 'dd/mm/yyyy' }, ...encabezado, { titulo: '% asistencia', ancho: 13, formato: PCT }],
    r.dias.map(d => [fecha(d.fecha), ...conteo.map(c => d[c]), d.porcentaje]));
  const det = hoja(wb, 'Detalle', 'Registros de asistencia', sub, ORO);
  tabla(det, 4, [{ titulo: 'Fecha', ancho: 12, formato: 'dd/mm/yyyy' }, { titulo: 'Matrícula', ancho: 12 }, { titulo: 'Nombre completo', ancho: 32 }, { titulo: 'Grado', ancho: 16 }, { titulo: 'Asistencia', ancho: 12 }, { titulo: 'Observación', ancho: 40 }],
    r.detalle.map(d => [fecha(d.fecha), d.matricula || '', d.nombre_completo, d.grado || '', ASISTENCIA[d.estado] ?? d.estado, d.observacion || '']));
  const bajo = hoja(wb, 'Bajo 75%', 'Personal con asistencia menor al 75 %', sub, ROJO);
  tabla(bajo, 4, [{ titulo: 'Matrícula', ancho: 12 }, { titulo: 'Nombre completo', ancho: 32 }, { titulo: 'Faltas', ancho: 10, formato: '0' }, { titulo: '% asistencia', ancho: 13, formato: PCT }],
    r.personas.filter(p => p.porcentaje !== null && p.porcentaje < 75).map(p => [p.matricula || '', p.nombre_completo, p.falta, p.porcentaje]));
  return wb;
}
export async function descargarReporteAsistencia(r: ReporteAsistencia) {
  await descargarLibro(await construirReporteAsistencia(r), `asistencia_${r.desde}_${r.hasta}.xlsx`);
}

/** Nómina completa de personal con sus indicadores. */
export async function descargarNominaPersonal(personal: PersonaLista[], codigos: Record<string, string>) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const ws = hoja(wb, 'Personal', 'Nómina de personal', `Generado el ${new Date().toLocaleString('es-BO')}`, AZUL);
  tabla(ws, 4, [{ titulo: 'Matrícula', ancho: 12 }, { titulo: 'Código', ancho: 22 }, { titulo: 'Nombre completo', ancho: 32 }, { titulo: 'C.I.', ancho: 13 }, { titulo: 'Grado', ancho: 16 }, { titulo: 'Estado', ancho: 13 }, { titulo: 'Comisión en', ancho: 22 }, { titulo: 'Teléfono', ancho: 13 }, { titulo: 'Correo', ancho: 28 }, { titulo: 'Puntos', ancho: 9, formato: '0' }, { titulo: 'Asistencias', ancho: 11, formato: '0' }, { titulo: 'Faltas', ancho: 9, formato: '0' }, { titulo: 'Méritos', ancho: 9, formato: '0' }, { titulo: 'Deméritos', ancho: 10, formato: '0' }, { titulo: 'Llamadas', ancho: 10, formato: '0' }, { titulo: 'Documentos', ancho: 11, formato: '0' }],
    personal.map(p => [p.matricula || '', codigos[p.codigo] ?? (p.role === 'postulante' ? 'Postulante' : ''), p.nombre_completo, p.carnet_identidad || '', p.grado || '', ESTADO_PERSONA[p.estado] ?? p.estado, p.comision_destino || '',
      p.telefono || '', p.email, p.total_puntos, p.asist_presentes, p.asist_faltas, p.meritos, p.demeritos, p.llamadas, p.documentos]));
  await descargarLibro(wb, `nomina_personal_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
