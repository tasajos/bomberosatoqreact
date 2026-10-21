import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { gestionApi } from '../../services/gestionApi';
import { comprobanteLlamada, descargarLlamadaPDF } from '../../utils/personalPdf';
import { Badge, fechaCorta, Feedback, FieldsForm, hoy, labels, useMutation, useRemote } from './shared';
import { ComprobantePagina } from './Voucher';
import s from './Gestion.module.css';

/** Llamadas de atención con memorándum correlativo LLA (digital y PDF). */
export default function Llamadas(){
  const r=useRemote(gestionApi.llamadas),personal=useRemote(gestionApi.personal),reg=useRemote(gestionApi.reglamento),m=useMutation(r.reload);
  const faltas=(reg.data??[]).filter(a=>a.activo&&a.tipo==='demerito');
  const [persona,setPersona]=useState(''),[gravedad,setGravedad]=useState(''),[q,setQ]=useState(''),[pdf,setPdf]=useState('');
  const rows=(r.data??[]).filter(l=>(!gravedad||l.gravedad===gravedad)&&`${l.codigo} ${l.persona} ${l.matricula} ${l.motivo}`.toLowerCase().includes(q.toLowerCase()));
  async function descargar(codigo:string){setPdf(codigo);try{await descargarLlamadaPDF(await gestionApi.llamada(codigo));}finally{setPdf('');}}
  return <div className={s.page}>
    <div className={s.heading}><div><h1>Llamadas de atención</h1><p className={s.muted}>Cada llamada emite un memorándum correlativo (LLA001…), se notifica al voluntario y queda en su file y en la bitácora.</p></div><button className={s.secondary} onClick={r.reload}>Actualizar</button></div>
    <Feedback loading={r.loading} error={r.error||personal.error||m.error} message={m.message}>{m.comprobante&&<Link to={`/personal/llamada/${m.comprobante}`}>Ver memorándum {m.comprobante}</Link>}</Feedback>
    <section className={`${s.card} ${s.formCard} ${s.tono_baja}`}>
      <div className={s.cardHead}><h2>Registrar llamada de atención</h2><span className={s.nextCode}>Se emitirá el memorándum LLA</span></div>
      <label className={s.field} style={{maxWidth:420,marginBottom:14}}>Persona<select value={persona} onChange={e=>setPersona(e.target.value)}><option value="">Seleccione…</option>{(personal.data?.personal??[]).filter(p=>p.estado!=='baja').map(p=><option key={p.id} value={p.id}>{p.matricula||'—'} · {p.nombre_completo}</option>)}</select></label>
      {persona&&<FieldsForm key={persona} busy={m.busy} label="Registrar y emitir memorándum" onSubmit={async d=>{const ok=await m.save(`/personal/${persona}/llamadas`,d);if(ok)setPersona('');return ok;}} fields={[
        {name:'reglamento_id',label:'Falta según reglamento (opcional: fija gravedad y puntos)',options:faltas.map(a=>[String(a.id),`${a.codigo} · ${a.descripcion} (-${a.puntos} pts, ${labels[a.gravedad??'leve'].toLowerCase()})`]),required:false,wide:true},
        {name:'tipo',label:'Tipo',options:[['escrita','Escrita'],['verbal','Verbal']]},{name:'gravedad',label:'Gravedad (si no cita una falta)',options:[['leve','Leve'],['grave','Grave'],['muy_grave','Muy grave']],required:false},
        {name:'fecha',label:'Fecha del hecho',type:'date',value:hoy()},{name:'puntos',label:'Puntos a descontar (si no cita una falta)',type:'number',min:'0',step:'1',value:'0',required:false},
        {name:'motivo',label:'Motivo (si no cita una falta)',max:200,required:false,wide:true},{name:'descripcion',label:'Descripción de los hechos',type:'textarea',max:3000,wide:true}]}/>}
    </section>
    <section className={s.card}>
      <div className={s.cardHead}><h2>Registro</h2><div className={s.toolbar}>
        <div className={s.tabs}>{([['','Todas'],['leve','Leves'],['grave','Graves'],['muy_grave','Muy graves']] as const).map(([v,l])=><button key={v} aria-pressed={gravedad===v} className={gravedad===v?s.tabActive:''} onClick={()=>setGravedad(v)}>{l}</button>)}</div>
        <input className={s.search} placeholder="Código, persona o motivo…" aria-label="Buscar llamadas" value={q} onChange={e=>setQ(e.target.value)}/>
      </div></div>
      {rows.length?<div className={s.tableWrap}><table className={s.table}><thead><tr><th>Memorándum</th><th>Persona</th><th>Fecha</th><th>Motivo</th><th>Gravedad</th><th className={s.num}>Puntos</th><th></th></tr></thead><tbody>
        {rows.map(l=><tr key={l.id}><td><span className={`${s.code} ${s.codeOut}`}>{l.codigo}</span><p>{labels[l.tipo]}</p></td><td><Link to={`/personal/file/${l.voluntario_id}`}><strong>{l.persona}</strong></Link><p>{l.matricula}</p></td><td>{fechaCorta(l.fecha.slice(0,10))}</td><td>{l.motivo}{l.reglamento_codigo&&<p>Falta: {l.reglamento_codigo}</p>}<p>{l.registrado_nombre}</p></td><td><Badge value={l.gravedad}/></td><td className={`${s.num} ${s.mono}`}>{l.puntos?`−${l.puntos}`:'—'}</td>
          <td><div className={s.rowActions}><Link className={s.chip} to={`/personal/llamada/${l.codigo}`}>Ver</Link><button className={s.chip} disabled={pdf===l.codigo} onClick={()=>descargar(l.codigo)}>{pdf===l.codigo?'…':'PDF'}</button></div></td></tr>)}
      </tbody></table></div>:<p className={s.empty}>No hay llamadas de atención registradas.</p>}
    </section>
  </div>;
}

export function LlamadaDoc(){
  const {codigo=''}=useParams();
  const load=useCallback(()=>gestionApi.llamada(codigo),[codigo]),r=useRemote(load),l=r.data;
  return <ComprobantePagina titulo={`Memorándum ${codigo.toUpperCase()}`} subtitulo="Llamada de atención. Descárguela en PDF (original para personal y copia para el voluntario) o imprímala."
    loading={r.loading} error={r.error} pdf={l?()=>descargarLlamadaPDF(l):undefined} comprobante={l&&comprobanteLlamada(l)}
    pie="El voluntario puede presentar su descargo por escrito ante la Jefatura de Personal."/>;
}
