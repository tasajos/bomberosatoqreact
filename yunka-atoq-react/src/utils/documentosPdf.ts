import type { DocumentoPresidencia, ContenidoResolucion, ContenidoPasos, ContenidoComunicado } from '../services/api';
import { GRADOS } from './rankBadge';
import { gradoBadgePNG } from './gradoBadgeImage';

const ROTULOS: Record<string, string> = {
  resolucion: 'PROCEDIMIENTO', // no usado: la resolución tiene su propio encabezado
  procedimiento: 'PROCEDIMIENTO',
  protocolo: 'PROTOCOLO',
  comunicado: 'COMUNICADO',
};

const MARGEN_IZQ = 15;
const MARGEN_DER = 195;
const ANCHO = MARGEN_DER - MARGEN_IZQ;
const CIUDAD = 'Cochabamba';

const NAVY: [number, number, number] = [26, 31, 94];
const RIBBON: [number, number, number] = [163, 177, 205];
const NOMBRE_FUNDACION = 'Fundación de Voluntarios de Salvamento, Rescate y Protección Ambiental "Yunka Atoq"';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function fechaLarga(fechaISO: string): string {
  const d = new Date(fechaISO);
  const mes = MESES[d.getUTCMonth()];
  return `${d.getUTCDate()} de ${mes.charAt(0).toUpperCase() + mes.slice(1)} de ${d.getUTCFullYear()}`;
}

let logoCache: string | null = null;
async function cargarLogoBase64(): Promise<string | null> {
  if (logoCache) return logoCache;
  try {
    const res = await fetch('/yunka_atoq_log.png');
    const blob = await res.blob();
    logoCache = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return logoCache;
  } catch {
    return null;
  }
}

type Run = { text: string; bold?: boolean; italic?: boolean };

// Escribe un párrafo mezclando tramos normales/negrita (word-wrap manual) y devuelve el y final
function escribirRuns(doc: any, runs: Run[], y: number, opts: { fontSize?: number; lineHeight?: number; font?: string } = {}): number {
  const font = opts.font || 'times';
  const fontSize = opts.fontSize || 10;
  const lineHeight = opts.lineHeight || 5;
  doc.setFontSize(fontSize);

  let line: Run[] = [];
  let lineWidth = 0;

  const estilo = (r: Run) => (r.bold && r.italic ? 'bolditalic' : r.bold ? 'bold' : r.italic ? 'italic' : 'normal');

  const flushLine = () => {
    if (y > 280) { doc.addPage(); y = 20; }
    let cx = MARGEN_IZQ;
    for (const seg of line) {
      doc.setFont(font, estilo(seg));
      doc.text(seg.text, cx, y);
      cx += doc.getTextWidth(seg.text);
    }
    line = [];
    lineWidth = 0;
    y += lineHeight;
  };

  for (const run of runs) {
    if (!run.text) continue;
    const words = run.text.split(' ');
    for (let i = 0; i < words.length; i++) {
      const isLast = i === words.length - 1;
      const word = words[i] + (isLast ? '' : ' ');
      if (!word) continue;
      doc.setFont(font, estilo(run));
      doc.setFontSize(fontSize);
      const w = doc.getTextWidth(word);
      if (lineWidth + w > ANCHO && line.length > 0) flushLine();
      line.push({ text: word, bold: run.bold, italic: run.italic });
      lineWidth += w;
    }
  }
  if (line.length) flushLine();
  return y;
}

function tablaVoluntarios(doc: any, autoTable: any, y: number, voluntarios: DocumentoPresidencia['voluntarios']): number {
  if (!voluntarios.length) return y;
  if (y > 260) { doc.addPage(); y = 20; }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Voluntarios relacionados', MARGEN_IZQ, y);
  autoTable(doc, {
    startY: y + 3,
    margin: { left: MARGEN_IZQ, right: 195 - MARGEN_DER },
    head: [['#', 'Nombre', 'Código', 'Rol', 'Especialidad']],
    body: voluntarios.map((v, i) => [i + 1, v.nombre, v.matricula, v.rol || '-', v.especialidad || '-']),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [178, 34, 34] },
  });
  return doc.lastAutoTable.finalY + 10;
}

function pieFirmante(doc: any, y: number, documento: DocumentoPresidencia, font: string) {
  if (y > 250) { doc.addPage(); y = 20; }
  y += 20;
  doc.setDrawColor(120);
  doc.line(75, y, 135, y);
  y += 6;
  doc.setFont(font, 'bold');
  doc.setFontSize(10);
  doc.text(documento.firmante_nombre || '—', 105, y, { align: 'center' });
  const lineasCargo = (documento.firmante_cargo || '').split('\n').filter(Boolean);
  for (const linea of lineasCargo) {
    y += 5;
    doc.setFont(font, 'bold');
    doc.setFontSize(9);
    doc.text(linea, 105, y, { align: 'center' });
  }
  return y;
}

