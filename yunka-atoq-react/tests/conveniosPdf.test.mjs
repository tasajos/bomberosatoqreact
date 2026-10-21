import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'vite';

test('convenios: cláusulas según la estructura de referencia, tiempos y PDF', async t => {
  const server = await createServer({ server: { middlewareMode: true }, logLevel: 'silent' });
  t.after(() => server.close());
  const { componerConvenioPDF, clausulasConvenio, plantillaConvenio, venceConvenio, cifra } = await server.ssrLoadModule('/src/utils/conveniosPdf.ts');
  const { CABECERA_POR_DEFECTO } = await server.ssrLoadModule('/src/utils/documentosPdf.ts');
  const logo = `data:image/png;base64,${(await readFile('public/yunka_atoq_transparente.png')).toString('base64')}`;

  const contenido = plantillaConvenio('cbvp');
  contenido.contraparte.representante = 'Nombre del Comandante';
  contenido.objetivos = ['Capacitar a 40 voluntarios en combate de incendios forestales.', 'Implementar el SCI en operaciones conjuntas.'];
  const documento = { id: 1, tipo: 'convenio', numero: 1, anio: 2026, codigo_completo: 'CONV N° 001/2026', titulo: 'Convenio CBVP', fecha: '2026-10-21',
    contenido, firmante_nombre: 'Carlos Azcarraga Esquivel', firmante_cargo: 'Presidente de la Fundación', voluntarios: [] };

  assert.equal(cifra(3), 'tres (3)'); assert.equal(cifra(30), 'treinta (30)');
  assert.equal(venceConvenio('2026-10-21', 3), '2029-10-21');
  const clausulas = clausulasConvenio(documento, CABECERA_POR_DEFECTO);
  assert.deepEqual(clausulas.map(c => c.titulo), [
    'PRIMERA – OBJETO DEL CONVENIO', 'SEGUNDA – OBJETIVOS ESPECÍFICOS', 'TERCERA – COMPROMISOS DE CBVP', 'CUARTA – COMPROMISOS DE YUNKA ATOQ',
    'QUINTA – MECANISMOS DE COORDINACIÓN', 'SEXTA – VIGENCIA', 'SÉPTIMA – FINANCIAMIENTO', 'OCTAVA – MODIFICACIONES Y RESOLUCIÓN',
    'NOVENA – CLÁUSULA DE FRATERNIDAD', 'DÉCIMA – FIRMA Y RATIFICACIÓN']);
  assert.match(clausulas[5].bloques[0].texto, /tres \(3\) años.*renovarse automáticamente/);
  assert.match(clausulas[7].bloques[1].texto, /treinta \(30\) días/);
  assert.match(clausulas.at(-1).bloques[0].texto, /Cochabamba, Bolivia, a los 21 días del mes de octubre del año 2026/);
  // Sin objetivos ni cláusulas adicionales la numeración se recorre.
  const minimo = clausulasConvenio({ ...documento, contenido: { ...contenido, objetivos: [], clausulas: [] } }, CABECERA_POR_DEFECTO);
  assert.equal(minimo[1].titulo, 'SEGUNDA – COMPROMISOS DE CBVP');

  await mkdir(resolve('..', 'output', 'convenios'), { recursive: true });
  const pdf = componerConvenioPDF(documento, { cabecera: CABECERA_POR_DEFECTO, logo });
  assert.ok(pdf.getNumberOfPages() >= 3);
  await writeFile(resolve('..', 'output', 'convenios', 'convenio_cbvp.pdf'), Buffer.from(pdf.output('arraybuffer')));
  const borrador = componerConvenioPDF(documento, { cabecera: CABECERA_POR_DEFECTO, logo }, true);
  await writeFile(resolve('..', 'output', 'convenios', 'convenio_borrador.pdf'), Buffer.from(borrador.output('arraybuffer')));
});
