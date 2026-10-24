import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ETIQUETAS, fechaCurso, precio, type DetalleStaff, type Examen, type MaterialStaff, type ModuloStaff, type TipoMaterial } from '../../services/cursosApi';
import { tamanoArchivo } from '../../utils/cursosMedia';
import { useCursos } from './zona';
import { Etiqueta } from './CursoCard';
import MaterialVisor from './MaterialVisor';
import ExamenesCurso from './ExamenEditor';
import ParticipantesCurso from './ParticipantesCurso';
import CursoForm from './CursoForm';
import s from '../gestion/Gestion.module.css';
import c from './Cursos.module.css';

type Pestana = 'contenido' | 'examenes' | 'participantes' | 'configuracion';
const ACEPTA: Partial<Record<TipoMaterial, string>> = {
  pdf: '.pdf,application/pdf', presentacion: '.ppt,.pptx,.pps,.ppsx,.odp', video: '.mp4,.m4v,.webm,.ogv,.mov,video/*',
};
const INICIAL: Record<string, string> = { pdf: 'PDF', presentacion: 'PPT', video: '▶', html: '</>', enlace: '↗' };

export default function CursoEditor() {
  const cursoId = Number(useParams().id);
  const { api, rutas } = useCursos();
  const [data, setData] = useState<DetalleStaff | null>(null), [error, setError] = useState('');
  const [pestana, setPestana] = useState<Pestana>('contenido');
  const cargar = useCallback(() => api.detalle(cursoId).then(d => { setData(d); setError(''); }).catch(e => setError(e.message)), [api, cursoId]);
  useEffect(() => { void cargar(); }, [cargar]);

  if (!data) return <div className={s.page}>{error ? <div role="alert" className={s.error}>{error}</div> : <p role="status" className={s.muted}>Cargando curso…</p>}</div>;
  const { curso } = data;
  const pestanas: [Pestana, string][] = [['contenido', `Contenido (${data.modulos.length} módulos)`], ['examenes', `Exámenes (${data.examenes.length})`],
    ['participantes', `Participantes (${curso.inscritos})`], ...(data.gestion ? [['configuracion', 'Datos del curso'] as [Pestana, string]] : [])];

  return <div className={s.page}>
    <Link to={rutas.dictar} className={s.link}>← {data.gestion ? 'Todos los cursos' : 'Mis cursos para dictar'}</Link>
    <div className={s.heading}>
      <div>
        <div className={c.etiquetas}><Etiqueta valor={curso.estado} /><Etiqueta valor={curso.visibilidad} /></div>
        <h1 style={{ marginTop: 8 }}>{curso.titulo}</h1>
        <div className={c.meta}>
          <span>Instructor: <strong>{curso.instructor_nombre ?? '—'}</strong></span><span><strong>{curso.horas}</strong> horas académicas</span>
          <span>{fechaCurso(curso.fecha_inicio)} – {fechaCurso(curso.fecha_fin)}</span><span>{precio(curso.costo)}</span><span>Aprueba con {curso.nota_minima}%</span>
        </div>
      </div>
      <Link className={s.secondary} to={rutas.aula(curso.id)}>Vista previa del aula</Link>
    </div>
    {curso.estado === 'borrador' && <div className={s.notice}>El curso está en borrador: los participantes aún no lo ven. {data.gestion ? 'Publícalo en “Datos del curso” cuando el contenido esté listo.' : 'Presidencia lo publicará cuando el contenido esté listo.'}</div>}
    {error && <div role="alert" className={s.error}>{error}</div>}
    <div className={s.tabs} style={{ marginBottom: 18 }} role="tablist">
      {pestanas.map(([v, l]) => <button key={v} role="tab" aria-selected={pestana === v} className={pestana === v ? s.tabActive : ''} onClick={() => setPestana(v)}>{l}</button>)}
    </div>
    {pestana === 'contenido' && <Contenido data={data} recargar={cargar} />}
    {pestana === 'examenes' && <ExamenesCurso data={data} recargar={cargar} />}
    {pestana === 'participantes' && <ParticipantesCurso cursoId={curso.id} gestion={data.gestion} />}
    {pestana === 'configuracion' && data.gestion && <section className={s.card}><CursoForm inicial={curso} onGuardado={() => void cargar()} /></section>}
  </div>;
}

