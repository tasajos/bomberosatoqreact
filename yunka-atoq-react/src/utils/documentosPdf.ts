import type { DocumentoPresidencia, ContenidoPasos, ContenidoComunicado, CabeceraDocumentos } from '../services/api';
import { documentosPresidenciaApi } from '../services/api';
import { GRADOS } from './rankBadge';
import { gradoBadgePNG } from './gradoBadgeImage';

const ROTULOS: Record<string, string> = {
  resolucion: 'PROCEDIMIENTO', // no usado: la resolución tiene su propio encabezado
  procedimiento: 'PROCEDIMIENTO',
  protocolo: 'PROTOCOLO',
  comunicado: 'COMUNICADO',
  carta: 'CARTA',
};

const MARGEN_IZQ = 15;
const MARGEN_DER = 195;
const ANCHO = MARGEN_DER - MARGEN_IZQ;

const NAVY: [number, number, number] = [26, 31, 94];
const OBA_LOGO_RATIO = 516 / 424; // ancho / alto de /oba_logo.png

// ── Cabecera editable ─────────────────────────────────────────────
export const MAX_HITOS_CABECERA = 6;
export const CABECERA_POR_DEFECTO: CabeceraDocumentos = {
  subtitulo: 'BOMBEROS VOLUNTARIOS',
  nombre: 'YUNKA ATOQ',
  nombre_legal: 'Fundación de Voluntarios de Salvamento, Rescate y Protección Ambiental "Yunka Atoq"',
  hitos: [
    { texto: 'Personería Jurídica Nro: 0304/2025', destacado: true },
    { texto: 'Reconocimiento Cámara de Diputados - Asamblea Legislativa Plurinacional de Bolivia - 08/2025', destacado: false },
  ],
  membresia: {
    mostrar: true,
    titulo: 'MIEMBRO ADHERENTE',
    organizacion: 'ORGANIZACIÓN DE BOMBEROS AMERICANOS',
    fecha: 'Desde el 09 de octubre de 2026',
  },
  contacto: { telefono: '+591 68503758', web: 'www.bomberosatoq.org', email: 'informacion@bomberosatoq.org' },
};

// Completa con los valores por defecto lo que falte en la configuración guardada
export function normalizarCabecera(c?: Partial<CabeceraDocumentos> | null): CabeceraDocumentos {
  const d = CABECERA_POR_DEFECTO;
  if (!c) return structuredClone(d);
  return {
    subtitulo:    c.subtitulo ?? d.subtitulo,
    nombre:       c.nombre || d.nombre,
    nombre_legal: c.nombre_legal ?? d.nombre_legal,
    hitos:        Array.isArray(c.hitos) ? c.hitos.slice(0, MAX_HITOS_CABECERA) : structuredClone(d.hitos),
    membresia:    { ...d.membresia, ...c.membresia },
    contacto:     { ...d.contacto, ...c.contacto },
  };
}

let cabeceraCache: CabeceraDocumentos | null = null;
export async function obtenerCabecera(): Promise<CabeceraDocumentos> {
  if (cabeceraCache) return cabeceraCache;
  try {
    const { cabecera } = await documentosPresidenciaApi.cabecera();
    cabeceraCache = normalizarCabecera(cabecera);
  } catch {
    return normalizarCabecera(null); // sin conexión: membrete por defecto, sin cachear
  }
  return cabeceraCache;
}
export function actualizarCabeceraCache(c: CabeceraDocumentos) {
  cabeceraCache = normalizarCabecera(c);
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function fechaLarga(fechaISO: string): string {
  const d = new Date(fechaISO);
  const mes = MESES[d.getUTCMonth()];
  return `${d.getUTCDate()} de ${mes.charAt(0).toUpperCase() + mes.slice(1)} de ${d.getUTCFullYear()}`;
}

const imagenCache = new Map<string, string>();
export async function cargarImagenBase64(url: string): Promise<string | null> {
  const cached = imagenCache.get(url);
  if (cached) return cached;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    // Si el archivo no existe, el servidor devuelve el index.html de la SPA con 200
    if (!blob.type.startsWith('image/')) return null;
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    imagenCache.set(url, data);
    return data;
  } catch {
    return null;
  }
}
export const cargarLogoBase64 = async () =>
  (await cargarImagenBase64('/yunka_atoq_transparente.png')) ?? cargarImagenBase64('/yunka_atoq_log.png');
