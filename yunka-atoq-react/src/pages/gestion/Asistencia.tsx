import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { gestionApi } from '../../services/gestionApi';
import { descargarReporteAsistencia } from '../../utils/personalExcel';
import { ASISTENCIA, descargarListaAsistenciaPDF } from '../../utils/personalPdf';
import { Matricula } from './Personal';
import { Badge, DecisionModal, fechaCorta, Feedback, hoy, ReporteExcel, useMutation, useRemote } from './shared';
import type { Decision } from './shared';
import s from './Gestion.module.css';

const ESTADOS=Object.entries(ASISTENCIA);
type Marca={estado:string;observacion:string};

/** Llamar lista: se marca al personal activo y en comisión; lo ya registrado se corrige con motivo. */
export default function Asistencia(){
  const {user}=useAuth();
  const [fecha,setFecha]=useState(hoy());
  const load=useCallback(()=>gestionApi.listaAsistencia(fecha),[fecha]),r=useRemote(load),m=useMutation(r.reload);
  const [marcas,setMarcas]=useState<Record<number,Marca>>({}),[decision,setDecision]=useState<Decision|null>(null),[pdf,setPdf]=useState(false);
  const d=r.data,registrado=new Map(d?.registros.map(x=>[x.voluntario_id,x])??[]);
  const pendientes=d?.personal.filter(p=>!registrado.has(p.id))??[];
  // Al cargar la lista, cada pendiente parte como presente (o comisión si está comisionado).
  useEffect(()=>{if(d)setMarcas(Object.fromEntries(d.personal.map(p=>[p.id,{estado:p.estado==='comision'?'comision':'presente',observacion:''}])));},[d]);
  const marcar=(id:number,k:keyof Marca,v:string)=>setMarcas(x=>({...x,[id]:{...x[id],[k]:v}}));
  const conteo=(e:string)=>pendientes.filter(p=>marcas[p.id]?.estado===e).length+(d?.registros.filter(x=>x.estado===e).length??0);
  async function guardar(){
    if(!pendientes.length)return;
    await m.save('/personal/asistencia',{fecha,registros:pendientes.map(p=>({voluntario_id:p.id,estado:marcas[p.id]?.estado??'presente',observacion:marcas[p.id]?.observacion.trim()||undefined}))});
  }
  async function descargar(){if(!d)return;setPdf(true);try{await descargarListaAsistenciaPDF(d,user?.nombre??'');}finally{setPdf(false);}}
  return <div className={s.page}>
    <div className={s.heading}><div><h1>Llamar lista</h1><p className={s.muted}>Asistencia a instrucción del personal activo y en comisión. Un registro por persona y día; las correcciones quedan en la bitácora.</p></div>
      <div className={s.excelForm}><label className={s.field}>Fecha<input type="date" value={fecha} max={hoy()} onChange={e=>e.target.value&&setFecha(e.target.value)}/></label><button className={s.secondary} disabled={!d?.registros.length||pdf} onClick={descargar}>{pdf?'Generando…':'Lista en PDF'}</button></div></div>
    <Feedback loading={r.loading} error={r.error||m.error} message={m.resultado?.registrados!==undefined?`Lista guardada: ${m.resultado.registrados} registro(s)${m.resultado.omitidos?`, ${m.resultado.omitidos} ya existían`:''}.`:m.message}/>
    {d&&<div className={s.kpis} style={{marginBottom:18}}>{ESTADOS.map(([k,v])=><div key={k} className={`${s.kpi} ${k==='presente'?s.kIn:k==='falta'?s.kOut:k==='comision'?s.kCom:s.kRes}`}><small>{v}</small><strong>{conteo(k)}</strong></div>)}
      <div className={`${s.kpi} ${s.kSaldo}`}><small>Por registrar</small><strong>{pendientes.length}</strong></div></div>}
    {d&&pendientes.length>0&&<section className={`${s.card} ${s.formCard} ${s.tono_entrega}`}>
      <div className={s.cardHead}><div><h2>Pendientes de registrar · {fechaCorta(fecha)}</h2><p className={s.muted}>Marque a cada persona y guarde la lista.</p></div>
        <div className={s.rowActions}>{['presente','falta'].map(e=><button key={e} className={s.chip} onClick={()=>setMarcas(x=>Object.fromEntries(Object.entries(x).map(([k,v])=>[k,{...v,estado:d.personal.find(p=>p.id===Number(k))?.estado==='comision'?'comision':e}])))}>Todos {ASISTENCIA[e].toLowerCase()}</button>)}</div></div>
      <div className={s.tableWrap}><table className={s.table}><thead><tr><th>Matrícula</th><th>Nombre</th><th>Asistencia</th><th>Observación</th></tr></thead><tbody>
        {pendientes.map(p=><tr key={p.id}><td><Matricula codigo={p.codigo} matricula={p.matricula}/></td><td><strong>{p.nombre_completo}</strong><p>{p.grado||''}{p.comision_destino?` · comisión en ${p.comision_destino}`:''}</p></td>
          <td><div className={s.tabs} role="radiogroup" aria-label={`Asistencia de ${p.nombre_completo}`}>{ESTADOS.map(([k,v])=><button key={k} role="radio" aria-checked={marcas[p.id]?.estado===k} className={marcas[p.id]?.estado===k?`${s.tabActive} ${s[`marca_${k}`]}`:''} onClick={()=>marcar(p.id,'estado',k)}>{v}</button>)}</div></td>
          <td><input className={s.search} style={{margin:0,width:'100%'}} maxLength={500} placeholder="Opcional" value={marcas[p.id]?.observacion??''} onChange={e=>marcar(p.id,'observacion',e.target.value)}/></td></tr>)}
      </tbody></table></div>
      <div className={s.actions}><button className={s.button} disabled={m.busy} onClick={guardar}>{m.busy?'Guardando…':`Guardar lista (${pendientes.length})`}</button></div>
    </section>}
    {d&&<section className={s.card}><h2>Registrados · {fechaCorta(fecha)}</h2>
      {d.registros.length?<div className={s.tableWrap}><table className={s.table}><thead><tr><th>Matrícula</th><th>Nombre</th><th>Asistencia</th><th>Observación</th><th>Registrado por</th><th></th></tr></thead><tbody>
        {d.registros.map(x=><tr key={x.id}><td><span className={s.code}>{x.matricula||'—'}</span></td><td><Link to={`/personal/file/${x.voluntario_id}`}>{x.nombre_completo}</Link></td><td><Badge value={x.estado}/></td><td>{x.observacion||'—'}</td><td>{x.registrado_nombre??'—'}</td>
          <td><button className={s.chip} onClick={()=>setDecision({title:'Corregir asistencia',description:`${x.nombre_completo} · ${fechaCorta(fecha)} · actualmente ${ASISTENCIA[x.estado]}`,path:`/personal/asistencia/${x.id}/corregir`,fields:[{name:'estado',label:'Nuevo estado',options:ESTADOS.filter(([k])=>k!==x.estado) as [string,string][]},{name:'motivo',label:'Motivo de la corrección',type:'textarea',max:500}]})}>Corregir</button></td></tr>)}
      </tbody></table></div>:<p className={s.empty}>Aún no hay asistencia registrada para esta fecha.</p>}
    </section>}
    <DecisionModal decision={decision} close={()=>setDecision(null)} mutation={m}/>
  </div>;
}

