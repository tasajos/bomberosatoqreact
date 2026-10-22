import { DIRECTIVA } from './rankBadge';

/** Nombre de la función institucional (cargo en directiva), p. ej. «Jefe de Finanzas». */
export function nombreFuncion(cargo?: string | null): string {
  if (!cargo || cargo === 'admin') return '';
  return DIRECTIVA.find(d => d.value === cargo)?.label ?? cargo;
}

/** Rol del voluntario en un documento: el escrito para ese documento o, si no hay, su función. */
export function rolDocumento(v: { rol?: string | null; cargo_directiva?: string | null }): string {
  return v.rol?.trim() || nombreFuncion(v.cargo_directiva);
}
