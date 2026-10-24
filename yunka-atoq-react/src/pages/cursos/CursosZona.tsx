import { useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import { crearCursosApi, type ModoCursos } from '../../services/cursosApi';
import { ContextoCursos, type RutasCursos } from './zona';

/** Provee la sesión (institucional o externa) y las rutas a las pantallas de cursos anidadas. */
export function CursosZona({ modo, rutas }: { modo: ModoCursos; rutas: RutasCursos }) {
  const api = useMemo(() => crearCursosApi(modo), [modo]);
  const valor = useMemo(() => ({ modo, api, rutas }), [modo, api, rutas]);
  return <ContextoCursos.Provider value={valor}><Outlet /></ContextoCursos.Provider>;
}
