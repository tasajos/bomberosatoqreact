import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

test('aviso de operación por WhatsApp: números bolivianos, enlace y mensaje', async t => {
  const server = await createServer({ server: { middlewareMode: true }, logLevel: 'silent' });
  t.after(() => server.close());
  const { numeroWhatsApp, enlaceWhatsApp, mensajeOperacion } = await server.ssrLoadModule('/src/utils/whatsapp.ts');

  assert.equal(numeroWhatsApp('71234567'), '59171234567');
  assert.equal(numeroWhatsApp('+591 7123-4567'), '59171234567');
  assert.equal(numeroWhatsApp('68503758'), '59168503758');
  assert.equal(numeroWhatsApp('0059171234567'), '59171234567');
  assert.equal(numeroWhatsApp('595981123456'), '595981123456');
  assert.equal(numeroWhatsApp('4401234'), null);
  assert.equal(numeroWhatsApp(''), null);

  const texto = mensajeOperacion({ titulo: 'Incendio forestal en Tunari', tipo: 'nacional', fecha: '2026-10-21T10:00', lugar: 'Parque Tunari',
    duracion_horas: '6', descripcion: 'Liquidación de focos', registrado_por: 'Ana Rojas', participantes: ['Ana Rojas', 'Beto Vera'], puntos: 10, enlace: 'https://sitio/operaciones/validar' });
  assert.match(texto, /Incendio forestal en Tunari/);
  assert.match(texto, /Emergencia nacional · 10 pts por participante/);
  assert.match(texto, /Participantes \(2\): Ana Rojas, Beto Vera/);
  assert.equal(enlaceWhatsApp('Hola & chau', '71234567'), 'https://wa.me/59171234567?text=Hola%20%26%20chau');
  assert.equal(enlaceWhatsApp('Hola'), 'https://wa.me/?text=Hola');
});
