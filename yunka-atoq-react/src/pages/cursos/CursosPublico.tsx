import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { crearCursosApi, cursosPublicoApi, sesionExterna, type CursoPublico } from '../../services/cursosApi';
import { useAuth } from '../../context/AuthContext';
import CursoCard from './CursoCard';
import { ConfirmarInscripcion } from './CursosCatalogo';
import { portalCursos, rutasPortal } from './zona';
import s from '../gestion/Gestion.module.css';
import c from './Cursos.module.css';

const externo = crearCursosApi('externo'), interno = crearCursosApi('interno');

export default function CursosPublico() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cursos, setCursos] = useState<CursoPublico[] | null>(null), [error, setError] = useState('');
  const [temarios, setTemarios] = useState<Record<number, { titulo: string }[] | 'cargando'>>({});
  const [inscribir, setInscribir] = useState<CursoPublico | null>(null);
  useEffect(() => { cursosPublicoApi.catalogo().then(r => setCursos(r.data)).catch(e => setError(e.message)); }, []);
  const conSesionExterna = sesionExterna.existe();
  const portal = user ? portalCursos(user.role) : null;
  const destinoAula = (id: number) => portal ? rutasPortal(portal).aula(id) : `/cursos/aula/${id}`;

  const verTemario = (id: number) => {
    if (temarios[id]) { setTemarios(t => { const n = { ...t }; delete n[id]; return n; }); return; }
    setTemarios(t => ({ ...t, [id]: 'cargando' }));
    cursosPublicoApi.detalle(id).then(d => setTemarios(t => ({ ...t, [id]: d.temario }))).catch(() => setTemarios(t => ({ ...t, [id]: [] })));
  };
  // Un miembro con sesión institucional se inscribe desde su portal; un externo con sesión, aquí mismo.
  const elegir = (curso: CursoPublico) => {
    if (user && !portal) setError('Tu cuenta institucional no tiene un portal de cursos. Comunícate con presidencia.');
    else if (user || conSesionExterna) setInscribir(curso);
    else navigate(`/cursos/registro?curso=${curso.id}`);
  };

  return <div className={c.landing}>
    <section className={c.hero}><div className={c.heroInner}>
      <small>Escuela de formación · Yunka Atoq</small>
      <h1>Cursos online</h1>
      <p>Capacitación en emergencias, rescate y primeros auxilios dictada por instructores de la fundación e invitados. Estudia a tu ritmo, rinde tus evaluaciones en línea y obtén un certificado verificable al aprobar.</p>
      <div className={c.heroAcciones}>
        {conSesionExterna ? <Link className={c.cta} to="/cursos/aula">Ir a mis cursos</Link> : <Link className={c.cta} to="/cursos/registro">Crear mi cuenta</Link>}
        {!conSesionExterna && <Link className={c.ctaSec} to="/cursos/ingresar">Ya tengo cuenta</Link>}
        {portal ? <Link className={c.ctaSec} to={rutasPortal(portal).catalogo}>Mis cursos de voluntario</Link>
          : <Link className={c.ctaSec} to="/login">Soy miembro de la fundación</Link>}
      </div>
    </div></section>
    <div className={c.landingInner}>
      <h2>Cursos con inscripción abierta</h2>
      {error && <div role="alert" className={s.error}>{error}</div>}
      {!cursos && !error && <p role="status" className={s.muted}>Cargando cursos…</p>}
      {cursos && (cursos.length ? <div className={c.grid}>{cursos.map(curso => {
        const temario = temarios[curso.id], lleno = curso.cupo > 0 && curso.inscritos >= curso.cupo;
        return <CursoCard key={curso.id} curso={curso} mostrarVisibilidad={false}
          extra={temario && (temario === 'cargando' ? <p className={s.muted}>Cargando temario…</p>
            : <ol className={c.temarioPublico}>{temario.map((m, i) => <li key={i}>{m.titulo}</li>)}{!temario.length && <li>Temario por publicar</li>}</ol>)}>
          {curso.modulos > 0 && <button className={s.secondary} onClick={() => verTemario(curso.id)}>{temario ? 'Ocultar temario' : 'Ver temario'}</button>}
          <button className={c.cta} style={{ padding: '9px 16px' }} disabled={lleno} onClick={() => elegir(curso)}>{lleno ? 'Sin cupos' : 'Inscribirme'}</button>
        </CursoCard>;
      })}</div> : <p className={s.empty}>No hay cursos abiertos en este momento. Vuelve pronto.</p>)}
      <p className={s.muted}>Los voluntarios y miembros de la fundación ingresan con su cuenta institucional y encuentran estos cursos, además de los internos, en la opción “Cursos online” de su portal.</p>
    </div>
    {inscribir && <ConfirmarInscripcion curso={inscribir} cerrar={() => setInscribir(null)} inscribir={async ref => {
      await (user ? interno : externo).inscribirse(inscribir.id, ref);
      navigate(destinoAula(inscribir.id));
    }} />}
  </div>;
}
