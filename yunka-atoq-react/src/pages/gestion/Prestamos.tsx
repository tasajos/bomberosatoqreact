import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { gestionApi } from '../../services/gestionApi';
import type { Prestamo } from '../../services/gestionApi';
import { Badge,DecisionModal,fechaCorta,Feedback,FieldsForm,hoy,stateOptions,useMutation,useRemote } from './shared';
import type { Decision } from './shared';
import s from './Gestion.module.css';

const FILTROS:[string,string][]=[['','Todos'],['pendiente','Pendientes'],['autorizado','Asignados'],['devuelto','Devueltos'],['rechazado','Rechazados']];

export default function Prestamos({embedded=false}:{embedded?:boolean}){
  const {user}=useAuth(),r=useRemote(gestionApi.prestamos),m=useMutation(r.reload),[decision,setDecision]=useState<Decision|null>(null);
  const log=user?.role==='jefe_logistica',pres=user?.role==='presidente';
  const base=log?'/logistica':pres?'/presidente':'/voluntario';
  const [estado,setEstado]=useState(pres?'pendiente':'');
  const rows=(r.data??[]).filter(p=>!estado||p.estado===estado);
  const cuenta=(e:string)=>(r.data??[]).filter(p=>!e||p.estado===e).length;
  return <div className={embedded?'':s.page}>
    <div className={s.heading}><div><h1>{log?'Préstamos de equipos':pres?'Autorizar préstamos':'Mis equipos asignados'}</h1><p className={s.muted}>La entrega requiere autorización presidencial. Cada entrega y devolución emite un acta LOG con respaldo en PDF.</p></div><button className={s.secondary} onClick={r.reload}>Actualizar</button></div>
    <Feedback loading={r.loading} error={r.error||m.error} message={m.message}>{m.comprobante&&<Link to={`${base}/acta/${m.comprobante}`}>Ver acta {m.comprobante}</Link>}</Feedback>
    {log&&<PrestamoForm key={r.data?.length??0} busy={m.busy} save={d=>m.save('/prestamos',d)}/>}
    <div className={s.tabs} style={{marginBottom:16}}>{FILTROS.map(([v,l])=><button key={v} aria-pressed={estado===v} className={estado===v?s.tabActive:''} onClick={()=>setEstado(v)}>{l} ({cuenta(v)})</button>)}</div>
    <div className={s.list}>{rows.map(p=><PrestamoCard key={p.id} p={p} base={base} log={log} pres={pres} decidir={setDecision}/>)}</div>
    {!r.loading&&!rows.length&&<p className={s.empty}>No hay préstamos para mostrar.</p>}
    <DecisionModal decision={decision} close={()=>setDecision(null)} mutation={m}/>
  </div>;
}

