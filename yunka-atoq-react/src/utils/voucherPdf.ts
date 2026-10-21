import type { Voucher } from '../services/gestionApi';
import { cargarLogoBase64, obtenerCabecera } from './documentosPdf';

// ── Monto literal (formato de recibos en Bolivia: «CIENTO CINCUENTA 00/100 BOLIVIANOS») ──
const UNIDADES = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ', 'ONCE', 'DOCE', 'TRECE',
  'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE', 'VEINTIUNO', 'VEINTIDÓS', 'VEINTITRÉS',
  'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
const DECENAS = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const CENTENAS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

function centenas(n: number): string {
  if (n === 100) return 'CIEN';
  const resto = n % 100;
  const decenas = resto < 30 ? UNIDADES[resto] : DECENAS[Math.floor(resto / 10)] + (resto % 10 ? ` Y ${UNIDADES[resto % 10]}` : '');
  return [CENTENAS[Math.floor(n / 100)], decenas].filter(Boolean).join(' ');
}
// «uno» pierde la vocal delante de MIL / MILLONES: «veintiún mil», «un millón».
const apocope = (s: string) => s.replace(/VEINTIUNO$/, 'VEINTIÚN').replace(/UNO$/, 'UN');

function enteroALetras(n: number): string {
  if (n === 0) return 'CERO';
  const millones = Math.floor(n / 1e6), miles = Math.floor(n / 1000) % 1000, resto = n % 1000;
  const partes: string[] = [];
  if (millones) partes.push(millones === 1 ? 'UN MILLÓN' : `${apocope(enteroALetras(millones))} MILLONES`);
  if (miles) partes.push(miles === 1 ? 'MIL' : `${apocope(centenas(miles))} MIL`);
  if (resto) partes.push(centenas(resto));
  return partes.join(' ');
}

export function montoEnLetras(monto: string | number): string {
  const [entero, decimales = '0'] = Number(monto).toFixed(2).split('.');
  return `${enteroALetras(Number(entero))} ${decimales.padEnd(2, '0')}/100 BOLIVIANOS`;
}

// ── Contenido común a la vista digital y al PDF ──
export const dineroBs = (n: string | number) => new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(Number(n));
export const fechaHora = (v?: string | null) => v
  ? new Date(v).toLocaleString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—';

const CONCEPTOS: Record<string, string> = { apoyo: 'Apoyo', instruccion: 'Instrucción', capacitacion: 'Capacitación', viaje: 'Viaje' };
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
/** '2026-09' → 'septiembre 2026' */
export const nombrePeriodo = (p: string) => `${MESES[Number(p.slice(5, 7)) - 1]} ${p.slice(0, 4)}`;

export type Tono = 'ingreso' | 'egreso' | 'reserva' | 'entrega' | 'devolucion' | 'baja';
export interface Autorizacion { instancia: string; nombre: string; fecha: string; estado: string }
export interface ContenidoVoucher {
  titulo: string; estado: string; tono: Tono;
  datos: [string, string][]; motivoTitulo: string; autorizaciones: Autorizacion[];
  firmas: { rol: string; nombre: string }[];
  /** Una página por copia en el PDF; vacío = una sola página sin rótulo. */
  copias: string[];
}

