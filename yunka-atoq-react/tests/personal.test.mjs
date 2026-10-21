import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import ExcelJS from 'exceljs';

test('personal: memorándum de llamada, lista de asistencia y reporte Excel', async t => {
  const server = await createServer({ server: { middlewareMode: true }, logLevel: 'silent' });
  t.after(() => server.close());
  const { comprobanteLlamada, generarListaAsistenciaPDF } = await server.ssrLoadModule('/src/utils/personalPdf.ts');
  const { generarComprobantePDF } = await server.ssrLoadModule('/src/utils/voucherPdf.ts');
  const { construirReporteAsistencia } = await server.ssrLoadModule('/src/utils/personalExcel.ts');
  await mkdir(resolve('..', 'output', 'personal'), { recursive: true });

  const llamada = { id: 1, codigo: 'LLA001', voluntario_id: 5, tipo: 'escrita', gravedad: 'grave', motivo: 'Inasistencia a guardia sin aviso',
    descripcion: 'El voluntario no se presentó a la guardia nocturna asignada ni comunicó su ausencia.', fecha: '2026-10-05', puntos: 5,
    registrado_nombre: 'Jefe de Personal', created_at: '2026-10-06T14:00:00.000Z', persona: 'Juan Pérez Quispe', matricula: 'VR-004', grado: 'Bombero', carnet_identidad: '1234567' };
  const c = comprobanteLlamada(llamada);
  assert.equal(c.rotulo, 'Memorándum'); assert.equal(c.contenido.estado, 'FALTA GRAVE'); assert.equal(c.contenido.tono, 'baja');
  assert.ok(c.contenido.datos.some(([k, v]) => k === 'Puntos descontados' && v === '-5 pts'));
  const citada = comprobanteLlamada({ ...llamada, reglamento_codigo: 'RO-001/25', reglamento_descripcion: 'Memorándum en contra', reglamento_sancion: 'Amonestación escrita' });
  assert.ok(citada.contenido.datos.some(([k, v]) => k === 'Falta según reglamento' && v === 'RO-001/25 · Memorándum en contra'));
  assert.ok(citada.contenido.datos.some(([k, v]) => k === 'Sanción prevista' && v === 'Amonestación escrita'));
  const memo = await generarComprobantePDF(citada);
  assert.equal(memo.getNumberOfPages(), 2);
  await writeFile(resolve('..', 'output', 'personal', 'llamada_LLA001.pdf'), Buffer.from(memo.output('arraybuffer')));

  const registros = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, voluntario_id: i + 1, estado: ['presente', 'presente', 'tarde', 'falta', 'permiso', 'comision'][i % 6],
    observacion: i % 6 === 4 ? 'Certificado médico' : null, created_at: '2026-10-21T13:00:00Z', registrado_nombre: 'Jefe de Personal',
    nombre_completo: `Voluntario ${i + 1} Apellido`, matricula: `VR-${String(i + 1).padStart(3, '0')}`, grado: 'Bombero' }));
  const lista = await generarListaAsistenciaPDF({ fecha: '2026-10-21', personal: [], registros }, 'Jefe de Personal');
  assert.equal(lista.getNumberOfPages(), 1);
  await writeFile(resolve('..', 'output', 'personal', 'lista_asistencia.pdf'), Buffer.from(lista.output('arraybuffer')));

  const cero = { presente: 0, tarde: 0, falta: 0, permiso: 0, comision: 0 };
  const wb = await construirReporteAsistencia({ desde: '2026-10-01', hasta: '2026-10-21',
    personas: [{ voluntario_id: 1, nombre_completo: 'Ana Rojas', matricula: 'VF-001', grado: null, estado_personal: 'activo', ...cero, presente: 3, falta: 1, porcentaje: 75 },
      { voluntario_id: 2, nombre_completo: 'Beto Vera', matricula: 'VR-002', grado: null, estado_personal: 'activo', ...cero, presente: 1, falta: 3, porcentaje: 25 }],
    dias: [{ fecha: '2026-10-07', ...cero, presente: 2, porcentaje: 100 }], detalle: [{ fecha: '2026-10-07', estado: 'presente', observacion: null, voluntario_id: 1, nombre_completo: 'Ana Rojas', matricula: 'VF-001', grado: null }] });
  assert.deepEqual(wb.worksheets.map(w => w.name), ['Por persona', 'Por día', 'Detalle', 'Bajo 75%']);
  const archivo = resolve('..', 'output', 'personal', 'reporte_asistencia.xlsx');
  await wb.xlsx.writeFile(archivo);
  const leido = new ExcelJS.Workbook(); await leido.xlsx.readFile(archivo);
  const bajo = leido.getWorksheet('Bajo 75%').getSheetValues().filter(Boolean).map(f => f.filter(v => v !== undefined));
  assert.ok(bajo.some(f => f[1] === 'Beto Vera' && f[3] === 25)); assert.ok(!bajo.some(f => f[1] === 'Ana Rojas'));
});
