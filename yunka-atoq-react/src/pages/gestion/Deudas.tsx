import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { gestionApi } from '../../services/gestionApi';
import type { Deuda } from '../../services/gestionApi';
import { Badge, dinero, fechaCorta, Feedback, FieldsForm, hoy, labels, useMutation, useRemote } from './shared';
import s from './Gestion.module.css';

/** Deudas y préstamos de la institución; se pagan con egresos que eligen la deuda a cubrir. */
export default function Deudas(){
  const {user}=useAuth(),finanzas=user?.role==='jefe_finanzas',base=finanzas?'/finanzas':'/presidente';
  const r=useRemote(gestionApi.deudas),m=useMutation(r.reload);
  const [estado,setEstado]=useState<'pendiente'|'pagada'|''>('pendiente'),[tipo,setTipo]=useState('');
  const deudas=r.data??[],pendientes=deudas.filter(d=>d.estado==='pendiente');
  const vencidas=pendientes.filter(d=>d.vencimiento&&d.vencimiento.slice(0,10)<hoy());
  const rows=deudas.filter(d=>(!estado||d.estado===estado));
  return <div className={s.page}>
    <div className={s.heading}><div><h1>Deudas y préstamos</h1><p className={s.muted}>Lo que la institución debe. Cada pago se registra como egreso eligiendo la deuda a cubrir; el saldo se actualiza solo.</p></div><button className={s.secondary} onClick={r.reload}>Actualizar</button></div>
    <Feedback loading={r.loading} error={r.error||m.error} message={m.message}>{m.comprobante&&<Link to={`${base}/voucher/${m.comprobante}`}>Ver voucher {m.comprobante}</Link>}</Feedback>
    {r.data&&<div className={s.kpis} style={{marginBottom:20}}>
      <div className={`${s.kpi} ${s.kOut}`}><small>Saldo por pagar</small><strong>{dinero(pendientes.reduce((t,d)=>t+d.saldo,0))}</strong></div>
      <div className={`${s.kpi} ${s.kRes}`}><small>Deudas pendientes</small><strong>{pendientes.length}</strong></div>
      <div className={`${s.kpi} ${s.kCom}`}><small>Vencidas</small><strong>{vencidas.length}</strong></div>
      <div className={`${s.kpi} ${s.kIn}`}><small>Total pagado</small><strong>{dinero(deudas.reduce((t,d)=>t+d.pagado,0))}</strong></div>
    </div>}
    {finanzas&&<NuevaDeuda tipo={tipo} setTipo={setTipo} mutation={m}/>}
    <div className={s.tabs} style={{marginBottom:16}}>{([['pendiente','Pendientes'],['pagada','Pagadas'],['','Todas']] as const).map(([v,l])=><button key={v} aria-pressed={estado===v} className={estado===v?s.tabActive:''} onClick={()=>setEstado(v)}>{l}</button>)}</div>
    <div className={s.list}>{rows.map(d=><DeudaCard key={d.id} d={d} base={base} finanzas={finanzas}/>)}</div>
    {!r.loading&&!rows.length&&<p className={s.empty}>No hay deudas para mostrar.</p>}
  </div>;
}

