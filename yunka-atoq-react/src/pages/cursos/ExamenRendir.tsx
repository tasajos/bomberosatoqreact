import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { ExamenParaRendir, ResultadoExamen } from '../../services/cursosApi';
import { useCursos } from './zona';
import s from '../gestion/Gestion.module.css';
import c from './Cursos.module.css';

export default function ExamenRendir({ examenId, onTerminar }: { examenId: number; onTerminar: () => void }) {
  const { api } = useCursos();
  const [examen, setExamen] = useState<ExamenParaRendir | null>(null), [respuestas, setRespuestas] = useState<number[][]>([]);
  const [error, setError] = useState(''), [enviando, setEnviando] = useState(false), [confirmar, setConfirmar] = useState(false);
  const [resultado, setResultado] = useState<ResultadoExamen | null>(null);
  useEffect(() => {
    let activo = true;
    setExamen(null); setResultado(null); setError(''); setConfirmar(false);
    api.examen(examenId).then(e => { if (activo) { setExamen(e); setRespuestas(e.preguntas.map(() => [])); } }).catch(e => { if (activo) setError(e.message); });
    return () => { activo = false; };
  }, [api, examenId]);

  if (error && !examen) return <div role="alert" className={s.error}>{error}</div>;
  if (!examen) return <p role="status" className={s.muted}>Cargando examen…</p>;
  if (resultado) return <div>
    <h2>{examen.titulo}</h2>
    <div className={`${c.resultado} ${resultado.aprobado ? c.aprobado : c.reprobado}`} role="status">
      <strong>{resultado.puntaje}%</strong>
      {resultado.aprobado ? 'Aprobado' : `No alcanzaste el ${resultado.nota_minima}% requerido`} · {resultado.correctas} de {resultado.total} respuestas correctas
    </div>
    <p className={s.muted}>Intento {resultado.intento} de {examen.intentos_max}. {resultado.intentos_restantes > 0 ? `Te quedan ${resultado.intentos_restantes} intento(s); se considera tu mejor nota.` : 'Ya no quedan intentos para este examen.'}</p>
    <button className={s.button} onClick={onTerminar}>Volver al curso</button>
  </div>;

  const sinResponder = respuestas.filter(r => !r.length).length;
  const marcar = (i: number, j: number, multiple: boolean) => {
    setConfirmar(false);
    setRespuestas(rs => rs.map((r, k) => k !== i ? r : multiple ? (r.includes(j) ? r.filter(x => x !== j) : [...r, j].sort((a, b) => a - b)) : [j]));
  };
  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (sinResponder && !confirmar) { setConfirmar(true); return; }
    setEnviando(true); setError('');
    try { setResultado(await api.rendir(examenId, respuestas)); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo enviar el examen.'); }
    finally { setEnviando(false); }
  }

  return <form onSubmit={enviar}>
    <div className={c.visorHead}>
      <div><span className={s.badge}>Examen</span><h2 style={{ marginTop: 8 }}>{examen.titulo}</h2></div>
      <span className={s.muted}>{examen.vista_previa ? 'Vista previa' : `Intento ${examen.intentos_usados + 1} de ${examen.intentos_max}`}</span>
    </div>
    {examen.vista_previa && <div className={s.notice}>Vista previa del instructor: puedes revisar el examen, pero las respuestas no se registran.</div>}
    {examen.instrucciones && <p className={s.line}>{examen.instrucciones}</p>}
    {examen.preguntas.map((p, i) => <fieldset key={i} className={c.pregunta}>
      <legend>{i + 1}. {p.texto} <small>· {p.puntos} pt{p.puntos === 1 ? '' : 's'}{p.tipo === 'multiple' ? ' · marca todas las correctas' : ''}</small></legend>
      {p.opciones.map((o, j) => <label key={j} className={c.opcion}>
        <input type={p.tipo === 'multiple' ? 'checkbox' : 'radio'} name={`p${i}`} checked={respuestas[i]?.includes(j) ?? false}
          onChange={() => marcar(i, j, p.tipo === 'multiple')} disabled={enviando} />
        <span>{o}</span>
      </label>)}
    </fieldset>)}
    {error && <div role="alert" className={s.error}>{error}</div>}
    {confirmar && <div role="alert" className={s.notice}>Tienes {sinResponder} pregunta(s) sin responder; se calificarán como incorrectas. Presiona “Enviar examen” otra vez para confirmar.</div>}
    <div className={s.actions}>
      <button className={s.button} disabled={enviando || examen.vista_previa}>{enviando ? 'Enviando…' : 'Enviar examen'}</button>
      <button type="button" className={s.secondary} onClick={onTerminar} disabled={enviando}>Cancelar</button>
    </div>
  </form>;
}
