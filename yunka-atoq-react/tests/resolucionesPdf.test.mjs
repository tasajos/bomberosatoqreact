import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import { jsPDF } from 'jspdf';

test('resoluciones: membrete, contenido completo, paginación y bloque de firma', async t => {
  const server = await createServer({ server: { middlewareMode: true }, logLevel: 'silent' });
  t.after(() => server.close());
  const { componerResolucionPDF } = await server.ssrLoadModule('/src/utils/resolucionesPdf.ts');
  const { CABECERA_POR_DEFECTO } = await server.ssrLoadModule('/src/utils/documentosPdf.ts');
  const logo = `data:image/png;base64,${(await readFile('public/yunka_atoq_transparente.png')).toString('base64')}`;
  const oba = `data:image/png;base64,${(await readFile('public/oba_logo.png')).toString('base64')}`;
  const documento = {
    tipo: 'resolucion', numero: 12, anio: 2026, codigo_completo: '012/2026',
    titulo: 'Aprobación del programa de formación y capacitación institucional', fecha: '2026-10-20',
    firmante_nombre: 'Nombre de la autoridad firmante', firmante_cargo: 'PRESIDENTE\nFundación Yunka Atoq', voluntarios: [],
    contenido: {
      vistos: 'El programa de formación presentado a la Presidencia y los antecedentes relativos al fortalecimiento de las capacidades del personal voluntario de la institución.',
      considerandos: [
        'la formación continua constituye un componente esencial para brindar una respuesta oportuna, segura y eficiente al servicio de la comunidad.',
        'corresponde establecer las condiciones de organización y seguimiento de las actividades de capacitación, en concordancia con los objetivos institucionales.',
      ],
      articulos: [
        { numero: 1, titulo: 'Aprobación', texto: 'Aprobar el programa de formación y capacitación institucional, orientado al desarrollo de competencias técnicas y al fortalecimiento del servicio voluntario.' },
        { numero: 2, titulo: 'Coordinación y ejecución', texto: 'Encomendar a los responsables de capacitación la coordinación del calendario, la designación de instructores y la preparación de los recursos necesarios para su ejecución.' },
        { numero: 3, titulo: 'Seguimiento', texto: 'Disponer el registro de asistencia y de los resultados de evaluación, así como la presentación de un informe de cumplimiento al concluir cada actividad.' },
      ],
    },
  };
  let registros;
  const hook = ['initialized', function () {
    registros = [];
    const original = this.text;
    this.text = function (texto, x, y, opciones) {
      registros.push({ texto: Array.isArray(texto) ? texto.join('\n') : texto, x, y, pagina: this.getNumberOfPages() });
      return original.call(this, texto, x, y, opciones);
    };
  }];
  jsPDF.API.events.push(hook);
  t.after(() => jsPDF.API.events.splice(jsPDF.API.events.indexOf(hook), 1));
  let grados = 0;
  const recursos = {
    cabecera: CABECERA_POR_DEFECTO, logo, oba, fecha: '20 de Octubre de 2026',
    dibujarGrados: async (doc, y, actual, nuevo) => {
      assert.ok(y + 50 <= 267, 'Las insignias deben caber completas');
      assert.equal(actual, 'bombero'); assert.equal(nuevo, 'cabo'); grados++;
      doc.text('INSIGNIAS DE ASCENSO', 105, y + 15, { align: 'center' });
      return y + 46;
    },
  };
  const muestra = await componerResolucionPDF(documento, recursos);
  assert.equal(muestra.getNumberOfPages(), 1, 'Una resolución breve incluye la firma en la misma página');
  assert.ok(muestra.output('arraybuffer').byteLength < 2_000_000);
  assert.ok(registros.some(r => r.texto.includes(documento.titulo)));
  assert.ok(registros.some(r => r.texto === 'Nro. 012/2026'));
  assert.ok(registros.some(r => r.texto === 'Página 1 de 1'));
  const subtitulo = registros.find(r => r.texto === 'BOMBEROS VOLUNTARIOS');
  const nombreInstitucion = registros.find(r => r.texto === 'YUNKA ATOQ');
  assert.ok(nombreInstitucion.y - subtitulo.y > 5, 'El nombre y el subtítulo del membrete no deben superponerse');

  const extensa = structuredClone(documento);
  extensa.contenido.vistos += '\n\nSegundo párrafo independiente de los antecedentes.';
  extensa.contenido.considerandos = Array.from({ length: 24 }, (_, i) => `ANTECEDENTE-${i + 1}: ${documento.contenido.considerandos[i % 2]}`);
  extensa.contenido.articulos[0].texto += `\n${'TEXTOEXTENSOSINESPACIOS'.repeat(20)}\nFin del texto extenso.`;
  extensa.contenido.gradoActual = 'bombero'; extensa.contenido.gradoNuevo = 'cabo';
  extensa.voluntarios = Array.from({ length: 15 }, (_, i) => ({ nombre: `VOLUNTARIO-${i + 1}`, rol: 'Responsable' }));
  const largo = await componerResolucionPDF(extensa, recursos);
  const trazasLargas = registros;
  const texto = trazasLargas.map(r => r.texto).join('\n');
  assert.ok(largo.getNumberOfPages() >= 3);
  for (let i = 1; i <= 24; i++) assert.ok(texto.includes(`ANTECEDENTE-${i}:`));
  for (let i = 1; i <= 15; i++) assert.ok(texto.includes(`VOLUNTARIO-${i}`));
  assert.ok(texto.includes('Segundo párrafo independiente'));
  assert.ok(texto.includes('Fin del texto extenso.'));
  assert.equal(grados, 1);
  const cierre = trazasLargas.find(r => r.texto.startsWith('Regístrese'));
  const firma = trazasLargas.find(r => r.texto === documento.firmante_nombre);
  assert.equal(cierre.pagina, firma.pagina, 'La firma acompaña a la fórmula de cierre');
  for (const r of trazasLargas) {
    if (r.y > 30 && r.y < 277) assert.ok(r.y <= 267, `Texto invade el pie: ${r.texto}`);
  }
  for (let pagina = 1; pagina <= largo.getNumberOfPages(); pagina++) {
    assert.ok(texto.includes(`Página ${pagina} de ${largo.getNumberOfPages()}`));
    if (pagina > 1) assert.ok(trazasLargas.some(r => r.pagina === pagina && r.texto === 'Resolución Jefatural Nro. 012/2026'));
  }
  const sinMembresia = structuredClone(CABECERA_POR_DEFECTO);
  sinMembresia.nombre = 'Fundación de prueba'; sinMembresia.membresia.mostrar = false;
  await componerResolucionPDF(documento, { ...recursos, cabecera: sinMembresia });
  assert.ok(registros.some(r => r.texto === 'FUNDACIÓN DE PRUEBA'));
  assert.ok(!registros.some(r => r.texto.includes('AMERICANOS')));

  if (process.env.RESOLUCIONES_PREVIEW_DIR) {
    const destino = resolve(process.env.RESOLUCIONES_PREVIEW_DIR);
    await mkdir(destino, { recursive: true });
    await writeFile(resolve(destino, 'resolucion-profesional.pdf'), Buffer.from(muestra.output('arraybuffer')));
    await writeFile(resolve(destino, 'resolucion-extensa.pdf'), Buffer.from(largo.output('arraybuffer')));
  }
});