function NuevaDeuda({tipo,setTipo,mutation}:{tipo:string;setTipo:(t:string)=>void;mutation:ReturnType<typeof useMutation>}){
  return <section className={`${s.card} ${s.formCard} ${s.tono_reserva}`}>
    <div className={s.cardHead}><div><h2>Registrar deuda o préstamo</h2><p className={s.muted}>Un préstamo recibido puede ingresar a caja: se emite su voucher de ingreso.</p></div></div>
    <label className={s.field} style={{maxWidth:320,marginBottom:14}}>Tipo<select value={tipo} disabled={mutation.busy} onChange={e=>setTipo(e.target.value)}><option value="">Seleccione…</option>{['prestamo','proveedor','otro'].map(t=><option key={t} value={t}>{labels[t]}</option>)}</select></label>
    {tipo&&<FieldsForm key={tipo} busy={mutation.busy} label="Registrar deuda" onSubmit={async d=>{const ok=await mutation.save('/deudas',{...d,tipo});if(ok)setTipo('');return ok;}} fields={[
      {name:'acreedor',label:tipo==='prestamo'?'Prestamista (persona o entidad)':'Acreedor',max:200},
      {name:'monto',label:'Monto total (Bs)',type:'number',min:'0.01',step:'0.01'},
      {name:'fecha',label:'Fecha de la deuda',type:'date',value:hoy()},
      {name:'vencimiento',label:'Fecha límite de pago (opcional)',type:'date',required:false},
      ...(tipo==='prestamo'?[{name:'ingresa_caja',label:'¿El dinero ingresa a caja?',options:[['1','Sí, registrar ingreso y voucher'],['0','No (pago directo a un tercero)']] as [string,string][],value:'1'}]:[]),
      {name:'detalle',label:'Detalle y condiciones',type:'textarea',max:1000,wide:true},
    ]}/>}
  </section>;
}

function DeudaCard({d,base,finanzas}:{d:Deuda;base:string;finanzas:boolean}){
  const pct=Math.min(100,d.pagado/Number(d.monto)*100),vencida=d.estado==='pendiente'&&!!d.vencimiento&&d.vencimiento.slice(0,10)<hoy();
  return <article className={s.card}>
    <div className={s.heading} style={{marginBottom:10}}><div><h2>#{d.id} · {d.acreedor}</h2><p className={s.muted}>{labels[d.tipo]} · desde {fechaCorta(d.fecha.slice(0,10))}{d.vencimiento?` · vence ${fechaCorta(d.vencimiento.slice(0,10))}`:''}</p></div>
      <div className={s.actions} style={{marginTop:0}}>{vencida&&<Badge value="vencido"/>}<Badge value={d.estado}/></div></div>
    <p className={s.line}>{d.detalle}</p>
    <div className={s.deudaBar} aria-label={`Pagado ${pct.toFixed(0)}%`}><span style={{width:`${pct}%`}}/></div>
    <dl className={s.details}>
      <div><dt>Monto total</dt><dd className={s.mono}>{dinero(d.monto)}</dd></div>
      <div><dt>Pagado</dt><dd className={`${s.mono} ${s.plus}`}>{dinero(d.pagado)}</dd></div>
      <div><dt>Falta por pagar</dt><dd className={`${s.mono} ${d.saldo?s.minus:''}`}>{dinero(d.saldo)}</dd></div>
      {d.ingreso_comprobante&&<div><dt>Ingreso a caja</dt><dd><Link className={`${s.code} ${s.codeIn}`} to={`${base}/voucher/${d.ingreso_comprobante}`}>{d.ingreso_comprobante}</Link></dd></div>}
    </dl>
    {d.pagos.length>0&&<details><summary className={s.muted}>{d.pagos.length} pago(s) registrado(s)</summary><div className={s.tableWrap}><table className={s.table}><thead><tr><th>Voucher</th><th>Fecha</th><th>Referencia</th><th className={s.num}>Monto</th></tr></thead><tbody>
      {d.pagos.map(p=><tr key={p.id}><td><Link className={`${s.code} ${s.codeOut}`} to={`${base}/voucher/${p.comprobante}`}>{p.comprobante}</Link></td><td>{fechaCorta(p.created_at)}<p>{p.registrado_nombre}</p></td><td>{p.referencia||'—'}</td><td className={`${s.num} ${s.mono}`}>{dinero(p.monto)}</td></tr>)}
    </tbody></table></div></details>}
    {finanzas&&d.estado==='pendiente'&&<div className={s.actions}><Link className={s.button} to={`/finanzas/egresos?deuda=${d.id}`}>Registrar pago</Link></div>}
  </article>;
}
