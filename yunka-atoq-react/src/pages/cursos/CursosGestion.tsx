import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cursosGestionApi, ETIQUETAS, fechaCurso, precio, type CursoOnline, type EstadoCurso } from '../../services/cursosApi';
import { Etiqueta } from './CursoCard';
import CursoForm from './CursoForm';
import ConfirmacionYunka from '../../components/ConfirmacionYunka';
import u from '../presidente/UsuariosExternos.module.css';
import s from '../gestion/Gestion.module.css';

const FILTROS: ['' | EstadoCurso, string][] = [['', 'Todos'], ['borrador', 'Borradores'], ['publicado', 'Publicados'], ['finalizado', 'Finalizados'], ['cancelado', 'Cancelados']];

export default function CursosGestion() {
  const navigate = useNavigate();
  const [seleccionado, setSeleccionado] = useState<CursoOnline | null>(null);
  const [eliminando, setEliminando] = useState(false), [errorEliminar, setErrorEliminar] = useState('');
  const [cursos, setCursos] = useState<CursoOnline[] | null>(null), [error, setError] = useState(''), [aviso, setAviso] = useState('');
  const [filtro, setFiltro] = useState<'' | EstadoCurso>(''), [form, setForm] = useState<CursoOnline | 'nuevo' | null>(null);
  const cargar = useCallback(() => cursosGestionApi.listar().then(r => { setCursos(r.data); setError(''); }).catch(e => setError(e.message)), []);
  useEffect(() => { void cargar(); }, [cargar]);

  async function eliminar(curso: CursoOnline) {
    setEliminando(true); setErrorEliminar('');
    try { await cursosGestionApi.eliminar(curso.id); setSeleccionado(null); setAviso('Curso eliminado.'); void cargar(); }
    catch (e) { setErrorEliminar(e instanceof Error ? e.message : 'No se pudo eliminar.'); }
    finally { setEliminando(false); }
  }
  const lista = (cursos ?? []).filter(c => !filtro || c.estado === filtro);
  const cuenta = (e: string) => (cursos ?? []).filter(c => !e || c.estado === e).length;
  const pendientes = (cursos ?? []).reduce((t, c) => t + c.pendientes, 0);

  return <div className={s.page}>
    <div className={s.heading}>
      <div><h1>Cursos online</h1><p className={s.muted}>Crea cursos, asigna al instructor (miembro de la fundación o externo) y define horas, fechas, costo y a quién están dirigidos. El instructor sube el contenido por módulos y los exámenes.</p></div>
      {!form && <button className={s.button} onClick={() => { setForm('nuevo'); setAviso(''); }}>+ Nuevo curso</button>}
    </div>
    {error && <div role="alert" className={s.error}>{error}</div>}
    {aviso && <div role="status" className={s.success}>{aviso}</div>}
    <Link className={u.accessCard} to="/presidente/usuarios-externos">
      <span className={u.accessIcon}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v3" /></svg></span>
      <span className={u.accessCopy}><strong>Usuarios externos</strong><small>Consulta los registros, revisa la confirmación de correo y administra las cuentas del portal.</small></span>
      <span className={u.accessAction}>Ver directorio <span aria-hidden="true">→</span></span>
    </Link>
    {pendientes > 0 && <div className={s.notice}>Hay {pendientes} solicitud(es) de inscripción por habilitar. Revísalas en la pestaña “Participantes” de cada curso.</div>}

    {form && <section className={s.card}>
      <h2>{form === 'nuevo' ? 'Nuevo curso' : `Editar · ${form.titulo}`}</h2>
      <CursoForm key={form === 'nuevo' ? 'nuevo' : form.id} inicial={form === 'nuevo' ? undefined : form} onCancelar={() => setForm(null)}
        onGuardado={curso => { const nuevo = form === 'nuevo'; setForm(null); void cargar();
          if (nuevo) navigate(`/presidente/cursos/${curso.id}`); else setAviso(`Curso “${curso.titulo}” actualizado.`); }} />
    </section>}

    <div className={s.tabs} style={{ marginBottom: 16 }}>{FILTROS.map(([v, l]) => <button key={v} aria-pressed={filtro === v} className={filtro === v ? s.tabActive : ''} onClick={() => setFiltro(v)}>{l} ({cuenta(v)})</button>)}</div>
    {!cursos && !error && <p role="status" className={s.muted}>Cargando…</p>}
    {cursos && (lista.length ? <div className={`${s.card} ${s.tableWrap}`} style={{ padding: 0 }}>
      <table className={s.table}>
        <thead><tr><th>Curso</th><th>Instructor</th><th>Fechas</th><th>Horas</th><th>Costo</th><th>Participantes</th><th>Estado</th><th /></tr></thead>
        <tbody>{lista.map(c => <tr key={c.id}>
          <td><Link to={`/presidente/cursos/${c.id}`}><strong>{c.titulo}</strong></Link><br /><span className={s.muted}>{ETIQUETAS[c.visibilidad]} · {c.modulos} módulo(s)</span></td>
          <td>{c.instructor_nombre ?? '—'}<br /><span className={s.muted}>{c.instructor_tipo === 'externo' ? `Externo${c.instructor_institucion ? ` · ${c.instructor_institucion}` : ''}` : 'Fundación'}</span></td>
          <td>{fechaCurso(c.fecha_inicio)}<br />{fechaCurso(c.fecha_fin)}</td>
          <td>{c.horas}</td>
          <td>{precio(c.costo)}</td>
          <td>{c.inscritos}{c.cupo > 0 ? ` / ${c.cupo}` : ''}{c.pendientes > 0 && <><br /><span className={`${s.badge} ${s.pending}`}>{c.pendientes} por habilitar</span></>}</td>
          <td><Etiqueta valor={c.estado} /></td>
          <td><div className={s.actions} style={{ marginTop: 0, flexWrap: 'nowrap' }}>
            <Link className={s.secondary} to={`/presidente/cursos/${c.id}`}>Abrir</Link>
            <button className={s.secondary} onClick={() => { setForm(c); setAviso(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Editar</button>
            <button className={s.danger} onClick={() => { setErrorEliminar(''); setSeleccionado(c); }}>Eliminar</button>
          </div></td>
        </tr>)}</tbody>
      </table>
    </div> : <p className={s.empty}>No hay cursos {filtro ? `en estado “${ETIQUETAS[filtro]}”` : 'registrados'}.</p>)}
    {seleccionado && <ConfirmacionYunka titulo="¿Eliminar este curso?" confirmar="Sí, eliminar curso" ocupado={eliminando} error={errorEliminar} onCancelar={() => setSeleccionado(null)} onConfirmar={() => void eliminar(seleccionado)}>
      <p>Se eliminará <strong>{seleccionado.titulo}</strong> junto con sus módulos, materiales y exámenes.</p>
      <p>Si tiene participantes inscritos, debe cambiar su estado a <strong>Cancelado</strong> desde la edición del curso.</p>
    </ConfirmacionYunka>}
  </div>;
}