export function contenidoVoucher(v: Voucher): ContenidoVoucher {
  if (v.clase === 'reserva') {
    const liberada = v.estado === 'liberada';
    return {
      titulo: 'COMPROBANTE DE RESERVA DE FONDOS', estado: liberada ? 'LIBERADA' : 'ACTIVA', tono: 'reserva', copias: [],
      datos: [
        ['Destino de la reserva', v.destino_nombre ?? v.destino ?? '—'],
        ...(v.campania_nombre ? [['Campaña', v.campania_nombre] as [string, string]] : []),
        ['Registrada por', v.registrado_nombre],
        ['Fecha de registro', fechaHora(v.fecha)],
        ...(liberada ? [['Liberada por', v.liberada_nombre ?? '—'], ['Fecha de liberación', fechaHora(v.liberada_at)],
          ['Motivo de liberación', v.liberada_motivo ?? '—']] as [string, string][] : []),
      ],
      motivoTitulo: 'Detalle de la reserva',
      autorizaciones: [
        { instancia: 'Reserva · Jefatura de Finanzas', nombre: v.registrado_nombre, fecha: fechaHora(v.fecha), estado: 'Registrada' },
        ...(liberada ? [{ instancia: 'Liberación · Jefatura de Finanzas', nombre: v.liberada_nombre ?? '—', fecha: fechaHora(v.liberada_at), estado: 'Liberada' }] : []),
      ],
      firmas: [{ rol: 'Jefatura de Finanzas', nombre: v.registrado_nombre }, { rol: 'Vº Bº Presidencia', nombre: '' }],
    };
  }
  if (v.periodos?.length) {
    const persona = v.beneficiario ?? '—';
    return {
      titulo: 'COMPROBANTE DE PAGO DE MENSUALIDAD', estado: 'PAGADO', tono: 'ingreso',
      copias: ['ORIGINAL · FINANZAS', 'COPIA · VOLUNTARIO'],
      datos: [
        ['Voluntario', persona],
        ...(v.beneficiario_ci ? [['C.I.', v.beneficiario_ci] as [string, string]] : []),
        ...(v.beneficiario_grado ? [['Grado', v.beneficiario_grado] as [string, string]] : []),
        [`Mes${v.periodos.length > 1 ? 'es' : ''} pagado${v.periodos.length > 1 ? 's' : ''}`,
          v.periodos.map(p => `${nombrePeriodo(p.periodo)} (${dineroBs(p.monto)})`).join(', ')],
        ['Fecha de cobro', fechaHora(v.fecha)],
        ['Referencia de pago', v.referencia || '—'],
      ],
      motivoTitulo: 'Detalle',
      autorizaciones: [{ instancia: 'Cobro · Jefatura de Finanzas', nombre: v.registrado_nombre, fecha: fechaHora(v.fecha), estado: 'Recibido' }],
      firmas: [{ rol: 'Entregué conforme · Voluntario', nombre: persona }, { rol: 'Recibí conforme · Finanzas', nombre: v.registrado_nombre }],
    };
  }
  const egreso = v.clase === 'egreso';
  const titulo = egreso ? 'COMPROBANTE DE EGRESO' : 'COMPROBANTE DE INGRESO';
  if (!v.solicitud_id) {
    // Un abono a deuda muestra el saldo antes y después de este pago.
    const antes = v.deuda_id ? Number(v.deuda_monto) - Number(v.deuda_pagado_antes ?? 0) : 0;
    const despues = Math.round((antes - Number(v.monto)) * 100) / 100;
    const deuda: [string, string][] = v.deuda_id ? [
      ['Deuda cubierta', `#${v.deuda_id} · ${v.deuda_acreedor ?? ''}`], ['Monto total de la deuda', dineroBs(v.deuda_monto ?? 0)],
      ['Saldo antes del pago', dineroBs(antes)], ['Falta por pagar tras este pago', dineroBs(despues)],
    ] : [];
    return {
      titulo: v.deuda_id ? 'COMPROBANTE DE EGRESO · PAGO DE DEUDA' : titulo,
      estado: v.deuda_id ? (despues <= 0 ? 'DEUDA CANCELADA' : 'ABONO REGISTRADO') : 'REGISTRADO', tono: v.clase, copias: [],
      datos: [['Concepto', v.concepto_nombre ?? '—'], ...deuda, ['Registrado por', v.registrado_nombre], ['Fecha de registro', fechaHora(v.fecha)], ['Referencia', v.referencia || '—']],
      motivoTitulo: 'Detalle',
      autorizaciones: [{ instancia: 'Registro · Jefatura de Finanzas', nombre: v.registrado_nombre, fecha: fechaHora(v.fecha), estado: 'Registrado' }],
      firmas: egreso
        ? [{ rol: 'Entregué conforme · Finanzas', nombre: v.registrado_nombre }, { rol: 'Recibí conforme', nombre: '' }]
        : [{ rol: 'Entregué conforme', nombre: '' }, { rol: 'Recibí conforme · Finanzas', nombre: v.registrado_nombre }],
    };
  }
  const persona = v.beneficiario ?? '—';
  return {
    titulo: egreso ? 'VOUCHER DE EGRESO · ENTREGA DE FONDOS' : titulo, estado: egreso ? 'DESEMBOLSADO' : 'RECIBIDO', tono: v.clase, copias: [],
    datos: [
      [egreso ? 'Voluntario beneficiario' : 'Solicitante / aportante', persona],
      ...(v.beneficiario_ci ? [['C.I.', v.beneficiario_ci] as [string, string]] : []),
      ...(v.beneficiario_grado ? [['Grado', v.beneficiario_grado] as [string, string]] : []),
      ['Concepto', v.concepto_nombre ?? CONCEPTOS[v.concepto ?? ''] ?? v.concepto ?? '—'],
      ['Solicitud', `Nº ${v.solicitud_id} · ${fechaHora(v.solicitud_fecha)}`],
      [egreso ? 'Fecha de entrega' : 'Fecha de recepción', fechaHora(v.fecha)],
      ['Referencia de pago', v.referencia || '—'],
    ],
    motivoTitulo: 'Motivo de la solicitud',
    autorizaciones: [
      { instancia: '1 · Jefatura de Finanzas', nombre: v.finanzas_nombre ?? '—', fecha: fechaHora(v.finanzas_fecha), estado: 'Autorizado' },
      { instancia: '2 · Presidencia', nombre: v.presidencia_nombre ?? '—', fecha: fechaHora(v.presidencia_fecha), estado: 'Autorizado' },
      { instancia: egreso ? '3 · Desembolso' : '3 · Recepción', nombre: v.registrado_nombre, fecha: fechaHora(v.fecha), estado: egreso ? 'Entregado' : 'Recibido' },
    ],
    firmas: egreso
      ? [{ rol: 'Entregué conforme · Finanzas', nombre: v.registrado_nombre }, { rol: 'Recibí conforme · Voluntario', nombre: persona }, { rol: 'Vº Bº Presidencia', nombre: v.presidencia_nombre ?? '' }]
      : [{ rol: 'Entregué conforme', nombre: persona }, { rol: 'Recibí conforme · Finanzas', nombre: v.registrado_nombre }],
  };
}

