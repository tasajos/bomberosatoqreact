import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ETIQUETAS, fechaCurso, precio, textoNota, type Aula as DatosAula } from '../../services/cursosApi';
import { useCursos } from './zona';
import { Avance, Etiqueta } from './CursoCard';
import MaterialVisor from './MaterialVisor';
import ExamenRendir from './ExamenRendir';
import s from '../gestion/Gestion.module.css';
import c from './Cursos.module.css';

const INICIAL: Record<string, string> = { pdf: 'PDF', presentacion: 'PPT', video: '▶', html: '</>', enlace: '↗' };
type Seleccion = { tipo: 'material' | 'examen'; id: number } | null;

export default function Aula() {
  const cursoId = Number(useParams().id);
  const { api, rutas } = useCursos();
  const [data, setData] = useState<DatosAula | null>(null), [error, setError] = useState(''), [version, setVersion] = useState(0);
  const [sel, setSel] = useState<Seleccion>(null);
  useEffect(() => {
    let activo = true;
    setError('');
    api.aula(cursoId).then(d => { if (activo) setData(d); }).catch(e => { if (activo) setError(e.message); });
    return () => { activo = false; };
  }, [api, cursoId, version]);

  if (error) return <div className={s.page}><div role="alert" className={s.error}>{error}</div><Link to={rutas.catalogo}>← Volver a mis cursos</Link></div>;
  if (!data) return <div className={s.page}><p role="status" className={s.muted}>Cargando curso…</p></div>;
  const { curso, evaluacion } = data;
  const examenDe = (moduloId: number | null) => data.examenes.find(e => e.modulo_id === moduloId);
  const final = examenDe(null);
  const marcarVisto = (id: number) => setData(d => d && !d.vista_previa ? {
    ...d, modulos: d.modulos.map(m => ({ ...m, materiales: m.materiales.map(x => x.id === id ? { ...x, visto: true } : x) })),
    evaluacion: d.evaluacion && !d.modulos.some(m => m.materiales.some(x => x.id === id && x.visto))
      ? { ...d.evaluacion, progreso: { ...d.evaluacion.progreso, vistos: d.evaluacion.progreso.vistos + 1 } } : d.evaluacion,
  } : d);

  const botonExamen = (e: DatosAula['examenes'][number], etiqueta: string) => {
    const agotado = !data.vista_previa && e.intentos >= e.intentos_max, cerrado = !data.vista_previa && !data.examenes_abiertos;
    return <button key={e.id} className={`${c.item} ${sel?.tipo === 'examen' && sel.id === e.id ? c.itemActivo : ''}`} disabled={agotado || cerrado}
      onClick={() => setSel({ tipo: 'examen', id: e.id })} title={cerrado ? 'Los exámenes se rinden durante las fechas del curso' : agotado ? 'Sin intentos disponibles' : ''}>
      <span className={`${c.icono} ${c.i_examen}`}>✎</span>
      <span>{etiqueta}<br /><small className={s.muted}>{e.mejor !== null ? `Mejor nota ${e.mejor}% · ` : ''}{e.intentos}/{e.intentos_max} intentos</small></span>
      {e.mejor !== null && <span className={c.check}>✓</span>}
    </button>;
  };

  return <div className={s.page}>
    <Link to={data.vista_previa ? rutas.editor(curso.id) : rutas.catalogo} className={s.link}>← {data.vista_previa ? 'Volver al editor del curso' : 'Mis cursos'}</Link>
    {data.vista_previa && <div className={s.notice}>Vista previa del aula tal como la ve un participante. Tus visitas y respuestas no se registran.</div>}
    <header className={c.aulaHead}>
      <div>
        <div className={c.etiquetas}><Etiqueta valor={curso.visibilidad} />{data.inscripcion && <Etiqueta valor={data.inscripcion.estado} />}{curso.estado !== 'publicado' && <Etiqueta valor={curso.estado} />}</div>
        <h1>{curso.titulo}</h1>
        <div className={c.meta}>
          <span>Instructor: <strong>{curso.instructor_nombre ?? '—'}</strong></span>
          <span><strong>{curso.horas}</strong> horas académicas</span>
          <span>{fechaCurso(curso.fecha_inicio)} – {fechaCurso(curso.fecha_fin)}</span>
          <span>Aprobación con <strong>{curso.nota_minima}%</strong></span>
        </div>
        {evaluacion && <div style={{ marginTop: 14, maxWidth: 420 }}><Avance evaluacion={evaluacion} /></div>}
      </div>
      {evaluacion && evaluacion.total > 0 && <div className={c.nota}><small>Nota actual</small><strong>{textoNota(evaluacion)}</strong><small>{ETIQUETAS[evaluacion.estado]} · {evaluacion.rendidos}/{evaluacion.total} exámenes</small></div>}
    </header>

    {data.concluido && data.inscripcion?.estado === 'activa' && evaluacion && <Certificacion data={data} onDescargar={() => api.certificado(curso.id)} />}
    {!data.acceso ? <SinAcceso data={data} onPago={async ref => { await api.registrarPago(curso.id, ref); setVersion(v => v + 1); }} /> :
      <div className={c.aula}>
        <nav className={c.temario} aria-label="Contenido del curso">
          {data.modulos.map((m, i) => {
            const ex = examenDe(m.id);
            return <div key={m.id} className={c.modulo}>
              <div className={c.moduloTitulo}>Módulo {i + 1} · {m.titulo}</div>
              {m.materiales.map(x => <button key={x.id} className={`${c.item} ${sel?.tipo === 'material' && sel.id === x.id ? c.itemActivo : ''}`} onClick={() => setSel({ tipo: 'material', id: x.id })}>
                <span className={`${c.icono} ${c[`i_${x.tipo}`]}`}>{INICIAL[x.tipo]}</span><span>{x.titulo}</span>{x.visto && <span className={c.check} aria-label="Visto">✓</span>}
              </button>)}
              {!m.materiales.length && <p className={s.muted} style={{ margin: '0 10px' }}>Sin materiales todavía.</p>}
              {ex && botonExamen(ex, `Examen: ${ex.titulo}`)}
            </div>;
          })}
          {final && <div className={c.modulo}><div className={c.moduloTitulo}>Evaluación final</div>{botonExamen(final, final.titulo)}</div>}
          {!data.modulos.length && <p className={s.empty}>El instructor aún no publicó contenido.</p>}
        </nav>
        <section className={c.visor}>
          {sel?.tipo === 'material' && <MaterialVisor key={sel.id} materialId={sel.id} onVisto={marcarVisto} onCerrar={() => setSel(null)} />}
          {sel?.tipo === 'examen' && <ExamenRendir examenId={sel.id} onTerminar={() => { setSel(null); setVersion(v => v + 1); }} />}
          {!sel && <div className={c.bienvenida}>
            <h2>Bienvenido al curso</h2>
            {curso.descripcion && <p className={s.line}>{curso.descripcion}</p>}
            <p>Elige un material del temario para comenzar. Los exámenes de cada módulo y el examen final se rinden entre el {fechaCurso(curso.fecha_inicio)} y el {fechaCurso(curso.fecha_fin)}; cuenta tu mejor intento. La nota final es el promedio de todos los exámenes.</p>
            {!data.examenes_abiertos && !data.vista_previa && <p className={s.notice}>Los exámenes no están disponibles en este momento.</p>}
          </div>}
        </section>
      </div>}
  </div>;
}

