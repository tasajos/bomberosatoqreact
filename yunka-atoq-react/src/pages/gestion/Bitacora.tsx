import { useCallback, useState } from 'react';
import { gestionApi } from '../../services/gestionApi';
import { Feedback, useRemote } from './shared';
import { ListaBitacora } from './PersonalFile';
import s from './Gestion.module.css';

const ACCIONES:[string,string][]=[['','Todas las acciones'],['alta','Altas'],['edicion','Ediciones de datos'],['codigo','Cambios de código'],['estado','Cambios de estado'],['comision','Comisiones'],['llamada','Llamadas de atención'],['merito','Méritos'],['demerito','Deméritos'],['asistencia','Asistencia'],['documento','Documentos'],['grado','Grados']];

/** Bitácora general: quién cambió qué, sobre quién y cuándo (últimos 500 movimientos del filtro). */
export default function Bitacora(){
  const personal=useRemote(gestionApi.personal);
  const [f,setF]=useState({voluntario_id:'',accion:'',desde:'',hasta:''});
  const load=useCallback(()=>gestionApi.bitacora({voluntario_id:f.voluntario_id?Number(f.voluntario_id):undefined,accion:f.accion||undefined,desde:f.desde||undefined,hasta:f.hasta||undefined}),[f]);
  const r=useRemote(load);
  const set=(k:keyof typeof f)=>(e:{target:{value:string}})=>setF(v=>({...v,[k]:e.target.value}));
  return <div className={s.page}>
    <div className={s.heading}><div><h1>Bitácora de cambios</h1><p className={s.muted}>Registro permanente de altas, ediciones, códigos, estados, comisiones, llamadas, méritos, asistencia y documentos.</p></div><button className={s.secondary} onClick={r.reload}>Actualizar</button></div>
    <section className={s.card}>
      <div className={s.form} style={{gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))'}}>
        <label className={s.field}>Persona<select value={f.voluntario_id} onChange={set('voluntario_id')}><option value="">Todo el personal</option>{(personal.data?.personal??[]).map(p=><option key={p.id} value={p.id}>{p.matricula||'—'} · {p.nombre_completo}</option>)}</select></label>
        <label className={s.field}>Acción<select value={f.accion} onChange={set('accion')}>{ACCIONES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
        <label className={s.field}>Desde<input type="date" value={f.desde} onChange={set('desde')}/></label>
        <label className={s.field}>Hasta<input type="date" value={f.hasta} min={f.desde||undefined} onChange={set('hasta')}/></label>
      </div>
    </section>
    <Feedback loading={r.loading} error={r.error}/>
    {r.data&&<section className={s.card}><div className={s.cardHead}><h2>Movimientos</h2><span className={s.nextCode}>{r.data.length} registro(s){r.data.length===500?' · se muestran los 500 más recientes':''}</span></div><ListaBitacora items={r.data} conPersona/></section>}
  </div>;
}