function Contenido({ data, recargar }: { data: DetalleStaff; recargar: () => Promise<void> }) {
  const { api } = useCursos();
  const [error, setError] = useState(''), [ver, setVer] = useState<MaterialStaff | null>(null);
  const ejecutar = async (fn: () => Promise<unknown>, confirmar?: string) => {
    if (confirmar && !window.confirm(confirmar)) return false;
    setError('');
    try { await fn(); await recargar(); return true; }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo completar la acción.'); return false; }
  };
  return <>
    {error && <div role="alert" className={s.error}>{error}</div>}
    {data.modulos.map((m, i) => <ModuloEditor key={m.id} m={m} i={i} total={data.modulos.length} ejecutar={ejecutar} onVer={setVer} recargar={recargar}
      examen={data.examenes.find(e => e.modulo_id === m.id)} />)}
    {!data.modulos.length && <p className={s.empty}>Empieza creando el primer módulo del curso.</p>}
    <NuevoModulo crear={d => ejecutar(() => api.crearModulo(data.curso.id, d))} />
    {ver && <div className={s.modalBackdrop} onKeyDown={e => { if (e.key === 'Escape') setVer(null); }}>
      <div className={s.modal} role="dialog" aria-modal="true" aria-label={ver.titulo} style={{ width: 1100 }}>
        <MaterialVisor materialId={ver.id} />
        <div className={s.actions}><button className={s.secondary} onClick={() => setVer(null)} autoFocus>Cerrar</button></div>
      </div>
    </div>}
  </>;
}

type Ejecutar = (fn: () => Promise<unknown>, confirmar?: string) => Promise<boolean>;

function ModuloEditor({ m, i, total, examen, ejecutar, onVer, recargar }: { m: ModuloStaff; i: number; total: number; examen?: Examen; ejecutar: Ejecutar; onVer: (m: MaterialStaff) => void; recargar: () => Promise<void> }) {
  const { api } = useCursos();
  const [editando, setEditando] = useState(false), [titulo, setTitulo] = useState(m.titulo), [descripcion, setDescripcion] = useState(m.descripcion ?? '');
  const [materialEditado, setMaterialEditado] = useState<number | null>(null);
  return <section className={c.moduloEditor}>
    <div className={c.moduloEditorHead}>
      {editando ? <form className={s.form} style={{ flex: 1 }} onSubmit={async e => { e.preventDefault(); if (await ejecutar(() => api.actualizarModulo(m.id, { titulo, descripcion }))) setEditando(false); }}>
        <label className={`${s.field} ${s.wide}`}>Título del módulo<input value={titulo} onChange={e => setTitulo(e.target.value)} maxLength={200} required autoFocus /></label>
        <label className={`${s.field} ${s.wide}`}>Descripción<textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} maxLength={3000} /></label>
        <div className={`${s.actions} ${s.wide}`}><button className={s.button}>Guardar</button><button type="button" className={s.secondary} onClick={() => setEditando(false)}>Cancelar</button></div>
      </form> : <>
        <div><h3>Módulo {i + 1} · {m.titulo}</h3>{m.descripcion && <p className={s.muted} style={{ margin: '4px 0 0' }}>{m.descripcion}</p>}
          <p className={s.muted} style={{ margin: '4px 0 0' }}>{examen ? <>Examen: <strong>{examen.titulo}</strong> · {examen.publicado ? 'publicado' : 'no publicado'} · {examen.preguntas.length} preguntas</> : 'Sin examen de módulo (créalo en la pestaña Exámenes).'}</p></div>
        <div className={s.actions} style={{ marginTop: 0 }}>
          <button className={c.mini} disabled={i === 0} onClick={() => ejecutar(() => api.moverModulo(m.id, 'arriba'))} aria-label="Subir módulo">↑</button>
          <button className={c.mini} disabled={i === total - 1} onClick={() => ejecutar(() => api.moverModulo(m.id, 'abajo'))} aria-label="Bajar módulo">↓</button>
          <button className={c.mini} onClick={() => setEditando(true)}>Editar</button>
          <button className={`${c.mini} ${c.miniDanger}`} onClick={() => ejecutar(() => api.eliminarModulo(m.id), `¿Eliminar el módulo “${m.titulo}”, sus materiales${examen ? ' y su examen' : ''}?`)}>Eliminar</button>
        </div>
      </>}
    </div>
    <ul className={c.materiales}>
      {m.materiales.map((x, j) => <li key={x.id}>
        {materialEditado === x.id ? <EditarMaterial material={x} cerrar={() => setMaterialEditado(null)} guardar={d => ejecutar(() => api.actualizarMaterial(x.id, d))} /> : <>
          <span className={`${c.icono} ${c[`i_${x.tipo}`]}`}>{INICIAL[x.tipo]}</span>
          <div className={c.materialInfo}><strong>{x.titulo}</strong>
            <small>{ETIQUETAS[x.tipo]}{x.nombre_original ? ` · ${x.nombre_original}` : ''}{x.tamano ? ` · ${tamanoArchivo(x.tamano)}` : ''}{x.url ? ` · ${x.url}` : ''}{x.html_largo ? ` · ${Math.ceil(x.html_largo / 1024)} KB de HTML` : ''}</small></div>
          <button className={c.mini} onClick={() => onVer(x)}>Ver</button>
          <button className={c.mini} onClick={() => setMaterialEditado(x.id)}>Editar</button>
          <button className={c.mini} disabled={j === 0} onClick={() => ejecutar(() => api.moverMaterial(x.id, 'arriba'))} aria-label="Subir material">↑</button>
          <button className={c.mini} disabled={j === m.materiales.length - 1} onClick={() => ejecutar(() => api.moverMaterial(x.id, 'abajo'))} aria-label="Bajar material">↓</button>
          <button className={`${c.mini} ${c.miniDanger}`} onClick={() => ejecutar(() => api.eliminarMaterial(x.id), `¿Eliminar “${x.titulo}”?`)}>Eliminar</button>
        </>}
      </li>)}
      {!m.materiales.length && <li className={s.muted}>Este módulo aún no tiene materiales.</li>}
    </ul>
    <NuevoMaterial moduloId={m.id} recargar={recargar} />
  </section>;
}