function SinAcceso({ data, onPago }: { data: DatosAula; onPago: (referencia: string) => Promise<void> }) {
  const [ref, setRef] = useState(data.inscripcion?.pago_referencia ?? ''), [estado, setEstado] = useState({ busy: false, error: '', ok: '' });
  async function enviar(e: FormEvent) {
    e.preventDefault(); setEstado({ busy: true, error: '', ok: '' });
    try { await onPago(ref); setEstado({ busy: false, error: '', ok: 'Referencia registrada. Presidencia la verificará al revisar tu inscripción.' }); }
    catch (err) { setEstado({ busy: false, error: err instanceof Error ? err.message : 'No se pudo registrar.', ok: '' }); }
  }
  const temario = <ul>{data.modulos.map(m => <li key={m.id}>{m.titulo}</li>)}</ul>;
  if (data.motivo === 'pendiente') return <section className={s.card}>
    <h2>Tu inscripción está por habilitar</h2>
    <p>Presidencia revisará tu solicitud y te avisaremos por correo cuando estés habilitado. Desde ese momento podrás ver el contenido{data.curso.fecha_inicio ? ` (a partir del ${fechaCurso(data.curso.fecha_inicio)})` : ''}.</p>
    {data.curso.costo > 0 && <>
      <h3>Pago del curso: {precio(data.curso.costo)}</h3>
      {data.curso.info_pago && <p className={`${s.notice} ${s.line}`}>{data.curso.info_pago}</p>}
      <form onSubmit={enviar} className={s.form}>
        <label className={`${s.field} ${s.wide}`}>Número de transacción, comprobante o detalle del pago<input value={ref} onChange={e => setRef(e.target.value)} maxLength={200} required disabled={estado.busy} /></label>
        <div className={`${s.actions} ${s.wide}`}><button className={s.button} disabled={estado.busy}>{estado.busy ? 'Guardando…' : 'Registrar pago'}</button></div>
      </form>
      {estado.error && <div role="alert" className={s.error}>{estado.error}</div>}
      {estado.ok && <div role="status" className={s.success}>{estado.ok}</div>}
    </>}
    {data.modulos.length > 0 && <><h3>Temario</h3>{temario}</>}
  </section>;
  const mensajes: Record<string, string> = {
    no_inicia: `El curso inicia el ${fechaCurso(data.curso.fecha_inicio)}. Desde esa fecha podrás ver el contenido.`,
    rechazada: 'Tu inscripción fue rechazada. Comunícate con la fundación para más información.',
    retirada: 'Tu inscripción fue dada de baja. Puedes volver a inscribirte desde el catálogo si el curso sigue abierto.',
    cancelado: 'Este curso fue cancelado.', no_publicado: 'Este curso todavía no está publicado.',
  };
  return <section className={s.card}>
    <h2>Contenido no disponible</h2>
    <p>{mensajes[data.motivo ?? ''] ?? 'No tienes acceso al contenido de este curso.'}</p>
    {data.inscripcion?.observacion && <p className={s.notice}>{data.inscripcion.observacion}</p>}
    {data.motivo === 'no_inicia' && data.modulos.length > 0 && <><h3>Temario</h3>{temario}</>}
  </section>;
}