function PrestamoCard({p,base,log,pres,decidir}:{p:Prestamo;base:string;log:boolean;pres:boolean;decidir:(d:Decision)=>void}){
  const vencido=p.estado==='autorizado'&&p.fecha_devolucion.slice(0,10)<hoy();
  const tono=p.estado==='devuelto'?s.tono_devolucion:p.estado==='rechazado'||vencido?s.tono_baja:p.estado==='autorizado'?s.tono_entrega:s.tono_reserva;
  return <article className={`${s.card} ${s.formCard} ${tono}`}>
    <div className={s.heading} style={{marginBottom:8}}><div><h2><span className={s.code}>{p.codigo}</span> {p.equipo_nombre}</h2><p className={s.muted}>Préstamo #{p.id}</p></div>
      <div className={s.actions} style={{marginTop:0}}>{vencido&&<Badge value="vencido"/>}<Badge value={p.estado}/></div></div>
    <dl className={s.details}><div><dt>Voluntario</dt><dd>{p.voluntario_nombre}</dd></div><div><dt>Fecha de devolución</dt><dd className={vencido?s.minus:''}>{fechaCorta(p.fecha_devolucion)}</dd></div><div><dt>Autorizado / revisado por</dt><dd>{p.autorizado_nombre??'Pendiente de presidencia'}</dd></div><div><dt>Estado al salir</dt><dd><Badge value={p.estado_salida}/></dd></div></dl>
    <p className={s.line}>{p.motivo}</p>
    {vencido&&<p className={s.error}>Devolución vencida. Coordine la entrega con logística.</p>}
    {p.rechazo_motivo&&<p className={s.error}>{p.rechazo_motivo}</p>}
    {p.estado_devolucion&&<p>Devuelto en estado <Badge value={p.estado_devolucion}/> · {p.observacion_devolucion}</p>}
    <p className={s.muted}>{p.correos_pendientes?`${p.correos_pendientes} notificación(es) pendiente(s) de envío.`:'Notificaciones entregadas al servicio de correo.'}</p>
    <div className={s.actions}>
      {p.acta_entrega&&<Link className={s.chip} to={`${base}/acta/${p.acta_entrega}`}>Acta de entrega {p.acta_entrega}</Link>}
      {p.acta_devolucion&&<Link className={s.chip} to={`${base}/acta/${p.acta_devolucion}`}>Acta de devolución {p.acta_devolucion}</Link>}
      {pres&&p.estado==='pendiente'&&<><button className={s.button} onClick={()=>decidir({title:'Autorizar préstamo',description:`${p.equipo_nombre} para ${p.voluntario_nombre}. Devolución: ${fechaCorta(p.fecha_devolucion)}. Se emitirá el acta de entrega.`,path:`/prestamos/${p.id}/presidencia`,body:{accion:'aprobar'},label:'Autorizar y emitir acta'})}>Autorizar</button><button className={s.danger} onClick={()=>decidir({title:'Rechazar préstamo',description:`${p.equipo_nombre} · ${p.voluntario_nombre}`,path:`/prestamos/${p.id}/presidencia`,body:{accion:'rechazar'},fields:[{name:'motivo',label:'Motivo',type:'textarea',max:1000}]})}>Rechazar</button></>}
      {log&&p.estado==='autorizado'&&<button className={s.button} onClick={()=>decidir({title:'Registrar devolución',description:`${p.equipo_nombre} · ${p.voluntario_nombre}. Confirme la recepción física y su estado. Se emitirá el acta de devolución.`,path:`/prestamos/${p.id}/devolver`,fields:[{name:'estado',label:'Estado al devolver',options:stateOptions},{name:'motivo',label:'Observaciones de recepción',type:'textarea',max:1000}],label:'Registrar y emitir acta'})}>Recibir devolución</button>}
    </div>
  </article>;
}

function PrestamoForm({busy,save}:{busy:boolean;save:(d:Record<string,string>)=>Promise<boolean>}){
  const e=useRemote(gestionApi.logistica),v=useRemote(gestionApi.voluntarios);
  return <section className={`${s.card} ${s.formCard} ${s.tono_entrega}`}><div className={s.cardHead}><h2>Solicitar préstamo a presidencia</h2><span className={s.nextCode}>Al autorizarse se emite el acta LOG</span></div><Feedback error={e.error||v.error}/><FieldsForm busy={busy} onSubmit={async d=>{const ok=await save(d);if(ok)e.reload();return ok;}} fields={[{name:'equipo_id',label:'Equipo disponible',options:e.data?.equipos.filter(e=>!e.prestamo_activo&&['bueno','regular'].includes(e.estado)).map(e=>[String(e.id),`${e.codigo} · ${e.nombre} (${e.tipo})`])??[]},{name:'voluntario_id',label:'Voluntario',options:v.data?.map(v=>[String(v.id),`${v.nombre} ${v.apellido_paterno??''}`])??[]},{name:'fecha_devolucion',label:'Fecha de devolución',type:'date',min:hoy()},{name:'motivo',label:'Motivo del préstamo',type:'textarea',max:1000,wide:true}]} label="Solicitar autorización"/></section>;
}
