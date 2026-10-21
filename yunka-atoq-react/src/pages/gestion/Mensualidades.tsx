import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { gestionApi } from '../../services/gestionApi';
import type { EstadoMensualidad, MesMensualidad, ResumenMensualidad } from '../../services/gestionApi';
import { nombrePeriodo } from '../../utils/voucherPdf';
import { Badge, DecisionModal, dinero, fechaCorta, Feedback, FieldsForm, hoy, useMutation, useRemote } from './shared';
import type { Decision } from './shared';
import s from './Gestion.module.css';

const mayus = (t:string) => t.charAt(0).toUpperCase()+t.slice(1);
const mes = (p:string) => mayus(nombrePeriodo(p));
const ESTADO_PERSONAL:Record<string,string>={activo:'Activo',pasiva:'Pasivo',baja:'Dado de baja',cooperador:'Cooperador',comision:'En comisión'};
function usePortal(){
  const {user}=useAuth(),rol=user?.role;
  return {finanzas:rol==='jefe_finanzas',base:rol==='jefe_finanzas'?'/finanzas':rol==='voluntario'?'/voluntario':'/presidente'};
}

/** Vista general y configuración de tarifas (finanzas y presidencia). */
export default function Mensualidades(){
  const {finanzas,base}=usePortal(),r=useRemote(gestionApi.mensualidades),m=useMutation(r.reload);
  const [tab,setTab]=useState<'estado'|'config'>('estado'),[filtro,setFiltro]=useState(''),[q,setQ]=useState('');
  const d=r.data,actual=d?.hoy.slice(0,7)??hoy().slice(0,7);
  const vigente=d?.tarifas.find(t=>t.desde<=actual);
  const deudores=d?.voluntarios.filter(v=>v.estado==='debe')??[];
  const rows=(d?.voluntarios??[]).filter(v=>(!filtro||v.estado===filtro)&&`${v.voluntario.nombre} ${v.voluntario.ci??''}`.toLowerCase().includes(q.toLowerCase()));
  return <div className={s.page}>
    <div className={s.heading}><div><h1>Mensualidades</h1><p className={s.muted}>Cobro mensual a voluntarios activos y pasivos (no figuran los dados de baja). Cada cobro se registra como ingreso y emite un voucher FIN para finanzas y para el voluntario.</p></div><button className={s.secondary} onClick={r.reload}>Actualizar</button></div>
    <Feedback loading={r.loading} error={r.error||m.error} message={m.message}/>
    {d&&<div className={s.kpis} style={{marginBottom:20}}>
      <div className={`${s.kpi} ${s.kSaldo}`}><small>Tarifa vigente</small><strong>{vigente?dinero(vigente.monto):'—'}</strong>{vigente&&<p className={s.muted}>Vence el día {vigente.dia_vencimiento} de cada mes</p>}</div>
      <div className={`${s.kpi} ${s.kCom}`}><small>Voluntarios</small><strong>{d.voluntarios.length}</strong></div>
      <div className={`${s.kpi} ${s.kIn}`}><small>Al día</small><strong>{d.voluntarios.length-deudores.length}</strong></div>
      <div className={`${s.kpi} ${s.kOut}`}><small>Con deuda</small><strong>{deudores.length}</strong></div>
      <div className={`${s.kpi} ${s.kRes}`}><small>Deuda total</small><strong>{dinero(deudores.reduce((t,v)=>t+v.deuda,0))}</strong></div>
    </div>}
    {d&&!d.tarifas.length&&<p className={s.notice}>Aún no hay una tarifa configurada. {finanzas?'Defínala en «Configuración» para empezar a cobrar.':'Finanzas debe definirla para empezar a cobrar.'}</p>}
    <div className={s.tabs} role="tablist" style={{marginBottom:16}}>{([['estado','Estado de voluntarios'],['config','Configuración']] as const).map(([v,l])=><button key={v} role="tab" aria-selected={tab===v} className={tab===v?s.tabActive:''} onClick={()=>setTab(v)}>{l}</button>)}</div>
    {tab==='estado'&&<section className={s.card}>
      <div className={s.cardHead}><h2>Estado por voluntario</h2><div className={s.toolbar}>
        <div className={s.tabs} aria-label="Filtrar por estado">{([['','Todos'],['debe','Con deuda'],['al_dia','Al día']] as const).map(([v,l])=><button key={v} aria-pressed={filtro===v} className={filtro===v?s.tabActive:''} onClick={()=>setFiltro(v)}>{l}</button>)}</div>
        <input className={s.search} aria-label="Buscar voluntario" placeholder="Buscar por nombre o C.I.…" value={q} onChange={e=>setQ(e.target.value)}/>
      </div></div>
      {rows.length?<div className={s.tableWrap}><table className={s.table}><thead><tr><th>Voluntario</th><th>Estado</th><th className={s.num}>Meses vencidos</th><th className={s.num}>Deuda</th><th>Mes en curso</th><th>Último pago</th><th></th></tr></thead><tbody>
        {rows.map(v=><Fila key={v.voluntario.id} v={v} base={base} finanzas={finanzas}/>)}
      </tbody></table></div>:<p className={s.empty}>No hay voluntarios para mostrar.</p>}
    </section>}
    {tab==='config'&&<>
      {finanzas&&<section className={`${s.card} ${s.formCard} ${s.tono_ingreso}`}>
        <div className={s.cardHead}><div><h2>Nueva tarifa mensual</h2><p className={s.muted}>Rige desde el mes indicado hasta que se registre otra. Use monto 0 para suspender el cobro. Los meses ya pagados conservan su monto.</p></div></div>
        <FieldsForm busy={m.busy} label="Guardar tarifa" onSubmit={dt=>m.save('/mensualidades/tarifas',{...dt,dia_vencimiento:Number(dt.dia_vencimiento)})} fields={[
          {name:'desde',label:'Vigente desde (mes)',type:'month',value:actual},
          {name:'monto',label:'Monto mensual (Bs)',type:'number',min:'0',step:'0.01',value:vigente?.monto},
          {name:'dia_vencimiento',label:'Día de vencimiento (1 a 28)',type:'number',min:'1',step:'1',value:String(vigente?.dia_vencimiento??10)},
        ]}/>
      </section>}
      <section className={s.card}><h2>Historial de tarifas</h2>
        {d?.tarifas.length?<div className={s.tableWrap}><table className={s.table}><thead><tr><th>Vigente desde</th><th className={s.num}>Monto</th><th>Vence</th><th>Registrada por</th><th></th></tr></thead><tbody>
          {d.tarifas.map(t=><tr key={t.id}><td><strong>{mes(t.desde)}</strong></td><td className={`${s.num} ${s.mono}`}>{Number(t.monto)?dinero(t.monto):'Sin cobro'}</td><td>Día {t.dia_vencimiento}</td><td>{t.creado_nombre}<p>{fechaCorta(t.created_at)}</p></td><td>{t===vigente&&<Badge value="al_dia"/>}</td></tr>)}
        </tbody></table></div>:<p className={s.empty}>Sin tarifas registradas.</p>}
        <p className={s.muted}>Por defecto se cobra desde el mes de registro de cada voluntario. El inicio de cobro y las exenciones (licencias, becas) se configuran en el detalle de cada voluntario.</p>
      </section>
    </>}
  </div>;
}