function Certificacion({ data, onDescargar }: { data: DatosAula; onDescargar: () => Promise<Blob> }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const ev = data.evaluacion!;
  async function descargar() {
    setBusy(true); setError('');
    try {
      const blob = await onDescargar(), url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = `${data.certificado?.codigo ?? 'certificado'}.pdf`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo descargar.'); } finally { setBusy(false); }
  }
  if (ev.estado === 'reprobado') return <div className={s.error}>El curso concluyó con una nota de {textoNota(ev)}. No alcanzaste el {data.curso.nota_minima}% necesario para la certificación.</div>;
  if (data.certificado) return <section className={`${s.card}`} style={{ borderLeft: '4px solid #16a36b' }}>
    <h2>Certificado {data.certificado.codigo}</h2>
    <p>¡Felicidades! Tu certificado fue emitido y puede verificarse públicamente.</p>
    <div className={s.actions}><button className={s.button} disabled={busy} onClick={descargar}>{busy ? 'Descargando…' : 'Descargar certificado'}</button>
      <Link className={s.secondary} to={data.certificado.verificacion_path} target="_blank">Ver verificación</Link></div>
    {error && <p role="alert" className={s.error}>{error}</p>}
  </section>;
  return <div className={s.success}>El curso concluyó{ev.nota !== null ? ` con una nota de ${textoNota(ev)}` : ''}. Tu certificado está habilitado y la fundación lo emitirá próximamente.</div>;
}