// Dibuja la(s) insignia(s) de grado (imagen real, no solo texto) para resoluciones de ascenso
async function dibujarAscensoGrados(doc: any, y: number, gradoActual: string | undefined, gradoNuevo: string): Promise<number> {
  const badgeW = 22;
  const badgeH = badgeW * (80 / 56);
  const gap = 8;
  const arrowW = 10;
  const labelActual = GRADOS.find(g => g.value === gradoActual)?.label || '';
  const labelNuevo = GRADOS.find(g => g.value === gradoNuevo)?.label || '';

  if (y + badgeH + 14 > 280) { doc.addPage(); y = 20; }
  y += 4;

  const mostrarActual = !!gradoActual;
  const totalW = mostrarActual ? badgeW * 2 + gap * 2 + arrowW : badgeW;
  let x = 105 - totalW / 2;

  if (mostrarActual) {
    const imgActual = await gradoBadgePNG(gradoActual!, 240);
    doc.addImage(imgActual, 'PNG', x, y, badgeW, badgeH);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(labelActual, x + badgeW / 2, y + badgeH + 4, { align: 'center' });
    x += badgeW + gap;

    const midY = y + badgeH / 2;
    doc.setDrawColor(120);
    doc.setFillColor(120, 120, 120);
    doc.setLineWidth(0.6);
    doc.line(x, midY, x + arrowW - 2.5, midY);
    doc.triangle(x + arrowW - 2.5, midY - 2, x + arrowW - 2.5, midY + 2, x + arrowW + 1.5, midY, 'F');
    x += arrowW + gap;
  }

  const imgNuevo = await gradoBadgePNG(gradoNuevo, 240);
  doc.addImage(imgNuevo, 'PNG', x, y, badgeW, badgeH);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(labelNuevo, x + badgeW / 2, y + badgeH + 4, { align: 'center' });

  return y + badgeH + 10;
}

function iconoTelefono(doc: any, cx: number, cy: number, r: number) {
  doc.setFillColor(255, 255, 255);
  doc.circle(cx, cy, r, 'F');
  doc.setDrawColor(...NAVY);
  doc.setFillColor(...NAVY);
  doc.setLineWidth(r * 0.55);
  doc.line(cx - r * 0.32, cy - r * 0.32, cx + r * 0.32, cy + r * 0.32);
  doc.circle(cx - r * 0.32, cy - r * 0.32, r * 0.24, 'F');
  doc.circle(cx + r * 0.32, cy + r * 0.32, r * 0.24, 'F');
}

function iconoGlobo(doc: any, cx: number, cy: number, r: number) {
  doc.setFillColor(255, 255, 255);
  doc.circle(cx, cy, r, 'F');
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.3);
  doc.circle(cx, cy, r * 0.7, 'S');
  doc.line(cx - r * 0.7, cy, cx + r * 0.7, cy);
  doc.ellipse(cx, cy, r * 0.32, r * 0.7, 'S');
}

function iconoSobre(doc: any, cx: number, cy: number, r: number) {
  doc.setFillColor(255, 255, 255);
  doc.circle(cx, cy, r, 'F');
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.3);
  const w = r * 1.3, h = r * 0.95;
  doc.rect(cx - w / 2, cy - h / 2, w, h, 'S');
  doc.line(cx - w / 2, cy - h / 2, cx, cy + h * 0.15);
  doc.line(cx + w / 2, cy - h / 2, cx, cy + h * 0.15);
}

// Membrete institucional: cinta + logo, personería jurídica, reconocimiento y contacto
async function dibujarCabeceraInstitucional(doc: any): Promise<number> {
  const barY = 8, barH = 34, barBottom = barY + barH;
  const ribbonX = 10, ribbonW = 36;

  doc.setFillColor(...NAVY);
  doc.rect(0, barY, 210, barH, 'F');

  doc.setFillColor(...RIBBON);
  doc.rect(ribbonX, 3, ribbonW, barBottom - 3, 'F');
  doc.triangle(ribbonX, barBottom, ribbonX + ribbonW, barBottom, ribbonX + ribbonW / 2, barBottom + 10, 'F');

  const logo = await cargarLogoBase64();
  if (logo) {
    const d = 30;
    doc.addImage(logo, 'PNG', ribbonX + ribbonW / 2 - d / 2, barY + barH / 2 - d / 2, d, d);
  }

  const textoX = ribbonX + ribbonW + 6;
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const lineasNombre = doc.splitTextToSize(NOMBRE_FUNDACION.toUpperCase(), 78);
  doc.text(lineasNombre, textoX, 15);
  let ty = 15 + lineasNombre.length * 3.6 + 3;

  doc.setFontSize(9.5);
  doc.text('Personería Jurídica Nro: 0304/2025', textoX, ty);
  ty += 4.5;

  doc.setFontSize(7);
  const lineasReconocimiento = doc.splitTextToSize(
    'Reconocimiento Cámara de Diputados - Asamblea Legislativa Plurinacional de Bolivia - 08/2025', 78
  );
  doc.text(lineasReconocimiento, textoX, ty);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const contactoX = 178, iconoX = 186;
  doc.text('+591 68503758', contactoX, 15, { align: 'right' });
  iconoTelefono(doc, iconoX, 13.5, 2.8);
  doc.text('www.bomberosatoq.org', contactoX, 24, { align: 'right' });
  iconoGlobo(doc, iconoX, 22.5, 2.8);
  doc.text('informacion@bomberosatoq.org', contactoX, 33, { align: 'right' });
  iconoSobre(doc, iconoX, 31.5, 2.8);

  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);
  return barBottom + 16;
}