function Fila({v,base,finanzas}:{v:ResumenMensualidad;base:string;finanzas:boolean}){
  const actual=hoy().slice(0,7),exento=v.exenciones.some(e=>e.desde<=actual&&(!e.hasta||e.hasta>=actual));
  return <tr><td><strong>{v.voluntario.nombre}</strong><p>{[ESTADO_PERSONAL[v.voluntario.estado_personal],v.voluntario.grado,v.voluntario.ci&&`C.I. ${v.voluntario.ci}`].filter(Boolean).join(' · ')}</p></td>
    <td><Badge value={v.estado}/>{exento&&<p>Exención vigente</p>}</td>
    <td className={`${s.num} ${s.mono}`}>{v.meses_vencidos}</td><td className={`${s.num} ${s.mono} ${v.deuda?s.minus:''}`}>{dinero(v.deuda)}</td>
    <td>{v.mes_actual?<><Badge value={v.mes_actual.estado}/><p>{mes(v.mes_actual.periodo)}{v.mes_actual.vence&&v.mes_actual.estado==='pendiente'?` · vence ${fechaCorta(v.mes_actual.vence)}`:''}</p></>:'—'}</td>
    <td>{v.ultimo_pago?<><Link className={`${s.code} ${s.codeIn}`} to={`${base}/voucher/${v.ultimo_pago.comprobante}`}>{v.ultimo_pago.comprobante}</Link><p>{mes(v.ultimo_pago.periodo)}</p></>:'Sin pagos'}</td>
    <td><Link className={v.deuda&&finanzas?s.button:s.chip} to={`${base}/mensualidades/${v.voluntario.id}`}>{finanzas?'Cobrar / detalle':'Ver detalle'}</Link></td></tr>;
}

