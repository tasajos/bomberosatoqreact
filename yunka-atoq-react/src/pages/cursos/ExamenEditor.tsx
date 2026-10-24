import { useState } from 'react';
import type { FormEvent } from 'react';
import type { DatosExamen, DetalleStaff, Examen, Pregunta } from '../../services/cursosApi';
import { useCursos } from './zona';
import s from '../gestion/Gestion.module.css';
import c from './Cursos.module.css';

const preguntaVacia = (): Pregunta => ({ texto: '', tipo: 'unica', puntos: 1, opciones: [{ texto: '', correcta: false }, { texto: '', correcta: false }] });
const datosDe = (e: Examen): DatosExamen => ({ modulo_id: e.modulo_id, titulo: e.titulo, instrucciones: e.instrucciones, intentos_max: e.intentos_max, publicado: e.publicado, preguntas: e.preguntas });

export default function ExamenesCurso({ data, recargar }: { data: DetalleStaff; recargar: () => Promise<void> }) {
  const { api } = useCursos();
  const [editando, setEditando] = useState<Examen | 'nuevo' | null>(null), [error, setError] = useState('');
  const alcance = (e: Examen) => e.modulo_id === null ? 'Examen final' : `Módulo ${data.modulos.findIndex(m => m.id === e.modulo_id) + 1} · ${data.modulos.find(m => m.id === e.modulo_id)?.titulo ?? ''}`;
  async function accion(fn: () => Promise<unknown>, confirmar?: string) {
    if (confirmar && !window.confirm(confirmar)) return;
    setError('');
    try { await fn(); await recargar(); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo completar la acción.'); }
  }
  const publicados = data.examenes.filter(e => e.publicado).length;

  if (editando) return <ExamenForm data={data} examen={editando === 'nuevo' ? undefined : editando} cerrar={() => setEditando(null)}
    guardar={async datos => {
      if (editando === 'nuevo') await api.crearExamen(data.curso.id, datos); else await api.actualizarExamen(editando.id, datos);
      await recargar(); setEditando(null);
    }} />;
  return <>
    <div className={s.heading}>
      <p className={s.muted} style={{ margin: 0 }}>Cada módulo puede tener un examen y el curso un examen final. La nota final es el promedio de la mejor nota de cada examen publicado; aprueba quien alcanza {data.curso.nota_minima}% o más.</p>
      <button className={s.button} onClick={() => setEditando('nuevo')}>+ Nuevo examen</button>
    </div>
    {error && <div role="alert" className={s.error}>{error}</div>}
    {data.examenes.length ? <div className={`${s.card} ${s.tableWrap}`} style={{ padding: 0 }}>
      <table className={s.table}>
        <thead><tr><th>Examen</th><th>Alcance</th><th>Preguntas</th><th>Intentos permitidos</th><th>Intentos rendidos</th><th>Estado</th><th /></tr></thead>
        <tbody>{data.examenes.map(e => <tr key={e.id}>
          <td><strong>{e.titulo}</strong></td><td>{alcance(e)}</td>
          <td>{e.preguntas.length} · {e.preguntas.reduce((t, p) => t + p.puntos, 0)} pts</td><td>{e.intentos_max}</td><td>{e.intentos}</td>
          <td><span className={`${s.badge} ${e.publicado ? s.good : s.pending}`}>{e.publicado ? 'Publicado' : 'No publicado'}</span></td>
          <td><div className={s.actions} style={{ marginTop: 0, flexWrap: 'nowrap' }}>
            <button className={s.secondary} onClick={() => setEditando(e)}>Editar</button>
            <button className={s.secondary} onClick={() => accion(() => api.actualizarExamen(e.id, { ...datosDe(e), publicado: !e.publicado }))}>{e.publicado ? 'Despublicar' : 'Publicar'}</button>
            <button className={s.danger} onClick={() => accion(() => api.eliminarExamen(e.id), `¿Eliminar el examen “${e.titulo}”?`)}>Eliminar</button>
          </div></td>
        </tr>)}</tbody>
      </table>
    </div> : <p className={s.empty}>Este curso todavía no tiene exámenes. Sin exámenes, el certificado se emite por participación.</p>}
    {data.examenes.length > 0 && !publicados && <div className={s.notice}>Ningún examen está publicado: los participantes no los verán hasta publicarlos.</div>}
  </>;
}

function ExamenForm({ data, examen, cerrar, guardar }: { data: DetalleStaff; examen?: Examen; cerrar: () => void; guardar: (d: DatosExamen) => Promise<void> }) {
  const ocupados = new Set(data.examenes.filter(e => e.id !== examen?.id).map(e => e.modulo_id ?? 'final'));
  const [f, setF] = useState<DatosExamen>(() => examen ? datosDe(examen) : {
    modulo_id: ocupados.has('final') ? data.modulos.find(m => !ocupados.has(m.id))?.id ?? null : null,
    titulo: '', instrucciones: '', intentos_max: 2, publicado: false, preguntas: [preguntaVacia()],
  });
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const setPregunta = (i: number, cambio: Partial<Pregunta>) => setF(v => ({ ...v, preguntas: v.preguntas.map((p, k) => k === i ? { ...p, ...cambio } : p) }));
  const setOpciones = (i: number, fn: (o: Pregunta['opciones']) => Pregunta['opciones']) => setF(v => ({ ...v, preguntas: v.preguntas.map((p, k) => k === i ? { ...p, opciones: fn(p.opciones) } : p) }));
  const marcarCorrecta = (i: number, j: number) => {
    const p = f.preguntas[i];
    setOpciones(i, os => os.map((o, k) => p.tipo === 'unica' ? { ...o, correcta: k === j } : k === j ? { ...o, correcta: !o.correcta } : o));
  };
  const cambiarTipo = (i: number, tipo: Pregunta['tipo']) => {
    const p = f.preguntas[i], primera = p.opciones.findIndex(o => o.correcta);
    setPregunta(i, { tipo, opciones: tipo === 'unica' ? p.opciones.map((o, k) => ({ ...o, correcta: k === primera })) : p.opciones });
  };
  const moverPregunta = (i: number, d: number) => setF(v => { const ps = [...v.preguntas]; [ps[i], ps[i + d]] = [ps[i + d], ps[i]]; return { ...v, preguntas: ps }; });

  async function enviar(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try { await guardar(f); } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar el examen.'); setBusy(false); }
  }
  const total = f.preguntas.reduce((t, p) => t + (Number(p.puntos) || 0), 0);
  return <form onSubmit={enviar}>
    <section className={s.card}>
      <h2>{examen ? `Editar examen · ${examen.titulo}` : 'Nuevo examen'}</h2>
      {examen && examen.intentos > 0 && <div className={s.notice}>Este examen ya tiene {examen.intentos} intento(s). Los cambios en las preguntas solo afectan a los próximos intentos; las notas registradas se conservan.</div>}
      <div className={s.form}>
        <label className={s.field}>Alcance
          <select value={f.modulo_id ?? 'final'} onChange={e => setF(v => ({ ...v, modulo_id: e.target.value === 'final' ? null : Number(e.target.value) }))} disabled={busy}>
            <option value="final" disabled={ocupados.has('final')}>Examen final del curso{ocupados.has('final') ? ' (ya existe)' : ''}</option>
            {data.modulos.map((m, i) => <option key={m.id} value={m.id} disabled={ocupados.has(m.id)}>Módulo {i + 1} · {m.titulo}{ocupados.has(m.id) ? ' (ya tiene examen)' : ''}</option>)}
          </select></label>
        <label className={s.field}>Título<input value={f.titulo} onChange={e => setF(v => ({ ...v, titulo: e.target.value }))} maxLength={200} required disabled={busy} placeholder="Ej. Evaluación del módulo 1" /></label>
        <label className={`${s.field} ${s.wide}`}>Instrucciones (opcional)<textarea value={f.instrucciones ?? ''} onChange={e => setF(v => ({ ...v, instrucciones: e.target.value }))} maxLength={3000} disabled={busy} /></label>
        <label className={s.field}>Intentos permitidos<input type="number" min={1} max={10} value={f.intentos_max} onChange={e => setF(v => ({ ...v, intentos_max: Number(e.target.value) }))} required disabled={busy} /></label>
        <label className={s.field} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 24 }}>
          <input type="checkbox" checked={f.publicado} onChange={e => setF(v => ({ ...v, publicado: e.target.checked }))} disabled={busy} /> Publicado (visible para los participantes)</label>
      </div>
    </section>

    {f.preguntas.map((p, i) => <div key={i} className={c.preguntaEditor}>
      <div className={c.preguntaEditorHead}>
        <strong>Pregunta {i + 1}</strong>
        <div className={s.actions} style={{ marginTop: 0 }}>
          <select className={c.mini} value={p.tipo} onChange={e => cambiarTipo(i, e.target.value as Pregunta['tipo'])} disabled={busy} aria-label="Tipo de pregunta">
            <option value="unica">Respuesta única</option><option value="multiple">Respuesta múltiple</option></select>
          <label className={s.muted} style={{ display: 'flex', gap: 5, alignItems: 'center' }}>Puntos
            <input type="number" className={c.mini} style={{ width: 60 }} min={1} max={100} value={p.puntos} onChange={e => setPregunta(i, { puntos: Number(e.target.value) })} disabled={busy} /></label>
          <button type="button" className={c.mini} disabled={busy || i === 0} onClick={() => moverPregunta(i, -1)} aria-label="Subir pregunta">↑</button>
          <button type="button" className={c.mini} disabled={busy || i === f.preguntas.length - 1} onClick={() => moverPregunta(i, 1)} aria-label="Bajar pregunta">↓</button>
          <button type="button" className={`${c.mini} ${c.miniDanger}`} disabled={busy || f.preguntas.length === 1} onClick={() => setF(v => ({ ...v, preguntas: v.preguntas.filter((_, k) => k !== i) }))}>Quitar</button>
        </div>
      </div>
      <label className={s.field}><span className={s.muted}>Enunciado</span>
        <textarea value={p.texto} onChange={e => setPregunta(i, { texto: e.target.value })} maxLength={2000} required disabled={busy} style={{ minHeight: 60 }} /></label>
      <p className={s.muted} style={{ margin: '10px 0 4px' }}>Opciones — marca {p.tipo === 'unica' ? 'la respuesta correcta' : 'todas las respuestas correctas'}:</p>
      {p.opciones.map((o, j) => <div key={j} className={c.opcionEditor}>
        <label><input type={p.tipo === 'unica' ? 'radio' : 'checkbox'} name={`correcta-${i}`} checked={o.correcta} onChange={() => marcarCorrecta(i, j)} disabled={busy} /> Correcta</label>
        <input type="text" value={o.texto} onChange={e => setOpciones(i, os => os.map((x, k) => k === j ? { ...x, texto: e.target.value } : x))} maxLength={500} required disabled={busy} placeholder={`Opción ${j + 1}`} />
        <button type="button" className={`${c.mini} ${c.miniDanger}`} disabled={busy || p.opciones.length <= 2} onClick={() => setOpciones(i, os => os.filter((_, k) => k !== j))} aria-label={`Quitar opción ${j + 1}`}>✕</button>
      </div>)}
      {p.opciones.length < 8 && <button type="button" className={c.mini} disabled={busy} onClick={() => setOpciones(i, os => [...os, { texto: '', correcta: false }])}>+ Opción</button>}
    </div>)}

    <div className={s.actions}>
      <button type="button" className={s.secondary} disabled={busy || f.preguntas.length >= 100} onClick={() => setF(v => ({ ...v, preguntas: [...v.preguntas, preguntaVacia()] }))}>+ Agregar pregunta</button>
      <span className={s.muted}>{f.preguntas.length} pregunta(s) · {total} puntos en total</span>
    </div>
    {error && <div role="alert" className={s.error}>{error}</div>}
    <div className={s.actions}>
      <button className={s.button} disabled={busy}>{busy ? 'Guardando…' : 'Guardar examen'}</button>
      <button type="button" className={s.secondary} disabled={busy} onClick={cerrar}>Cancelar</button>
    </div>
  </form>;
}
