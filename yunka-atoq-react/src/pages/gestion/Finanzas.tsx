import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { campaniasApi } from '../../services/api';
import { gestionApi } from '../../services/gestionApi';
import type { Concepto, Deuda, Destino, FinanzasData } from '../../services/gestionApi';
import { descargarVoucherPDF } from '../../utils/voucherPdf';
import { descargarReporteFinanzas } from '../../utils/finanzasExcel';
import { amountField, detailField, Badge, DecisionModal, dinero, fechaCorta, Feedback, FieldsForm, ReporteExcel, useMutation, useRemote } from './shared';
import type { Decision } from './shared';
import s from './Gestion.module.css';

type Vista = 'resumen'|'ingreso'|'egreso'|'reservas';
const TITULOS:Record<Vista,[string,string]>={
  resumen:['Estado financiero','Fondos institucionales en bolivianos. Cada ingreso, egreso y reserva emite un voucher correlativo FIN.'],
  ingreso:['Registrar ingresos','Donaciones, aportes y saldos recibidos. Al guardar se emite el voucher de ingreso.'],
  egreso:['Registrar egresos','Pagos institucionales directos o abonos a una deuda. Al guardar se emite el voucher de egreso.'],
  reservas:['Reservas de dinero','Fondos apartados para campañas, vehículo y logística. Cada reserva tiene su voucher.'],
};

