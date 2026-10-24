import { createContext, useContext } from 'react';
import type { CursosApi, ModoCursos } from '../../services/cursosApi';

// Las mismas pantallas sirven al portal de cada miembro, a presidencia y al portal externo: cambian la sesión y las rutas.
export interface RutasCursos { catalogo: string; aula: (id: number) => string; dictar: string; editor: (id: number) => string }
export interface ZonaCursos { modo: ModoCursos; api: CursosApi; rutas: RutasCursos }
export const ContextoCursos = createContext<ZonaCursos | null>(null);

export const rutasPortal = (base: string): RutasCursos => ({
  catalogo: `${base}/cursos-online`, aula: id => `${base}/cursos-online/${id}`, dictar: `${base}/dictar`, editor: id => `${base}/dictar/${id}`,
});
/** Portal institucional donde cada rol toma y dicta cursos; null si el rol no tiene portal propio. */
export function portalCursos(role: string): string | null {
  const portales: Record<string, string> = { presidente: '/presidente', voluntario: '/voluntario', jefe_finanzas: '/finanzas',
    jefe_logistica: '/logistica', jefe_personal: '/personal', jefe_operaciones: '/operaciones', coordinador: '/operaciones' };
  return portales[role] ?? null;
}
export const rutasPresidencia: RutasCursos = {
  catalogo: '/presidente/cursos', aula: id => `/presidente/cursos/${id}/aula`, dictar: '/presidente/cursos', editor: id => `/presidente/cursos/${id}`,
};
export const rutasExternas: RutasCursos = {
  catalogo: '/cursos/aula', aula: id => `/cursos/aula/${id}`, dictar: '/cursos/instructor', editor: id => `/cursos/instructor/${id}`,
};

export function useCursos() {
  const ctx = useContext(ContextoCursos);
  if (!ctx) throw new Error('useCursos debe usarse dentro de CursosZona');
  return ctx;
}