/** Estado específico de un voluntario: cobro, inicio y exenciones. */
export function MensualidadVoluntario(){
  const {id}=useParams(),{finanzas,base}=usePortal();
  const load=useCallback(()=>gestionApi.mensualidadVoluntario(Number(id)),[id]),r=useRemote(load),m=useMutation(r.reload);
  const [decision,setDecision]=useState<Decision|null>(null);
  const e=r.data;
  return <div className={s.page}>
    <div className={s.heading}><div><Link className={s.link} to={`${base}/mensualidades`}>← Mensualidades</Link><h1>{e?.voluntario.nombre??'Voluntario'}</h1><p className={s.muted}>{[e?.voluntario.grado,e?.voluntario.ci&&`C.I. ${e.voluntario.ci}`,e?.voluntario.email].filter(Boolean).join(' · ')}</p></div><button className={s.secondary} onClick={r.reload}>Actualizar</button></div>
    <Feedback loading={r.loading} error={r.error||m.error} message={m.message}>{m.comprobante&&<Link to={`${base}/voucher/${m.comprobante}`}>Abrir voucher {m.comprobante}</Link>}</Feedback>
    {e&&<>
      {!e.voluntario.cobrable&&<p className={s.notice}>Voluntario en estado «{ESTADO_PERSONAL[e.voluntario.estado_personal]??e.voluntario.estado_personal}»: no está sujeto al cobro de mensualidades. Se muestra solo su historial.</p>}
      <EstadoHero e={e} base={base}/>
      {finanzas&&e.voluntario.cobrable&&<Cobro key={e.por_cobrar.map(p=>p.periodo).join()} e={e} mutation={m}/>}
      <MesesGrid meses={e.meses} base={base}/>
      <section className={s.card}><div className={s.cardHead}><div><h2>Configuración del cobro</h2><p className={s.muted}>Se cobra desde <strong>{e.inicio?mes(e.inicio):'—'}</strong>{e.configuracion.inicio?' (definido por finanzas)':' (mes de registro del voluntario)'}.</p></div></div>
        {finanzas&&e.voluntario.cobrable&&<FieldsForm key={e.inicio??''} busy={m.busy} label="Cambiar inicio" onSubmit={dt=>m.save(`/mensualidades/voluntarios/${e.voluntario.id}/inicio`,dt)} fields={[{name:'inicio',label:'Cobrar desde (mes)',type:'month',value:e.inicio??undefined}]}/>}
        <h3 style={{marginTop:22}}>Exenciones</h3>
        {e.exenciones.length?<div className={s.tableWrap}><table className={s.table}><thead><tr><th>Desde</th><th>Hasta</th><th>Motivo</th><th></th></tr></thead><tbody>
          {e.exenciones.map(x=><tr key={x.id}><td>{mes(x.desde)}</td><td>{x.hasta?mes(x.hasta):'Indefinida'}</td><td>{x.motivo}</td><td>{finanzas&&!x.hasta&&<button className={s.chip} onClick={()=>setDecision({title:'Finalizar exención',description:`${x.motivo} · desde ${mes(x.desde)}`,path:`/mensualidades/exenciones/${x.id}/cerrar`,fields:[{name:'hasta',label:'Último mes exento',type:'month',value:hoy().slice(0,7)}]})}>Finalizar</button>}</td></tr>)}
        </tbody></table></div>:<p className={s.muted}>Sin exenciones registradas.</p>}
        {finanzas&&e.voluntario.cobrable&&<details className={s.details2}><summary>Registrar exención</summary>
          <FieldsForm busy={m.busy} label="Registrar exención" onSubmit={dt=>m.save(`/mensualidades/voluntarios/${e.voluntario.id}/exenciones`,dt)} fields={[
            {name:'desde',label:'Desde (mes)',type:'month',value:hoy().slice(0,7)},{name:'hasta',label:'Hasta (vacío = indefinida)',type:'month',required:false},
            {name:'motivo',label:'Motivo (licencia, beca, etc.)',type:'textarea',max:500,wide:true}]}/>
        </details>}
      </section>
    </>}
    <DecisionModal decision={decision} close={()=>setDecision(null)} mutation={m}/>
  </div>;
}

