import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { contenidoModulo } from '../scripts/generar-migraciones.js';
import { SQL } from '../services/migracionesSql.js';

test('el SQL incrustado coincide con los .sql (ejecute npm run sql:generar si falla)', async () => {
  const actual = await readFile(new URL('../services/migracionesSql.js', import.meta.url), 'utf8');
  assert.equal(actual, await contenidoModulo());
});

test('cada script que el backend aplica al iniciar está incluido en el código', async () => {
  const usados = new Set();
  for (const archivo of ['../services/gestion.js', '../services/credenciales.js']) {
    const fuente = await readFile(new URL(archivo, import.meta.url), 'utf8');
    for (const m of fuente.matchAll(/'(\d\d_[a-z_]+\.sql)'/g)) usados.add(m[1]);
  }
  assert.ok(usados.size >= 10);
  for (const nombre of usados) assert.ok(SQL[nombre], `Falta ${nombre} en services/migracionesSql.js`);
});
