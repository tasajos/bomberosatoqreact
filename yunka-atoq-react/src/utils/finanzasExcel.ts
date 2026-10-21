import { AZUL, BS, FECHA, ORO, ROJO, VERDE, descargarLibro, fecha, hoja, n, tabla } from './excelTablas';
import type { ReporteFinanzas } from '../services/gestionApi';
import { nombrePeriodo } from './voucherPdf';

const TIPOS_DEUDA: Record<string, string> = { prestamo: 'Préstamo recibido', proveedor: 'Proveedor', otro: 'Otra' };
const ESTADO_PERSONAL: Record<string, string> = { activo: 'Activo', pasiva: 'Pasivo', baja: 'Baja', cooperador: 'Cooperador', comision: 'En comisión' };
const mes = (p: string) => { const t = nombrePeriodo(p); return t.charAt(0).toUpperCase() + t.slice(1); };

export async function construirReporteFinanzas(r: ReporteFinanzas) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Yunka Atoq · Finanzas';
  wb.created = new Date();
  const periodo = r.desde || r.hasta
    ? `Periodo: ${r.desde ? fecha(r.desde)!.toLocaleDateString('es-BO') : 'inicio'} al ${r.hasta ? fecha(r.hasta)!.toLocaleDateString('es-BO') : 'hoy'}`
    : 'Periodo: todos los registros';
  const sub = `${periodo} · generado el ${new Date(r.generado).toLocaleString('es-BO')}`;
  const ingresos = r.movimientos.filter(m => m.tipo === 'ingreso'), egresos = r.movimientos.filter(m => m.tipo === 'egreso');
  const suma = (l: { monto: string }[]) => l.reduce((t, m) => t + n(m.monto), 0);
  const deudasPendientes = r.deudas.filter(d => d.estado === 'pendiente');
  const deudores = r.mensualidades.voluntarios.filter(v => v.estado === 'debe');

  // Resumen
  const res = hoja(wb, 'Resumen', 'Bomberos Voluntarios Yunka Atoq · Reporte financiero', sub, ORO);
  const bloque = (fila: number, titulo: string, datos: [string, number | string, string?][]) => {
    res.getCell(`A${fila}`).value = titulo;
    res.getCell(`A${fila}`).font = { bold: true, color: { argb: AZUL } };
    datos.forEach(([k, v, fmt], i) => {
      res.getCell(`A${fila + 1 + i}`).value = k;
      const c = res.getCell(`B${fila + 1 + i}`);
      c.value = v; if (fmt ?? typeof v === 'number') c.numFmt = fmt ?? BS;
      c.font = { bold: true };
    });
    return fila + datos.length + 2;
  };
  res.getColumn(1).width = 42; res.getColumn(2).width = 22;
  let f = bloque(4, 'Movimientos del periodo', [['Total ingresos', suma(ingresos)], ['Total egresos', suma(egresos)], ['Resultado (ingresos − egresos)', suma(ingresos) - suma(egresos)], ['Cantidad de movimientos', r.movimientos.length, '0']]);
  f = bloque(f, 'Estado actual de caja', [['Saldo en caja', r.resumen.saldo], ['Reservado', r.resumen.reservado], ['Comprometido (egresos aprobados)', r.resumen.comprometido], ['Disponible para operar', r.resumen.disponible]]);
  f = bloque(f, 'Préstamos y deudas (actual)', [['Deudas pendientes', deudasPendientes.length, '0'], ['Saldo total por pagar', deudasPendientes.reduce((t, d) => t + d.saldo, 0)]]);
  bloque(f, 'Mensualidades', [['Cobrado en el periodo', suma(r.mensualidades.pagos)], ['Meses cobrados en el periodo', r.mensualidades.pagos.length, '0'], ['Voluntarios con deuda (actual)', deudores.length, '0'], ['Deuda total de mensualidades (actual)', deudores.reduce((t, v) => t + v.deuda, 0)]]);

  // Ingresos y egresos
  const ing = hoja(wb, 'Ingresos', 'Ingresos', sub, VERDE);
  tabla(ing, 4, [{ titulo: 'Voucher', ancho: 11 }, { titulo: 'Fecha', ancho: 17 }, { titulo: 'Concepto', ancho: 22 }, { titulo: 'Detalle', ancho: 48 }, { titulo: 'Aportante / voluntario', ancho: 28 }, { titulo: 'Referencia', ancho: 20 }, { titulo: 'Registrado por', ancho: 20 }, { titulo: 'Monto', ancho: 14, formato: BS }],
    ingresos.map(m => [m.comprobante, fecha(m.created_at), m.concepto_nombre, m.detalle, m.beneficiario || '', m.referencia || '', m.registrado_nombre, n(m.monto)]), [8]);
  const egr = hoja(wb, 'Egresos', 'Egresos', sub, ROJO);
  tabla(egr, 4, [{ titulo: 'Voucher', ancho: 11 }, { titulo: 'Fecha', ancho: 17 }, { titulo: 'Concepto', ancho: 22 }, { titulo: 'Detalle', ancho: 48 }, { titulo: 'Beneficiario', ancho: 28 }, { titulo: 'Deuda cubierta', ancho: 24 }, { titulo: 'Referencia', ancho: 20 }, { titulo: 'Registrado por', ancho: 20 }, { titulo: 'Monto', ancho: 14, formato: BS }],
    egresos.map(m => [m.comprobante, fecha(m.created_at), m.concepto_nombre, m.detalle, m.beneficiario || '', m.deuda_acreedor || '', m.referencia || '', m.registrado_nombre, n(m.monto)]), [9]);

  // Por concepto
  const con = hoja(wb, 'Por concepto', 'Totales por concepto', sub);
  const grupos = new Map<string, { tipo: string; concepto: string; cantidad: number; total: number }>();
  for (const m of r.movimientos) {
    const k = `${m.tipo}|${m.concepto_nombre}`, g = grupos.get(k) ?? { tipo: m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso', concepto: m.concepto_nombre, cantidad: 0, total: 0 };
    g.cantidad++; g.total += n(m.monto); grupos.set(k, g);
  }
  const filasConcepto = [...grupos.values()].sort((a, b) => a.tipo.localeCompare(b.tipo) || b.total - a.total);
  let fc = tabla(con, 4, [{ titulo: 'Tipo', ancho: 12 }, { titulo: 'Concepto', ancho: 30 }, { titulo: 'Nº movimientos', ancho: 16, formato: '0' }, { titulo: 'Total', ancho: 16, formato: BS }, { titulo: '% del tipo', ancho: 12, formato: '0.0%' }],
    filasConcepto.map(g => [g.tipo, g.concepto, g.cantidad, g.total, g.total / (g.tipo === 'Ingreso' ? suma(ingresos) : suma(egresos)) || 0]));
  fc += 2;
  for (const [k, v] of [['Total ingresos', suma(ingresos)], ['Total egresos', suma(egresos)]] as const) {
    con.getCell(`B${fc}`).value = k; con.getCell(`D${fc}`).value = v; con.getCell(`D${fc}`).numFmt = BS; con.getRow(fc).font = { bold: true }; fc++;
  }

  // Préstamos y deudas
  const deu = hoja(wb, 'Préstamos y deudas', 'Préstamos y deudas de la institución', `Estado al ${new Date(r.generado).toLocaleDateString('es-BO')} (incluye todas las deudas)`, ORO);
  let fd = tabla(deu, 4, [{ titulo: 'Nº', ancho: 7 }, { titulo: 'Tipo', ancho: 18 }, { titulo: 'Acreedor', ancho: 26 }, { titulo: 'Detalle', ancho: 40 }, { titulo: 'Fecha', ancho: 12, formato: 'dd/mm/yyyy' }, { titulo: 'Vence', ancho: 12, formato: 'dd/mm/yyyy' }, { titulo: 'Monto', ancho: 14, formato: BS }, { titulo: 'Pagado', ancho: 14, formato: BS }, { titulo: 'Saldo', ancho: 14, formato: BS }, { titulo: 'Estado', ancho: 11 }, { titulo: 'Voucher ingreso', ancho: 15 }],
    r.deudas.map(d => [d.id, TIPOS_DEUDA[d.tipo], d.acreedor, d.detalle, fecha(d.fecha), fecha(d.vencimiento), n(d.monto), d.pagado, d.saldo, d.estado === 'pagada' ? 'Pagada' : 'Pendiente', d.ingreso_comprobante ?? '']), [7, 8, 9]);
  fd += 3;
  deu.getCell(`A${fd - 1}`).value = 'Pagos realizados'; deu.getCell(`A${fd - 1}`).font = { bold: true, color: { argb: AZUL } };
  tabla(deu, fd, [{ titulo: 'Deuda', ancho: 0 }, { titulo: 'Acreedor', ancho: 0 }, { titulo: 'Voucher', ancho: 0 }, { titulo: 'Fecha', ancho: 0, formato: FECHA }, { titulo: 'Referencia', ancho: 0 }, { titulo: 'Registrado por', ancho: 0 }, { titulo: 'Monto', ancho: 0, formato: BS }],
    r.deudas.flatMap(d => d.pagos.map(p => [d.id, d.acreedor, p.comprobante, fecha(p.created_at), p.referencia || '', p.registrado_nombre, n(p.monto)])), [7]);

  // Mensualidades: cobros del periodo y estado actual
  const men = hoja(wb, 'Mensualidades', 'Mensualidades cobradas', sub, VERDE);
  tabla(men, 4, [{ titulo: 'Voucher', ancho: 11 }, { titulo: 'Fecha de cobro', ancho: 17 }, { titulo: 'Voluntario', ancho: 32 }, { titulo: 'C.I.', ancho: 14 }, { titulo: 'Mes pagado', ancho: 18 }, { titulo: 'Monto', ancho: 14, formato: BS }],
    r.mensualidades.pagos.map(p => [p.comprobante, fecha(p.created_at), p.voluntario, p.ci ?? '', mes(p.periodo), n(p.monto)]), [6]);
  const est = hoja(wb, 'Estado mensualidades', 'Estado de mensualidades por voluntario', `Activos y pasivos al ${new Date(r.generado).toLocaleDateString('es-BO')}`, ROJO);
  tabla(est, 4, [{ titulo: 'Voluntario', ancho: 32 }, { titulo: 'C.I.', ancho: 14 }, { titulo: 'Estado personal', ancho: 15 }, { titulo: 'Situación', ancho: 12 }, { titulo: 'Meses vencidos', ancho: 15, formato: '0' }, { titulo: 'Deuda', ancho: 14, formato: BS }, { titulo: 'Último mes pagado', ancho: 18 }, { titulo: 'Último voucher', ancho: 14 }],
    [...r.mensualidades.voluntarios].sort((a, b) => b.deuda - a.deuda).map(v => [v.voluntario.nombre, v.voluntario.ci ?? '', ESTADO_PERSONAL[v.voluntario.estado_personal] ?? v.voluntario.estado_personal, v.estado === 'debe' ? 'Con deuda' : 'Al día', v.meses_vencidos, v.deuda, v.ultimo_pago ? mes(v.ultimo_pago.periodo) : 'Sin pagos', v.ultimo_pago?.comprobante ?? '']), [6]);

  return wb;
}

export async function descargarReporteFinanzas(r: ReporteFinanzas) {
  await descargarLibro(await construirReporteFinanzas(r), `finanzas_yunka_atoq_${r.desde ?? 'inicio'}_${r.hasta ?? r.hoy}.xlsx`);
}
