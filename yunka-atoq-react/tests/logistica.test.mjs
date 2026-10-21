import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import ExcelJS from 'exceljs';

test('logística: actas LOG en PDF y reporte Excel', async t => {
  const server = await createServer({ server: { middlewareMode: true }, logLevel: 'silent' });
  t.after(() => server.close());
  const { comprobanteActa } = await server.ssrLoadModule('/src/utils/actaPdf.ts');
  const { generarComprobantePDF } = await server.ssrLoadModule('/src/utils/voucherPdf.ts');
  const { construirReporteLogistica, situacion } = await server.ssrLoadModule('/src/utils/logisticaExcel.ts');

  const base = {
    prestamo_id: 7, registrado_nombre: 'Presidente', equipo_codigo: 'RAD-001', equipo_nombre: 'Radio portátil', equipo_tipo: 'Comunicaciones',
    voluntario: 'Juan Pérez Quispe', voluntario_ci: '1234567 LP', voluntario_grado: 'Bombero', prestamo_motivo: 'Guardia nocturna de fin de semana',
    fecha_devolucion: '2026-10-25T04:00:00.000Z', solicitud_fecha: '2026-10-19T13:00:00.000Z', solicitado_nombre: 'Jefe de Logística',
    autorizado_nombre: 'Presidente', autorizado_at: '2026-10-20T15:00:00.000Z', estado_salida: 'bueno', devuelto_nombre: null, devuelto_at: null,
    estado_devolucion: null, observacion_devolucion: null, acta_entrega: 'LOG004', acta_devolucion: null,
  };
  const actas = {
    entrega: { ...base, codigo: 'LOG004', tipo: 'entrega', fecha: '2026-10-20T15:00:00.000Z', estado_equipo: 'bueno', motivo: base.prestamo_motivo },
    devolucion: { ...base, codigo: 'LOG005', tipo: 'devolucion', fecha: '2026-10-27T15:00:00.000Z', estado_equipo: 'regular', motivo: 'Antena doblada',
      devuelto_nombre: 'Jefe de Logística', devuelto_at: '2026-10-27T15:00:00.000Z', estado_devolucion: 'regular', observacion_devolucion: 'Antena doblada', acta_devolucion: 'LOG005' },
    baja: { ...base, codigo: 'LOG006', tipo: 'baja', fecha: '2026-10-28T15:00:00.000Z', estado_equipo: 'danado', motivo: 'Placa quemada sin reparación', prestamo_id: null, voluntario: null },
  };
  const c = comprobanteActa(actas.entrega);
  assert.equal(c.rotulo, 'Acta'); assert.equal(c.monto, undefined); assert.equal(c.detalle, base.prestamo_motivo);
  assert.deepEqual(c.contenido.autorizaciones.map(a => a.nombre), ['Jefe de Logística', 'Presidente']);
  assert.ok(c.contenido.datos.some(([k, v]) => k === 'Voluntario' && v === 'Juan Pérez Quispe'));
  const dev = comprobanteActa(actas.devolucion).contenido;
  assert.equal(dev.estado, 'DEVUELTO CON RETRASO');
  assert.equal(dev.autorizaciones.length, 3);
  assert.equal(comprobanteActa(actas.baja).contenido.titulo, 'ACTA DE BAJA DE EQUIPO');

  await mkdir(resolve('..', 'output', 'actas'), { recursive: true });
  for (const [nombre, a] of Object.entries(actas)) {
    const doc = await generarComprobantePDF(comprobanteActa(a));
    // Entrega y devolución: original para logística y copia para el voluntario.
    assert.equal(doc.getNumberOfPages(), nombre === 'baja' ? 1 : 2, nombre);
    await writeFile(resolve('..', 'output', 'actas', `acta_${nombre}.pdf`), Buffer.from(doc.output('arraybuffer')));
  }

  const eq = (id, codigo, tipo, estado, extra = {}) => ({ id, codigo, nombre: `Equipo ${id}`, tipo, estado, observaciones: '', prestamo_activo: null, prestamo_estado: null,
    fecha_devolucion: null, asignado_a: null, acta_baja: null, created_at: '2026-10-01T12:00:00Z', ...extra });
  const reporte = {
    generado: '2026-10-21T15:00:00.000Z', hoy: '2026-10-21', desde: null, hasta: null,
    equipos: [eq(1, 'RAD-001', 'Comunicaciones', 'bueno', { prestamo_activo: 7, prestamo_estado: 'autorizado', fecha_devolucion: '2026-10-15T04:00:00.000Z', asignado_a: 'Juan Pérez' }),
      eq(2, 'RAD-002', 'Comunicaciones', 'bueno'), eq(3, 'EPP-001', 'EPP', 'mantenimiento'), eq(4, 'EPP-002', 'EPP', 'baja', { acta_baja: 'LOG006' })],
    prestamos: [{ id: 7, estado: 'autorizado', motivo: 'Guardia', fecha_devolucion: '2026-10-15T04:00:00.000Z', created_at: '2026-10-10T12:00:00Z', autorizado_at: '2026-10-11T12:00:00Z',
      devuelto_at: null, estado_salida: 'bueno', estado_devolucion: null, observacion_devolucion: null, rechazo_motivo: null, equipo_codigo: 'RAD-001', equipo_nombre: 'Equipo 1',
      equipo_tipo: 'Comunicaciones', voluntario: 'Juan Pérez', voluntario_ci: '123', autorizado_nombre: 'Presidente', devuelto_nombre: null, acta_entrega: 'LOG004', acta_devolucion: null }],
    actas: [{ codigo: 'LOG004', tipo: 'entrega', created_at: '2026-10-11T12:00:00Z', estado_equipo: 'bueno', motivo: 'Guardia', equipo_codigo: 'RAD-001', equipo_nombre: 'Equipo 1', equipo_tipo: 'Comunicaciones', registrado_nombre: 'Presidente', voluntario: 'Juan Pérez' },
      { codigo: 'LOG006', tipo: 'baja', created_at: '2026-10-12T12:00:00Z', estado_equipo: 'danado', motivo: 'Rotura', equipo_codigo: 'EPP-002', equipo_nombre: 'Equipo 4', equipo_tipo: 'EPP', registrado_nombre: 'Logística', voluntario: null }],
  };
  assert.deepEqual(reporte.equipos.map(situacion), ['Prestado', 'Disponible', 'No disponible', 'Dado de baja']);
  const wb = await construirReporteLogistica(reporte);
  assert.deepEqual(wb.worksheets.map(w => w.name), ['Resumen', 'Inventario', 'Préstamos', 'Vencidos', 'Actas', 'Por voluntario']);
  const archivo = resolve('..', 'output', 'reporte_logistica_prueba.xlsx');
  await wb.xlsx.writeFile(archivo);
  const leido = new ExcelJS.Workbook();
  await leido.xlsx.readFile(archivo);
  const valores = nombre => leido.getWorksheet(nombre).getSheetValues().filter(Boolean).map(f => f.filter(v => v !== undefined));
  assert.ok(valores('Resumen').some(f => f[0] === 'Equipos en servicio (sin bajas)' && f[1] === 3));
  assert.ok(valores('Resumen').some(f => f[0] === 'Préstamos vencidos sin devolver' && f[1] === 1));
  assert.ok(valores('Resumen').some(f => f[0] === 'EPP' && f[1] === 2));
  assert.ok(valores('Vencidos').some(f => f[0] === 'RAD-001' && f.includes(6)));
  assert.equal(valores('Actas').filter(f => /^LOG/.test(f[0])).length, 2);
  assert.ok(valores('Por voluntario').some(f => f[0] === 'Juan Pérez' && f[1] === 1));
});