const cargarLogoOBA    = () => cargarImagenBase64('/oba_logo.png');

// Las tablas respetan el mismo margen derecho que el texto (A4 = 210 mm de ancho).
const MARGENES_TABLA = { left: MARGEN_IZQ, right: 210 - MARGEN_DER, top: 20, bottom: 20 };

// Caracteres de WinAnsi (fuentes estándar de jsPDF) fuera de Latin-1.
const WINANSI = new Set([8211, 8212, 8216, 8217, 8218, 8220, 8221, 8222, 8224, 8225, 8226, 8230, 8240, 8249, 8250, 8364, 8482, 338, 339, 352, 353, 376, 381, 382, 402, 710, 732]);
// Flechas -> ->, guiones y signo menos -> -, mayor/menor o igual, marcas de verificación y espacio duro.
const REEMPLAZOS: [RegExp, string][] = [
  [/[\u2192\u21D2\u2794\u279C\u279D\u27F6]/g, '->'], [/[\u2190\u21D0]/g, '<-'], [/[\u2212\u2010\u2011]/g, '-'],
  [/\u2265/g, '>='], [/\u2264/g, '<='], [/[\u2713\u2714\u2611]/g, '(v)'], [/[\u2717\u2718]/g, '(x)'], [/\u00A0/g, ' '],
];
/** Texto apto para las fuentes estándar del PDF: lo no representable se sustituye o se omite. */
export function textoPdf(texto: string): string {
  let t = String(texto ?? '');
  for (const [re, r] of REEMPLAZOS) t = t.replace(re, r);
  return [...t].filter(ch => { const c = ch.codePointAt(0)!; return c === 10 || c === 9 || (c >= 32 && c <= 255) || WINANSI.has(c); }).join('');
}