// ── PDF ──
type RGB = [number, number, number];
const AZUL: RGB = [8, 42, 78], ORO: RGB = [174, 139, 73], TEXTO: RGB = [33, 43, 54], GRIS: RGB = [100, 112, 128], LINEA: RGB = [220, 226, 235];
export const TONOS: Record<Tono, { fuerte: RGB; suave: RGB }> = {
  ingreso: { fuerte: [22, 110, 76], suave: [232, 246, 239] },
  egreso: { fuerte: [176, 30, 60], suave: [252, 237, 240] },
  reserva: { fuerte: [149, 100, 21], suave: [255, 246, 226] },
  entrega: { fuerte: [36, 86, 189], suave: [237, 243, 255] },
  devolucion: { fuerte: [22, 110, 76], suave: [232, 246, 239] },
  baja: { fuerte: [176, 30, 60], suave: [252, 237, 240] },
};
const IZQ = 18, DER = 192, ANCHO = DER - IZQ;

/** Comprobante institucional (voucher de finanzas o acta de logística); el monto es opcional. */
export interface Comprobante { codigo: string; fecha: string; rotulo: string; detalle: string; monto?: string; contenido: ContenidoVoucher }

export async function generarVoucherPDF(v: Voucher) {
  return generarComprobantePDF({ codigo: v.codigo, fecha: v.fecha, rotulo: 'Voucher', detalle: v.detalle, monto: v.monto, contenido: contenidoVoucher(v) });
}