async function crearBaseGenerica(documento: DocumentoPresidencia) {
  const { jsPDF } = await import('jspdf');
  const autoTableModule = await import('jspdf-autotable');
  const autoTable = autoTableModule.default;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const yTrasCabecera = await dibujarCabeceraInstitucional(doc);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`${ROTULOS[documento.tipo]} ${documento.codigo_completo}`, 105, yTrasCabecera, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  const tituloLineas = doc.splitTextToSize(documento.titulo, ANCHO);
  doc.text(tituloLineas, 105, yTrasCabecera + 9, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const yFecha = yTrasCabecera + 9 + tituloLineas.length * 5 + 4;
  doc.text(`Fecha: ${fechaLarga(documento.fecha)}`, MARGEN_IZQ, yFecha);

  return { doc, autoTable, y: yFecha + 8 };
}

export async function generarResolucionPDF(documento: DocumentoPresidencia) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const contenido = documento.contenido as ContenidoResolucion;

  const logo = await cargarLogoBase64();
  if (logo) doc.addImage(logo, 'PNG', 92, 10, 26, 26);

  doc.setFont('times', 'bolditalic');
  doc.setFontSize(18);
  doc.text('Resolución Jefatural', 105, 48, { align: 'center' });

  doc.setFont('times', 'italic');
  doc.setFontSize(12);
  doc.text(`Nro ${String(documento.numero).padStart(3, '0')} – ${documento.anio}`, 105, 56, { align: 'center' });

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text(`${CIUDAD}, ${fechaLarga(documento.fecha)}`, MARGEN_DER, 70, { align: 'right' });

  let y = 82;

  if (contenido.vistos) {
    y = escribirRuns(doc, [{ text: 'VISTOS:', bold: true, italic: true }], y);
    y += 1;
    y = escribirRuns(doc, [{ text: contenido.vistos }], y);
    y += 4;
  }

  if (contenido.considerandos?.length) {
    y = escribirRuns(doc, [{ text: 'CONSIDERANDO:', bold: true, italic: true }], y);
    y += 1;
    for (const c of contenido.considerandos) {
      y = escribirRuns(doc, [{ text: 'Que, ' + c }], y);
      y += 2;
    }
    y += 2;
  }

  if (contenido.articulos?.length) {
    y = escribirRuns(doc, [{ text: 'RESUELVE:', bold: true, italic: true }], y);
    y += 1;
    for (const a of contenido.articulos) {
      const encabezado = a.titulo ? `ARTÍCULO ${a.numero}.- ${a.titulo.toUpperCase()}.` : `ARTÍCULO ${a.numero}.-`;
      y = escribirRuns(doc, [{ text: encabezado, bold: true }, { text: ' ' + a.texto }], y);
      y += 3;
    }

    if (contenido.gradoNuevo) {
      y = await dibujarAscensoGrados(doc, y, contenido.gradoActual, contenido.gradoNuevo);
    }

    if (documento.voluntarios.length) {
      y += 1;
      for (const v of documento.voluntarios) {
        const runs: Run[] = [{ text: '•  ' }];
        if (v.rol) runs.push({ text: `${v.rol}:  `, bold: true });
        runs.push({ text: v.nombre });
        y = escribirRuns(doc, runs, y);
        y += 1;
      }
      y += 3;
    }
  }

  y += 6;
  y = escribirRuns(doc, [{ text: 'Regístrese, Comuníquese y Cúmplase.', bold: true }], y, { fontSize: 10 });

  y = pieFirmante(doc, y, documento, 'times');

  if (y > 270) { doc.addPage(); y = 20; }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('cc: Personal', MARGEN_IZQ, 285);

  return doc;
}