/** Párrafo con salto de página: ninguna línea se escribe fuera del área útil. */
function parrafoPaginado(doc: import('jspdf').jsPDF, texto: string, y: number, x = MARGEN_IZQ, ancho = ANCHO, alto = 5): number {
  const lineas: string[] = doc.splitTextToSize(textoPdf(texto), ancho);
  for (const linea of lineas) {
    if (y > 277) { doc.addPage(); y = 20; }
    doc.text(linea, x, y);
    y += alto;
  }
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
    margin: MARGENES_TABLA,
    head: [['#', 'Nombre', 'Código', 'Rol', 'Especialidad']],
    body: voluntarios.map((v, i) => [i + 1, textoPdf(v.nombre), v.matricula, textoPdf(v.rol || '-'), textoPdf(v.especialidad || '-')]),
    styles: { fontSize: 9, overflow: 'linebreak', valign: 'top' },
    columnStyles: { 0: { cellWidth: 9 }, 2: { cellWidth: 24 } },
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

// Un solo membrete integra identidad, hitos, membresía y contactos.
// La altura crece si el nombre legal o los hitos ocupan más líneas.
async function dibujarCabeceraInstitucional(doc: any, cfg: CabeceraDocumentos): Promise<number> {
  const m = cfg.membresia;
  const [logo, oba] = await Promise.all([cargarLogoBase64(), m.mostrar ? cargarLogoOBA() : null]);
  const blue: [number, number, number] = [8, 42, 78];
  const gris: [number, number, number] = [66, 84, 107];
  const textX = 50;
  const textW = m.mostrar ? 107 : 142;
  const lh = (pt: number) => pt * 0.3528 * 1.2; // alto de línea en mm

  // 1) Medir el bloque de texto para conocer la altura total
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.3);
  const legal = cfg.nombre_legal ? doc.splitTextToSize(cfg.nombre_legal, textW) : [];
  const hitos = cfg.hitos.filter(h => h.texto.trim()).map(h => {
    doc.setFont('helvetica', h.destacado ? 'bold' : 'normal');
    doc.setFontSize(h.destacado ? 7.5 : 6.2);
    return { ...h, lineas: doc.splitTextToSize(h.texto, textW) as string[] };
  });

  let y = 29;
  const yLegal = y;
  if (legal.length) y += (legal.length - 1) * lh(7.3) + 9;
  else y += 4;
  const yHitos: number[] = [];
  hitos.forEach(h => {
    yHitos.push(y);
    y += (h.lineas.length - 1) * lh(h.destacado ? 7.5 : 6.2) + 4;
  });
  const textoFin = (hitos.length ? y - 4 : y - 9) + 1;
  const filaContactos = Math.max(55, textoFin + 8);
  const panelFin = filaContactos + 5;

  // 2) Fondo
  doc.setFillColor(234, 237, 242);
  doc.roundedRect(9, 8, 192, panelFin - 8, 2, 2, 'F');
  doc.setFillColor(224, 230, 238);
  doc.triangle(143, 8, 199, 8, 199, 48, 'F');
  doc.setFillColor(205, 35, 45);
  doc.rect(12, panelFin - 1, 186, 1, 'F');

  if (logo) doc.addImage(logo, 'PNG', 14, 13, 30, 31.5);

  // 3) Identidad
  doc.setTextColor(...blue);
  doc.setFont('helvetica', 'bold');
  if (cfg.subtitulo) {
    doc.setFontSize(7);
    doc.text(cfg.subtitulo.toUpperCase(), textX, 16);
  }
  doc.setFontSize(19);
  doc.text(cfg.nombre.toUpperCase(), textX, 24);
  if (legal.length) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.3);
    doc.text(legal, textX, yLegal, { lineHeightFactor: 1.2 });
  }

  // 4) Hitos: destacados en negrita azul, el resto en gris
  hitos.forEach((h, i) => {
    doc.setFont('helvetica', h.destacado ? 'bold' : 'normal');
    doc.setFontSize(h.destacado ? 7.5 : 6.2);
    doc.setTextColor(...(h.destacado ? blue : gris));
    doc.text(h.lineas, textX, yHitos[i], { lineHeightFactor: 1.2 });
  });

  // 5) Membresía
  if (m.mostrar) {
    const obaH = 19, obaW = obaH * OBA_LOGO_RATIO;
    if (oba) doc.addImage(oba, 'PNG', 181 - obaW / 2, 13, obaW, obaH);
    doc.setTextColor(...blue);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.3);
    if (m.titulo) doc.text(m.titulo.toUpperCase(), 181, 36, { align: 'center' });
    doc.setFontSize(5.4);
    const org = m.organizacion ? doc.splitTextToSize(m.organizacion.toUpperCase(), 24) as string[] : [];
    if (org.length) doc.text(org, 181, 39.5, { align: 'center', lineHeightFactor: 1.2 });
    if (m.fecha) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.7);
      doc.text(m.fecha, 181, 39.5 + Math.max(2, org.length) * lh(5.4) + 2.9, { align: 'center' });
    }
  }

  // 6) Contactos (solo los que tienen valor)
  const contactos = [
    { value: cfg.contacto.telefono, icon: iconoTelefono },
    { value: cfg.contacto.web, icon: iconoGlobo },
    { value: cfg.contacto.email, icon: iconoSobre },
  ].filter(c => c.value);
  const slots = [16, 67, 127];
  contactos.forEach(({ value, icon }, i) => {
    const x = slots[i];
    icon(doc, x + 2, filaContactos - 1, 1.9);
    doc.setTextColor(...blue);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.text(value, x + 6, filaContactos);
  });

  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);
  return panelFin + 12;
}

// Vista previa del membrete para el formulario de edición (URL blob de un PDF de una página)
export async function generarVistaPreviaCabecera(cfg: CabeceraDocumentos): Promise<string> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = await dibujarCabeceraInstitucional(doc, normalizarCabecera(cfg));
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('COMUNICADO COM N° 001/2026', 105, y, { align: 'center' });
  doc.setDrawColor(225);
  doc.setFillColor(238, 240, 243);
  y += 10;
  for (let i = 0; i < 9; i++) doc.rect(MARGEN_IZQ, y + i * 7, i % 3 === 2 ? ANCHO * 0.6 : ANCHO, 3, 'F');
  return doc.output('bloburl') as unknown as string;
}

