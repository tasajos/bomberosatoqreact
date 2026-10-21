import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import ExcelJS from 'exceljs';

test('reporte financiero Excel: hojas, totales por concepto, deudas y mensualidades', async t => {
  const server = await createServer({ server: { middlewareMode: true }, logLevel: 'silent' });
  t.after(() => server.close());
  const { construirReporteFinanzas } = await server.ssrLoadModule('/src/utils/finanzasExcel.ts');
  const { contenidoVoucher } = await server.ssrLoadModule('/src/utils/voucherPdf.ts');

  const mov = (id, tipo, concepto_nombre, monto, extra = {}) => ({ id, comprobante: `FIN00${id}`, tipo, concepto: null, concepto_nombre, monto, detalle: `Movimiento ${id}`,
    referencia: '', created_at: `2026-10-0${id}T14:00:00.000Z`, solicitud_id: null, registrado_nombre: 'Finanzas', beneficiario: '', deuda_acreedor: null, ...extra });
  const reporte = {
    generado: '2026-10-21T15:00:00.000Z', hoy: '2026-10-21', desde: '2026-10-01', hasta: '2026-10-31',
    resumen: { saldo: 660, ingresos: 1060, egresos: 400, reservado: 100, comprometido: 0, disponible: 560 },
    conceptos: [],
    movimientos: [
      mov(1, 'ingreso', 'Donación', '500.00'), mov(2, 'ingreso', 'Mensualidades', '60.00', { beneficiario: 'Juan Pérez' }),
      mov(3, 'ingreso', 'Préstamo recibido', '500.00'), mov(4, 'egreso', 'Pago de deuda', '300.00', { deuda_acreedor: 'Taller Sur' }),
      mov(5, 'egreso', 'Combustible', '100.00'),
    ],
    deudas: [{ id: 1, tipo: 'proveedor', acreedor: 'Taller Sur', detalle: 'Reparación', monto: '500.00', fecha: '2026-10-01', vencimiento: null, ingreso_comprobante: null,
      creado_nombre: 'Finanzas', created_at: '2026-10-01T12:00:00Z', pagado: 300, saldo: 200, estado: 'pendiente',
      pagos: [{ id: 4, comprobante: 'FIN004', monto: '300.00', referencia: '', created_at: '2026-10-04T14:00:00Z', registrado_nombre: 'Finanzas' }] }],
    mensualidades: {
      pagos: [{ periodo: '2026-09', monto: '30.00', comprobante: 'FIN002', created_at: '2026-10-02T14:00:00Z', voluntario: 'Juan Pérez', ci: '123' },
        { periodo: '2026-10', monto: '30.00', comprobante: 'FIN002', created_at: '2026-10-02T14:00:00Z', voluntario: 'Juan Pérez', ci: '123' }],
      voluntarios: [{ voluntario: { id: 9, nombre: 'Ana Rojas', ci: null, grado: null, email: '', estado_personal: 'pasiva', cobrable: true },
        configuracion: { inicio: null }, inicio: '2026-08', estado: 'debe', meses_vencidos: 2, deuda: 60, mes_actual: null, ultimo_pago: null, exenciones: [] }],
    },
  };
  const wb = await construirReporteFinanzas(reporte);
  assert.deepEqual(wb.worksheets.map(w => w.name), ['Resumen', 'Ingresos', 'Egresos', 'Por concepto', 'Préstamos y deudas', 'Mensualidades', 'Estado mensualidades']);

  // Ida y vuelta por el formato xlsx para validar el archivo real.
  await mkdir(resolve('..', 'output'), { recursive: true });
  const archivo = resolve('..', 'output', 'reporte_finanzas_prueba.xlsx');
  await wb.xlsx.writeFile(archivo);
  const leido = new ExcelJS.Workbook();
  await leido.xlsx.readFile(archivo);
  const valores = nombre => leido.getWorksheet(nombre).getSheetValues().filter(Boolean).map(f => f.filter(v => v !== undefined));
  const resumen = valores('Resumen');
  assert.ok(resumen.some(f => f[0] === 'Total ingresos' && f[1] === 1060));
  assert.ok(resumen.some(f => f[0] === 'Total egresos' && f[1] === 400));
  assert.ok(resumen.some(f => f[0] === 'Saldo total por pagar' && f[1] === 200));
  assert.ok(resumen.some(f => f[0] === 'Deuda total de mensualidades (actual)' && f[1] === 60));
  const conceptos = valores('Por concepto');
  assert.ok(conceptos.some(f => f[0] === 'Egreso' && f[1] === 'Pago de deuda' && f[2] === 1 && f[3] === 300));
  assert.ok(conceptos.some(f => f[0] === 'Ingreso' && f[1] === 'Donación' && f[3] === 500));
  assert.equal(valores('Ingresos').filter(f => /^FIN/.test(f[0])).length, 3);
  assert.ok(valores('Egresos').some(f => f[0] === 'FIN004' && f.includes('Taller Sur')));
  assert.ok(valores('Préstamos y deudas').some(f => f[2] === 'Taller Sur' && f.includes(200) && f.includes('Pendiente')));
  assert.equal(valores('Mensualidades').filter(f => f[0] === 'FIN002').length, 2);
  assert.ok(valores('Estado mensualidades').some(f => f[0] === 'Ana Rojas' && f.includes('Pasivo') && f.includes('Con deuda')));

  // Voucher de abono a deuda: saldo antes y después del pago.
  const c = contenidoVoucher({ codigo: 'FIN004', clase: 'egreso', monto: '300.00', detalle: 'Abono', fecha: '2026-10-04T14:00:00Z', registrado_nombre: 'Finanzas',
    solicitud_id: null, concepto_nombre: 'Pago de deuda', deuda_id: 1, deuda_acreedor: 'Taller Sur', deuda_monto: '500.00', deuda_pagado_antes: '0' });
  assert.equal(c.estado, 'ABONO REGISTRADO');
  assert.match(c.datos.find(([k]) => k === 'Falta por pagar tras este pago')[1], /^Bs\s200,00$/);
});
