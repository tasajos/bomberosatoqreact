import { GRADOS } from './rankBadge';
import type { EstadoPersonal } from '../services/api';

export const ESTADO_META: Record<EstadoPersonal, { label: string; color: string }> = {
  activo:     { label: 'Activo',     color: '#16a34a' },
  baja:       { label: 'Baja',       color: '#b91c1c' },
  pasiva:     { label: 'Pasiva',     color: '#d97706' },
  cooperador: { label: 'Cooperador', color: '#2563eb' },
  comision:   { label: 'Comisión',   color: '#7c3aed' },
};
export const ESTADO_LIST: EstadoPersonal[] = ['activo', 'baja', 'pasiva', 'cooperador', 'comision'];

// Precedencia por código: Fundadores → Rescatistas → Colaboradores
const CODIGO_ORDEN: Record<string, number> = { VF: 0, VR: 1, VC: 2 };

type Ordenable = {
  grado?: string | null;
  codigo?: string | null;
  matricula?: string | null;
  antiguedad_anios?: number | null;
  created_at?: string | null;
  apellido_paterno?: string | null;
};

function gradoRank(g?: string | null) {
  const i = GRADOS.findIndex(x => x.value === (g || ''));
  return i < 0 ? 0 : i;
}

function matriculaNum(m?: string | null) {
  const n = parseInt((m || '').split('-')[1] ?? '', 10);
  return Number.isNaN(n) ? Number.MAX_SAFE_INTEGER : n;
}

/**
 * Orden de antigüedad: primero el grado más alto, luego el código (VF, VR, VC),
 * después años de antigüedad, número de matrícula más bajo y fecha de registro.
 */
export function compararAntiguedad(a: Ordenable, b: Ordenable) {
  return (gradoRank(b.grado) - gradoRank(a.grado))
    || ((CODIGO_ORDEN[a.codigo || ''] ?? 9) - (CODIGO_ORDEN[b.codigo || ''] ?? 9))
    || ((b.antiguedad_anios || 0) - (a.antiguedad_anios || 0))
    || (matriculaNum(a.matricula) - matriculaNum(b.matricula))
    || (a.created_at || '').localeCompare(b.created_at || '')
    || (a.apellido_paterno || '').localeCompare(b.apellido_paterno || '', 'es');
}

export function compararNombre(
  a: { apellido_paterno?: string | null; nombre?: string | null },
  b: { apellido_paterno?: string | null; nombre?: string | null },
) {
  return `${a.apellido_paterno || ''} ${a.nombre || ''}`.localeCompare(`${b.apellido_paterno || ''} ${b.nombre || ''}`, 'es');
}
