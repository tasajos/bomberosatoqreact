import { useState } from 'react';
import { Link } from 'react-router-dom';
import { gestionApi } from '../../services/gestionApi';
import { Badge, DecisionModal, fechaCorta, Feedback, FieldsForm, hoy, labels, useMutation, useRemote } from './shared';
import type { Decision } from './shared';
import s from './Gestion.module.css';

/** Comisiones del personal: al asignarla la persona pasa a «En comisión» y al finalizarla recupera su estado. */
export default function Comisiones(){
  const r=useRemote(gestionApi.comisiones),personal=useRemote(gestionApi.personal);
  const m=useMutation(()=>{r.reload();personal.reload();});
  const [estado,setEstado]=useState<'activa'|'finalizada'|''>('activa'),[decision,setDecision]=useState<Decision|null>(null),[persona,setPersona]=useState('');
  const rows=(r.data??[]).filter(c=>!estado||c.estado===estado);
  const elegibles=(personal.data?.personal??[]).filter(p=>['activo','pasiva','cooperador'].includes(p.estado)&&p.role!=='postulante');
  return <div className={s.page}>
    <div className={s.heading}><div><h1>Comisiones</h1><p className={s.muted}>Personal comisionado a otras instituciones o tareas. En lista de asistencia figura como «comisión».</p></div><button className={s.secondary} onClick={r.reload}>Actualizar</button></div>
    <Feedback loading={r.loading} error={r.error||personal.error||m.error} message={m.message}/>
    <section className={`${s.card} ${s.formCard} ${s.tono_entrega}`}>
      <div className={s.cardHead}><h2>Poner en comisión</h2><span className={s.nextCode}>{(r.data??[]).filter(c=>c.estado==='activa').length} comisión(es) activa(s)</span></div>
      <label className={s.field} style={{maxWidth:420,marginBottom:14}}>Persona<select value={persona} onChange={e=>setPersona(e.target.value)}><option value="">Seleccione…</option>{elegibles.map(p=><option key={p.id} value={p.id}>{p.matricula||'—'} · {p.nombre_completo} ({labels[p.estado]})</option>)}</select></label>
      {persona&&<FieldsForm key={persona} busy={m.busy} label="Registrar comisión" onSubmit={async d=>{const ok=await m.save(`/personal/${persona}/comisiones`,d);if(ok)setPersona('');return ok;}} fields={[
        {name:'destino',label:'Destino o institución',max:200},{name:'desde',label:'Desde',type:'date',value:hoy()},{name:'hasta',label:'Hasta (opcional)',type:'date',required:false},
        {name:'motivo',label:'Motivo de la comisión',type:'textarea',max:1000,wide:true}]}/>}
    </section>
    <div className={s.tabs} style={{marginBottom:16}}>{([['activa','Activas'],['finalizada','Finalizadas'],['','Todas']] as const).map(([v,l])=><button key={v} aria-pressed={estado===v} className={estado===v?s.tabActive:''} onClick={()=>setEstado(v)}>{l}</button>)}</div>
    <section className={s.card}>
      {rows.length?<div className={s.tableWrap}><table className={s.table}><thead><tr><th>Persona</th><th>Destino</th><th>Periodo</th><th>Motivo</th><th>Estado</th><th></th></tr></thead><tbody>
        {rows.map(c=>{const vencida=c.estado==='activa'&&!!c.hasta&&c.hasta.slice(0,10)<hoy();return <tr key={c.id}>
          <td><Link to={`/personal/file/${c.voluntario_id}`}><strong>{c.persona}</strong></Link><p>{c.matricula}{c.grado?` · ${c.grado}`:''}</p></td>
          <td><strong>{c.destino}</strong><p>Registró: {c.creado_nombre}</p></td>
          <td>{fechaCorta(c.desde.slice(0,10))} → {c.hasta?fechaCorta(c.hasta.slice(0,10)):'sin fecha fin'}{vencida&&<p className={s.minus}>Plazo cumplido: finalice la comisión</p>}{c.finalizada_at&&<p>Finalizó {fechaCorta(c.finalizada_at)} · {c.finalizada_nombre}</p>}</td>
          <td>{c.motivo}{c.observacion_cierre&&<p>Cierre: {c.observacion_cierre}</p>}</td>
          <td><Badge value={c.estado}/>{vencida&&<p><Badge value="vencido"/></p>}</td>
          <td>{c.estado==='activa'&&<button className={s.chip} onClick={()=>setDecision({title:'Finalizar comisión',description:`${c.persona} · ${c.destino}. Vuelve a estado ${labels[c.estado_anterior]??c.estado_anterior}.`,path:`/personal/comisiones/${c.id}/finalizar`,fields:[{name:'observacion',label:'Observación de cierre',type:'textarea'}]})}>Finalizar</button>}</td>
        </tr>;})}
      </tbody></table></div>:<p className={s.empty}>No hay comisiones para mostrar.</p>}
    </section>
    <DecisionModal decision={decision} close={()=>setDecision(null)} mutation={m}/>
  </div>;
}