export async function generarPasosPDF(documento: DocumentoPresidencia) {
  const { doc, autoTable, y: yInicial } = await crearBaseGenerica(documento);
  const contenido = documento.contenido as ContenidoPasos;
  let y = yInicial;

  if (contenido.objetivo) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('OBJETIVO:', MARGEN_IZQ, y); y += 5;
    doc.setFont('helvetica', 'normal');
    const lineas = doc.splitTextToSize(contenido.objetivo, ANCHO);
    doc.text(lineas, MARGEN_IZQ, y); y += lineas.length * 5 + 4;
  }
  if (contenido.alcance) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('ALCANCE:', MARGEN_IZQ, y); y += 5;
    doc.setFont('helvetica', 'normal');
    const lineas = doc.splitTextToSize(contenido.alcance, ANCHO);
    doc.text(lineas, MARGEN_IZQ, y); y += lineas.length * 5 + 4;
  }
  if (contenido.pasos?.length) {
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('PASOS', MARGEN_IZQ, y);
    autoTable(doc, {
      startY: y + 3,
      margin: { left: MARGEN_IZQ, right: 195 - MARGEN_DER },
      head: [['N°', 'Paso', 'Descripción']],
      body: contenido.pasos.map(p => [p.numero, p.titulo, p.descripcion]),
      styles: { fontSize: 9, cellWidth: 'wrap' },
      columnStyles: { 0: { cellWidth: 12 }, 1: { cellWidth: 40 } },
      headStyles: { fillColor: [178, 34, 34] },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  y = tablaVoluntarios(doc, autoTable, y, documento.voluntarios);
  pieFirmante(doc, y, documento, 'helvetica');
  return doc;
}

export async function generarComunicadoPDF(documento: DocumentoPresidencia) {
  const { doc, autoTable, y: yInicial } = await crearBaseGenerica(documento);
  const contenido = documento.contenido as ContenidoComunicado;
  let y = yInicial;

  if (contenido.destinatario) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('A:', MARGEN_IZQ, y);
    doc.setFont('helvetica', 'normal');
    const lineas = doc.splitTextToSize(contenido.destinatario, ANCHO - 10);
    doc.text(lineas, MARGEN_IZQ + 8, y);
    y += lineas.length * 5 + 4;
  }
  if (contenido.asunto) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('ASUNTO:', MARGEN_IZQ, y);
    doc.setFont('helvetica', 'normal');
    const lineas = doc.splitTextToSize(contenido.asunto, ANCHO - 22);
    doc.text(lineas, MARGEN_IZQ + 22, y);
    y += lineas.length * 5 + 6;
  }

  doc.setDrawColor(180);
  doc.line(MARGEN_IZQ, y, MARGEN_DER, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const parrafos = (contenido.cuerpo || '').split('\n').filter(p => p.trim());
  for (const p of parrafos) {
    if (y > 270) { doc.addPage(); y = 20; }
    const lineas = doc.splitTextToSize(p, ANCHO);
    doc.text(lineas, MARGEN_IZQ, y);
    y += lineas.length * 5 + 4;
  }

  y = tablaVoluntarios(doc, autoTable, y + 2, documento.voluntarios);
  pieFirmante(doc, y, documento, 'helvetica');
  return doc;
}

export async function generarDocumentoPDF(documento: DocumentoPresidencia) {
  if (documento.tipo === 'resolucion') return generarResolucionPDF(documento);
  if (documento.tipo === 'comunicado') return generarComunicadoPDF(documento);
  return generarPasosPDF(documento);
}

function nombreArchivo(documento: DocumentoPresidencia) {
  const prefijos: Record<string, string> = { resolucion: 'RES', procedimiento: 'PROC', protocolo: 'PROT', comunicado: 'COM' };
  return `${prefijos[documento.tipo]}_${String(documento.numero).padStart(3, '0')}-${documento.anio}.pdf`;
}

export async function descargarDocumentoPDF(documento: DocumentoPresidencia) {
  const doc = await generarDocumentoPDF(documento);
  doc.save(nombreArchivo(documento));
}

export async function compartirDocumentoPDF(documento: DocumentoPresidencia) {
  const doc = await generarDocumentoPDF(documento);
  const blob = doc.output('blob');
  const archivo = new File([blob], nombreArchivo(documento), { type: 'application/pdf' });

  const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };
  if (nav.share && nav.canShare?.({ files: [archivo] })) {
    try {
      await nav.share({ files: [archivo], title: documento.titulo, text: `${documento.codigo_completo} — ${documento.titulo}` });
      return;
    } catch {
      // el usuario canceló o el share falló — caemos a la descarga
    }
  }
  doc.save(nombreArchivo(documento));
}