function Cobro({e,mutation}:{e:EstadoMensualidad;mutation:ReturnType<typeof useMutation>}){
  const max=Math.min(24,e.por_cobrar.length);
  const [n,setN]=useState(Math.min(max,Math.max(1,e.meses_vencidos))),[referencia,setReferencia]=useState('');
  if(!max)return null;
  const meses=e.por_cobrar.slice(0,n),total=meses.reduce((t,p)=>t+p.monto,0);
  return <section className={`${s.card} ${s.formCard} ${s.tono_ingreso}`}>
    <div className={s.cardHead}><h2>Registrar cobro</h2><span className={s.nextCode}>Se emitirá un voucher FIN</span></div>
    <p className={s.muted}>Los meses se cobran en orden, empezando por el más antiguo pendiente. Puede adelantar hasta 11 meses.</p>
    <div className={s.form}>
      <label className={s.field}>Meses a cobrar<select value={n} disabled={mutation.busy} onChange={ev=>setN(Number(ev.target.value))}>{Array.from({length:max},(_,i)=><option key={i} value={i+1}>{i+1} {i?'meses':'mes'} · hasta {mes(e.por_cobrar[i].periodo)}</option>)}</select></label>
      <label className={s.field}>Referencia (recibo, transferencia)<input value={referencia} maxLength={200} disabled={mutation.busy} onChange={ev=>setReferencia(ev.target.value)}/></label>
    </div>
    <ul className={s.cobroList}>{meses.map(p=><li key={p.periodo}><span>{mes(p.periodo)}</span><Badge value={p.estado}/><strong className={s.mono}>{dinero(p.monto)}</strong></li>)}<li className={s.cobroTotal}><span>Total</span><strong className={s.mono}>{dinero(total)}</strong></li></ul>
    <div className={s.actions}><button className={s.button} disabled={mutation.busy} onClick={async()=>{if(await mutation.save('/mensualidades/cobros',{voluntario_id:e.voluntario.id,periodos:meses.map(p=>p.periodo),referencia:referencia.trim()||undefined}))setReferencia('');}}>{mutation.busy?'Guardando…':`Cobrar ${dinero(total)} y emitir voucher`}</button></div>
  </section>;
}

function EstadoHero({e,base}:{e:EstadoMensualidad;base:string}){
  const debe=e.estado==='debe';
  return <div className={`${s.estadoHero} ${debe?s.tono_egreso:s.tono_ingreso}`}>
    <div><small>Estado de mensualidades</small><strong>{debe?`Debe ${dinero(e.deuda)}`:'Al día'}</strong><p>{debe?`${e.meses_vencidos} ${e.meses_vencidos===1?'mes vencido':'meses vencidos'}`:e.meses.length?'Sin meses vencidos':'Aún no hay mensualidades por cobrar'}</p></div>
    {e.mes_actual&&<div><small>{mes(e.mes_actual.periodo)}</small><Badge value={e.mes_actual.estado}/><p>{e.mes_actual.monto?dinero(e.mes_actual.monto):'Sin cobro'}{e.mes_actual.vence&&e.mes_actual.estado==='pendiente'?` · vence ${fechaCorta(e.mes_actual.vence)}`:''}</p></div>}
    <div><small>Último pago</small>{e.ultimo_pago?<><Link className={`${s.code} ${s.codeIn}`} to={`${base}/voucher/${e.ultimo_pago.comprobante}`}>{e.ultimo_pago.comprobante}</Link><p>{mes(e.ultimo_pago.periodo)}</p></>:<p>Sin pagos registrados</p>}</div>
  </div>;
}

function MesesGrid({meses,base}:{meses:MesMensualidad[];base:string}){
  const visibles=meses.filter(m=>m.estado!=='adelanto').reverse();
  return <section className={s.card}><h2>Historial mensual</h2>
    {visibles.length?<div className={s.mesesGrid}>{visibles.map(m=><div key={m.periodo} className={`${s.mesTile} ${s[`mes_${m.estado}`]??''}`}>
      <span>{mes(m.periodo)}</span><Badge value={m.estado}/>
      <strong className={s.mono}>{m.monto?dinero(m.monto):'—'}</strong>
      {m.comprobante?<Link to={`${base}/voucher/${m.comprobante}`}>Voucher {m.comprobante}</Link>:m.motivo?<small>{m.motivo}</small>:m.vence&&m.estado!=='sin_cobro'?<small>Vence {fechaCorta(m.vence)}</small>:null}
    </div>)}</div>:<p className={s.empty}>Aún no hay meses registrados.</p>}
  </section>;
}

/** Vista del voluntario: si está al día o cuánto debe, con sus vouchers. */
export function MiMensualidad(){
  const r=useRemote(gestionApi.miMensualidad),e=r.data;
  return <div className={s.page}>
    <div className={s.heading}><div><h1>Mis mensualidades</h1><p className={s.muted}>Los pagos se realizan en Finanzas. Cada pago genera un voucher que puede ver y descargar en PDF.</p></div><button className={s.secondary} onClick={r.reload}>Actualizar</button></div>
    <Feedback loading={r.loading} error={r.error}/>
    {e&&!e.voluntario.cobrable&&<p className={s.notice}>Su estado actual («{ESTADO_PERSONAL[e.voluntario.estado_personal]??e.voluntario.estado_personal}») no está sujeto al cobro de mensualidades. Se muestra su historial de pagos.</p>}
    {e&&<><EstadoHero e={e} base="/voluntario"/><MesesGrid meses={e.meses} base="/voluntario"/></>}
  </div>;
}