/** Reporte por persona y por día, con Excel. */
export function ReporteAsistencia(){
  const [desde,setDesde]=useState(`${hoy().slice(0,7)}-01`),[hasta,setHasta]=useState(hoy());
  const load=useCallback(()=>gestionApi.reporteAsistencia(desde,hasta),[desde,hasta]),r=useRemote(load),d=r.data;
  const total=d?.personas.reduce((t,p)=>({base:t.base+p.presente+p.tarde+p.falta,ok:t.ok+p.presente+p.tarde}),{base:0,ok:0});
  const bajo=d?.personas.filter(p=>p.porcentaje!==null&&p.porcentaje<75)??[];
  return <div className={s.page}>
    <div className={s.heading}><div><h1>Reporte de asistencia</h1><p className={s.muted}>Asistencia efectiva = (presente + tarde) / (presente + tarde + falta). Permisos y comisiones no cuentan en contra.</p></div>
      <div className={s.excelForm}><label className={s.field}>Desde<input type="date" value={desde} max={hasta} onChange={e=>e.target.value&&setDesde(e.target.value)}/></label><label className={s.field}>Hasta<input type="date" value={hasta} min={desde} max={hoy()} onChange={e=>e.target.value&&setHasta(e.target.value)}/></label></div></div>
    <Feedback loading={r.loading} error={r.error}/>
    {d&&<div className={s.kpis} style={{marginBottom:18}}>
      <div className={`${s.kpi} ${s.kIn}`}><small>Asistencia efectiva</small><strong>{total?.base?`${Math.round(total.ok/total.base*1000)/10}%`:'—'}</strong></div>
      <div className={`${s.kpi} ${s.kSaldo}`}><small>Días con lista</small><strong>{d.dias.length}</strong></div>
      <div className={`${s.kpi} ${s.kCom}`}><small>Personas evaluadas</small><strong>{d.personas.length}</strong></div>
      <div className={`${s.kpi} ${s.kOut}`}><small>Faltas</small><strong>{d.personas.reduce((t,p)=>t+p.falta,0)}</strong></div>
      <div className={`${s.kpi} ${s.kRes}`}><small>Bajo 75 %</small><strong>{bajo.length}</strong></div>
    </div>}
    <ReporteExcel descripcion="Por persona, por día, detalle de registros y personal con asistencia menor al 75 %. Si deja las fechas vacías, se usa el periodo de esta pantalla." descargar={async(a,b)=>descargarReporteAsistencia(await gestionApi.reporteAsistencia(a??desde,b??hasta))}/>
    {d&&<section className={s.card}><h2>Por persona</h2>
      {d.personas.length?<div className={s.tableWrap}><table className={s.table}><thead><tr><th>Persona</th>{ESTADOS.map(([k,v])=><th key={k} className={s.num}>{v}</th>)}<th style={{minWidth:180}}>Asistencia efectiva</th></tr></thead><tbody>
        {d.personas.map(p=><tr key={p.voluntario_id}><td><Link to={`/personal/file/${p.voluntario_id}`}><strong>{p.nombre_completo}</strong></Link><p>{p.matricula} · <Badge value={p.estado_personal}/></p></td>
          {ESTADOS.map(([k])=><td key={k} className={`${s.num} ${s.mono}`}>{p[k as 'presente']}</td>)}
          <td>{p.porcentaje===null?'—':<><div className={s.deudaBar}><span style={{width:`${p.porcentaje}%`,background:p.porcentaje<75?'#d43a5c':'#16a36b'}}/></div><strong className={p.porcentaje<75?s.minus:s.plus}>{p.porcentaje}%</strong></>}</td></tr>)}
      </tbody></table></div>:<p className={s.empty}>Sin registros en el periodo.</p>}</section>}
    {d&&d.dias.length>0&&<section className={s.card}><h2>Por día</h2><div className={s.tableWrap}><table className={s.table}><thead><tr><th>Fecha</th>{ESTADOS.map(([k,v])=><th key={k} className={s.num}>{v}</th>)}<th className={s.num}>Asistencia</th></tr></thead><tbody>
      {d.dias.map(x=><tr key={x.fecha}><td>{fechaCorta(x.fecha)}</td>{ESTADOS.map(([k])=><td key={k} className={`${s.num} ${s.mono}`}>{x[k as 'presente']}</td>)}<td className={`${s.num} ${s.mono}`}>{x.porcentaje===null?'—':`${x.porcentaje}%`}</td></tr>)}
    </tbody></table></div></section>}
  </div>;
}
