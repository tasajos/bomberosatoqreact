import type { Borders, Fill } from 'exceljs';
import type { Capacitacion, Inscripcion } from '../services/api';
import { AZUL, ORO, GRIS, VERDE, ROJO, descargarLibro, fecha } from './excelTablas';

const TIPO: Record<string, string>   = { interna: 'Interna', externa: 'Externa', certificacion: 'Certificación' };
const ESTADO_CAP: Record<string, string> = { planificada: 'Planificada', activa: 'Activa', cerrada: 'Cerrada' };
const ESTADO_INS: Record<string, { label: string; color: string; bg: string }> = {
  inscrito:   { label: 'Inscrito',   color: 'FF1741B8', bg: 'FFE8EFFF' },
  completado: { label: 'Completado', color: VERDE,      bg: 'FFE3F4EC' },
  ausente:    { label: 'Ausente',    color: ROJO,       bg: 'FFFBE7EB' },
};

// Excel guarda las fechas sin zona horaria: se fija el día local para que no se corra al siguiente.
const diaLocal = (v?: string | null) => {
  const d = fecha(v);
  return d && !isNaN(d.getTime()) ? new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) : null;
};
const solido = (argb: string): Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const linea = { style: 'thin' as const, color: { argb: 'FFD5DCE8' } };
const BORDE: Partial<Borders> = { top: linea, left: linea, bottom: linea, right: linea };

const COLUMNAS = [
  { titulo: 'N°',               ancho: 5  },
  { titulo: 'Nombre completo',  ancho: 34 },
  { titulo: 'C.I.',             ancho: 13 },
  { titulo: 'Matrícula',        ancho: 12 },
  { titulo: 'Grado',            ancho: 16 },
  { titulo: 'Especialidad',     ancho: 18 },
  { titulo: 'Teléfono',         ancho: 14 },
  { titulo: 'Correo',           ancho: 30 },
  { titulo: 'Tipo sangre',      ancho: 11 },
  { titulo: 'Fecha inscripción', ancho: 16 },
  { titulo: 'Estado',           ancho: 13 },
];

