import type { ReactNode } from 'react';
import { ETIQUETAS, fechaCurso, precio, type CursoPublico, type EstadoAcademico, type EstadoInscripcion, type Evaluacion } from '../../services/cursosApi';
import s from '../gestion/Gestion.module.css';
import c from './Cursos.module.css';

const TONO: Record<string, string> = { activa: s.good, aprobado: s.good, publicado: s.good, pendiente: s.pending, en_curso: s.pending,
  borrador: s.pending, rechazada: s.bad, reprobado: s.bad, cancelado: s.bad, retirada: s.bad };
export function Etiqueta({ valor }: { valor: string }) {
  return <span className={`${s.badge} ${TONO[valor] ?? ''}`}>{ETIQUETAS[valor] ?? valor}</span>;
}

export function Avance({ evaluacion }: { evaluacion: Evaluacion }) {
  const { vistos, total } = evaluacion.progreso, pct = total ? Math.round(vistos / total * 100) : 0;
  return <div>
    <div className={c.barraTexto}><span>Avance {pct}%</span><span>{vistos}/{total} materiales</span></div>
    <div className={c.barra}><span style={{ width: `${pct}%` }} /></div>
  </div>;
}

interface Props {
  curso: CursoPublico; children?: ReactNode; inscripcion?: EstadoInscripcion; estadoAcademico?: EstadoAcademico; extra?: ReactNode; mostrarVisibilidad?: boolean;
}
export default function CursoCard({ curso, children, inscripcion, estadoAcademico, extra, mostrarVisibilidad = true }: Props) {
  const cupos = curso.cupo > 0 ? Math.max(0, curso.cupo - curso.inscritos) : null;
  return <article className={c.curso}>
    <div className={`${c.cursoBanda} ${curso.visibilidad === 'interno' ? c.interno : ''}`} />
    <div className={c.cursoCuerpo}>
      <div className={c.etiquetas}>
        {mostrarVisibilidad && <Etiqueta valor={curso.visibilidad} />}
        {inscripcion && <Etiqueta valor={inscripcion} />}
        {estadoAcademico && inscripcion === 'activa' && <Etiqueta valor={estadoAcademico} />}
        {curso.estado !== 'publicado' && <Etiqueta valor={curso.estado} />}
      </div>
      <h3>{curso.titulo}</h3>
      {curso.descripcion && <p>{curso.descripcion.length > 220 ? `${curso.descripcion.slice(0, 220)}…` : curso.descripcion}</p>}
      <div className={c.meta}>
        <span>Instructor: <strong>{curso.instructor_nombre ?? 'Por asignar'}</strong>{curso.instructor_institucion ? ` · ${curso.instructor_institucion}` : ''}</span>
        <span><strong>{curso.horas}</strong> horas académicas</span>
        <span>{fechaCurso(curso.fecha_inicio)} – {fechaCurso(curso.fecha_fin)}</span>
        {curso.modulos > 0 && <span><strong>{curso.modulos}</strong> módulo{curso.modulos === 1 ? '' : 's'}</span>}
        {cupos !== null && <span><strong>{cupos}</strong> cupo{cupos === 1 ? '' : 's'} disponible{cupos === 1 ? '' : 's'}</span>}
      </div>
      {extra}
    </div>
    <div className={c.pie}>
      <span className={c.precio}>{precio(curso.costo)}</span>
      <div className={s.actions} style={{ marginTop: 0 }}>{children}</div>
    </div>
  </article>;
}