function NuevoModulo({ crear }: { crear: (d: { titulo: string; descripcion: string }) => Promise<boolean> }) {
  const [titulo, setTitulo] = useState(''), [descripcion, setDescripcion] = useState(''), [busy, setBusy] = useState(false);
  async function enviar(e: FormEvent) {
    e.preventDefault(); setBusy(true);
    if (await crear({ titulo, descripcion })) { setTitulo(''); setDescripcion(''); }
    setBusy(false);
  }
  return <section className={s.card}>
    <h2>Agregar módulo</h2>
    <form className={s.form} onSubmit={enviar}>
      <label className={`${s.field} ${s.wide}`}>Título<input value={titulo} onChange={e => setTitulo(e.target.value)} maxLength={200} required disabled={busy} placeholder="Ej. Módulo 1: Evaluación primaria del paciente" /></label>
      <label className={`${s.field} ${s.wide}`}>Descripción (opcional)<textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} maxLength={3000} disabled={busy} /></label>
      <div className={`${s.actions} ${s.wide}`}><button className={s.button} disabled={busy}>{busy ? 'Guardando…' : 'Agregar módulo'}</button></div>
    </form>
  </section>;
}

function NuevoMaterial({ moduloId, recargar }: { moduloId: number; recargar: () => Promise<void> }) {
  const { api } = useCursos();
  const [abierto, setAbierto] = useState(false), [tipo, setTipo] = useState<TipoMaterial>('pdf'), [titulo, setTitulo] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null), [html, setHtml] = useState(''), [url, setUrl] = useState('');
  const [progreso, setProgreso] = useState<number | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const conArchivo = tipo === 'pdf' || tipo === 'presentacion' || tipo === 'video';
  const tituloDe = (nombre: string) => { if (!titulo) setTitulo(nombre.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ')); };

  async function cargarHtml(f: File | undefined) {
    if (!f) return;
    if (f.size > 2_000_000) { setError('El archivo HTML supera 2 MB.'); return; }
    setHtml(await f.text()); tituloDe(f.name);
  }
  async function enviar(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      if (conArchivo) {
        if (!archivo) throw new Error('Seleccione el archivo.');
        const fd = new FormData(); fd.append('titulo', titulo); fd.append('tipo', tipo); fd.append('archivo', archivo);
        setProgreso(0); await api.subirMaterial(moduloId, fd, setProgreso);
      } else await api.crearMaterial(moduloId, tipo === 'html' ? { titulo, tipo, html } : { titulo, tipo, url });
      setTitulo(''); setArchivo(null); setHtml(''); setUrl(''); setAbierto(false);
      await recargar();
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo agregar el material.'); }
    finally { setBusy(false); setProgreso(null); }
  }
  if (!abierto) return <div className={c.nuevoMaterial}><button className={s.secondary} onClick={() => setAbierto(true)}>+ Agregar material</button></div>;
  return <form className={`${c.nuevoMaterial} ${s.form}`} onSubmit={enviar}>
    <label className={s.field}>Tipo de material
      <select value={tipo} onChange={e => { setTipo(e.target.value as TipoMaterial); setArchivo(null); setError(''); }} disabled={busy}>
        <option value="pdf">PDF</option><option value="presentacion">Presentación PowerPoint</option><option value="video">Video (archivo)</option>
        <option value="html">Práctica HTML personalizada</option><option value="enlace">Enlace (YouTube, Vimeo, Drive u otro sitio)</option>
      </select></label>
    <label className={s.field}>Título<input value={titulo} onChange={e => setTitulo(e.target.value)} maxLength={200} required disabled={busy} /></label>
    {conArchivo && <label className={`${s.field} ${s.wide}`}>Archivo
      <input type="file" accept={ACEPTA[tipo]} required disabled={busy} onChange={e => { const f = e.target.files?.[0] ?? null; setArchivo(f); if (f) tituloDe(f.name); }} />
      <span className={s.muted} style={{ fontWeight: 400 }}>
        {tipo === 'pdf' && 'Se muestra dentro del aula.'}
        {tipo === 'presentacion' && 'PPT, PPTX, PPS, PPSX u ODP. Se visualiza con el visor de Office cuando el sitio está publicado; también puede descargarse.'}
        {tipo === 'video' && 'MP4 (recomendado), WebM u OGV. Para videos muy pesados conviene subirlos a YouTube (no listado) y usar “Enlace”.'}
      </span></label>}
    {tipo === 'html' && <>
      <label className={`${s.field} ${s.wide}`}>Código HTML (puede incluir CSS y JavaScript)
        <textarea className={c.codigo} value={html} onChange={e => setHtml(e.target.value)} required disabled={busy} spellCheck={false}
          placeholder={'<!doctype html>\n<html>\n  <body>\n    <h1>Práctica</h1>\n    <script>/* interacción */</script>\n  </body>\n</html>'} /></label>
      <label className={`${s.field} ${s.wide}`}>…o cargar un archivo .html<input type="file" accept=".html,.htm,text/html" disabled={busy} onChange={e => void cargarHtml(e.target.files?.[0])} />
        <span className={s.muted} style={{ fontWeight: 400 }}>Se ejecuta aislado del sitio: no puede acceder a la sesión ni a datos de los participantes. Las imágenes deben estar incrustadas o enlazadas desde internet.</span></label>
    </>}
    {tipo === 'enlace' && <label className={`${s.field} ${s.wide}`}>Enlace<input type="url" value={url} onChange={e => setUrl(e.target.value)} maxLength={500} required disabled={busy} placeholder="https://www.youtube.com/watch?v=…" /></label>}
    {progreso !== null && <div className={s.wide}><div className={c.barraTexto}><span>Subiendo archivo…</span><span>{progreso}%</span></div><div className={c.progreso}><span style={{ width: `${progreso}%` }} /></div></div>}
    {error && <div role="alert" className={`${s.error} ${s.wide}`}>{error}</div>}
    <div className={`${s.actions} ${s.wide}`}>
      <button className={s.button} disabled={busy}>{busy ? 'Guardando…' : 'Agregar material'}</button>
      <button type="button" className={s.secondary} disabled={busy} onClick={() => setAbierto(false)}>Cancelar</button>
    </div>
  </form>;
}

function EditarMaterial({ material, cerrar, guardar }: { material: MaterialStaff; cerrar: () => void; guardar: (d: { titulo: string; html?: string; url?: string }) => Promise<boolean> }) {
  const { api } = useCursos();
  const [titulo, setTitulo] = useState(material.titulo), [url, setUrl] = useState(material.url ?? '');
  const [html, setHtml] = useState<string | null>(material.tipo === 'html' ? null : ''), [busy, setBusy] = useState(false);
  useEffect(() => { if (material.tipo === 'html') api.contenido(material.id).then(d => setHtml(d.html ?? '')).catch(() => setHtml('')); }, [api, material]);
  async function enviar(e: FormEvent) {
    e.preventDefault(); setBusy(true);
    const datos = { titulo, ...(material.tipo === 'html' && html !== null ? { html } : {}), ...(material.tipo === 'enlace' ? { url } : {}) };
    if (await guardar(datos)) cerrar(); else setBusy(false);
  }
  return <form className={s.form} style={{ flex: 1 }} onSubmit={enviar}>
    <label className={`${s.field} ${s.wide}`}>Título<input value={titulo} onChange={e => setTitulo(e.target.value)} maxLength={200} required autoFocus disabled={busy} /></label>
    {material.tipo === 'enlace' && <label className={`${s.field} ${s.wide}`}>Enlace<input type="url" value={url} onChange={e => setUrl(e.target.value)} maxLength={500} required disabled={busy} /></label>}
    {material.tipo === 'html' && (html === null ? <p className={s.muted}>Cargando HTML…</p>
      : <label className={`${s.field} ${s.wide}`}>Código HTML<textarea className={c.codigo} value={html} onChange={e => setHtml(e.target.value)} required disabled={busy} spellCheck={false} /></label>)}
    {['pdf', 'presentacion', 'video'].includes(material.tipo) && <p className={`${s.muted} ${s.wide}`}>Para reemplazar el archivo, elimine este material y suba el nuevo.</p>}
    <div className={`${s.actions} ${s.wide}`}><button className={s.button} disabled={busy || html === null}>Guardar</button><button type="button" className={s.secondary} onClick={cerrar} disabled={busy}>Cancelar</button></div>
  </form>;
}
