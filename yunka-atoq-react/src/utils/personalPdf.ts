import type { ListaAsistencia, Llamada } from '../services/gestionApi';
import { cargarLogoBase64, obtenerCabecera } from './documentosPdf';
import { fechaHora, generarComprobantePDF } from './voucherPdf';
import type { Comprobante, ContenidoVoucher } from './voucherPdf';

export const GRAVEDAD: Record<string, string> = { leve: 'Leve', grave: 'Grave', muy_grave: 'Muy grave' };
export const ASISTENCIA: Record<string, string> = { presente: 'Presente', tarde: 'Tarde', falta: 'Falta', permiso: 'Permiso', comision: 'Comisión' };
const dia = (v?: string | null) => (v ? new Date(`${v.slice(0, 10)}T12:00:00`).toLocaleDateString('es-BO') : '—');

/** Llamada de atención como memorándum institucional, con el formato de vouchers y actas. */
export function contenidoLlamada(l: Llamada): ContenidoVoucher {
  return {
    titulo: `LLAMADA DE ATENCIÓN ${l.tipo === 'escrita' ? 'ESCRITA' : 'VERBAL'}`, estado: `FALTA ${GRAVEDAD[l.gravedad].toUpperCase()}`,
    tono: l.gravedad === 'leve' ? 'reserva' : 'baja', copias: ['ORIGINAL · PERSONAL', 'COPIA · VOLUNTARIO'],
    datos: [
      ['Destinatario', l.persona ?? '—'], ['Matrícula', l.matricula || '—'],
      ...(l.carnet_identidad ? [['C.I.', l.carnet_identidad] as [string, string]] : []),
      ...(l.grado ? [['Grado', l.grado] as [string, string]] : []),
      ['Fecha del hecho', dia(l.fecha)], ['Motivo', l.motivo],
      ...(l.reglamento_codigo ? [['Falta según reglamento', `${l.reglamento_codigo} · ${l.reglamento_descripcion ?? ''}`] as [string, string]] : []),
      ...(l.reglamento_sancion ? [['Sanción prevista', l.reglamento_sancion] as [string, string]] : []),
      ['Gravedad', GRAVEDAD[l.gravedad]], ['Puntos descontados', l.puntos ? `-${l.puntos} pts` : 'Ninguno'],
    ],
    motivoTitulo: 'Descripción de los hechos',
    autorizaciones: [{ instancia: 'Registro · Jefatura de Personal', nombre: l.registrado_nombre, fecha: fechaHora(l.created_at), estado: 'Registrada' }],
    firmas: [{ rol: 'Jefatura de Personal', nombre: l.registrado_nombre }, { rol: 'Recibí conforme · Voluntario', nombre: l.persona ?? '' }],
  };
}
export const comprobanteLlamada = (l: Llamada): Comprobante =>
  ({ codigo: l.codigo, fecha: l.created_at, rotulo: 'Memorándum', detalle: l.descripcion, contenido: contenidoLlamada(l) });
export async function descargarLlamadaPDF(l: Llamada) {
  (await generarComprobantePDF(comprobanteLlamada(l))).save(`Llamada_${l.codigo}.pdf`);
}

/** Lista de asistencia del día, con columna de firma, para archivo físico. */
export async function generarListaAsistenciaPDF(lista: ListaAsistencia, responsable: string) {
  const [{ jsPDF }, { default: autoTable }, cabecera, logo] = await Promise.all([import('jspdf'), import('jspdf-autotable'), obtenerCabecera(), cargarLogoBase64()]);
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const AZUL: [number, number, number] = [8, 42, 78], GRIS: [number, number, number] = [100, 112, 128];
  doc.setProperties({ title: `Lista de asistencia ${lista.fecha}`, author: cabecera.nombre });
  if (logo) doc.addImage(logo, 'PNG', 18, 12, 18, 19, 'logo-lista', 'FAST');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(174, 139, 73); doc.text(cabecera.subtitulo.toUpperCase(), 40, 17);
  doc.setFontSize(14); doc.setTextColor(...AZUL); doc.text(cabecera.nombre.toUpperCase(), 40, 23);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(...GRIS); doc.text(doc.splitTextToSize(cabecera.nombre_legal, 100), 40, 28);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...AZUL); doc.text('LISTA DE ASISTENCIA', 192, 19, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...GRIS);
  doc.text(new Date(`${lista.fecha}T12:00:00`).toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), 192, 25, { align: 'right' });
  doc.setDrawColor(174, 139, 73); doc.setLineWidth(0.8); doc.line(18, 35, 192, 35);
  const conteo: Record<string, number> = {};
  for (const r of lista.registros) conteo[r.estado] = (conteo[r.estado] ?? 0) + 1;
  autoTable(doc, {
    startY: 40, margin: { left: 18, right: 18 }, theme: 'grid',
    head: [['Nº', 'Matrícula', 'Nombre completo', 'Grado', 'Asistencia', 'Observación', 'Firma']],
    body: lista.registros.map((r, i) => [i + 1, r.matricula || '—', r.nombre_completo, r.grado || '', ASISTENCIA[r.estado] ?? r.estado, r.observacion || '', '']),
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2.2, lineColor: [220, 226, 235], lineWidth: 0.2, textColor: [33, 43, 54], minCellHeight: 8 },
    headStyles: { fillColor: AZUL, textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 9 }, 1: { cellWidth: 20 }, 3: { cellWidth: 22 }, 4: { cellWidth: 20, fontStyle: 'bold' }, 6: { cellWidth: 30 } },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let y = (doc as any).lastAutoTable.finalY + 8;
  if (y > 250) { doc.addPage(); y = 30; }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...AZUL);
  doc.text(Object.entries(ASISTENCIA).map(([k, v]) => `${v}: ${conteo[k] ?? 0}`).join('   ·   ') + `   ·   Total: ${lista.registros.length}`, 18, y);
  y = Math.max(y + 30, 255);
  doc.setDrawColor(...GRIS); doc.setLineWidth(0.3); doc.line(70, y, 140, y);
  doc.setFontSize(8.5); doc.setTextColor(33, 43, 54); doc.text(responsable, 105, y + 4.5, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...GRIS); doc.text('Jefatura de Personal', 105, y + 8.5, { align: 'center' });
  doc.setFontSize(6.5); doc.text(`Generado el ${fechaHora(new Date().toISOString())} desde el sistema institucional`, 18, 285);
  return doc;
}
export async function descargarListaAsistenciaPDF(lista: ListaAsistencia, responsable: string) {
  (await generarListaAsistenciaPDF(lista, responsable)).save(`Asistencia_${lista.fecha}.pdf`);
}