export async function generarComprobantePDF(v: Comprobante) {
  const [{ jsPDF }, { default: autoTable }, cabecera, logo] = await Promise.all([
    import('jspdf'), import('jspdf-autotable'), obtenerCabecera(), cargarLogoBase64(),
  ]);
  const c = v.contenido, tono = TONOS[c.tono];
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({ title: `${v.rotulo} ${v.codigo}`, author: cabecera.nombre, subject: c.titulo });
  const fuente = (estilo: 'normal' | 'bold', size: number, color: RGB = TEXTO) => {
    doc.setFont('helvetica', estilo); doc.setFontSize(size); doc.setTextColor(...color);
  };

  // Cada copia ocupa su propia hoja con el mismo contenido.
  const pagina = (copia: string) => {
    if (copia) { fuente('bold', 7, GRIS); doc.text(copia, DER, 8, { align: 'right' }); }

    // Membrete
    if (logo) doc.addImage(logo, 'PNG', IZQ, 13, 22, 23, 'logo-voucher', 'FAST');
    const tx = logo ? IZQ + 27 : IZQ;
    fuente('bold', 7.5, ORO); doc.text(cabecera.subtitulo.toUpperCase(), tx, 18);
    fuente('bold', 16, AZUL); doc.text(cabecera.nombre.toUpperCase(), tx, 25);
    fuente('normal', 6.6, GRIS); doc.text(doc.splitTextToSize(cabecera.nombre_legal, 92), tx, 30);
    const hito = cabecera.hitos.find(h => h.destacado) ?? cabecera.hitos[0];
    if (hito) doc.text(hito.texto, tx, 37);

    // Recuadro del número de comprobante
    doc.setDrawColor(...AZUL); doc.setLineWidth(0.5); doc.roundedRect(143, 12, 49, 26, 2, 2);
    doc.setFillColor(...AZUL); doc.rect(143.25, 12.25, 48.5, 7, 'F');
    fuente('bold', 7.5, [255, 255, 255]); doc.text(`${v.rotulo.toUpperCase()} Nº`, 167.5, 17, { align: 'center' });
    fuente('bold', 17, AZUL); doc.text(v.codigo, 167.5, 28.5, { align: 'center' });
    fuente('normal', 7, GRIS); doc.text(fechaHora(v.fecha), 167.5, 34.5, { align: 'center' });
    doc.setDrawColor(...ORO); doc.setLineWidth(0.8); doc.line(IZQ, 43, DER, 43);

    // Título y estado
    let y = 49;
    doc.setFillColor(...tono.suave); doc.roundedRect(IZQ, y, ANCHO, 12, 2, 2, 'F');
    doc.setFillColor(...tono.fuerte); doc.rect(IZQ, y, 2.2, 12, 'F');
    fuente('bold', 12, tono.fuerte); doc.text(c.titulo, IZQ + 7, y + 7.8);
    fuente('bold', 8);
    const anchoEstado = doc.getTextWidth(c.estado) + 8;
    doc.setDrawColor(...tono.fuerte); doc.setLineWidth(0.4); doc.roundedRect(DER - 4 - anchoEstado, y + 3, anchoEstado, 6, 3, 3);
    doc.text(c.estado, DER - 4 - anchoEstado / 2, y + 7.1, { align: 'center' });

    // Monto (solo vouchers)
    y += 18;
    if (v.monto !== undefined) {
      doc.setDrawColor(...LINEA); doc.setLineWidth(0.3); doc.roundedRect(IZQ, y, ANCHO, 22, 2, 2);
      fuente('normal', 7, GRIS); doc.text('MONTO', IZQ + 6, y + 7);
      fuente('bold', 19, AZUL); doc.text(dineroBs(v.monto), IZQ + 6, y + 16.5);
      doc.setDrawColor(...LINEA); doc.line(IZQ + 66, y + 4, IZQ + 66, y + 18);
      fuente('normal', 7, GRIS); doc.text('SON', IZQ + 72, y + 7);
      fuente('bold', 9, TEXTO); doc.text(doc.splitTextToSize(montoEnLetras(v.monto), ANCHO - 78), IZQ + 72, y + 12.5);
      y += 30;
    } else y += 4;

    // Datos en dos columnas
    const col = ANCHO / 2;
    for (let i = 0; i < c.datos.length; i += 2) {
      let alto = 0;
      c.datos.slice(i, i + 2).forEach(([etiqueta, valor], j) => {
        const x = IZQ + j * col;
        fuente('normal', 6.8, GRIS); doc.text(etiqueta.toUpperCase(), x, y);
        fuente('bold', 9.5, TEXTO);
        const lineas: string[] = doc.splitTextToSize(valor, col - 6);
        doc.text(lineas, x, y + 4.8);
        alto = Math.max(alto, 4.8 + lineas.length * 4.2);
      });
      y += alto + 4;
    }

    // Motivo / detalle
    y += 2;
    fuente('bold', 8, AZUL); doc.text(c.motivoTitulo.toUpperCase(), IZQ, y);
    fuente('normal', 9.5, TEXTO);
    const detalle: string[] = doc.splitTextToSize(v.detalle, ANCHO - 10).slice(0, 14);
    const altoDetalle = detalle.length * 4.4 + 7;
    doc.setFillColor(247, 249, 252); doc.roundedRect(IZQ, y + 2.5, ANCHO, altoDetalle, 2, 2, 'F');
    doc.text(detalle, IZQ + 5, y + 8);
    y += altoDetalle + 10;

    // Autorizaciones
    fuente('bold', 8, AZUL); doc.text('AUTORIZACIONES Y REGISTRO', IZQ, y);
    autoTable(doc, {
      startY: y + 2.5, margin: { left: IZQ, right: 210 - DER }, theme: 'grid',
      head: [['Instancia', 'Responsable', 'Fecha y hora', 'Estado']],
      body: c.autorizaciones.map(a => [a.instancia, a.nombre, a.fecha, a.estado]),
      styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2.4, textColor: TEXTO, lineColor: LINEA, lineWidth: 0.2 },
      headStyles: { fillColor: AZUL, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
      columnStyles: { 0: { cellWidth: 46 }, 2: { cellWidth: 40 }, 3: { cellWidth: 24, fontStyle: 'bold', textColor: TONOS.ingreso.fuerte } },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY;

    // Firmas: al pie de la hoja, o bajo el contenido si este es extenso
    y = Math.max(y + 32, 238);
    if (y > 262) { doc.addPage(); y = 50; }
    const ancho = ANCHO / c.firmas.length;
    c.firmas.forEach((f, i) => {
      const centro = IZQ + ancho * i + ancho / 2;
      doc.setDrawColor(...GRIS); doc.setLineWidth(0.3); doc.line(centro - ancho / 2 + 6, y, centro + ancho / 2 - 6, y);
      fuente('bold', 8, TEXTO); if (f.nombre) doc.text(doc.splitTextToSize(f.nombre, ancho - 10)[0], centro, y + 4.5, { align: 'center' });
      fuente('normal', 7, GRIS); doc.text(f.rol, centro, y + (f.nombre ? 8.5 : 4.5), { align: 'center' });
    });

    // Pie
    doc.setDrawColor(...LINEA); doc.line(IZQ, 280, DER, 280);
    fuente('normal', 6.5, GRIS);
    doc.text(`${v.rotulo} ${v.codigo} · generado el ${fechaHora(new Date().toISOString())} desde el sistema institucional`, IZQ, 284.5);
    doc.text([cabecera.contacto.web, cabecera.contacto.email].filter(Boolean).join(' · '), DER, 284.5, { align: 'right' });
  };
  (c.copias.length ? c.copias : ['']).forEach((copia, i) => { if (i) doc.addPage(); pagina(copia); });
  return doc;
}

export async function descargarVoucherPDF(v: Voucher) {
  (await generarVoucherPDF(v)).save(`Voucher_${v.codigo}.pdf`);
}
