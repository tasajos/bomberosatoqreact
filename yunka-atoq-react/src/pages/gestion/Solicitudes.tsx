import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { gestionApi } from '../../services/gestionApi';
import type { Solicitud } from '../../services/gestionApi';
import { amountField,detailField,Badge,DecisionModal,dinero,fechaCorta,Feedback,FieldsForm,labels,useMutation,useRemote } from './shared';
import type { Decision } from './shared';
import s from './Gestion.module.css';

export default function Solicitudes({tipo}:{tipo?:'ingreso'|'egreso'}){
  const {user}=useAuth(),remote=useRemote(gestionApi.solicitudes),m=useMutation(remote.reload);
  const [decision,setDecision]=useState<Decision|null>(null),[estado,setEstado]=useState('');
  const voluntario=user?.role==='voluntario',finanzas=user?.role==='jefe_finanzas';
  function decidir(r:Solicitud,accion:'aprobar'|'rechazar'){
    setDecision({title:accion==='aprobar'?'Autorizar solicitud':'Rechazar solicitud',description:`#${r.id} · ${r.solicitante_nombre}\n${r.detalle}\n${dinero(r.monto)}`,path:`/solicitudes/${r.id}/${finanzas?'finanzas':'presidencia'}`,body:{accion},fields:accion==='rechazar'?[{name:'motivo',label:'Motivo del rechazo',type:'textarea',max:1000}]:[]});
  }
  const rows=(remote.data??[]).filter(r=>(!estado||r.estado===estado)&&(!tipo||r.tipo===tipo));
  return <div className={s.page}><div className={s.heading}><div><h1>{voluntario?'Mis solicitudes de dinero':tipo?`Solicitar ${tipo} por apoyo`:'Solicitudes de fondos'}</h1><p className={s.muted}>Finanzas → Presidencia → Registro de pago o recepción → Comprobante.</p></div><button className={s.secondary} onClick={remote.reload}>Actualizar</button></div><Feedback loading={remote.loading} error={remote.error||m.error} message={m.message}>{m.comprobante&&<Link to={`/finanzas/voucher/${m.comprobante}`}>Abrir voucher {m.comprobante}</Link>}</Feedback>
    {(voluntario||tipo)&&<section className={s.card}><h2>Nueva solicitud</h2><p className={s.notice}>Se notificará por correo a finanzas, presidencia y al solicitante. El dinero se entrega después de ambas autorizaciones.</p><FieldsForm key={tipo??'voluntario'} busy={m.busy} label="Enviar solicitud" fields={[amountField,...(voluntario?[{name:'concepto',label:'Concepto',options:['apoyo','instruccion','capacitacion','viaje'].map(v=>[v,labels[v]] as [string,string])}]:[]),detailField]} onSubmit={d=>m.save('/solicitudes',{...d,tipo:tipo??'egreso',concepto:voluntario?d.concepto:'apoyo'})}/></section>}
    <label className={s.field} style={{maxWidth:310,marginBottom:20}}>Filtrar por estado<select value={estado} onChange={e=>setEstado(e.target.value)}><option value="">Todos los estados</option>{['pendiente_finanzas','pendiente_presidencia','autorizada','ejecutada','rechazada'].map(v=><option value={v} key={v}>{labels[v]}</option>)}</select></label>
    <div className={s.list}>{rows.map(r=><article className={s.card} key={r.id}><div className={s.heading}><div><h2>#{r.id} · {r.solicitante_nombre}</h2><Badge value={r.estado}/></div><div className={s.amount}>{dinero(r.monto)}</div></div><p className={s.line}>{r.detalle}</p><dl className={s.details}><div><dt>Tipo / concepto</dt><dd>{labels[r.tipo]} · {labels[r.concepto]}</dd></div><div><dt>Finanzas</dt><dd>{r.finanzas_nombre??'Pendiente'} · {fechaCorta(r.finanzas_fecha)}</dd></div><div><dt>Presidencia</dt><dd>{r.presidencia_nombre??'Pendiente'} · {fechaCorta(r.presidencia_fecha)}</dd></div></dl>{r.rechazo_motivo&&<p className={s.error}>{r.rechazo_motivo}</p>}<p className={s.muted}>{r.correos_pendientes?`${r.correos_pendientes} notificación(es) pendiente(s) de envío.`:'Notificaciones entregadas al servicio de correo.'}</p>
      <div className={s.actions}>{((finanzas&&r.estado==='pendiente_finanzas')||(user?.role==='presidente'&&r.estado==='pendiente_presidencia'))&&<><button className={s.button} onClick={()=>decidir(r,'aprobar')}>Autorizar</button><button className={s.danger} onClick={()=>decidir(r,'rechazar')}>Rechazar</button></>}{finanzas&&r.estado==='autorizada'&&<button className={s.button} onClick={()=>setDecision({title:r.tipo==='egreso'?'Registrar desembolso':'Registrar ingreso recibido',description:`#${r.id} · ${r.solicitante_nombre}\n${r.detalle}\n${dinero(r.monto)}. Confirme cuando el dinero haya sido entregado o recibido.`,path:`/solicitudes/${r.id}/ejecutar`,fields:[{name:'referencia',label:'Referencia de transferencia o recibo',max:200}],label:r.tipo==='egreso'?'Registrar y emitir voucher':'Registrar recepción'})}>{r.tipo==='egreso'?'Desembolsar y emitir voucher':'Confirmar ingreso recibido'}</button>}{r.comprobante&&<Link className={s.secondary} to={`/${voluntario?'voluntario':finanzas?'finanzas':'presidente'}/voucher/${r.comprobante}`}>Voucher {r.comprobante} · ver / PDF</Link>}</div>
    </article>)}</div>{!remote.loading&&!rows.length&&<p className={s.empty}>No hay solicitudes para mostrar.</p>}<DecisionModal decision={decision} close={()=>setDecision(null)} mutation={m}/>
  </div>;
}
