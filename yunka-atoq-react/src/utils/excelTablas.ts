import type { Workbook, Worksheet } from 'exceljs';

// Utilidades comunes de los reportes Excel de gestión (finanzas, logística).
export const AZUL = 'FF0B2A4E', ORO = 'FFAE8B49', GRIS = 'FFF3F6FA', VERDE = 'FF166E4C', ROJO = 'FFB01E3C';
export const BS = '"Bs" #,##0.00';
export const FECHA = 'dd/mm/yyyy hh:mm';

export type Columna = { titulo: string; ancho: number; formato?: string };
export const n = (v: string | number | null | undefined) => Number(v ?? 0);
export const fecha = (v?: string | null) => (v ? new Date(v.length === 10 ? `${v}T12:00:00` : v) : null);

/** Tabla con encabezado institucional, filtros, fila congelada y total opcional en las columnas indicadas. */
export function tabla(ws: Worksheet, fila: number, columnas: Columna[], filas: (string | number | Date | null)[][], totales: number[] = []) {
  columnas.forEach((c, i) => { const col = ws.getColumn(i + 1); col.width = Math.max(col.width ?? 0, c.ancho); });
  const head = ws.getRow(fila);
  columnas.forEach((c, i) => {
    const cell = head.getCell(i + 1);
    cell.value = c.titulo;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL } };
    cell.alignment = { vertical: 'middle', wrapText: true };
  });
  head.height = 20;
  filas.forEach((valores, r) => {
    const row = ws.getRow(fila + 1 + r);
    valores.forEach((v, i) => {
      const cell = row.getCell(i + 1);
      cell.value = v;
      const formato = columnas[i].formato ?? (v instanceof Date ? FECHA : undefined);
      if (formato) cell.numFmt = formato;
      cell.alignment = { vertical: 'top', wrapText: typeof v === 'string' && v.length > 40 };
      if (r % 2) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRIS } };
    });
  });
  let fin = fila + filas.length;
  // Excel admite un solo autofiltro por hoja: se conserva el de la primera tabla.
  if (filas.length && !ws.autoFilter) ws.autoFilter = { from: { row: fila, column: 1 }, to: { row: fin, column: columnas.length } };
  else { ws.getRow(fila + 1).getCell(1).value = 'Sin registros en el periodo'; ws.getRow(fila + 1).getCell(1).font = { italic: true, color: { argb: 'FF65728C' } }; fin++; }
  if (totales.length && filas.length) {
    fin++;
    const row = ws.getRow(fin);
    row.getCell(1).value = 'TOTAL';
    for (const col of totales) {
      const letra = ws.getColumn(col).letter;
      row.getCell(col).value = { formula: `SUM(${letra}${fila + 1}:${letra}${fila + filas.length})` };
      row.getCell(col).numFmt = BS;
    }
    row.font = { bold: true };
    row.eachCell(c => { c.border = { top: { style: 'thin', color: { argb: AZUL } } }; });
  }
  return fin;
}

export function hoja(wb: Workbook, nombre: string, titulo: string, subtitulo: string, color = AZUL) {
  const ws = wb.addWorksheet(nombre, { properties: { tabColor: { argb: color } }, views: [{ state: 'frozen', ySplit: 4 }] });
  ws.getCell('A1').value = titulo;
  ws.getCell('A1').font = { bold: true, size: 14, color: { argb: AZUL } };
  ws.getCell('A2').value = subtitulo;
  ws.getCell('A2').font = { size: 10, color: { argb: 'FF65728C' } };
  return ws;
}

export async function descargarLibro(wb: Workbook, nombre: string) {
  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a');
  a.href = url; a.download = nombre; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
