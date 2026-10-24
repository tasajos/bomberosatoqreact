import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { CursoOnline } from '../../services/cursosApi';
import { useCursos } from './zona';
import CursoCard from './CursoCard';
import s from '../gestion/Gestion.module.css';
import c from './Cursos.module.css';

export default function CursosDictar() {
  const { api, rutas } = useCursos();
  const [cursos, setCursos] = useState<CursoOnline[] | null>(null), [error, setError] = useState('');
  useEffect(() => { api.dictados().then(r => setCursos(r.data)).catch(e => setError(e.message)); }, [api]);
  return <div className={s.page}>
    <div className={s.heading}><div>
      <h1>Cursos para dictar</h1>
      <p className={s.muted}>Organiza el contenido por módulos (PDF, presentaciones, videos, prácticas HTML y enlaces), crea los exámenes y revisa las calificaciones de tus participantes.</p>
    </div></div>
    {error && <div role="alert" className={s.error}>{error}</div>}
    {!cursos && !error && <p role="status" className={s.muted}>Cargando…</p>}
    {cursos && (cursos.length ? <div className={c.grid}>{cursos.map(curso =>
      <CursoCard key={curso.id} curso={curso} extra={<span className={s.muted}>{curso.inscritos} participante(s) inscrito(s){curso.pendientes ? ` · ${curso.pendientes} por habilitar` : ''}</span>}>
        <Link className={s.button} to={rutas.editor(curso.id)}>Gestionar curso</Link>
      </CursoCard>)}</div> : <p className={s.empty}>No tienes cursos asignados como instructor.</p>)}
  </div>;
}
