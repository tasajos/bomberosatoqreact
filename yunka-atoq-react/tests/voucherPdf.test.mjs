import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'vite';

test('vouchers de finanzas: monto literal, autorizaciones y PDF', async t => {
  const server = await createServer({ server: { middlewareMode: true }, logLevel: 'silent' });
  t.after(() => server.close());
  const { montoEnLetras, contenidoVoucher, generarVoucherPDF } = await server.ssrLoadModule('/src/utils/voucherPdf.ts');

  assert.equal(montoEnLetras('150.00'), 'CIENTO CINCUENTA 00/100 BOLIVIANOS');
  assert.equal(montoEnLetras('1.5'), 'UNO 50/100 BOLIVIANOS');
  assert.equal(montoEnLetras('100'), 'CIEN 00/100 BOLIVIANOS');
  assert.equal(montoEnLetras('21000.05'), 'VEINTIÚN MIL 05/100 BOLIVIANOS');
  assert.equal(montoEnLetras('1999.99'), 'MIL NOVECIENTOS NOVENTA Y NUEVE 99/100 BOLIVIANOS');
  assert.equal(montoEnLetras('2501000'), 'DOS MILLONES QUINIENTOS UN MIL 00/100 BOLIVIANOS');
  assert.equal(montoEnLetras('1000000'), 'UN MILLÓN 00/100 BOLIVIANOS');

  const egreso = {
    codigo: 'FIN005', clase: 'egreso', monto: '150.00', detalle: 'Pasajes y viáticos para el curso de rescate vehicular en Cochabamba.',
    fecha: '2026-10-21T15:30:00.000Z', registrado_nombre: 'Jefa de Finanzas', referencia: 'Transferencia 001',
    solicitud_id: 7, concepto: 'viaje', solicitud_fecha: '2026-10-19T13:00:00.000Z',
    beneficiario: 'Juan Pérez Quispe', beneficiario_ci: '1234567 LP', beneficiario_grado: 'Bombero',
    finanzas_nombre: 'Ana Rojas', finanzas_fecha: '2026-10-20T14:00:00.000Z', presidencia_nombre: 'Carlos Mendoza', presidencia_fecha: '2026-10-21T12:00:00.000Z',
  };
  const c = contenidoVoucher(egreso);
  assert.deepEqual(c.autorizaciones.map(a => a.nombre), ['Ana Rojas', 'Carlos Mendoza', 'Jefa de Finanzas']);
  assert.ok(c.datos.some(([k, v]) => k === 'Voluntario beneficiario' && v === 'Juan Pérez Quispe'));
  assert.equal(c.motivoTitulo, 'Motivo de la solicitud');
  assert.deepEqual(contenidoVoucher({ codigo: 'FIN010', clase: 'ingreso', monto: '20', detalle: '', fecha: '2026-10-21', registrado_nombre: 'F', periodos: [{ periodo: '2026-09', monto: '20.00' }] }).copias, ['ORIGINAL · FINANZAS', 'COPIA · VOLUNTARIO']);

  const casos = {
    egreso,
    ingreso: { codigo: 'FIN001', clase: 'ingreso', monto: '1000.00', detalle: 'Saldo inicial de caja', fecha: '2026-10-01T12:00:00.000Z', registrado_nombre: 'Jefa de Finanzas', referencia: 'Acta 01', solicitud_id: null },
    reserva: { codigo: 'FIN003', clase: 'reserva', monto: '300.00', detalle: 'Ahorro para el vehículo de rescate', fecha: '2026-10-02T12:00:00.000Z', registrado_nombre: 'Jefa de Finanzas',
      destino: 'vehiculo', destino_nombre: 'Compra de vehículo', estado: 'liberada', liberada_at: '2026-10-10T12:00:00.000Z', liberada_motivo: 'Reprogramación', liberada_nombre: 'Jefa de Finanzas' },
    mensualidad: { codigo: 'FIN010', clase: 'ingreso', monto: '40.00', detalle: 'Mensualidades septiembre 2026 y octubre 2026 · Juan Pérez Quispe', fecha: '2026-10-21T15:00:00.000Z',
      registrado_nombre: 'Jefa de Finanzas', referencia: 'Efectivo', solicitud_id: null, beneficiario: 'Juan Pérez Quispe', beneficiario_ci: '1234567 LP',
      periodos: [{ periodo: '2026-09', monto: '20.00' }, { periodo: '2026-10', monto: '20.00' }] },
  };
  await mkdir(resolve('..', 'output', 'vouchers'), { recursive: true });
  for (const [nombre, v] of Object.entries(casos)) {
    const doc = await generarVoucherPDF(v);
    // La mensualidad lleva original para finanzas y copia para el voluntario.
    assert.equal(doc.getNumberOfPages(), nombre === 'mensualidad' ? 2 : 1, `páginas de ${nombre}`);
    const bytes = Buffer.from(doc.output('arraybuffer'));
    assert.ok(bytes.subarray(0, 5).toString() === '%PDF-');
    await writeFile(resolve('..', 'output', 'vouchers', `voucher_${nombre}.pdf`), bytes);
  }
});