export default function Finanzas({vista='resumen'}:{vista?:Vista}) {
  const remote=useRemote(gestionApi.finanzas),dest=useRemote(gestionApi.destinos),{user}=useAuth();
  const m=useMutation(()=>{remote.reload();dest.reload();});
  const [decision,setDecision]=useState<Decision|null>(null),[filtro,setFiltro]=useState(''),[tipo,setTipo]=useState('');
  const [pdf,setPdf]=useState(''),[pdfError,setPdfError]=useState('');
  const data=remote.data,editable=user?.role==='jefe_finanzas',base=`/${editable?'finanzas':'presidente'}/voucher`;
  const tipoVisible=vista==='ingreso'||vista==='egreso'?vista:tipo;
  const q=filtro.toLowerCase();
  const rows=data?.movimientos.filter(r=>(!tipoVisible||r.tipo===tipoVisible)&&`${r.comprobante} ${r.detalle} ${r.referencia} ${r.beneficiario}`.toLowerCase().includes(q))??[];
  async function descargar(codigo:string){
    setPdf(codigo);setPdfError('');
    try{await descargarVoucherPDF(await gestionApi.voucher(codigo));}
    catch{setPdfError(`No se pudo generar el PDF del voucher ${codigo}.`);}
    finally{setPdf('');}
  }
  const acciones=(codigo:string)=><><Link className={s.chip} to={`${base}/${codigo}`}>Ver</Link><button className={s.chip} disabled={pdf===codigo} onClick={()=>descargar(codigo)}>{pdf===codigo?'…':'PDF'}</button></>;
  const [titulo,subtitulo]=TITULOS[vista];
  const conceptoDe=(clave:string|null)=>data?.conceptos.find(c=>c.clave===clave)?.nombre??'Sin concepto';
  return <div className={s.page}>
    <div className={s.heading}><div><h1>{titulo}</h1><p className={s.muted}>{subtitulo}</p></div><button className={s.secondary} onClick={remote.reload}>Actualizar</button></div>
    {vista==='resumen'&&<ReporteExcel descripcion="Resumen, ingresos, egresos, totales por concepto, préstamos y deudas, y mensualidades. Deje las fechas vacías para incluir todo." descargar={async(d,h)=>descargarReporteFinanzas(await gestionApi.reporte(d,h))}/>}
    <Feedback loading={remote.loading} error={remote.error||m.error||pdfError} message={m.message}>{m.comprobante&&<Link to={`${base}/${m.comprobante}`}>Ver voucher {m.comprobante}</Link>}</Feedback>
    {data&&<Resumen r={data.resumen}/>}
    {editable&&(vista==='ingreso'||vista==='egreso')&&<section className={`${s.card} ${s.formCard} ${vista==='ingreso'?s.tono_ingreso:s.tono_egreso}`}>
      <div className={s.cardHead}><h2>Nuevo {vista}</h2><span className={s.nextCode}>Se emitirá un voucher FIN</span></div>
      {vista==='egreso'&&<p className={s.notice}>Para entregar fondos a un voluntario, ejecute su solicitud desde «Atender solicitudes»: el voucher incluirá ambas autorizaciones.</p>}
      {data&&<MovimientoForm key={vista} tipo={vista} conceptos={data.conceptos} mutation={m}/>}
    </section>}
    {vista==='reservas'&&editable&&<ReservaForm busy={m.busy} save={d=>m.save('/reservas',d)} destinos={dest.data??[]}/>}
    {vista==='reservas'&&dest.data&&<Destinos destinos={dest.data} editable={editable} mutation={m} decidir={setDecision}/>}
    {(vista==='reservas'||vista==='resumen')&&<section className={s.card}>
      <div className={s.cardHead}><div><h2>Reservas para campañas, vehículo y logística</h2><p className={s.muted}>Las reservas activas reducen el disponible. Libere una reserva, indicando el motivo, para utilizar esos fondos.</p></div></div>
      {data?.reservas.length?<div className={s.tableWrap}><table className={s.table}><thead><tr><th>Voucher</th><th>Destino</th><th>Detalle</th><th className={s.num}>Monto</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
        {data.reservas.map(r=><tr key={r.id}><td><span className={s.code}>{r.comprobante}</span><p>{fechaCorta(r.created_at)}</p></td><td><strong>{r.destino_nombre}</strong>{r.campania_nombre&&<p>{r.campania_nombre}</p>}</td><td>{r.detalle}{r.liberada_motivo&&<p>Liberada: {r.liberada_motivo}</p>}</td><td className={`${s.num} ${s.mono}`}>{dinero(r.monto)}</td><td><Badge value={r.estado}/></td>
          <td><div className={s.rowActions}>{acciones(r.comprobante)}{editable&&r.estado==='activa'&&<button className={s.chipDanger} onClick={()=>setDecision({title:`Liberar reserva ${r.comprobante}`,description:`${r.detalle} · ${dinero(r.monto)}`,path:`/reservas/${r.id}/liberar`,fields:[{name:'motivo',label:'Motivo',type:'textarea'}]})}>Liberar</button>}</div></td></tr>)}
      </tbody></table></div>:<p className={s.empty}>No hay reservas registradas.</p>}
    </section>}
    {vista!=='reservas'&&<section className={s.card}>
      <div className={s.cardHead}><h2>Historial de movimientos</h2>
        <div className={s.toolbar}>
          {vista==='resumen'&&<div className={s.tabs} role="tablist" aria-label="Tipo de movimiento">{([['','Todos'],['ingreso','Ingresos'],['egreso','Egresos']] as const).map(([v,l])=><button key={v} role="tab" aria-selected={tipo===v} className={tipo===v?s.tabActive:''} onClick={()=>setTipo(v)}>{l}</button>)}</div>}
          <input className={s.search} aria-label="Buscar movimientos" placeholder="Buscar por voucher, detalle o referencia…" value={filtro} onChange={e=>setFiltro(e.target.value)}/>
        </div>
      </div>
      {rows.length?<div className={s.tableWrap}><table className={s.table}><thead><tr><th>Voucher</th><th>Fecha</th><th>Detalle</th><th>Referencia</th><th className={s.num}>Monto</th><th>Acciones</th></tr></thead><tbody>
        {rows.map(r=><tr key={r.id}><td><span className={`${s.code} ${r.tipo==='ingreso'?s.codeIn:s.codeOut}`}>{r.comprobante}</span><p>{conceptoDe(r.concepto)}{r.solicitud_id?` · solicitud #${r.solicitud_id}`:''}</p></td><td>{fechaCorta(r.created_at)}<p>{r.registrado_nombre}</p></td><td>{r.detalle}{r.beneficiario&&<p>{r.tipo==='egreso'?'Beneficiario':'Aportante'}: {r.beneficiario}</p>}{r.deuda_acreedor&&<p>Abono a deuda #{r.deuda_id} · {r.deuda_acreedor}</p>}</td><td>{r.referencia||'—'}</td>
          <td className={`${s.num} ${s.mono} ${r.tipo==='ingreso'?s.plus:s.minus}`}>{r.tipo==='ingreso'?'+':'−'} {dinero(r.monto)}</td><td><div className={s.rowActions}>{acciones(r.comprobante)}</div></td></tr>)}
      </tbody></table></div>:<p className={s.empty}>No hay movimientos para mostrar.</p>}
    </section>}
    <DecisionModal decision={decision} close={()=>setDecision(null)} mutation={m}/>
  </div>;
}

/** Ingreso o egreso directo con su concepto; un egreso puede abonar a una deuda pendiente. */
function MovimientoForm({tipo,conceptos,mutation}:{tipo:'ingreso'|'egreso';conceptos:Concepto[];mutation:ReturnType<typeof useMutation>}){
  const [params]=useSearchParams(),deudas=useRemote(tipo==='egreso'?gestionApi.deudas:sinDeudas);
  const vacio={deuda:'',monto:'',concepto:'',referencia:'',detalle:''};
  const [f,setF]=useState({...vacio,deuda:params.get('deuda')??''});
  const set=(k:keyof typeof vacio)=>(e:{target:{value:string}})=>setF(v=>({...v,[k]:e.target.value}));
  const pendientes=deudas.data?.filter(d=>d.estado==='pendiente')??[],deuda=pendientes.find(d=>String(d.id)===f.deuda);
  const quedara=deuda?Math.round((deuda.saldo-(Number(f.monto)||0))*100)/100:0;
  const opciones=conceptos.filter(c=>c.manual&&c.tipo===tipo);
  async function enviar(e:FormEvent){
    e.preventDefault();
    const ok=await mutation.save('/movimientos',{tipo,monto:f.monto,detalle:f.detalle,referencia:f.referencia.trim()||undefined,...(deuda?{deuda_id:deuda.id}:{concepto:f.concepto})});
    if(ok){setF(vacio);deudas.reload();}
  }
  return <form className={s.form} onSubmit={enviar}>
    {tipo==='egreso'&&<label className={`${s.field} ${s.wide}`}>Deuda a cubrir (opcional)
      <select value={f.deuda} disabled={mutation.busy} onChange={e=>{const d=pendientes.find(x=>String(x.id)===e.target.value);setF(v=>({...v,deuda:e.target.value,detalle:v.detalle||(d?`Abono a deuda #${d.id} · ${d.acreedor}`:'')}));}}>
        <option value="">Ninguna · egreso por concepto</option>{pendientes.map(d=><option key={d.id} value={d.id}>#{d.id} · {d.acreedor} · falta {dinero(d.saldo)}</option>)}
      </select></label>}
    {deuda&&<div className={`${s.deudaInfo} ${s.wide}`}>
      <div><small>Monto de la deuda</small><strong>{dinero(deuda.monto)}</strong></div>
      <div><small>Pagado</small><strong>{dinero(deuda.pagado)}</strong></div>
      <div><small>Falta por pagar</small><strong className={s.minus}>{dinero(deuda.saldo)}</strong></div>
      <div><small>Quedará tras este pago</small><strong className={quedara<0?s.minus:s.plus}>{quedara<0?'Excede el saldo':dinero(quedara)}</strong></div>
      <button type="button" className={s.chip} disabled={mutation.busy} onClick={()=>setF(v=>({...v,monto:String(deuda.saldo)}))}>Pagar el saldo completo</button>
    </div>}
    <label className={s.field}>Monto (Bs)<input type="number" min="0.01" step="0.01" max={deuda?.saldo} required value={f.monto} disabled={mutation.busy} onChange={set('monto')}/></label>
    {!deuda&&<label className={s.field}>Concepto<select required value={f.concepto} disabled={mutation.busy} onChange={set('concepto')}><option value="">Seleccione…</option>{opciones.map(c=><option key={c.clave} value={c.clave}>{c.nombre}</option>)}</select></label>}
    <label className={s.field}>Referencia (nº de transferencia, recibo, factura)<input maxLength={200} value={f.referencia} disabled={mutation.busy} onChange={set('referencia')}/></label>
    <label className={`${s.field} ${s.wide}`}>Detalle y justificación<textarea required maxLength={2000} value={f.detalle} disabled={mutation.busy} onChange={set('detalle')}/></label>
    <div className={`${s.actions} ${s.wide}`}><button className={s.button} disabled={mutation.busy}>{mutation.busy?'Guardando…':deuda?'Registrar abono y emitir voucher':`Registrar ${tipo} y emitir voucher`}</button></div>
  </form>;
}
const sinDeudas=async():Promise<Deuda[]>=>[];

function Resumen({r}:{r:FinanzasData['resumen']}){
  const total=r.saldo>0?r.saldo:0,pct=(n:number)=>total?`${Math.max(0,Math.min(100,n/total*100))}%`:'0%';
  return <div className={s.finGrid}>
    <div className={s.hero}>
      <small>Disponible para operar</small><strong>{dinero(r.disponible)}</strong>
      <div className={s.heroBar} aria-hidden><span className={s.barFree} style={{width:pct(r.disponible)}}/><span className={s.barRes} style={{width:pct(r.reservado)}}/><span className={s.barCom} style={{width:pct(r.comprometido)}}/></div>
      <ul className={s.legend}><li><i className={s.barFree}/>Disponible</li><li><i className={s.barRes}/>Reservado {dinero(r.reservado)}</li><li><i className={s.barCom}/>Comprometido {dinero(r.comprometido)}</li></ul>
      <p>Saldo en caja {dinero(r.saldo)} − reservas activas − egresos aprobados pendientes de entrega.</p>
    </div>
    <div className={s.kpis}>
      {([['Saldo en caja',r.saldo,s.kSaldo],['Ingresos',r.ingresos,s.kIn],['Egresos',r.egresos,s.kOut],['Reservado',r.reservado,s.kRes],['Comprometido',r.comprometido,s.kCom]] as [string,number,string][]).map(([l,v,c])=><div className={`${s.kpi} ${c}`} key={l}><small>{l}</small><strong>{dinero(v)}</strong></div>)}
    </div>
  </div>;
}

function ReservaForm({busy,save,destinos}:{busy:boolean;save:(d:Record<string,string>)=>Promise<boolean>;destinos:Destino[]}){
  const c=useRemote(campaniasApi.list);
  const activos=destinos.filter(d=>d.activo),conCampania=activos.filter(d=>d.requiere_campania).map(d=>d.nombre).join(', ');
  return <section className={`${s.card} ${s.formCard} ${s.tono_reserva}`}><div className={s.cardHead}><h2>Reservar fondos</h2><span className={s.nextCode}>Se emitirá un voucher FIN</span></div><Feedback error={c.error}/><FieldsForm key={activos.length} busy={busy} onSubmit={save} label="Reservar y emitir voucher" fields={[{name:'destino',label:'Destino',options:activos.map(d=>[d.clave,d.nombre])},amountField,{name:'campania_id',label:`Campaña${conCampania?` (obligatoria para: ${conCampania})`:''}`,options:c.data?.map(c=>[String(c.id),c.nombre])??[],required:false},detailField]}/></section>;
}

function Destinos({destinos,editable,mutation,decidir}:{destinos:Destino[];editable:boolean;mutation:ReturnType<typeof useMutation>;decidir:(d:Decision)=>void}){
  return <section className={s.card}>
    <div className={s.cardHead}><div><h2>Destinos de reserva</h2><p className={s.muted}>Agregue destinos según las necesidades institucionales. Un destino desactivado conserva sus reservas, pero no admite nuevas.</p></div></div>
    <div className={s.destinos}>{destinos.map(d=><div key={d.clave} className={`${s.destino} ${d.activo?'':s.destinoOff}`}>
      <div><strong>{d.nombre}</strong><p>{d.reservas} reserva(s){d.requiere_campania?' · requiere campaña':''}</p></div>
      {editable&&<button className={d.activo?s.chipDanger:s.chip} onClick={()=>decidir({title:`${d.activo?'Desactivar':'Activar'} destino`,description:d.nombre,path:`/destinos/${d.clave}/estado`,body:{activo:!d.activo}})}>{d.activo?'Desactivar':'Activar'}</button>}
    </div>)}</div>
    {editable&&<FieldsForm busy={mutation.busy} label="Agregar destino" onSubmit={d=>mutation.save('/destinos',d)} fields={[{name:'nombre',label:'Nuevo destino (ej. Equipos de rescate)',max:120},{name:'requiere_campania',label:'¿Requiere vincular una campaña?',options:[['0','No'],['1','Sí']],value:'0'}]}/>}
  </section>;
}
