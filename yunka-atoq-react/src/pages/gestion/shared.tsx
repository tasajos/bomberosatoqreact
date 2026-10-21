import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { gestionApi } from '../../services/gestionApi';
import s from './Gestion.module.css';

export const dinero=(n:number|string)=>new Intl.NumberFormat('es-BO',{style:'currency',currency:'BOB'}).format(Number(n));
export const fechaCorta=(v:string|null)=>v ? (v.length===10 ? new Date(`${v}T12:00:00`) : new Date(v)).toLocaleDateString('es-BO') : '—';
export const hoy=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/La_Paz'}).format(new Date());
export const labels:Record<string,string>={pendiente_finanzas:'Pendiente de finanzas',pendiente_presidencia:'Pendiente de presidencia',autorizada:'Autorizada · por ejecutar',ejecutada:'Ejecutada',rechazada:'Rechazada',pendiente:'Pendiente de presidencia',autorizado:'Asignado al voluntario',rechazado:'Rechazado',devuelto:'Devuelto',bueno:'Bueno',regular:'Regular',mantenimiento:'En mantenimiento',danado:'Dañado',baja:'Dado de baja',apoyo:'Apoyo',instruccion:'Instrucción',capacitacion:'Capacitación',viaje:'Viaje',campania:'Campaña',vehiculo:'Vehículo',logistica:'Logística',ingreso:'Ingreso',egreso:'Egreso',al_dia:'Al día',debe:'Con deuda',pagado:'Pagado',vencido:'Vencido',exento:'Exento',sin_cobro:'Sin cobro',adelanto:'Adelanto',pagada:'Pagada',prestamo:'Préstamo recibido',proveedor:'Deuda con proveedor',otro:'Otra deuda',activo:'Activo',pasiva:'Pasivo',cooperador:'Cooperador',comision:'En comisión',activa:'Activa',finalizada:'Finalizada',presente:'Presente',tarde:'Tarde',falta:'Falta',permiso:'Permiso',leve:'Leve',muy_grave:'Muy grave',grave:'Grave',verbal:'Verbal',escrita:'Escrita',merito:'Mérito',demerito:'Demérito',postulante:'Postulante'};
export function Badge({value}:{value:string}){return <span className={`${s.badge} ${['autorizado','ejecutada','devuelto','bueno','validado','al_dia','pagado','pagada','activo','presente','merito','finalizada'].includes(value)?s.good:['rechazada','rechazado','baja','danado','debe','vencido','falta','grave','muy_grave','demerito'].includes(value)?s.bad:value.startsWith('pendiente')||['tarde','permiso','leve','comision','activa','pasiva'].includes(value)?s.pending:''}`}>{labels[value]??value}</span>;}
export function useRemote<T>(loader:()=>Promise<T>){
  const [data,setData]=useState<T|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[version,setVersion]=useState(0);
  useEffect(()=>{let active=true;setLoading(true);setError('');loader().then(d=>{if(active)setData(d);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[loader,version]);
  return {data,error,loading,reload:()=>setVersion(v=>v+1)};
}
export function useMutation(reload:()=>void){
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[comprobante,setComprobante]=useState(''),[resultado,setResultado]=useState<Awaited<ReturnType<typeof gestionApi.guardar>>|null>(null);
  const lock=useRef(false),last=useRef({payload:'',key:''});
  async function save(path:string,body:unknown){
    if(lock.current)return false;
    lock.current=true;setBusy(true);setError('');setMessage('');setComprobante('');
    const payload=JSON.stringify({path,body});
    if(last.current.payload!==payload)last.current={payload,key:crypto.randomUUID()};
    try{const r=await gestionApi.guardar(path,body,last.current.key);setResultado(r);last.current={payload:'',key:''};setComprobante(r.comprobante??'');setMessage(r.comprobante?`Registro guardado. Se emitió ${r.comprobante.startsWith('LOG')?'el acta':'el voucher'} ${r.comprobante}.`:'Registro guardado correctamente.');reload();return true;}
    catch(e){setError(e instanceof Error?e.message:'No se pudo guardar');return false;}
    finally{lock.current=false;setBusy(false);}
  }
  return {busy,error,message,comprobante,resultado,save};
}
export function Feedback({loading,error,message,children}:{loading?:boolean;error?:string;message?:string;children?:ReactNode}){return <>{loading&&<p role="status" className={s.muted}>Cargando…</p>}{error&&<div role="alert" className={s.error}>{error}</div>}{message&&<div role="status" className={s.success}>{message} {children}</div>}</>;}
export interface Field {name:string;label:string;type?:string;options?:[string,string][];value?:string;required?:boolean;max?:number;min?:string;step?:string;wide?:boolean}
export function FieldsForm({fields,onSubmit,busy,label='Guardar',children}:{fields:Field[];onSubmit:(data:Record<string,string>)=>Promise<boolean>;busy:boolean;label?:string;children?:ReactNode}){
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const form=e.currentTarget;const data=Object.fromEntries(new FormData(form).entries()) as Record<string,string>;if(await onSubmit(data))form.reset();}
  return <form className={s.form} onSubmit={submit}>{fields.map(f=><label className={`${s.field} ${f.wide?s.wide:''}`} key={f.name}>{f.label}{f.type==='textarea'?<textarea name={f.name} required={f.required!==false} maxLength={f.max??2000} defaultValue={f.value} disabled={busy}/>:f.options?<select name={f.name} defaultValue={f.value??''} required={f.required!==false} disabled={busy}><option value="">Seleccione…</option>{f.options.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select>:<input name={f.name} type={f.type??'text'} defaultValue={f.value} required={f.required!==false} maxLength={f.max??200} min={f.min} step={f.step} disabled={busy}/>}</label>)}<div className={`${s.actions} ${s.wide}`}><button className={s.button} disabled={busy}>{busy?'Guardando…':label}</button>{children}</div></form>;
}
export interface Decision {title:string;description:string;path:string;body?:Record<string,unknown>;fields?:Field[];label?:string}
export function DecisionModal({decision,close,mutation}:{decision:Decision|null;close:()=>void;mutation:ReturnType<typeof useMutation>}){
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(!decision)return;const prev=document.activeElement as HTMLElement|null;ref.current?.focus();return()=>prev?.focus();},[decision]);
  if(!decision)return null;
  return <div className={s.modalBackdrop}><div ref={ref} tabIndex={-1} className={s.modal} role="dialog" aria-modal="true" aria-label={decision.title} onKeyDown={e=>{if(e.key==='Escape'&&!mutation.busy)close();if(e.key==='Tab'){const els=ref.current?.querySelectorAll<HTMLElement>('input:not(:disabled),select:not(:disabled),textarea:not(:disabled),button:not(:disabled)');if(els?.length){const first=els[0],last=els[els.length-1];if(e.shiftKey&&(document.activeElement===first||document.activeElement===ref.current)){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}}}><h2>{decision.title}</h2><p className={s.line}>{decision.description}</p><Feedback error={mutation.error}/><FieldsForm fields={decision.fields??[]} busy={mutation.busy} label={decision.label??'Confirmar'} onSubmit={async d=>{const ok=await mutation.save(decision.path,{...decision.body,...d});if(ok)close();return ok;}}><button type="button" className={s.secondary} disabled={mutation.busy} onClick={close}>Cancelar</button></FieldsForm></div></div>;
}
export const amountField:Field={name:'monto',label:'Monto (Bs)',type:'number',min:'0.01',step:'0.01'};
export const detailField:Field={name:'detalle',label:'Detalle y justificación',type:'textarea',wide:true};
export const stateOptions:[string,string][]=['bueno','regular','mantenimiento','danado'].map(v=>[v,labels[v]]);
/** Tarjeta de descarga de reporte Excel con rango de fechas opcional. */
export function ReporteExcel({descripcion,descargar}:{descripcion:string;descargar:(desde?:string,hasta?:string)=>Promise<void>}){
  const [desde,setDesde]=useState(''),[hasta,setHasta]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function generar(){
    setBusy(true);setError('');
    try{await descargar(desde||undefined,hasta||undefined);}
    catch(e){setError(e instanceof Error?e.message:'No se pudo generar el Excel');}
    finally{setBusy(false);}
  }
  return <section className={`${s.card} ${s.excel}`}>
    <div><h2>Reporte en Excel</h2><p className={s.muted}>{descripcion}</p></div>
    <div className={s.excelForm}>
      <label className={s.field}>Desde<input type="date" value={desde} max={hasta||hoy()} onChange={e=>setDesde(e.target.value)}/></label>
      <label className={s.field}>Hasta<input type="date" value={hasta} min={desde||undefined} onChange={e=>setHasta(e.target.value)}/></label>
      <button className={s.button} disabled={busy} onClick={generar}>{busy?'Generando…':'Descargar Excel'}</button>
    </div>
    {error&&<p role="alert" className={s.error}>{error}</p>}
  </section>;
}