async function crearBaseGenerica(documento: DocumentoPresidencia) {
  const { jsPDF } = await import('jspdf');
  const autoTableModule = await import('jspdf-autotable');
  const autoTable = autoTableModule.default;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const yTrasCabecera = await dibujarCabeceraInstitucional(doc, await obtenerCabecera());

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`${ROTULOS[documento.tipo]} ${documento.codigo_completo}`, 105, yTrasCabecera, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  const tituloLineas = doc.splitTextToSize(textoPdf(documento.titulo), ANCHO);
  doc.text(tituloLineas, 105, yTrasCabecera + 9, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const yFecha = yTrasCabecera + 9 + tituloLineas.length * 5 + 4;
  doc.text(`Fecha: ${fechaLarga(documento.fecha)}`, MARGEN_IZQ, yFecha);

  return { doc, autoTable, y: yFecha + 8 };
}

export async function generarResolucionPDF(documento: DocumentoPresidencia) {
  const { componerResolucionPDF } = await import('./resolucionesPdf');
  const cabecera = await obtenerCabecera();
  const [logo, oba] = await Promise.all([cargarLogoBase64(), cabecera.membresia.mostrar ? cargarLogoOBA() : null]);
  return componerResolucionPDF(documento, {
    cabecera, logo, oba, fecha: fechaLarga(documento.fecha), dibujarGrados: dibujarAscensoGrados,
  });
}

export async function generarPasosPDF(documento: DocumentoPresidencia) {
  const { doc, autoTable, y: yInicial } = await crearBaseGenerica(documento);
  const contenido = documento.contenido as ContenidoPasos;
  let y = yInicial;

  for (const [titulo, texto] of [['OBJETIVO:', contenido.objetivo], ['ALCANCE:', contenido.alcance]] as const) {
    if (!texto) continue;
    if (y > 270) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text(titulo, MARGEN_IZQ, y); y += 5;
    doc.setFont('helvetica', 'normal');
    y = parrafoPaginado(doc, texto, y) + 4;
  }
  if (contenido.pasos?.length) {
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('PASOS', MARGEN_IZQ, y);
    // La descripción ocupa el ancho restante y se parte en líneas dentro del margen.
    autoTable(doc, {
      startY: y + 3,
      margin: MARGENES_TABLA,
      head: [['N°', 'Paso', 'Descripción']],
      body: contenido.pasos.map(p => [p.numero, textoPdf(p.titulo), textoPdf(p.descripcion)]),
      styles: { fontSize: 9, overflow: 'linebreak', valign: 'top', cellPadding: 2.4 },
      columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 42, fontStyle: 'bold' }, 2: { cellWidth: 'auto' } },
      headStyles: { fillColor: [178, 34, 34] },
      rowPageBreak: 'avoid',
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
    y = parrafoPaginado(doc, contenido.destinatario, y, MARGEN_IZQ + 8, ANCHO - 8) + 4;
  }
  if (contenido.asunto) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('ASUNTO:', MARGEN_IZQ, y);
    doc.setFont('helvetica', 'normal');
    y = parrafoPaginado(doc, contenido.asunto, y, MARGEN_IZQ + 22, ANCHO - 22) + 6;
  }

  doc.setDrawColor(180);
  doc.line(MARGEN_IZQ, y, MARGEN_DER, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const parrafos = (contenido.cuerpo || '').split('\n').filter(p => p.trim());
  for (const p of parrafos) y = parrafoPaginado(doc, p, y) + 4;

  y = tablaVoluntarios(doc, autoTable, y + 2, documento.voluntarios);
  pieFirmante(doc, y, documento, 'helvetica');
  return doc;
}

/** Convenio interinstitucional; con borrador=true lleva marca de agua y no muestra número. */
export async function generarConvenioPDF(documento: DocumentoPresidencia, borrador = false) {
  const { componerConvenioPDF } = await import('./conveniosPdf');
  const [cabecera, logo] = await Promise.all([obtenerCabecera(), cargarLogoBase64()]);
  return componerConvenioPDF(documento, { cabecera, logo }, borrador);
}

export async function generarDocumentoPDF(documento: DocumentoPresidencia) {
  if (documento.tipo === 'resolucion') return generarResolucionPDF(documento);
  if (documento.tipo === 'convenio') return generarConvenioPDF(documento);
  if (documento.tipo === 'comunicado' || documento.tipo === 'carta') return generarComunicadoPDF(documento);
  return generarPasosPDF(documento);
}

export function nombreArchivo(documento: DocumentoPresidencia) {
  const prefijos: Record<string, string> = { resolucion: 'RES', procedimiento: 'PROC', protocolo: 'PROT', comunicado: 'COM', carta: 'PYA', convenio: 'CONV' };
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
