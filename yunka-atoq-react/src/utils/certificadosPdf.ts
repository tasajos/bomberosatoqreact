import type { jsPDF } from 'jspdf';
import { obtenerCabecera } from './documentosPdf';

export interface DatosCertificado {
  participante: string;
  documento: string;
  curso: string;
  modalidad: 'participacion' | 'aprobacion';
  horas: string;
  fechaInicio: string;
  fechaFin: string;
  lugar: string;
  fechaEmision: string;
  presidente: string;
  cargoPresidente: string;
  instructor: string;
  cargoInstructor: string;
  codigo: string;
  temario: string;
  incluirQR: boolean;
}

export function datosCertificadoVacios(): DatosCertificado {
  const hoy = new Date();
  const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  return {
    participante: '', documento: '', curso: '', modalidad: 'participacion', horas: '',
    fechaInicio: '', fechaFin: '', lugar: 'Cochabamba', fechaEmision: fecha,
    presidente: '', cargoPresidente: 'Presidente de la Fundación',
    instructor: '', cargoInstructor: 'Instructor del curso', codigo: '', temario: '', incluirQR: true,
  };
}

function fechaLarga(fecha: string): string {
  const date = new Date(`${fecha.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) throw new Error('Revisa las fechas del certificado.');
  return date.toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' });
}

const NAVY: [number, number, number] = [8, 42, 78];
const RED: [number, number, number] = [186, 35, 46];
const GRAY: [number, number, number] = [83, 98, 115];
const GOLD: [number, number, number] = [177, 144, 83];

// Ajusta texto real sin cortarlo ni invadir las firmas o el marco.
function centrado(doc: jsPDF, texto: string, y: number, ancho: number, tamano: number, maxLineas = 1, interlineado = 5, centro = 148.5): void {
  let lineas: string[] = [];
  for (let size = tamano; size >= 6; size -= 0.5) {
    doc.setFontSize(size);
    lineas = doc.splitTextToSize(texto, ancho);
    if (lineas.length <= maxLineas) {
      doc.text(lineas, centro, y, { align: 'center', lineHeightFactor: interlineado / (size * 0.352778) });
      return;
    }
  }
  throw new Error('El texto es demasiado largo para la plantilla. Reduce el nombre o el título del curso.');
}

async function cargarLogo(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) throw new Error('No se pudo cargar un logo oficial. Recarga e intenta nuevamente.');
  return new Uint8Array(await response.arrayBuffer());
}

export interface EmisionCertificadoPDF { urlVerificacion: string; }

function marco(doc: jsPDF) {
  doc.setFillColor(252, 251, 248);
  doc.rect(0, 0, 297, 210, 'F');
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.6);
  doc.rect(12, 12, 273, 186);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.2);
  doc.rect(15, 15, 267, 180);
  doc.setFillColor(...NAVY);
  doc.rect(12, 12, 2, 186, 'F');
  doc.setFillColor(...RED);
  doc.rect(12, 12, 2, 31, 'F');
  for (const [x,y,sx,sy] of [[19,19,1,1],[278,19,-1,1],[19,191,1,-1],[278,191,-1,-1]]) {
    doc.setDrawColor(...GOLD); doc.setLineWidth(0.45);
    doc.line(x,y,x+sx*9,y); doc.line(x,y,x,y+sy*9);
  }
}

function temarioEnColumnas(doc: jsPDF, temario: string) {
  const temas = (temario || '[TEMA O MÓDULO 1]\n[TEMA O MÓDULO 2]\n[TEMA O MÓDULO 3]')
    .split('\n').map(s => s.trim().replace(/^(?:[-•]\s*|\d+[.)]\s+)/,'')).filter(Boolean);
  doc.setFont('helvetica','normal');
  for (let size = 10; size >= 7; size -= 0.5) {
    const altoLinea = size * 0.352778 * 1.35;
    doc.setFontSize(size);
    const partes = temas.map(texto => {
      const lineas: string[] = doc.splitTextToSize(texto,105);
      return { lineas, alto:lineas.length*altoLinea+2.5 };
    });
    let corte = partes.length, maximo = Infinity;
    for (let i = 1; i <= partes.length; i++) {
      const alto = Math.max(partes.slice(0,i).reduce((a,b)=>a+b.alto,0),partes.slice(i).reduce((a,b)=>a+b.alto,0));
      if (alto <= maximo) { maximo = alto; corte = i; }
    }
    if (maximo > 80) continue;
    let y = 66;
    partes.forEach((parte,i) => {
      if (i === corte) y = 66;
      const x = i < corte ? 34 : 163;
      doc.setFont('helvetica','bold'); doc.setTextColor(...GOLD);
      doc.text(String(i+1).padStart(2,'0'),x-9,y);
      doc.setFont('helvetica','normal'); doc.setTextColor(...NAVY);
      doc.text(parte.lineas,x,y,{ lineHeightFactor:1.35 });
      y += parte.alto;
    });
    return;
  }
  throw new Error('El temario no cabe en el reverso. Resume los módulos o reduce su cantidad. No se ha emitido el certificado.');
}

export async function crearCertificadoPDF(datos: DatosCertificado, emision?: EmisionCertificadoPDF) {
  if (datos.horas && (!Number.isFinite(Number(datos.horas)) || Number(datos.horas) <= 0)) {
    throw new Error('La carga horaria debe ser mayor que cero.');
  }
  if (datos.fechaInicio && datos.fechaFin && datos.fechaFin < datos.fechaInicio) {
    throw new Error('La fecha de finalización no puede ser anterior al inicio.');
  }
  const [{ jsPDF }, identidad, logo, oba] = await Promise.all([
    import('jspdf'), obtenerCabecera(),
    cargarLogo('/yunka_atoq_transparente.png'), cargarLogo('/oba_logo.png'),
  ]);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.setProperties({ title: `Certificado - ${datos.curso || 'Plantilla de curso'}`, author: identidad.nombre });
  const registrado = !!emision && /^CRTYA-\d+$/.test(datos.codigo);
  const control = registrado ? `${datos.codigo} - ${datos.curso}` : 'BORRADOR · SIN REGISTRO';
  let qr: string | null = null;
  if (registrado && datos.incluirQR) {
    const { default: QRCode } = await import('qrcode');
    qr = await QRCode.toDataURL(emision!.urlVerificacion, { width:600, margin:4, errorCorrectionLevel:'M', color:{ dark:'#082A4E', light:'#FFFFFF' } });
  }
  marco(doc);

  const img = doc.getImageProperties(logo);
  const logoH = 25;
  const logoW = logoH * img.width / img.height;
  doc.addImage(logo, 'PNG', 36 - logoW / 2, 22, logoW, logoH);
  if (identidad.membresia.mostrar) {
    const image = doc.getImageProperties(oba);
    const h = 20, w = h * image.width / image.height;
    doc.addImage(oba, 'PNG', 261 - w / 2, 23, w, h);
    doc.setTextColor(...GRAY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.7);
    doc.text('Miembro adherente O.B.A.', 261, 47, { align: 'center' });
  }
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  centrado(doc, identidad.nombre, 28, 182, 14);
  doc.setFont('helvetica', 'normal');
  centrado(doc, identidad.nombre_legal, 34, 180, 8.5, 2, 4);
  const personeria = identidad.hitos.find(h => /personer/i.test(h.texto));
  doc.setTextColor(...GRAY);
  if (personeria) centrado(doc, personeria.texto, 44, 170, 7);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.3);
  doc.line(77, 50, 220, 50);
  doc.setFillColor(...GOLD);
  doc.circle(148.5, 50, 0.8, 'F');

  doc.setTextColor(...NAVY);
  doc.setFont('times', 'normal');
  centrado(doc, 'CERTIFICADO', 67, 235, 35);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...RED);
  centrado(doc, datos.modalidad === 'aprobacion' ? 'DE APROBACIÓN' : 'DE PARTICIPACIÓN', 75, 210, 11);

  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'normal');
  centrado(doc, 'Se otorga el presente certificado a:', 86, 230, 10);
  doc.setFont('times', 'italic');
  doc.setTextColor(...NAVY);
  centrado(doc, datos.participante.trim() || '[NOMBRE COMPLETO DEL PARTICIPANTE]', 98, 232, 25, 2, 7);
  if (datos.documento.trim()) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    centrado(doc, `Documento / matrícula: ${datos.documento.trim()}`, 111, 220, 8);
  }
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  centrado(doc, datos.modalidad === 'aprobacion' ? 'por haber completado y aprobado el curso' : 'por su participación en el curso', 118, 230, 10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  centrado(doc, datos.curso.trim() || '[NOMBRE DEL CURSO]', 129, 230, 18, 2, 6);

  let periodo = '[FECHA O PERÍODO DEL CURSO]';
  if (datos.fechaInicio) {
    periodo = fechaLarga(datos.fechaInicio);
    if (datos.fechaFin && datos.fechaFin !== datos.fechaInicio) periodo += ` al ${fechaLarga(datos.fechaFin)}`;
  } else if (datos.fechaFin) periodo = fechaLarga(datos.fechaFin);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  centrado(doc, `${periodo}  |  Carga horaria: ${datos.horas || '[HORAS]'} horas`, 145, 235, 9);
  centrado(doc, `${datos.lugar.trim() || '[LUGAR]'}, ${datos.fechaEmision ? fechaLarga(datos.fechaEmision) : '[FECHA DE EMISIÓN]'}`, 153, 235, 9);

  const firma = (nombre: string, cargo: string, x: number) => {
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.25);
    doc.line(x - 37, 174, x + 37, 174);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    centrado(doc, nombre, 178.5, 80, 9, 2, 4, x);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    centrado(doc, cargo, 187, 80, 7.5, 2, 3.5, x);
  };
  firma(datos.presidente.trim() || '[NOMBRE DEL PRESIDENTE]', datos.cargoPresidente || 'Presidente de la Fundación', 78);
  firma(datos.instructor.trim() || '[NOMBRE DEL INSTRUCTOR]', datos.cargoInstructor || 'Instructor del curso', 174);
  if (qr) {
    doc.addImage(qr,'PNG',244,159,28,28);
    doc.link(244,159,28,28,{url:emision!.urlVerificacion});
  } else if (!registrado && datos.incluirQR) {
    doc.setDrawColor(213,218,224); doc.rect(246,162,24,24);
    doc.setFont('helvetica','normal'); doc.setFontSize(6); doc.setTextColor(...GRAY);
    doc.text(['QR de verificación','al emitir'],258,172,{align:'center'});
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  centrado(doc, control, 193, 238, 7);

  // Reverso: programa del curso, QR y recuadro del libro de capacitaciones.
  doc.addPage('a4','landscape'); marco(doc);
  doc.addImage(logo,'PNG',26,22,18*img.width/img.height,18);
  doc.setTextColor(...NAVY); doc.setFont('helvetica','bold');
  centrado(doc, 'PROGRAMA ACADÉMICO',31,205,17);
  doc.setFont('helvetica','normal'); doc.setTextColor(...GRAY);
  centrado(doc, 'RÚBRICA DEL CURSO · CONTENIDO TEMÁTICO',38,210,8);
  doc.setTextColor(...NAVY); doc.setFont('times','italic');
  centrado(doc, datos.curso || '[NOMBRE DEL CURSO]',49,241,15,2,5);
  doc.setDrawColor(...GOLD); doc.setLineWidth(0.25); doc.line(26,58,271,58);
  temarioEnColumnas(doc,datos.temario);
  doc.setDrawColor(...GOLD); doc.line(26,150,271,150);
  if (qr) {
    doc.addImage(qr,'PNG',176,156,29,29);
    doc.link(176,156,29,29,{url:emision!.urlVerificacion});
  }
  // Recuadro de control del libro de capacitaciones.
  doc.setDrawColor(...NAVY); doc.setTextColor(...NAVY);
  doc.setLineWidth(0.4); doc.rect(226,156,48,30);
  doc.setFont('helvetica','bold'); doc.setFontSize(6.5);
  doc.text('LIBRO DE CAPACITACIONES',250,162,{align:'center'});
  doc.setLineWidth(0.2); doc.line(226,166,274,166);
  doc.setFontSize(12); doc.text(registrado ? datos.codigo : 'BORRADOR',250,175,{align:'center'});
  doc.setFont('helvetica','normal'); doc.setFontSize(6);
  doc.text(`YUNKA ATOQ · ${registrado ? 'REGISTRADO' : 'SIN REGISTRAR'}`,250,182,{align:'center'});
  doc.setFont('helvetica','normal'); doc.setTextColor(...GRAY);
  centrado(doc, control,193,238,7);
  return doc;
}

export function nombreArchivoCertificado(datos: DatosCertificado): string {
  const nombre = datos.participante.trim() || 'plantilla';
  const seguro = nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 75);
  return `Certificado_${seguro}.pdf`;
}
