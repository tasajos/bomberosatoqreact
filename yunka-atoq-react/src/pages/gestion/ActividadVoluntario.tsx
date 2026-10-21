import { useState } from 'react';
import { request } from '../../services/api';
import { Badge,fechaCorta,Feedback,FieldsForm,hoy,useRemote } from './shared';
import s from './Gestion.module.css';

interface Actividad {id:number;fecha:string;titulo?:string;estado?:string;observacion_validacion?:string;tipo?:string;turno?:string;rol_guardia?:string;novedades?:string;lugar?:string}
const operaciones=()=>request<{data:Actividad[]}>('/operaciones-dpto?limit=200').then(r=>r.data);
const guardias=()=>request<Actividad[]>('/operaciones-dpto/guardias');
export default function ActividadVoluntario({tipo}:{tipo:'operaciones'|'guardias'}){
  const esOp=tipo==='operaciones',r=useRemote(esOp?operaciones:guardias),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  return <div className={s.page}><div className={s.heading}><div><h1>{esOp?'Mis operaciones':'Mis guardias'}</h1><p className={s.muted}>{esOp?'Las operaciones se registran pendientes de validación del jefe de operaciones.':'Registre su turno y las novedades del servicio.'}</p></div><button className={s.secondary} onClick={r.reload}>Actualizar</button></div><Feedback loading={r.loading} error={r.error||error} message={message}/><section className={s.card}><h2>{esOp?'Registrar operación':'Registrar guardia'}</h2><FieldsForm key={tipo} busy={busy} fields={esOp?[
    {name:'titulo',label:'Título de la operación'},
    {name:'tipo',label:'Tipo',options:[['local','Local'],['nacional','Nacional'],['internacional','Internacional']]},
    {name:'fecha',label:'Fecha y hora',type:'datetime-local'},
    {name:'lugar',label:'Lugar'},
    {name:'duracion_horas',label:'Duración (horas)',type:'number',min:'0.1',step:'0.1'},
    {name:'descripcion',label:'Descripción y actividades realizadas',type:'textarea',wide:true},
  ]:[{name:'fecha',label:'Fecha',type:'date',value:hoy()},{name:'turno',label:'Turno',options:[['diurno','Diurno'],['nocturno','Nocturno'],['24h','24 horas']]},{name:'rol_guardia',label:'Rol en la guardia',max:100},{name:'novedades',label:'Novedades',type:'textarea',wide:true}]} onSubmit={async d=>{setBusy(true);setError('');setMessage('');try{await request(esOp?'/operaciones-dpto':'/operaciones-dpto/guardias',{method:'POST',body:JSON.stringify(d)});setMessage(esOp?'Operación registrada. Pendiente de validación.':'Guardia registrada.');r.reload();return true;}catch(e){setError(e instanceof Error?e.message:'No se pudo registrar');return false;}finally{setBusy(false);}}}/></section>
    <section className={s.card}><h2>Mi historial {esOp?'(últimas 200 operaciones)':''}</h2>{r.data?.length?<div className={s.tableWrap}><table className={s.table}><thead><tr><th>Fecha</th><th>{esOp?'Operación':'Turno / rol'}</th><th>{esOp?'Estado y observaciones':'Novedades'}</th></tr></thead><tbody>{r.data.map(a=><tr key={a.id}><td>{fechaCorta(a.fecha)}</td><td>{esOp?a.titulo:`${a.turno} · ${a.rol_guardia}`}<p>{a.lugar}</p></td><td>{esOp?<><Badge value={a.estado??'pendiente'}/><p>{a.observacion_validacion}</p></>:a.novedades}</td></tr>)}</tbody></table></div>:<p className={s.empty}>Todavía no tiene registros.</p>}</section>
  </div>;
}
