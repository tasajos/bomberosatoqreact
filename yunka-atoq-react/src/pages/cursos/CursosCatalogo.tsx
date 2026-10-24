import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { precio, textoNota, type Catalogo, type CursoPublico } from '../../services/cursosApi';
import { useCursos } from './zona';
import CursoCard, { Avance } from './CursoCard';
import s from '../gestion/Gestion.module.css';
import c from './Cursos.module.css';

export default function CursosCatalogo() {
  const { api, rutas, modo } = useCursos();
  const [data, setData] = useState<Catalogo | null>(null), [error, setError] = useState('');
  const [confirmar, setConfirmar] = useState<CursoPublico | null>(null), [aviso, setAviso] = useState('');
  const cargar = useCallback(() => api.catalogo().then(d => { setData(d); setError(''); }).catch(e => setError(e.message)), [api]);
  useEffect(() => { void cargar(); }, [cargar]);

  return <div className={s.page}>
    <div className={s.heading}><div>
      <h1>Cursos online</h1>
      <p className={s.muted}>{modo === 'interno' ? 'Cursos de la fundación y abiertos al público. ' : 'Cursos abiertos al público de Yunka Atoq. '}
        Al terminar, los participantes aprobados (nota mínima del curso) quedan habilitados para su certificado.</p>
    </div></div>
    {error && <div role="alert" className={s.error}>{error}</div>}
    {aviso && <div role="status" className={s.success}>{aviso}</div>}
    {!data && !error && <p role="status" className={s.muted}>Cargando cursos…</p>}
    {data && <>
      <h2 className={c.seccion}>Mis cursos <span className={c.contador}>{data.inscritos.length}</span></h2>
      {data.inscritos.length ? <div className={c.grid}>{data.inscritos.map(({ curso, inscripcion, evaluacion, concluido, certificado }) =>
        <CursoCard key={curso.id} curso={curso} inscripcion={inscripcion.estado} estadoAcademico={evaluacion.estado}
          extra={inscripcion.estado === 'activa' && <>
            <Avance evaluacion={evaluacion} />
            {evaluacion.total > 0 && <span className={s.muted}>Nota: <strong>{textoNota(evaluacion)}</strong> · {evaluacion.rendidos}/{evaluacion.total} exámenes</span>}
            {concluido && certificado && <span className={`${s.badge} ${s.good}`}>Certificado emitido</span>}
          </>}>
          <Link className={s.button} to={rutas.aula(curso.id)}>{inscripcion.estado === 'activa' ? 'Entrar al aula' : 'Ver solicitud'}</Link>
        </CursoCard>)}</div>
        : <p className={s.empty}>Aún no estás inscrito en ningún curso.</p>}

      <h2 className={c.seccion}>Cursos disponibles <span className={c.contador}>{data.disponibles.length}</span></h2>
      {data.disponibles.length ? <div className={c.grid}>{data.disponibles.map(curso =>
        <CursoCard key={curso.id} curso={curso} mostrarVisibilidad={modo === 'interno'}>
          <button className={s.button} disabled={curso.cupo > 0 && curso.inscritos >= curso.cupo} onClick={() => setConfirmar(curso)}>
            {curso.cupo > 0 && curso.inscritos >= curso.cupo ? 'Sin cupos' : 'Inscribirme'}</button>
        </CursoCard>)}</div>
        : <p className={s.empty}>No hay otros cursos abiertos en este momento.</p>}
    </>}
    {confirmar && <ConfirmarInscripcion curso={confirmar} cerrar={() => setConfirmar(null)}
      inscribir={async ref => {
        const r = await api.inscribirse(confirmar.id, ref);
        setConfirmar(null);
        setAviso(r.estado === 'activa' ? `Ya estás habilitado en “${confirmar.titulo}”.` : `Solicitud enviada para “${confirmar.titulo}”. Presidencia habilitará tu inscripción y te avisaremos por correo.`);
        void cargar();
      }} />}
  </div>;
}

export function ConfirmarInscripcion({ curso, cerrar, inscribir }: { curso: CursoPublico; cerrar: () => void; inscribir: (referencia: string) => Promise<void> }) {
  const [ref, setRef] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function confirmar() {
    setBusy(true); setError('');
    try { await inscribir(ref); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo completar la inscripción.'); setBusy(false); }
  }
  return <div className={s.modalBackdrop} onKeyDown={e => { if (e.key === 'Escape' && !busy) cerrar(); }}>
    <div className={s.modal} role="dialog" aria-modal="true" aria-label={`Inscripción a ${curso.titulo}`}>
      <h2>Inscripción · {curso.titulo}</h2>
      {curso.costo > 0 ? <>
        <p>Este curso tiene un costo de <strong>{precio(curso.costo)}</strong>. Presidencia verificará el pago al habilitar tu inscripción.</p>
        {curso.info_pago && <p className={`${s.notice} ${s.line}`}>{curso.info_pago}</p>}
        <label className={s.field}>Referencia del pago (opcional, puedes registrarla después)
          <input value={ref} onChange={e => setRef(e.target.value)} maxLength={200} disabled={busy} placeholder="N.° de transacción o comprobante" /></label>
      </> : <p>El curso es gratuito.</p>}
      <p className={s.muted}>Tu solicitud queda pendiente hasta que presidencia la habilite; te avisaremos por correo. El contenido se abre desde el {curso.fecha_inicio.split('-').reverse().join('/')}.</p>
      {error && <div role="alert" className={s.error}>{error}</div>}
      <div className={s.actions}>
        <button className={s.button} disabled={busy} onClick={confirmar} autoFocus>{busy ? 'Enviando…' : 'Solicitar inscripción'}</button>
        <button className={s.secondary} disabled={busy} onClick={cerrar}>Cancelar</button>
      </div>
    </div>
  </div>;
}