/** Lista de voluntarios inscritos en una capacitación, con ficha del curso y resumen. */
export async function descargarInscritosCapacitacion(cap: Capacitacion, inscripciones: Inscripcion[]) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Yunka Atoq · Capacitaciones';
  wb.created = new Date();

  const ultima = COLUMNAS.length;
  const ws = wb.addWorksheet('Inscritos', {
    properties: { tabColor: { argb: ORO } },
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } },
    headerFooter: { oddFooter: '&L&8Yunka Atoq · Capacitaciones&R&8Página &P de &N' },
  });
  COLUMNAS.forEach((c, i) => { ws.getColumn(i + 1).width = c.ancho; });

  // ── Banner institucional ──────────────────────────────────────
  ws.mergeCells(1, 1, 1, ultima);
  const banner = ws.getCell(1, 1);
  banner.value = 'BOMBEROS VOLUNTARIOS YUNKA ATOQ';
  banner.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  banner.fill = solido(AZUL);
  banner.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 22;

  ws.mergeCells(2, 1, 2, ultima);
  const titulo = ws.getCell(2, 1);
  titulo.value = `Lista de inscritos · ${cap.nombre}`;
  titulo.font = { bold: true, size: 15, color: { argb: AZUL } };
  titulo.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  ws.getRow(2).height = 30;

  ws.mergeCells(3, 1, 3, ultima);
  const franja = ws.getCell(3, 1);
  franja.fill = solido(ORO);
  ws.getRow(3).height = 4;

  // ── Ficha del curso (dos columnas de pares etiqueta/valor) ──────
  const horas = Number(cap.horas) || 0;
  const ficha: [string, string | number | Date | null, string?][] = [
    ['Tipo',        TIPO[cap.tipo] ?? cap.tipo],
    ['Estado',      ESTADO_CAP[cap.estado] ?? cap.estado],
    ['Institución', cap.institucion || '—'],
    ['Instructor',  cap.instructor || '—'],
    ['Lugar',       cap.lugar || '—'],
    ['Fecha',       diaLocal(cap.fecha) ?? 'Por definir', 'dd/mm/yyyy'],
    ['Horas',       horas || '—'],
    ['Cupo',        cap.cupo > 0 ? cap.cupo : 'Sin límite'],
  ];
  const filaFicha = 5;
  ficha.forEach(([k, v, fmt], i) => {
    const fila = filaFicha + Math.floor(i / 2);
    const col = i % 2 === 0 ? 1 : 6;               // izquierda A:E · derecha F:K
    ws.mergeCells(fila, col, fila, col + 1);
    ws.mergeCells(fila, col + 2, fila, col === 1 ? 5 : ultima);
    const et = ws.getCell(fila, col);
    et.value = k;
    et.font = { bold: true, size: 9, color: { argb: 'FF65728C' } };
    et.fill = solido(GRIS);
    et.alignment = { vertical: 'middle', indent: 1 };
    const val = ws.getCell(fila, col + 2);
    val.value = v;
    val.font = { bold: true, color: { argb: AZUL } };
    val.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    if (fmt && v instanceof Date) val.numFmt = fmt;
    ws.getRow(fila).height = 18;
  });

  // ── Resumen ───────────────────────────────────────────────────
  const filaRes = filaFicha + Math.ceil(ficha.length / 2) + 1;
  const cuenta = (e: string) => inscripciones.filter(i => i.estado === e).length;
  const resumen: [string, number, string][] = [
    ['Total inscritos', inscripciones.length, AZUL],
    ['Inscritos',       cuenta('inscrito'),   'FF1741B8'],
    ['Completados',     cuenta('completado'), VERDE],
    ['Ausentes',        cuenta('ausente'),    ROJO],
  ];
  // Cada indicador ocupa un bloque de columnas: A:B, C:E, F:H, I:K
  const bloques: [number, number][] = [[1, 2], [3, 5], [6, 8], [9, ultima]];
  resumen.forEach(([k, v, color], i) => {
    const [a, b] = bloques[i];
    ws.mergeCells(filaRes, a, filaRes, b);
    ws.mergeCells(filaRes + 1, a, filaRes + 1, b);
    const num = ws.getCell(filaRes, a);
    num.value = v;
    num.font = { bold: true, size: 16, color: { argb: color } };
    num.alignment = { horizontal: 'center', vertical: 'middle' };
    num.border = { top: { style: 'medium', color: { argb: color } } };
    const lab = ws.getCell(filaRes + 1, a);
    lab.value = k.toUpperCase();
    lab.font = { bold: true, size: 8, color: { argb: 'FF65728C' } };
    lab.alignment = { horizontal: 'center' };
  });
  ws.getRow(filaRes).height = 26;

  // ── Tabla de inscritos ────────────────────────────────────────
  const filaHead = filaRes + 3;
  const head = ws.getRow(filaHead);
  COLUMNAS.forEach((c, i) => {
    const cell = head.getCell(i + 1);
    cell.value = c.titulo;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = solido(AZUL);
    cell.border = BORDE;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
  head.height = 24;

  const ordenadas = [...inscripciones].sort((a, b) => (a.nombre_completo || a.nombre_voluntario).localeCompare(b.nombre_completo || b.nombre_voluntario, 'es'));
  ordenadas.forEach((ins, r) => {
    const row = ws.getRow(filaHead + 1 + r);
    const est = ESTADO_INS[ins.estado] ?? ESTADO_INS.inscrito;
    const valores = [
      r + 1, ins.nombre_completo || ins.nombre_voluntario, ins.carnet_identidad || '', ins.matricula || '',
      ins.grado || '', ins.especialidad || '', ins.telefono || '', ins.email || '', ins.tipo_sangre || '',
      diaLocal(ins.fecha_inscripcion), est.label,
    ];
    valores.forEach((v, i) => {
      const cell = row.getCell(i + 1);
      cell.value = v;
      cell.border = BORDE;
      cell.alignment = { vertical: 'middle', horizontal: [0, 2, 3, 8, 9, 10].includes(i) ? 'center' : 'left' };
      if (r % 2) cell.fill = solido(GRIS);
    });
    row.getCell(10).numFmt = 'dd/mm/yyyy';
    const estado = row.getCell(ultima);
    estado.fill = solido(est.bg);
    estado.font = { bold: true, color: { argb: est.color } };
    row.height = 18;
  });

  const filaFin = filaHead + Math.max(ordenadas.length, 1);
  if (!ordenadas.length) {
    ws.mergeCells(filaHead + 1, 1, filaHead + 1, ultima);
    const vacio = ws.getCell(filaHead + 1, 1);
    vacio.value = 'Sin voluntarios inscritos';
    vacio.font = { italic: true, color: { argb: 'FF65728C' } };
    vacio.alignment = { horizontal: 'center' };
  } else {
    ws.autoFilter = { from: { row: filaHead, column: 1 }, to: { row: filaFin, column: ultima } };
  }
  ws.views = [{ state: 'frozen', ySplit: filaHead }];
  ws.pageSetup.printTitlesRow = `${filaHead}:${filaHead}`;

  // ── Pie: generado + firma ─────────────────────────────────────
  const filaPie = filaFin + 2;
  ws.mergeCells(filaPie, 1, filaPie, 5);
  const gen = ws.getCell(filaPie, 1);
  gen.value = `Generado el ${new Date().toLocaleString('es-BO')}`;
  gen.font = { italic: true, size: 9, color: { argb: 'FF65728C' } };

  ws.mergeCells(filaPie + 3, 8, filaPie + 3, ultima);
  const firma = ws.getCell(filaPie + 3, 8);
  firma.value = 'Responsable de capacitación';
  firma.font = { size: 9, color: { argb: 'FF65728C' } };
  firma.alignment = { horizontal: 'center' };
  firma.border = { top: { style: 'thin', color: { argb: AZUL } } };

  const slug = cap.nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').toLowerCase().slice(0, 50);
  await descargarLibro(wb, `inscritos_${slug || cap.id}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
