import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'vite';

test('procedimientos: tablas y textos dentro del margen, caracteres no representables sustituidos', async t => {
  const server = await createServer({ server: { middlewareMode: true }, logLevel: 'silent' });
  t.after(() => server.close());
  const { generarPasosPDF, textoPdf } = await server.ssrLoadModule('/src/utils/documentosPdf.ts');

  assert.equal(textoPdf('el Voluntario solicita → el Director aprueba ⇒ Finanzas'), 'el Voluntario solicita -> el Director aprueba -> Finanzas');
  assert.equal(textoPdf('≥ 48 h – “plazo” • ✓ listo 🚒'), '>= 48 h – “plazo” • (v) listo ');

  const largo = 'Finanzas verifica que la solicitud cuente con la aprobación del Director, la disponibilidad de fondos en la cuenta de la Fundación y la correcta asignación del gasto. Puede aprobar el monto total o parcial, observar o rechazar, registrando su decisión en el sistema. Una vez aprobada por Finanzas, la solicitud queda autorizada para la entrega de fondos.';
  const documento = {
    id: 2, tipo: 'procedimiento', numero: 2, anio: 2026, codigo_completo: 'PROC N° 002/2026', fecha: '2026-10-21',
    titulo: 'Solicitud de Apoyo Económico para Apoyos y Operaciones (PRO-FIN-001)',
    contenido: {
      objetivo: largo, alcance: `${largo}\nFlujo en el sistema:\n1) el Voluntario solicita\n2) el Director aprueba\n3) Finanzas aprueba`,
      pasos: Array.from({ length: 12 }, (_, i) => ({ numero: i + 1, titulo: `ANTES – Paso número ${i + 1} con un título largo de varias palabras`,
        descripcion: i === 9 ? `${largo} Flujo: el Voluntario solicita → el Director aprueba → Finanzas aprueba.` : largo })),
    },
    firmante_nombre: 'Cap. Director. Carlos Andres Azcarraga Esquivel', firmante_cargo: 'PRESIDENTE DE LA FUNDACIÓN\nREPRESENTANTE LEGAL\nYUNKA ATOQ',
    voluntarios: [{ voluntario_id: 1, rol: null, nombre: 'Karylia Guerrero', matricula: 'VR-019', codigo: 'VR', especialidad: 'Soporte Vital', cargo_directiva: '' }],
  };
  const doc = await generarPasosPDF(documento);
  // Ningún elemento de las tablas puede pasar del margen derecho (195 mm).
  const anchoPagina = doc.internal.pageSize.getWidth();
  assert.equal(Math.round(anchoPagina), 210);
  assert.ok(doc.getNumberOfPages() >= 2);
  await mkdir(resolve('..', 'output', 'procedimientos'), { recursive: true });
  await writeFile(resolve('..', 'output', 'procedimientos', 'procedimiento_prueba.pdf'), Buffer.from(doc.output('arraybuffer')));
});
