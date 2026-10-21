import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const milestone = (id, fecha_label, orden = id) => ({ id, fecha_label, orden, titulo: `Hito ${id}`, descripcion: null, created_at: '2026-10-20' });

test('historia: agrupa por año y ordena por fecha del hito, no por fecha de creación ni orden editorial', async t => {
  const server = await createServer({ server: { middlewareMode: true }, logLevel: 'silent' });
  t.after(() => server.close());
  const { groupMilestones } = await server.ssrLoadModule('/src/utils/milestones.ts');
  const items = [
    milestone(1, '2023 · Nacimiento'),
    milestone(2, '18 Abr 2025 · Muro de la Voluntad', 100),
    milestone(3, '18 de Julio de 2025 · Personería Jurídica'),
    milestone(4, '11 Jul 2025 · Asamblea Legislativa'),
    milestone(5, '18 Dic 2024 · Reconocimiento UCB'),
    milestone(6, '20 Sep 2024 · Beni'),
    milestone(7, '2023 · Primer apoyo oficial'),
  ];
  const before = structuredClone(items);
  const groups = groupMilestones(items);
  assert.deepEqual(groups.map(g => g.year), ['2025', '2024', '2023']);
  assert.deepEqual(groups.flatMap(g => g.items.map(m => m.id)), [3, 4, 2, 5, 6, 7, 1]);
  assert.deepEqual(items, before);
});

test('historia: admite fechas numéricas, empates, meses completos y etiquetas sin fecha', async t => {
  const server = await createServer({ server: { middlewareMode: true }, logLevel: 'silent' });
  t.after(() => server.close());
  const { groupMilestones } = await server.ssrLoadModule('/src/utils/milestones.ts');
  const groups = groupMilestones([
    milestone(1, 'Sin fecha'),
    milestone(2, '2025-10-20'),
    milestone(3, '21/10/2025'),
    milestone(4, 'Septiembre de 2025'),
    milestone(5, '5 de Agosto 2023'),
    milestone(6, '21/10/2025'),
    milestone(7, '2025'),
  ]);
  assert.deepEqual(groups.map(g => g.year), ['2025', '2023', 'Sin fecha']);
  assert.deepEqual(groups.flatMap(g => g.items.map(m => m.id)), [6, 3, 2, 4, 7, 5, 1]);
  assert.deepEqual(groupMilestones([]), []);
});
