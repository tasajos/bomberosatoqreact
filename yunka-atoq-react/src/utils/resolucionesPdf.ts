import { jsPDF } from 'jspdf';
import type { CabeceraDocumentos, ContenidoResolucion, DocumentoPresidencia } from '../services/api';

const AZUL: [number, number, number] = [8, 42, 78];
const ORO: [number, number, number] = [174, 139, 73];
const TEXTO: [number, number, number] = [39, 48, 59];
const GRIS: [number, number, number] = [94, 108, 122];
const IZQ = 22, DER = 188, ANCHO = DER - IZQ, LIMITE = 267;

type RecursosResolucion = {
  cabecera: CabeceraDocumentos;
  logo: string | null;
  oba: string | null;
  fecha: string;
  dibujarGrados: (doc: jsPDF, y: number, actual: string | undefined, nuevo: string) => Promise<number>;
};

/** Composición independiente: las demás clases de documento conservan su membrete. */
export async function componerResolucionPDF(documento: DocumentoPresidencia, recursos: RecursosResolucion) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true, putOnlyUsedFonts: true });
  const { cabecera: cfg, logo, oba } = recursos;
  const contenido = documento.contenido as ContenidoResolucion;
  const numero = `${String(documento.numero).padStart(3, '0')}/${documento.anio}`;
  doc.setProperties({ title: `Resolución Jefatural ${numero} - ${documento.titulo}`, author: cfg.nombre });

  const fuente = (familia: string, estilo: string, size: number, color = TEXTO) => {
    doc.setFont(familia, estilo);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };
  const regla = (y: number, color = ORO, grosor = 0.35) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(grosor);
    doc.line(IZQ, y, DER, y);
  };

  // Membrete abierto, con proporciones originales y una sola línea de identidad.
  if (logo) doc.addImage(logo, 'PNG', IZQ, 15, 25, 26.25, 'escudo-atoq', 'FAST');
  const conOba = cfg.membresia.mostrar && !!oba;
  if (conOba) doc.addImage(oba!, 'PNG', DER - 26, 17, 26, 26 * 424 / 516, 'escudo-oba', 'FAST');
  const centro = conOba ? 105 : 121;
  const anchoIdentidad = conOba ? 103 : 134;
  let hy = 17;
  const centrado = (texto: string, size: number, estilo = 'normal', color = AZUL, espacio = 0.8) => {
    if (!texto.trim()) return;
    fuente('helvetica', estilo, size, color);
    const lineas: string[] = doc.splitTextToSize(texto, anchoIdentidad);
    const alto = size * 0.3528 * 1.2;
    doc.text(lineas, centro, hy + size * 0.3528, { align: 'center', lineHeightFactor: 1.2 });
    hy += lineas.length * alto + espacio;
  };
  centrado(cfg.subtitulo.toUpperCase(), 7.2, 'bold');
  centrado(cfg.nombre.toUpperCase(), 16, 'bold', AZUL, 1);
  centrado(cfg.nombre_legal, 6.5, 'normal', GRIS);
  for (const hito of cfg.hitos) centrado(hito.texto, hito.destacado ? 6.5 : 6, hito.destacado ? 'bold' : 'normal', GRIS, 0.8);
  hy = Math.max(hy + 2, 47);
  if (cfg.membresia.mostrar) {
    fuente('helvetica', 'normal', 6.1, GRIS);
    const membresia = [cfg.membresia.titulo, cfg.membresia.organizacion, cfg.membresia.fecha].filter(Boolean).join(' · ');
    const lineas: string[] = doc.splitTextToSize(membresia, ANCHO);
    doc.text(lineas, 105, hy, { align: 'center', lineHeightFactor: 1.2 });
    hy += lineas.length * 2.6 + 2;
  }
  regla(hy);

  let y = hy + 9;
  fuente('helvetica', 'bold', 17, AZUL);
  doc.text('RESOLUCIÓN JEFATURAL', 105, y, { align: 'center' });
  y += 7;
  fuente('helvetica', 'bold', 11, AZUL);
  doc.text(`Nro. ${numero}`, 105, y, { align: 'center' });
  y += 7;

  function nuevaPagina() {
    doc.addPage();
    fuente('helvetica', 'bold', 8, AZUL);
    const nombre: string[] = doc.splitTextToSize(cfg.nombre.toUpperCase(), 98);
    doc.text(nombre, IZQ, 18, { lineHeightFactor: 1.2 });
    fuente('helvetica', 'normal', 8, GRIS);
    doc.text(`Resolución Jefatural Nro. ${numero}`, DER, 18, { align: 'right' });
    const base = Math.max(24, 20 + nombre.length * 3.4);
    regla(base);
    y = base + 10;
  }
  function espacio(alto: number) {
    if (y + alto > LIMITE) nuevaPagina();
  }
  function parrafo(texto: string, opciones: { bold?: boolean; size?: number; color?: [number, number, number]; centro?: boolean } = {}) {
    const size = opciones.size ?? 10.5;
    const alto = size * 0.3528 * 1.35;
    for (const bloque of texto.replace(/\r\n?/g, '\n').split('\n')) {
      if (!bloque.trim()) { y += alto * 0.6; continue; }
      fuente('times', opciones.bold ? 'bold' : 'normal', size, opciones.color ?? TEXTO);
      const lineas: string[] = doc.splitTextToSize(bloque.trim(), ANCHO);
      // Evita una primera línea sola al pie y una última línea sola al inicio.
      espacio(Math.min(2, lineas.length) * alto);
      for (let i = 0; i < lineas.length; i++) {
        espacio((lineas.length - i === 2 ? 2 : 1) * alto);
        fuente('times', opciones.bold ? 'bold' : 'normal', size, opciones.color ?? TEXTO);
        doc.text(lineas[i], opciones.centro ? 105 : IZQ, y, opciones.centro ? { align: 'center' } : {});
        y += alto;
      }
    }
  }
  function seccion(titulo: string, reserva = 12) {
    espacio(10 + reserva);
    fuente('helvetica', 'bold', 9, AZUL);
    doc.text(titulo, IZQ, y);
    doc.setFillColor(...ORO);
    doc.rect(IZQ, y + 2, 10, 0.6, 'F');
    y += 7;
  }

  if (documento.titulo.trim()) {
    parrafo(documento.titulo, { bold: true, size: 11.5, color: AZUL, centro: true });
    y += 2;
  }
  espacio(17);
  fuente('helvetica', 'normal', 8.5, GRIS);
  doc.text(`Cochabamba, ${recursos.fecha}`, DER, y, { align: 'right' });
  y += 8;

  if (contenido.vistos?.trim()) {
    seccion('VISTOS');
    parrafo(contenido.vistos);
    y += 4;
  }
  if (contenido.considerandos?.length) {
    seccion('CONSIDERANDO');
    for (const considerando of contenido.considerandos) {
      parrafo(`Que, ${considerando}`);
      y += 2;
    }
    y += 2;
  }
  if (contenido.articulos?.length) {
    seccion('RESUELVE', 23);
    for (const articulo of contenido.articulos) {
      const encabezado = `ARTÍCULO ${articulo.numero}.${articulo.titulo ? ` ${articulo.titulo}` : ''}`;
      fuente('times', 'bold', 11, AZUL);
      const lineas: string[] = doc.splitTextToSize(encabezado, ANCHO);
      espacio(Math.min(lineas.length, 6) * 5.44 + 12);
      parrafo(encabezado, { bold: true, color: AZUL });
      y += 1;
      parrafo(articulo.texto);
      y += 3;
    }
    if (contenido.gradoNuevo) {
      espacio(50);
      y = await recursos.dibujarGrados(doc, y, contenido.gradoActual, contenido.gradoNuevo);
    }
    for (const voluntario of documento.voluntarios) {
      parrafo(`•  ${voluntario.rol ? `${voluntario.rol}: ` : ''}${voluntario.nombre}`, { size: 10.5 });
      y += 1;
    }
  }

  // La fórmula de cierre y la firma forman un solo bloque, sin páginas sueltas para copias.
  fuente('times', 'bold', 11);
  const nombres: string[] = doc.splitTextToSize(documento.firmante_nombre || '—', 130);
  fuente('helvetica', 'normal', 8.5);
  const cargos: string[] = doc.splitTextToSize(documento.firmante_cargo || '', 130);
  const altoFirma = 35 + nombres.length * 5.2 + cargos.length * 4;
  espacio(Math.min(altoFirma, LIMITE - 36));
  y += 3;
  parrafo('Regístrese, Comuníquese y Cúmplase.', { bold: true, size: 11 });
  y += 19;
  doc.setDrawColor(...GRIS);
  doc.setLineWidth(0.25);
  doc.line(70, y, 140, y);
  y += 6;
  for (const linea of nombres) { espacio(5.2); fuente('times', 'bold', 11, AZUL); doc.text(linea, 105, y, { align: 'center' }); y += 5.2; }
  for (const linea of cargos) { espacio(4); fuente('helvetica', 'normal', 8.5, GRIS); doc.text(linea, 105, y, { align: 'center' }); y += 4; }

  const paginas = doc.getNumberOfPages();
  for (let pagina = 1; pagina <= paginas; pagina++) {
    doc.setPage(pagina);
    regla(277, [214, 220, 226], 0.2);
    fuente('helvetica', 'normal', 6.7, GRIS);
    const contacto: string[] = doc.splitTextToSize([cfg.contacto.web, cfg.contacto.email, cfg.contacto.telefono].filter(Boolean).join('  |  '), ANCHO);
    // Reserva dos líneas para el contacto sin invadir los folios.
    doc.text(contacto.slice(0, 2), IZQ, 282, { lineHeightFactor: 1.15 });
    fuente('helvetica', 'normal', 7, GRIS);
    doc.text(`RJ ${numero}`, IZQ, 291);
    doc.text(`Página ${pagina} de ${paginas}`, DER, 291, { align: 'right' });
    if (pagina === paginas) doc.text('cc: Personal', 105, 291, { align: 'center' });
  }
  return doc;
}
