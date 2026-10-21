import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { gestionApi } from '../../services/gestionApi';
import type { Equipo, LogisticaData, TipoEquipo } from '../../services/gestionApi';
import { descargarReporteLogistica, situacion } from '../../utils/logisticaExcel';
import { Badge,DecisionModal,fechaCorta,Feedback,FieldsForm,ReporteExcel,stateOptions,useMutation,useRemote } from './shared';
import type { Decision } from './shared';
import s from './Gestion.module.css';

type Vista='resumen'|'inventario'|'estados';
const TITULOS:Record<Vista,[string,string]>={
  resumen:['Dashboard de logística','Inventario, préstamos y actas. Cada entrega, devolución y baja emite un acta correlativa LOG.'],
  inventario:['Inventario de equipos','Registre cada unidad física con su código, tipo y estado inicial.'],
  estados:['Estado y bajas','Actualice el estado físico de los equipos. La baja emite un acta y conserva el historial.'],
};
const SITUACION_CLASE:Record<string,string>={Disponible:'good','Dado de baja':'bad','Pendiente de autorización':'pending'};

export default function Logistica({vista='resumen'}:{vista?:Vista}){
  const {user}=useAuth(),r=useRemote(gestionApi.logistica),tipos=useRemote(gestionApi.tiposEquipo);
  const m=useMutation(()=>{r.reload();tipos.reload();});
  const [decision,setDecision]=useState<Decision|null>(null),[filtro,setFiltro]=useState(''),[sit,setSit]=useState('');
  const editable=user?.role==='jefe_logistica',base=editable?'/logistica':'/presidente';
  const d=r.data,hoyBo=d?.hoy??'';
  const vencido=(e:Equipo)=>e.prestamo_estado==='autorizado'&&!!e.fecha_devolucion&&e.fecha_devolucion.slice(0,10)<hoyBo;
  const rows=d?.equipos.filter(e=>(!sit||situacion(e)===sit)&&`${e.codigo} ${e.nombre} ${e.tipo} ${e.asignado_a??''}`.toLowerCase().includes(filtro.toLowerCase()))??[];
  const [titulo,subtitulo]=TITULOS[vista];
  return <div className={s.page}>
    <div className={s.heading}><div><h1>{titulo}</h1><p className={s.muted}>{subtitulo}</p></div><button className={s.secondary} onClick={r.reload}>Actualizar</button></div>
    <Feedback loading={r.loading} error={r.error||m.error} message={m.message}>{m.comprobante&&<Link to={`${base}/acta/${m.comprobante}`}>Ver acta {m.comprobante}</Link>}</Feedback>
    {d&&vista==='resumen'&&<Resumen d={d} vencido={vencido} base={base}/>}
    {vista==='resumen'&&<ReporteExcel descripcion="Inventario, préstamos, vencidos, actas de entrega/devolución/baja y equipos por voluntario. Deje las fechas vacías para incluir todo." descargar={async(a,b)=>descargarReporteLogistica(await gestionApi.reporteLogistica(a,b))}/>}
    {editable&&vista==='inventario'&&<section className={`${s.card} ${s.formCard} ${s.tono_entrega}`}>
      <div className={s.cardHead}><h2>Registrar equipo</h2><a className={s.nextCode} href="#tipos">Tipos configurables</a></div>
      <FieldsForm key={tipos.data?.length??0} busy={m.busy} onSubmit={dt=>m.save('/equipos',dt)} label="Registrar equipo" fields={[{name:'codigo',label:'Código de inventario / serie',max:80},{name:'nombre',label:'Nombre del equipo'},{name:'tipo',label:'Tipo de equipo',options:(tipos.data??[]).filter(t=>t.activo).map(t=>[t.nombre,t.nombre])},{name:'estado',label:'Estado inicial',options:stateOptions},{name:'observaciones',label:'Observaciones',type:'textarea',required:false,wide:true}]}/>
    </section>}
    {vista==='inventario'&&tipos.data&&<TiposEquipo tipos={tipos.data} editable={editable} mutation={m} decidir={setDecision}/>}
    {vista!=='resumen'&&<section className={s.card}>
      <div className={s.cardHead}><h2>Equipos registrados</h2><div className={s.toolbar}>
        <div className={s.tabs} aria-label="Filtrar por situación">{['','Disponible','Prestado','No disponible','Dado de baja'].map(v=><button key={v} aria-pressed={sit===v} className={sit===v?s.tabActive:''} onClick={()=>setSit(v)}>{v||'Todos'}</button>)}</div>
        <input className={s.search} placeholder="Código, nombre, tipo o voluntario…" aria-label="Buscar equipos" value={filtro} onChange={e=>setFiltro(e.target.value)}/>
      </div></div>
      {rows.length?<div className={s.tableWrap}><table className={s.table}><thead><tr><th>Equipo</th><th>Tipo</th><th>Estado físico</th><th>Situación</th><th>Observaciones</th>{(editable&&vista==='estados')&&<th>Acciones</th>}</tr></thead><tbody>
        {rows.map(e=><tr key={e.id}><td><span className={s.code}>{e.codigo}</span><p><strong>{e.nombre}</strong></p></td><td>{e.tipo}</td><td><Badge value={e.estado}/></td>
          <td><span className={`${s.badge} ${s[SITUACION_CLASE[situacion(e)]]??''}`}>{situacion(e)}</span>
            {e.asignado_a&&<p>{e.asignado_a}{e.fecha_devolucion?` · hasta ${fechaCorta(e.fecha_devolucion.slice(0,10))}`:''}</p>}
            {vencido(e)&&<p className={s.minus}>Devolución vencida</p>}
            {e.acta_baja&&<p><Link to={`${base}/acta/${e.acta_baja}`}>Acta {e.acta_baja}</Link></p>}</td>
          <td>{e.observaciones||'—'}</td>
          {(editable&&vista==='estados')&&<td>{e.estado!=='baja'&&!e.prestamo_activo&&<div className={s.rowActions}>
            <button className={s.chip} onClick={()=>setDecision({title:'Actualizar estado',description:`${e.codigo} · ${e.nombre}`,path:`/equipos/${e.id}/estado`,fields:[{name:'estado',label:'Nuevo estado',options:stateOptions,value:e.estado},{name:'motivo',label:'Motivo y observaciones',type:'textarea'}]})}>Cambiar estado</button>
            <button className={s.chipDanger} onClick={()=>setDecision({title:'Dar de baja al equipo',description:`${e.codigo} · ${e.nombre}. Se emitirá un acta de baja; el historial se conserva y el equipo sale de futuros préstamos.`,path:`/equipos/${e.id}/estado`,body:{estado:'baja'},fields:[{name:'motivo',label:'Motivo de la baja',type:'textarea'}],label:'Registrar baja y emitir acta'})}>Dar de baja</button>
          </div>}{e.prestamo_activo&&e.estado!=='baja'&&<p className={s.muted}>En préstamo #{e.prestamo_activo}</p>}</td>}
        </tr>)}
      </tbody></table></div>:<p className={s.empty}>No hay equipos para mostrar.</p>}
    </section>}
    <DecisionModal decision={decision} close={()=>setDecision(null)} mutation={m}/>
  </div>;
}

function Resumen({d,vencido,base}:{d:LogisticaData;vencido:(e:Equipo)=>boolean;base:string}){
  const cuenta=(f:(e:Equipo)=>boolean)=>d.equipos.filter(f).length;
  const enServicio=cuenta(e=>e.estado!=='baja'),vencidos=d.equipos.filter(vencido);
  const pct=(n:number,t:number)=>t?`${n/t*100}%`:'0%';
  return <>
    <div className={s.kpis} style={{marginBottom:18}}>
      {([['Equipos en servicio',enServicio,s.kSaldo],['Disponibles',cuenta(e=>situacion(e)==='Disponible'),s.kIn],['Prestados',cuenta(e=>situacion(e)==='Prestado'),s.kCom],
        ['Pendientes de autorización',cuenta(e=>situacion(e)==='Pendiente de autorización'),s.kRes],['Mantenimiento o dañados',cuenta(e=>['mantenimiento','danado'].includes(e.estado)),s.kRes],['Devoluciones vencidas',vencidos.length,s.kOut]] as [string,number,string][])
        .map(([l,v,c])=><div className={`${s.kpi} ${c}`} key={l}><small>{l}</small><strong>{v}</strong></div>)}
    </div>
    {vencidos.length>0&&<section className={`${s.card} ${s.formCard} ${s.tono_baja}`}><h2>Devoluciones vencidas</h2><div className={s.tableWrap}><table className={s.table}><thead><tr><th>Equipo</th><th>Voluntario</th><th>Debía devolverse</th></tr></thead><tbody>
      {vencidos.map(e=><tr key={e.id}><td><span className={s.code}>{e.codigo}</span><p>{e.nombre}</p></td><td>{e.asignado_a}</td><td className={s.minus}>{fechaCorta(e.fecha_devolucion!.slice(0,10))}</td></tr>)}
    </tbody></table></div><p className={s.muted}>El sistema envía recordatorios por correo al voluntario. <Link to={`${base}/prestamos`}>Ir a préstamos</Link></p></section>}
    <section className={s.card}><h2>Equipos por tipo</h2>
      {d.resumen.length?<div className={s.tiposGrid}>{d.resumen.map(t=>{
        const total=Number(t.total),noDisp=Number(t.mantenimiento)+Number(t.danados),bajas=Number(t.bajas);
        return <div key={t.tipo} className={s.tipoCard}>
          <div className={s.cardHead} style={{marginBottom:6}}><strong>{t.tipo}</strong><span className={s.muted}>{total-bajas} en servicio</span></div>
          <div className={s.stackBar} aria-label={`${t.disponibles} disponibles de ${total}`}><span className={s.barFree} style={{width:pct(Number(t.disponibles),total)}}/><span className={s.barCom} style={{width:pct(Number(t.prestados),total)}}/><span className={s.barRes} style={{width:pct(noDisp,total)}}/><span className={s.barOff} style={{width:pct(bajas,total)}}/></div>
          <ul className={s.legendDark}><li><i className={s.barFree}/>{t.disponibles} disponibles</li><li><i className={s.barCom}/>{t.prestados} prestados</li><li><i className={s.barRes}/>{noDisp} mant./dañados</li><li><i className={s.barOff}/>{bajas} bajas</li></ul>
        </div>;})}</div>:<p className={s.empty}>Registre equipos para ver su distribución.</p>}
    </section>
  </>;
}

function TiposEquipo({tipos,editable,mutation,decidir}:{tipos:TipoEquipo[];editable:boolean;mutation:ReturnType<typeof useMutation>;decidir:(d:Decision)=>void}){
  return <section className={s.card} id="tipos">
    <div className={s.cardHead}><div><h2>Tipos de equipo</h2><p className={s.muted}>Catálogo usado al registrar equipos. Un tipo desactivado conserva sus equipos, pero no admite nuevos.</p></div></div>
    <div className={s.destinos}>{tipos.map(t=><div key={t.id} className={`${s.destino} ${t.activo?'':s.destinoOff}`} style={{borderLeftColor:t.activo?'#2456bd':undefined}}>
      <div><strong>{t.nombre}</strong><p>{t.equipos} equipo(s)</p></div>
      {editable&&<button className={t.activo?s.chipDanger:s.chip} onClick={()=>decidir({title:`${t.activo?'Desactivar':'Activar'} tipo de equipo`,description:t.nombre,path:`/tipos-equipo/${t.id}/estado`,body:{activo:!t.activo}})}>{t.activo?'Desactivar':'Activar'}</button>}
    </div>)}</div>
    {editable&&<FieldsForm busy={mutation.busy} label="Agregar tipo" onSubmit={dt=>mutation.save('/tipos-equipo',dt)} fields={[{name:'nombre',label:'Nuevo tipo (ej. Drones, Iluminación)',max:100}]}/>}
  </section>;
}
