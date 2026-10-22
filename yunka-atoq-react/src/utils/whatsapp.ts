/** Número en formato internacional para WhatsApp (Bolivia por defecto: 8 dígitos → 591XXXXXXXX). */
export function numeroWhatsApp(telefono: string | null | undefined): string | null {
  const digitos = String(telefono ?? '').replace(/\D/g, '').replace(/^00/, '');
  if (/^[67]\d{7}$/.test(digitos)) return `591${digitos}`;
  if (/^591[67]\d{7}$/.test(digitos)) return digitos;
  return digitos.length >= 10 ? digitos : null; // otro país con código incluido
}

/** Enlace click-to-chat: con número abre el chat de esa persona; sin número, permite elegir chat o grupo. */
export function enlaceWhatsApp(texto: string, telefono?: string | null): string {
  const numero = numeroWhatsApp(telefono);
  return `https://wa.me/${numero ?? ''}?text=${encodeURIComponent(texto)}`;
}

export interface OperacionAviso {
  titulo: string; tipo: string; fecha: string; lugar?: string; duracion_horas?: string | number; descripcion?: string;
  registrado_por: string; participantes: string[]; puntos: number; enlace: string;
}
const TIPOS: Record<string, string> = { local: 'Local', nacional: 'Emergencia nacional', internacional: 'Emergencia internacional' };

/** Mensaje de aviso de una operación pendiente de aprobación. */
export function mensajeOperacion(o: OperacionAviso): string {
  const fecha = o.fecha ? new Date(o.fecha).toLocaleString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  return [
    '🚒 *Yunka Atoq · Operación registrada (pendiente de aprobación)*',
    `*${o.titulo}*`,
    `Tipo: ${TIPOS[o.tipo] ?? o.tipo} · ${o.puntos} pts por participante (RO-001/25)`,
    fecha && `Fecha: ${fecha}`,
    o.lugar && `Lugar: ${o.lugar}`,
    o.duracion_horas && `Duración: ${o.duracion_horas} h`,
    `Registró: ${o.registrado_por}`,
    `Participantes (${o.participantes.length}): ${o.participantes.join(', ')}`,
    o.descripcion && `Actividades: ${o.descripcion}`,
    `Aprobar en el sistema: ${o.enlace}`,
  ].filter(Boolean).join('\n');
}
