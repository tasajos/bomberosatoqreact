import { jsPDF } from 'jspdf';
import type { CabeceraDocumentos, ContenidoConvenio, DocumentoPresidencia } from '../services/api';
import { enteroALetras } from './voucherPdf';

const AZUL: [number, number, number] = [8, 42, 78];
const ORO: [number, number, number] = [174, 139, 73];
const TEXTO: [number, number, number] = [33, 41, 52];
const GRIS: [number, number, number] = [94, 108, 122];
const IZQ = 22, DER = 188, ANCHO = DER - IZQ, LIMITE = 268;
const ORDINALES = ['PRIMERA', 'SEGUNDA', 'TERCERA', 'CUARTA', 'QUINTA', 'SEXTA', 'SÉPTIMA', 'OCTAVA', 'NOVENA', 'DÉCIMA',
  'DÉCIMA PRIMERA', 'DÉCIMA SEGUNDA', 'DÉCIMA TERCERA', 'DÉCIMA CUARTA', 'DÉCIMA QUINTA', 'DÉCIMA SEXTA'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** «tres (3)»: forma usual de las cifras en convenios. */
export const cifra = (n: number) => `${enteroALetras(n).toLowerCase()} (${n})`;
const limpiar = (l: string[]) => l.map(x => x.trim()).filter(Boolean);
const inicial = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const fechaDe = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`);

/** Fecha de vencimiento: fecha de firma + años de vigencia. */
export function venceConvenio(fecha: string, anios: number) {
  const d = fechaDe(fecha); d.setFullYear(d.getFullYear() + anios);
  return d.toISOString().slice(0, 10);
}

export type Bloque = { tipo: 'parrafo'; texto: string } | { tipo: 'lista'; items: string[]; numerada: boolean };
export interface Clausula { titulo: string; bloques: Bloque[] }

/** Partes del convenio con su denominación abreviada. */
export function partesConvenio(c: ContenidoConvenio, cfg: CabeceraDocumentos) {
  const yunka = cfg.nombre_legal || `Fundación ${cfg.nombre}`;
  const contraparte = c.contraparte.nombre.trim() || 'contraparte';
  // «el Cuerpo de Bomberos…»: el artículo acompaña al nombre en el texto, no en la firma.
  const conArticulo = [c.contraparte.articulo?.trim(), contraparte].filter(Boolean).join(' ');
  return { yunka, alias: cfg.nombre.toUpperCase(), contraparte, conArticulo, sigla: c.contraparte.sigla.trim() || contraparte };
}

/** Cláusulas en orden; las secciones vacías se omiten y la numeración se ajusta sola. */
export function clausulasConvenio(documento: DocumentoPresidencia, cfg: CabeceraDocumentos): Clausula[] {
  const c = documento.contenido as ContenidoConvenio;
  const { alias, conArticulo, sigla } = partesConvenio(c, cfg);
  const lista: { titulo: string; bloques: Bloque[] }[] = [];
  const ambitos = limpiar(c.ambitos), objetivos = limpiar(c.objetivos);
  lista.push({ titulo: 'OBJETO DEL CONVENIO', bloques: [
    { tipo: 'parrafo', texto: `${c.proposito.trim()}${ambitos.length && !/[:]$/.test(c.proposito.trim()) ? ' en los ámbitos de:' : ''}` },
    ...(ambitos.length ? [{ tipo: 'lista', items: ambitos, numerada: false } as Bloque] : []),
  ] });
  if (objetivos.length) lista.push({ titulo: 'OBJETIVOS ESPECÍFICOS', bloques: [
    { tipo: 'parrafo', texto: 'Son objetivos específicos del presente convenio:' }, { tipo: 'lista', items: objetivos, numerada: true }] });
  if (limpiar(c.compromisos_contraparte).length) lista.push({ titulo: `COMPROMISOS DE ${sigla.toUpperCase()}`, bloques: [
    { tipo: 'parrafo', texto: `${inicial(conArticulo)}${c.contraparte.sigla ? ` (${c.contraparte.sigla})` : ''} se compromete a:` },
    { tipo: 'lista', items: limpiar(c.compromisos_contraparte), numerada: true }] });
  if (limpiar(c.compromisos_yunka).length) lista.push({ titulo: `COMPROMISOS DE ${alias}`, bloques: [
    { tipo: 'parrafo', texto: `La Fundación ${cfg.nombre} se compromete a:` }, { tipo: 'lista', items: limpiar(c.compromisos_yunka), numerada: true }] });
  if (c.coordinacion.trim()) lista.push({ titulo: 'MECANISMOS DE COORDINACIÓN', bloques: [{ tipo: 'parrafo', texto: c.coordinacion.trim() }] });
  const v = c.vigencia;
  lista.push({ titulo: 'VIGENCIA', bloques: [{ tipo: 'parrafo', texto:
    `El presente convenio tendrá una vigencia inicial de ${cifra(v.anios)} ${v.anios === 1 ? 'año' : 'años'}, contados a partir de la fecha de su firma${v.renovacion
      ? ', pudiendo renovarse automáticamente por períodos similares previo acuerdo escrito entre ambas partes.' : '. Su renovación requerirá acuerdo escrito entre ambas partes.'}` }] });
  if (limpiar(c.financiamiento).length) lista.push({ titulo: 'FINANCIAMIENTO', bloques: [
    { tipo: 'parrafo', texto: 'Las actividades derivadas del presente convenio podrán ser financiadas:' }, { tipo: 'lista', items: limpiar(c.financiamiento), numerada: false }] });
  lista.push({ titulo: 'MODIFICACIONES Y RESOLUCIÓN', bloques: [
    { tipo: 'parrafo', texto: 'Cualquier modificación al presente convenio deberá realizarse mediante adenda escrita firmada por ambas partes.' },
    { tipo: 'parrafo', texto: `El convenio podrá darse por terminado por mutuo acuerdo o por incumplimiento de alguna de las partes, previa notificación con ${cifra(v.preaviso_dias)} días de anticipación.` }] });
  for (const extra of c.clausulas.filter(x => x.titulo.trim() && x.texto.trim()))
    lista.push({ titulo: extra.titulo.trim().toUpperCase(), bloques: [{ tipo: 'parrafo', texto: extra.texto.trim() }] });
  const f = fechaDe(documento.fecha);
  lista.push({ titulo: 'FIRMA Y RATIFICACIÓN', bloques: [{ tipo: 'parrafo', texto:
    `Leído que fue el presente Convenio, las partes lo firman por duplicado de un mismo tenor y a un solo efecto, en la ciudad de ${v.ciudad || 'Cochabamba'}, ${v.pais || 'Bolivia'}, a los ${f.getDate()} días del mes de ${MESES[f.getMonth()]} del año ${f.getFullYear()}.` }] });
  return lista.map((x, i) => ({ ...x, titulo: `${ORDINALES[i] ?? `CLÁUSULA ${i + 1}`} – ${x.titulo}` }));
}

type Recursos = { cabecera: CabeceraDocumentos; logo: string | null };

/** Composición del convenio (A4 vertical), independiente del navegador para poder probarla. */
export function componerConvenioPDF(documento: DocumentoPresidencia, { cabecera: cfg, logo }: Recursos, borrador = false) {
  const c = documento.contenido as ContenidoConvenio;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true, putOnlyUsedFonts: true });
  const codigo = borrador ? 'BORRADOR' : documento.codigo_completo;
  const { yunka, alias, contraparte, conArticulo, sigla } = partesConvenio(c, cfg);
  doc.setProperties({ title: `${c.titulo} · ${sigla}`, author: cfg.nombre, subject: codigo });
  const fuente = (estilo: string, size: number, color = TEXTO, familia = 'helvetica') => { doc.setFont(familia, estilo); doc.setFontSize(size); doc.setTextColor(...color); };
  const regla = (yy: number, color = ORO, grosor = 0.35) => { doc.setDrawColor(...color); doc.setLineWidth(grosor); doc.line(IZQ, yy, DER, yy); };

  // Membrete con ambos escudos: la institución a la izquierda y la contraparte a la derecha.
  if (logo) doc.addImage(logo, 'PNG', IZQ, 13, 22, 23.1, 'escudo-yunka', 'FAST');
  if (c.contraparte.logo) {
    try {
      const p = doc.getImageProperties(c.contraparte.logo), escala = Math.min(26 / p.width, 24 / p.height);
      doc.addImage(c.contraparte.logo, 'PNG', DER - p.width * escala, 13, p.width * escala, p.height * escala, 'escudo-contraparte', 'FAST');
    } catch { /* logo inválido: se omite */ }
  }
  let y = 17;
  const centro = (texto: string, size: number, estilo = 'bold', color = AZUL, ancho = 112) => {
    if (!texto.trim()) return;
    fuente(estilo, size, color);
    const l: string[] = doc.splitTextToSize(texto, ancho);
    doc.text(l, 105, y + size * 0.3528, { align: 'center', lineHeightFactor: 1.2 });
    y += l.length * size * 0.3528 * 1.2 + 0.8;
  };
  centro(cfg.subtitulo.toUpperCase(), 7.2);
  centro(cfg.nombre.toUpperCase(), 15);
  centro(cfg.nombre_legal, 6.5, 'normal', GRIS);
  const hito = cfg.hitos.find(h => h.destacado);
  if (hito) centro(hito.texto, 6.3, 'normal', GRIS);
  y = Math.max(y + 2, 41);
  regla(y);
  fuente('bold', 8, borrador ? [176, 30, 60] : AZUL);
  doc.text(codigo, DER, y + 5, { align: 'right' });

  // Título y partes
  y += 13;
  centro(c.titulo.toUpperCase(), 15, 'bold', AZUL, 150);
  y += 2;
  centro(`ENTRE ${conArticulo.toUpperCase()}${c.contraparte.sigla ? ` (${c.contraparte.sigla.toUpperCase()})` : ''} Y LA ${yunka.toUpperCase()} (BOLIVIA)`, 9.5, 'bold', TEXTO, 150);
  y += 3;
  // Ficha de tiempos del convenio
  const vence = venceConvenio(documento.fecha, c.vigencia.anios);
  const ficha = [['Firma', fechaDe(documento.fecha).toLocaleDateString('es-BO')], ['Vigencia', `${c.vigencia.anios} ${c.vigencia.anios === 1 ? 'año' : 'años'}`],
    ['Vence', fechaDe(vence).toLocaleDateString('es-BO')], ['Renovación', c.vigencia.renovacion ? 'Automática' : 'Por acuerdo escrito']];
  doc.setFillColor(246, 248, 251); doc.setDrawColor(222, 228, 236); doc.roundedRect(IZQ, y, ANCHO, 12, 1.5, 1.5, 'FD');
  ficha.forEach(([k, v], i) => {
    const x = IZQ + 5 + i * (ANCHO / 4);
    fuente('normal', 6.5, GRIS); doc.text(k.toUpperCase(), x, y + 4.6);
    fuente('bold', 9, AZUL); doc.text(v, x, y + 9.3);
  });
  y += 20;

  function nuevaPagina() {
    doc.addPage();
    fuente('bold', 8, AZUL); doc.text(`${cfg.nombre.toUpperCase()} · ${sigla.toUpperCase()}`, IZQ, 18);
    fuente('normal', 8, GRIS); doc.text(codigo, DER, 18, { align: 'right' });
    regla(21);
    y = 30;
  }
  const espacio = (alto: number) => { if (y + alto > LIMITE) nuevaPagina(); };
  const alto = 10.5 * 0.3528 * 1.45;
  function parrafo(texto: string, sangria = 0, prefijo = '') {
    fuente('normal', 10.5);
    const ancho = ANCHO - sangria;
    const lineas: string[] = doc.splitTextToSize(texto, ancho);
    espacio(Math.min(2, lineas.length) * alto);
    lineas.forEach((l, i) => {
      espacio((lineas.length - i === 2 ? 2 : 1) * alto);
      fuente('normal', 10.5);
      if (i === 0 && prefijo) { fuente('bold', 10.5, AZUL); doc.text(prefijo, IZQ + sangria - 6, y); fuente('normal', 10.5); }
      // Justificado salvo la última línea: el espacio sobrante se reparte entre palabras.
      const palabras = l.trim().split(/\s+/);
      if (i < lineas.length - 1 && palabras.length > 1) {
        const libre = (ancho - palabras.reduce((t, p) => t + doc.getTextWidth(p), 0)) / (palabras.length - 1);
        let x = IZQ + sangria;
        for (const p of palabras) { doc.text(p, x, y); x += doc.getTextWidth(p) + libre; }
      } else doc.text(l, IZQ + sangria, y);
      y += alto;
    });
  }

  // Comparecencia de las partes
  espacio(30);
  fuente('bold', 11.5, AZUL); doc.text('LAS PARTES', IZQ, y); doc.setFillColor(...ORO); doc.rect(IZQ, y + 2, 12, 0.6, 'F'); y += 8;
  parrafo(`De una parte, la ${yunka}, en adelante «${alias}», representada por ${documento.firmante_nombre || '—'}, en su calidad de ${documento.firmante_cargo || 'Presidente'}; y de otra parte, ${conArticulo}${c.contraparte.pais ? ` (${c.contraparte.pais})` : ''}, en adelante «${sigla}», representada por ${c.contraparte.representante || '—'}, en su calidad de ${c.contraparte.cargo || 'representante legal'}; quienes, reconociéndose capacidad suficiente, acuerdan suscribir el presente convenio al tenor de las siguientes cláusulas:`);
  y += 4;

  for (const cl of clausulasConvenio(documento, cfg)) {
    espacio(alto * 3 + 9);
    fuente('bold', 11.5, AZUL);
    const titulo: string[] = doc.splitTextToSize(cl.titulo, ANCHO);
    doc.text(titulo, IZQ, y, { lineHeightFactor: 1.2 });
    y += titulo.length * 5 + 2.5;
    for (const b of cl.bloques) {
      if (b.tipo === 'parrafo') { parrafo(b.texto); y += 2; }
      else { b.items.forEach((item, i) => { parrafo(item, 8, b.numerada ? `${i + 1}.` : '•'); y += 1.5; }); y += 1; }
    }
    y += 4;
  }

  // Firmas: bloque indivisible a dos columnas, cada parte con su institución.
  const firmas = [
    { nombre: c.contraparte.representante || '—', cargo: c.contraparte.cargo || '', inst: `${contraparte}${c.contraparte.sigla ? ` (${c.contraparte.sigla})` : ''}` },
    { nombre: documento.firmante_nombre || '—', cargo: documento.firmante_cargo || '', inst: `Fundación ${cfg.nombre}` },
  ];
  espacio(48);
  y += 26;
  const col = ANCHO / 2;
  firmas.forEach((f, i) => {
    const cx = IZQ + col * i + col / 2;
    doc.setDrawColor(...GRIS); doc.setLineWidth(0.3); doc.line(cx - 32, y, cx + 32, y);
    let fy = y + 5;
    fuente('bold', 9.5, AZUL);
    for (const l of doc.splitTextToSize(f.nombre, col - 10) as string[]) { doc.text(l, cx, fy, { align: 'center' }); fy += 4.2; }
    fuente('normal', 8.3, GRIS);
    for (const l of [...doc.splitTextToSize(f.cargo, col - 10), ...doc.splitTextToSize(f.inst, col - 10)] as string[]) { doc.text(l, cx, fy, { align: 'center' }); fy += 3.8; }
  });

  // Pie con contacto, código y folio en todas las hojas.
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    regla(277, [214, 220, 226], 0.2);
    fuente('normal', 6.7, GRIS);
    doc.text([cfg.contacto.web, cfg.contacto.email, cfg.contacto.telefono].filter(Boolean).join('  |  '), IZQ, 282);
    fuente('normal', 7, GRIS);
    doc.text(codigo, IZQ, 289);
    doc.text('Rúbricas: ________   ________', 105, 289, { align: 'center' });
    doc.text(`Página ${p} de ${total}`, DER, 289, { align: 'right' });
    if (borrador) { fuente('bold', 60, [240, 214, 218]); doc.text('BORRADOR', 105, 160, { align: 'center', angle: 35 }); }
  }
  return doc;
}

/** Plantilla basada en el convenio de cooperación con el CBVP (estructura de referencia). */
export function plantillaConvenio(modelo: 'cbvp' | 'blanco'): ContenidoConvenio {
  const base: ContenidoConvenio = {
    titulo: 'Convenio de cooperación y ayuda interinstitucional',
    contraparte: { articulo: 'la', nombre: '', sigla: '', pais: '', representante: '', cargo: '', logo: null },
    proposito: 'El presente Convenio tiene por objeto fortalecer la cooperación técnica, operativa y formativa entre ambas instituciones, mediante la ejecución de programas, cursos, entrenamientos, intercambio de experiencias y asistencia mutua',
    ambitos: [], objetivos: [], compromisos_contraparte: [], compromisos_yunka: [],
    coordinacion: 'Ambas partes designarán puntos focales institucionales para la planificación, seguimiento y evaluación de las actividades derivadas del presente convenio.\nLas comunicaciones oficiales se realizarán por medio de los canales institucionales previamente designados.',
    financiamiento: ['Con aportes propios de las instituciones firmantes.', 'Mediante apoyo de organismos públicos o privados nacionales o internacionales.', 'A través de convenios específicos o proyectos conjuntos que se desarrollen en el marco de esta alianza.'],
    vigencia: { anios: 3, renovacion: true, preaviso_dias: 30, ciudad: 'Cochabamba', pais: 'Bolivia' },
    clausulas: [],
  };
  if (modelo === 'blanco') return base;
  return {
    ...base,
    contraparte: { articulo: 'el', nombre: 'Cuerpo de Bomberos Voluntarios del Paraguay', sigla: 'CBVP', pais: 'Paraguay', representante: '', cargo: 'Comandante', logo: null },
    ambitos: ['Gestión del riesgo de desastres.', 'Prevención y combate de incendios forestales y estructurales.', 'Atención prehospitalaria y soporte vital básico.',
      'Formación, investigación y capacitación en salvamento y rescate.', 'Implementación del Sistema de Comando de Incidentes (SCI).'],
    compromisos_contraparte: ['Brindar asistencia técnica y académica en la planificación y ejecución de cursos y entrenamientos especializados.',
      'Designar instructores certificados en las áreas de incendios forestales, emergencias médicas, rescate y SCI.',
      'Apoyar el desarrollo de materiales de capacitación, guías y protocolos operativos.',
      'Promover el intercambio de experiencias y buenas prácticas entre el personal voluntario de ambos países.',
      'Facilitar la participación de sus miembros en misiones de cooperación internacional cuando las circunstancias lo permitan.',
      'Apoyar en caso de desastre y/o emergencia declarado y solicitado con personal capacitado para intervenir según sea el riesgo.'],
    compromisos_yunka: ['Brindar las condiciones logísticas y administrativas necesarias para el desarrollo de las actividades conjuntas.',
      'Gestionar ante autoridades nacionales y locales el apoyo institucional que garantice la ejecución de los programas.',
      'Promover la participación de sus voluntarios en los procesos de capacitación y certificación.',
      'Velar por la difusión de las actividades conjuntas, destacando la cooperación entre Bolivia y Paraguay.',
      'Facilitar espacios de práctica, materiales y recursos humanos requeridos para el cumplimiento del convenio.',
      'Apoyar en caso de desastre y/o emergencia declarado y solicitado con personal capacitado para intervenir según sea el riesgo.'],
    clausulas: [{ titulo: 'Cláusula de fraternidad', texto: 'Ambas instituciones reconocen este convenio como un acto de hermandad, cooperación y fortalecimiento regional, en el espíritu de colaboración solidaria entre los pueblos de Bolivia y Paraguay, en beneficio de la seguridad, la protección ambiental y el servicio humanitario.' }],
  };
}
