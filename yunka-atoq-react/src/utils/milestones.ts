import type { Milestone } from '../services/api';

const months: Record<string, number> = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12 };

// Las fechas del administrador son etiquetas libres, no fechas de creación.
function milestoneDate(label: string) {
  const text = label.toLowerCase().split('·')[0].trim();
  const year = Number(text.match(/\b(?:19|20)\d{2}\b/)?.[0]) || 0;
  const iso = text.match(/\b((?:19|20)\d{2})-(\d{1,2})-(\d{1,2})\b/);
  const numeric = text.match(/\b(\d{1,2})[/-](\d{1,2})[/-]((?:19|20)\d{2})\b/);
  const spanish = text.match(/(?:(\d{1,2})\s+(?:de\s+)?)?([a-z]+)\.?\s+(?:de\s+)?((?:19|20)\d{2})\b/);
  const month = iso ? Number(iso[2]) : numeric ? Number(numeric[2]) : spanish ? months[spanish[2].slice(0, 3)] || 0 : 0;
  const day = iso ? Number(iso[3]) : numeric ? Number(numeric[1]) : spanish ? Number(spanish[1]) || 0 : 0;
  return { year, key: year * 10000 + month * 100 + day };
}

export function groupMilestones(items: Milestone[]) {
  const sorted = items.map(item => ({ item, date: milestoneDate(item.fecha_label) }))
    .sort((a, b) => b.date.key - a.date.key || b.item.orden - a.item.orden || b.item.id - a.item.id);
  const groups = new Map<string, Milestone[]>();
  for (const { item, date } of sorted) {
    const year = date.year ? String(date.year) : 'Sin fecha';
    const group = groups.get(year) ?? [];
    group.push(item);
    groups.set(year, group);
  }
  return Array.from(groups, ([year, milestones]) => ({ year, items: milestones }));
}
