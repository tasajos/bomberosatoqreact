import { useState } from 'react';
import { gestionApi } from '../../services/gestionApi';
import type { ArticuloReglamento } from '../../services/gestionApi';
import { Badge, DecisionModal, Feedback, FieldsForm, useMutation, useRemote } from './shared';
import type { Decision, Field } from './shared';
import s from './Gestion.module.css';

const GRAVEDADES:[string,string][]=[['leve','Leve'],['grave','Grave'],['muy_grave','Muy grave']];

/** Catálogo de méritos y deméritos: cada registro disciplinario cita un artículo y toma sus puntos. */
export default function Reglamento(){
  const r=useRemote(gestionApi.reglamento),m=useMutation(r.reload);
  const [tipo,setTipo]=useState<'merito'|'demerito'>('demerito'),[decision,setDecision]=useState<Decision|null>(null),[mostrarInactivos,setInactivos]=useState(false);
  const rows=(r.data??[]).filter(a=>a.tipo===tipo&&(mostrarInactivos||a.activo));
  const campos=(t:'merito'|'demerito',a?:ArticuloReglamento):Field[]=>[
    {name:'codigo',label:'Artículo / código (ej. Art. 12 inc. b, RO-001/25)',max:40,value:a?.codigo},
    {name:'puntos',label:t==='merito'?'Puntos que suma':'Puntos que descuenta',type:'number',min:'0',step:'1',value:a?String(a.puntos):'0'},
    ...(t==='demerito'?[{name:'gravedad',label:'Gravedad de la falta',options:GRAVEDADES,value:a?.gravedad??''} as Field]:[]),
    {name:'sancion',label:t==='demerito'?'Sanción prevista (opcional)':'Reconocimiento previsto (opcional)',max:300,required:false,value:a?.sancion??''},
    {name:'descripcion',label:t==='merito'?'Descripción del mérito':'Descripción de la falta',type:'textarea',max:300,wide:true,value:a?.descripcion},
  ];
  return <div className={s.page}>
    <div className={s.heading}><div><h1>Reglamento disciplinario</h1><p className={s.muted}>Artículos de méritos y deméritos con su puntaje. Al registrar un mérito, demérito o llamada de atención se cita el artículo y se aplican sus puntos.</p></div><button className={s.secondary} onClick={r.reload}>Actualizar</button></div>
    <Feedback loading={r.loading} error={r.error||m.error} message={m.message}/>
    <p className={s.notice}>Se precargaron los ítems disciplinarios del Reglamento RO-001/25 de Antigüedad y Jerarquía. Agregue aquí los artículos del reglamento de disciplina vigente. Modificar un artículo solo afecta a los registros futuros.</p>
    <div className={s.tabs} style={{marginBottom:16}}>{([['demerito','Deméritos (faltas)'],['merito','Méritos']] as const).map(([v,l])=><button key={v} aria-pressed={tipo===v} className={tipo===v?s.tabActive:''} onClick={()=>setTipo(v)}>{l} ({(r.data??[]).filter(a=>a.tipo===v&&a.activo).length})</button>)}</div>
    <section className={`${s.card} ${s.formCard} ${tipo==='merito'?s.tono_devolucion:s.tono_baja}`}>
      <div className={s.cardHead}><h2>Agregar {tipo==='merito'?'mérito':'falta'}</h2></div>
      <FieldsForm key={tipo} busy={m.busy} label="Agregar al reglamento" onSubmit={d=>m.save('/personal/reglamento',{...d,tipo})} fields={campos(tipo)}/>
    </section>
    <section className={s.card}>
      <div className={s.cardHead}><h2>{tipo==='merito'?'Méritos':'Deméritos'}</h2><label className={s.muted} style={{display:'flex',gap:6,alignItems:'center'}}><input type="checkbox" checked={mostrarInactivos} onChange={e=>setInactivos(e.target.checked)}/>Mostrar inactivos</label></div>
      {rows.length?<div className={s.tableWrap}><table className={s.table}><thead><tr><th>Artículo</th><th>Descripción</th>{tipo==='demerito'&&<th>Gravedad</th>}<th className={s.num}>Puntos</th><th>{tipo==='demerito'?'Sanción':'Reconocimiento'}</th><th></th></tr></thead><tbody>
        {rows.map(a=><tr key={a.id} style={a.activo?undefined:{opacity:.55}}><td><span className={`${s.code} ${tipo==='merito'?s.codeIn:s.codeOut}`}>{a.codigo}</span></td><td>{a.descripcion}{!a.activo&&<p>Inactivo</p>}</td>
          {tipo==='demerito'&&<td>{a.gravedad&&<Badge value={a.gravedad}/>}</td>}
          <td className={`${s.num} ${s.mono} ${tipo==='merito'?s.plus:s.minus}`}>{tipo==='merito'?'+':'−'}{a.puntos}</td><td>{a.sancion||'—'}</td>
          <td><div className={s.rowActions}>
            <button className={s.chip} onClick={()=>setDecision({title:`Modificar ${a.codigo}`,description:'El cambio aplica a los registros futuros; los anteriores conservan sus puntos.',path:`/personal/reglamento/${a.id}`,fields:campos(tipo,a),label:'Guardar cambios'})}>Editar</button>
            <button className={a.activo?s.chipDanger:s.chip} onClick={()=>setDecision({title:`${a.activo?'Desactivar':'Activar'} artículo`,description:`${a.codigo} · ${a.descripcion}${a.activo?'. No se podrá citar en nuevos registros.':''}`,path:`/personal/reglamento/${a.id}/estado`,body:{activo:!a.activo}})}>{a.activo?'Desactivar':'Activar'}</button>
          </div></td></tr>)}
      </tbody></table></div>:<p className={s.empty}>No hay artículos registrados.</p>}
    </section>
    <DecisionModal decision={decision} close={()=>setDecision(null)} mutation={m}/>
  </div>;
}
