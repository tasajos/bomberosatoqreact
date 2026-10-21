import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { API_BASE, personalApi } from '../../services/api';
import { gestionApi } from '../../services/gestionApi';
import type { ArticuloReglamento, FilePersonal } from '../../services/gestionApi';
import { ASISTENCIA } from '../../utils/personalPdf';
import { fechaHora } from '../../utils/voucherPdf';
import { Matricula } from './Personal';
import { Badge, DecisionModal, fechaCorta, Feedback, FieldsForm, hoy, labels, useMutation, useRemote } from './shared';
import type { Decision, Field } from './shared';
import s from './Gestion.module.css';

type Tab='resumen'|'datos'|'disciplina'|'asistencia'|'documentos'|'formacion'|'comisiones'|'bitacora';
const TABS:[Tab,string][]=[['resumen','Resumen'],['datos','Datos personales'],['disciplina','Méritos y llamadas'],['asistencia','Asistencia'],['documentos','Documentos'],['formacion','Formación y resoluciones'],['comisiones','Comisiones'],['bitacora','Bitácora']];
const CATEGORIAS:[string,string][]=[['identidad','Carnet de identidad / identidad'],['certificado','Certificado'],['medico','Médico'],['administrativo','Administrativo'],['formacion','Formación'],['otro','Otro']];
// Documentos que todo file debe tener.
const REQUERIDOS:[string,string][]=[['identidad','Carnet de identidad'],['medico','Certificado médico']];
const ACCIONES:Record<string,string>={alta:'Alta',edicion:'Edición',codigo:'Código',estado:'Estado',comision:'Comisión',llamada:'Llamada',merito:'Mérito',demerito:'Demérito',asistencia:'Asistencia',documento:'Documento',grado:'Grado'};

/** Seguimiento del file del voluntario: datos, código, estado, disciplina, asistencia, documentos y bitácora. */
export default function PersonalFile(){
  const {id}=useParams();
  const load=useCallback(()=>gestionApi.filePersonal(Number(id)),[id]),r=useRemote(load),m=useMutation(r.reload);
  const reg=useRemote(gestionApi.reglamento),[decision,setDecision]=useState<Decision|null>(null);
  const f=r.data,p=f?.persona;
  const comision=f?.comisiones.find(c=>c.estado==='activa');
  // Opciones del reglamento vigente: el tipo y los puntos salen del artículo elegido.
  const vigentes=(reg.data??[]).filter(a=>a.activo);
  const opcion=(a:ArticuloReglamento):[string,string]=>[String(a.id),`${a.tipo==='merito'?'Mérito':'Demérito'} · ${a.codigo} · ${a.descripcion} (${a.tipo==='merito'?'+':'-'}${a.puntos} pts${a.gravedad?`, ${labels[a.gravedad].toLowerCase()}`:''})`];
  const acciones:{label:string;clase:string;decision:Decision}[]=p?[
    {label:'Cambiar estado',clase:s.chip,decision:{title:'Cambiar estado del personal',description:`${p.nombre_completo} · actualmente ${labels[p.estado]}`,path:`/personal/${p.id}/estado`,
      fields:[{name:'estado',label:'Nuevo estado',options:[['activo','Activo'],['pasiva','Pasivo'],['cooperador','Cooperador'],['baja','Baja']].filter(([v])=>v!==p.estado) as [string,string][]},{name:'motivo',label:'Motivo',type:'textarea',max:500}]}},
    ...(comision?[]:[{label:'Poner en comisión',clase:s.chip,decision:{title:'Poner en comisión',description:`${p.nombre_completo}. Al finalizar la comisión vuelve a su estado actual (${labels[p.estado]}).`,path:`/personal/${p.id}/comisiones`,
      fields:[{name:'destino',label:'Destino o institución',max:200},{name:'desde',label:'Desde',type:'date',value:hoy()},{name:'hasta',label:'Hasta (opcional)',type:'date',required:false},{name:'motivo',label:'Motivo de la comisión',type:'textarea',max:1000}] as Field[],label:'Registrar comisión'}}]),
    {label:'Cambiar código',clase:s.chip,decision:{title:'Cambiar código y matrícula',description:`Matrícula actual: ${p.matricula||'sin matrícula'}. Se asignará la siguiente matrícula de la serie elegida.`,path:`/personal/${p.id}/codigo`,
      fields:[{name:'codigo',label:'Nuevo código',options:Object.entries(f!.codigos).filter(([k])=>k!==p.codigo).map(([k,v])=>[k,`${k} · ${v}`])},{name:'motivo',label:'Motivo',type:'textarea',max:500}],label:'Asignar nueva matrícula'}},
    {label:'Mérito / demérito',clase:s.chip,decision:{title:'Registrar mérito o demérito según reglamento',description:`${p.nombre_completo}. Los puntos se aplican según el artículo elegido.`,path:`/personal/${p.id}/meritos`,
      fields:[{name:'reglamento_id',label:'Artículo del reglamento',options:vigentes.map(opcion)},{name:'fecha',label:'Fecha',type:'date',value:hoy()},{name:'descripcion',label:'Descripción de los hechos',type:'textarea',max:2000}],label:'Registrar'}},
    {label:'Llamada de atención',clase:s.chipDanger,decision:{title:'Registrar llamada de atención',description:`${p.nombre_completo}. Si cita una falta del reglamento, la gravedad y los puntos salen del artículo. Se emitirá un memorándum LLA y se notificará por correo.`,path:`/personal/${p.id}/llamadas`,
      fields:[{name:'reglamento_id',label:'Falta según reglamento (opcional)',options:vigentes.filter(a=>a.tipo==='demerito').map(opcion),required:false},{name:'tipo',label:'Tipo',options:[['escrita','Escrita'],['verbal','Verbal']]},
        {name:'gravedad',label:'Gravedad (si no cita una falta)',options:[['leve','Leve'],['grave','Grave'],['muy_grave','Muy grave']],required:false},{name:'fecha',label:'Fecha del hecho',type:'date',value:hoy()},
        {name:'motivo',label:'Motivo (si no cita una falta)',max:200,required:false},{name:'puntos',label:'Puntos a descontar (si no cita una falta)',type:'number',min:'0',step:'1',value:'0',required:false},{name:'descripcion',label:'Descripción de los hechos',type:'textarea',max:3000}],label:'Registrar y emitir memorándum'}},
  ]:[];
  return <div className={s.page}>
    <div className={s.heading}><div><Link className={s.link} to="/personal">← Personal</Link><h1>{p?.nombre_completo??'File del voluntario'}</h1>
      {p&&<p className={s.muted}><Matricula codigo={p.codigo} matricula={p.matricula}/> {f.codigos[p.codigo]??''}{p.grado?` · ${p.grado}`:''}{p.cargo_directiva?` · ${p.cargo_directiva}`:''}</p>}</div>
      <button className={s.secondary} onClick={r.reload}>Actualizar</button></div>
    <Feedback loading={r.loading} error={r.error||m.error} message={m.message}>{m.comprobante&&<Link to={`/personal/llamada/${m.comprobante}`}>Ver memorándum {m.comprobante}</Link>}</Feedback>
    {f&&p&&<>
      <div className={`${s.estadoHero} ${p.estado==='baja'?s.tono_baja:p.estado==='comision'?s.tono_entrega:s.tono_devolucion}`}>
        <div><small>Estado del personal</small><strong>{labels[p.estado]}</strong><p>{comision?`En ${comision.destino} desde ${fechaCorta(comision.desde.slice(0,10))}`:`Registrado el ${fechaCorta(p.created_at)}`}</p></div>
        <div><small>Puntos</small><Badge value={p.total_puntos<0?'debe':'al_dia'}/><p className={s.mono}>{p.total_puntos} pts</p></div>
        <div><small>Contacto</small><p>{p.telefono||'—'} · {p.email}</p></div>
      </div>
      <div className={s.actions} style={{marginBottom:18}}>{acciones.map(a=><button key={a.label} className={a.clase} onClick={()=>setDecision(a.decision)}>{a.label}</button>)}
        {comision&&<button className={s.chip} onClick={()=>setDecision({title:'Finalizar comisión',description:`${comision.destino} · desde ${fechaCorta(comision.desde.slice(0,10))}. Vuelve a estado ${labels[comision.estado_anterior]??comision.estado_anterior}.`,path:`/personal/comisiones/${comision.id}/finalizar`,fields:[{name:'observacion',label:'Observación de cierre',type:'textarea'}]})}>Finalizar comisión</button>}</div>
      <FileContenido f={f} modo="jefe" reload={r.reload} m={m}/>
    </>}
    <DecisionModal decision={decision} close={()=>setDecision(null)} mutation={m}/>
  </div>;
}

/** El file del propio voluntario: mismo contenido en modo lectura, sin bitácora interna. */
export function MiFile(){
  const r=useRemote(gestionApi.miFileCompleto),f=r.data,p=f?.persona;
  const comision=f?.comisiones.find(c=>c.estado==='activa');
  return <div className={s.page}>
    <div className={s.heading}><div><h1>Mi file personal</h1>
      {p&&<p className={s.muted}><Matricula codigo={p.codigo} matricula={p.matricula}/> {f.codigos[p.codigo]??''}{p.grado?` · ${p.grado}`:''}{p.cargo_directiva?` · ${p.cargo_directiva}`:''}</p>}</div>
      <button className={s.secondary} onClick={r.reload}>Actualizar</button></div>
    <Feedback loading={r.loading} error={r.error}/>
    {f&&p&&<>
      <div className={`${s.estadoHero} ${p.estado==='baja'?s.tono_baja:p.estado==='comision'?s.tono_entrega:s.tono_devolucion}`}>
        <div><small>Mi estado</small><strong>{labels[p.estado]}</strong><p>{comision?`En comisión en ${comision.destino} desde ${fechaCorta(comision.desde.slice(0,10))}`:`Registrado el ${fechaCorta(p.created_at)}`}</p></div>
        <div><small>Puntos</small><Badge value={p.total_puntos<0?'debe':'al_dia'}/><p className={s.mono}>{p.total_puntos} pts</p></div>
        <div><small>¿Algún dato es incorrecto?</small><p>Solicite la corrección a la Jefatura de Personal.</p></div>
      </div>
      <FileContenido f={f} modo="voluntario"/>
    </>}
  </div>;
}

function FileContenido({f,modo,reload,m}:{f:FilePersonal;modo:'jefe'|'voluntario';reload?:()=>void;m?:ReturnType<typeof useMutation>}){
  const [tab,setTab]=useState<Tab>('resumen'),[visor,setVisor]=useState<Visible|null>(null);
  const p=f.persona,jefe=modo==='jefe'&&!!m&&!!reload,base=jefe?'/personal':'/voluntario';
  return <>
      <div className={s.tabs} style={{marginBottom:16,flexWrap:'wrap'}}>{TABS.filter(([v])=>jefe||v!=='bitacora').map(([v,l])=><button key={v} aria-pressed={tab===v} className={tab===v?s.tabActive:''} onClick={()=>setTab(v)}>{l}</button>)}</div>
      {tab==='resumen'&&<Resumen f={f}/>}
      {tab==='datos'&&!jefe&&<section className={s.card}><h2>Datos personales</h2><dl className={s.details}>
        {([['Nombre completo',p.nombre_completo],['Carnet de identidad',p.carnet_identidad],['Fecha de nacimiento',p.fecha_nacimiento?fechaCorta(p.fecha_nacimiento):''],['Tipo de sangre',p.tipo_sangre],['Teléfono',p.telefono],['Correo',p.email],['Especialidad',p.especialidad],['Domicilio',p.domicilio],['Contacto de emergencia',[p.contacto_nombre,p.contacto_telefono].filter(Boolean).join(' · ')]] as [string,string][])
          .map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v||'—'}</dd></div>)}</dl></section>}
      {tab==='datos'&&jefe&&<section className={`${s.card} ${s.formCard} ${s.tono_entrega}`}><div className={s.cardHead}><h2>Datos personales</h2><span className={s.nextCode}>Cada cambio queda en la bitácora</span></div>
        <FieldsForm key={JSON.stringify(p)} busy={m!.busy} label="Guardar cambios" onSubmit={async d=>{await m!.save(`/personal/${p.id}/datos`,d);return false;}} fields={[
          {name:'nombre',label:'Nombre(s)',max:120,value:p.nombre},{name:'apellido_paterno',label:'Apellido paterno',max:100,value:p.apellido_paterno},
          {name:'apellido_materno',label:'Apellido materno',max:100,required:false,value:p.apellido_materno??''},{name:'carnet_identidad',label:'Carnet de identidad',max:30,value:p.carnet_identidad??''},
          {name:'fecha_nacimiento',label:'Fecha de nacimiento',type:'date',required:false,value:p.fecha_nacimiento},
          {name:'tipo_sangre',label:'Tipo de sangre',options:['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t=>[t,t]),required:false,value:p.tipo_sangre??''},
          {name:'telefono',label:'Teléfono',max:30,required:false,value:p.telefono??''},{name:'email',label:'Correo',type:'email',max:180,value:p.email},
          {name:'especialidad',label:'Especialidad',max:150,required:false,value:p.especialidad??''},{name:'contacto_nombre',label:'Contacto de emergencia',max:200,required:false,value:p.contacto_nombre??''},
          {name:'contacto_telefono',label:'Teléfono de contacto',max:30,required:false,value:p.contacto_telefono??''},{name:'domicilio',label:'Domicilio',max:300,required:false,wide:true,value:p.domicilio??''},
        ]}/></section>}
      {tab==='disciplina'&&<Disciplina f={f} base={base}/>}
      {tab==='asistencia'&&<section className={s.card}><h2>Asistencia a instrucción</h2>
        <div className={s.kpis} style={{marginBottom:16}}>{Object.entries(ASISTENCIA).map(([k,v])=><div key={k} className={`${s.kpi} ${k==='falta'?s.kOut:k==='presente'?s.kIn:s.kRes}`}><small>{v}</small><strong>{f.asistencia.resumen[k]??0}</strong></div>)}</div>
        {f.asistencia.registros.length?<div className={s.tableWrap}><table className={s.table}><thead><tr><th>Fecha</th><th>Asistencia</th><th>Observación</th><th>Registrado por</th></tr></thead><tbody>
          {f.asistencia.registros.map(a=><tr key={a.id}><td>{fechaCorta(a.fecha.slice(0,10))}</td><td><Badge value={a.estado}/></td><td>{a.observacion||'—'}</td><td>{a.registrado_nombre??'—'}</td></tr>)}
        </tbody></table></div>:<p className={s.empty}>Sin registros de asistencia.</p>}</section>}
      {tab==='documentos'&&<Documentos f={f} reload={jefe?reload:undefined} ver={setVisor}/>}
      {tab==='formacion'&&<Formacion f={f} ver={setVisor}/>}
      {tab==='comisiones'&&<section className={s.card}><h2>Comisiones</h2>
        {f.comisiones.length?<div className={s.tableWrap}><table className={s.table}><thead><tr><th>Destino</th><th>Periodo</th><th>Motivo</th><th>Estado</th></tr></thead><tbody>
          {f.comisiones.map(c=><tr key={c.id}><td><strong>{c.destino}</strong><p>Registró: {c.creado_nombre}</p></td><td>{fechaCorta(c.desde.slice(0,10))} → {c.hasta?fechaCorta(c.hasta.slice(0,10)):'sin fecha fin'}{c.finalizada_at&&<p>Finalizó {fechaCorta(c.finalizada_at)}</p>}</td><td>{c.motivo}{c.observacion_cierre&&<p>Cierre: {c.observacion_cierre}</p>}</td><td><Badge value={c.estado}/></td></tr>)}
        </tbody></table></div>:<p className={s.empty}>Sin comisiones registradas.</p>}</section>}
      {tab==='bitacora'&&jefe&&<section className={s.card}><h2>Bitácora de cambios</h2><ListaBitacora items={f.bitacora}/></section>}
      {visor&&<VisorDocumento doc={visor} cerrar={()=>setVisor(null)}/>}
  </>;
}

type Visible={nombre:string;url:string;mime?:string|null};
const tipoArchivo=(d:Visible)=>{const ext=d.url.split('?')[0].split('.').pop()?.toLowerCase()??'';
  return d.mime?.includes('pdf')||ext==='pdf'?'pdf':d.mime?.startsWith('image/')||['png','jpg','jpeg','gif','webp'].includes(ext)?'imagen':'otro';};

/** Visualiza PDF e imágenes del file sin salir del sistema. */
function VisorDocumento({doc,cerrar}:{doc:Visible;cerrar:()=>void}){
  const url=`${API_BASE}${doc.url}`,tipo=tipoArchivo(doc);
  return <div className={s.modalBackdrop} onClick={cerrar}><div className={`${s.modal} ${s.visor}`} role="dialog" aria-modal="true" aria-label={doc.nombre} tabIndex={-1} onClick={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==='Escape')cerrar();}}>
    <div className={s.cardHead}><h2>{doc.nombre}</h2><div className={s.rowActions}><a className={s.chip} href={url} target="_blank" rel="noreferrer">Abrir en pestaña nueva</a><a className={s.chip} href={url} download>Descargar</a><button className={s.secondary} autoFocus onClick={cerrar}>Cerrar</button></div></div>
    {tipo==='pdf'&&<iframe className={s.visorMarco} src={url} title={doc.nombre}/>}
    {tipo==='imagen'&&<div className={s.visorImagen}><img src={url} alt={doc.nombre}/></div>}
    {tipo==='otro'&&<p className={s.empty}>Este tipo de archivo no se puede previsualizar. Use «Descargar».</p>}
  </div></div>;
}

function Resumen({f}:{f:FilePersonal}){
  const a=f.asistencia.resumen,base=(a.presente??0)+(a.tarde??0)+(a.falta??0),pct=base?Math.round(((a.presente??0)+(a.tarde??0))/base*100):null;
  const tiene=(cat:string)=>f.documentos.some(d=>d.categoria===cat);
  const p=f.persona;
  return <>
    <div className={s.kpis} style={{marginBottom:18}}>
      {([['Asistencia',pct===null?'—':`${pct}%`,s.kIn],['Operaciones validadas',f.actividad.operaciones,s.kSaldo],['Guardias',f.actividad.guardias,s.kCom],['Méritos',f.meritos.filter(m=>m.tipo==='merito').length,s.kIn],['Deméritos',f.meritos.filter(m=>m.tipo==='demerito').length,s.kOut],['Llamadas de atención',f.llamadas.length,s.kOut],['Documentos',f.documentos.length,s.kRes],['Certificados',f.certificados.length+f.cursos.length,s.kRes]] as [string,string|number,string][])
        .map(([l,v,c])=><div key={l} className={`${s.kpi} ${c}`}><small>{l}</small><strong>{v}</strong></div>)}
    </div>
    <section className={s.card}><h2>Datos principales</h2><dl className={s.details}>
      {([['Carnet de identidad',p.carnet_identidad],['Fecha de nacimiento',p.fecha_nacimiento?fechaCorta(p.fecha_nacimiento):''],['Tipo de sangre',p.tipo_sangre],['Especialidad',p.especialidad],['Domicilio',p.domicilio],['Contacto de emergencia',[p.contacto_nombre,p.contacto_telefono].filter(Boolean).join(' · ')],['Rol en el sistema',labels[p.role]??p.role.replace('_',' ')],['Registrado',fechaCorta(p.created_at)]] as [string,string][])
        .map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v||'—'}</dd></div>)}
    </dl></section>
    <section className={s.card}><h2>Documentos obligatorios</h2><div className={s.destinos}>{REQUERIDOS.map(([cat,nombre])=><div key={cat} className={`${s.destino} ${tiene(cat)?'':s.destinoOff}`} style={{borderLeftColor:tiene(cat)?'#16a36b':'#d43a5c'}}><div><strong>{nombre}</strong><p>{tiene(cat)?'En el file':'Pendiente de cargar'}</p></div><Badge value={tiene(cat)?'pagado':'vencido'}/></div>)}</div></section>
    {f.equipos.some(e=>e.estado==='autorizado')&&<section className={s.card}><h2>Equipos asignados</h2><ul className={s.cobroList}>{f.equipos.filter(e=>e.estado==='autorizado').map(e=><li key={e.id}><span><span className={s.code}>{e.codigo}</span> {e.nombre}</span><span className={s.muted}>{e.tipo}</span><span>hasta {fechaCorta(e.fecha_devolucion.slice(0,10))}</span></li>)}</ul></section>}
  </>;
}

function Disciplina({f,base}:{f:FilePersonal;base:string}){
  return <>
    <section className={s.card}><h2>Llamadas de atención</h2>
      {f.llamadas.length?<div className={s.tableWrap}><table className={s.table}><thead><tr><th>Memorándum</th><th>Fecha</th><th>Motivo</th><th>Gravedad</th><th className={s.num}>Puntos</th></tr></thead><tbody>
        {f.llamadas.map(l=><tr key={l.id}><td><Link className={`${s.code} ${s.codeOut}`} to={`${base}/llamada/${l.codigo}`}>{l.codigo}</Link><p>{labels[l.tipo]}</p></td><td>{fechaCorta(l.fecha.slice(0,10))}</td><td>{l.motivo}{l.reglamento_codigo&&<p>Falta: {l.reglamento_codigo} · {l.reglamento_descripcion}</p>}<p>{l.descripcion}</p></td><td><Badge value={l.gravedad}/></td><td className={`${s.num} ${s.mono}`}>{l.puntos?`−${l.puntos}`:'—'}</td></tr>)}
      </tbody></table></div>:<p className={s.empty}>Sin llamadas de atención.</p>}</section>
    <section className={s.card}><h2>Méritos y deméritos</h2>
      {f.meritos.length?<div className={s.tableWrap}><table className={s.table}><thead><tr><th>Fecha</th><th>Tipo</th><th>Artículo del reglamento</th><th className={s.num}>Puntos</th><th>Registrado por</th></tr></thead><tbody>
        {f.meritos.map(m=><tr key={m.id}><td>{fechaCorta(m.fecha.slice(0,10))}</td><td><Badge value={m.tipo}/>{m.reglamento_gravedad&&<p><Badge value={m.reglamento_gravedad}/></p>}</td><td><strong>{m.titulo}</strong>{m.descripcion&&<p>{m.descripcion}</p>}{m.reglamento_sancion&&<p>Sanción: {m.reglamento_sancion}</p>}{!m.reglamento_id&&<p>Registro anterior al reglamento en el sistema</p>}</td><td className={`${s.num} ${s.mono} ${m.tipo==='demerito'?s.minus:s.plus}`}>{m.puntos_extra?`${m.tipo==='demerito'?'−':'+'}${m.puntos_extra}`:'—'}</td><td>{m.registrado_nombre??'—'}</td></tr>)}
      </tbody></table></div>:<p className={s.empty}>Sin méritos ni deméritos.</p>}</section>
  </>;
}

function Documentos({f,reload,ver}:{f:FilePersonal;reload?:()=>void;ver:(d:Visible)=>void}){
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[ok,setOk]=useState('');
  async function subir(e:FormEvent<HTMLFormElement>){
    e.preventDefault();const form=e.currentTarget;setBusy(true);setError('');setOk('');
    try{await personalApi.addDocumento(f.persona.id,new FormData(form));form.reset();setOk('Documento agregado al file.');reload?.();}
    catch(err){setError(err instanceof Error?err.message:'No se pudo subir el documento');}finally{setBusy(false);}
  }
  async function eliminar(id:number,nombre:string){
    if(!window.confirm(`¿Eliminar "${nombre}" del file? Quedará registrado en la bitácora.`))return;
    setError('');try{await personalApi.deleteDocumento(id);reload?.();}catch(err){setError(err instanceof Error?err.message:'No se pudo eliminar');}
  }
  return <>
    {reload&&<section className={`${s.card} ${s.formCard} ${s.tono_entrega}`}><h2>Agregar documento</h2><Feedback error={error} message={ok}/>
      <form className={s.form} onSubmit={subir}>
        <label className={s.field}>Nombre del documento<input name="nombre" required maxLength={200} disabled={busy}/></label>
        <label className={s.field}>Categoría<select name="categoria" required disabled={busy}>{CATEGORIAS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
        <label className={`${s.field} ${s.wide}`}>Archivo (PDF o imagen, máx. 25 MB)<input name="archivo" type="file" required accept=".pdf,image/*" disabled={busy}/></label>
        <label className={`${s.field} ${s.wide}`}>Descripción<textarea name="descripcion" maxLength={1000} disabled={busy}/></label>
        <div className={`${s.actions} ${s.wide}`}><button className={s.button} disabled={busy}>{busy?'Subiendo…':'Subir al file'}</button></div>
      </form></section>}
    {!reload&&<Feedback error={error}/>}
    <section className={s.card}><h2>Documentos del file</h2>
      {f.documentos.length?<div className={s.tableWrap}><table className={s.table}><thead><tr><th>Documento</th><th>Categoría</th><th>Cargado</th><th></th></tr></thead><tbody>
        {f.documentos.map(d=><tr key={d.id}><td><strong>{d.nombre}</strong>{d.descripcion&&<p>{d.descripcion}</p>}</td><td><span className={s.badge}>{CATEGORIAS.find(c=>c[0]===d.categoria)?.[1]??d.categoria}</span></td><td>{fechaCorta(d.created_at)}<p>{d.registrado_nombre??'—'}</p></td>
          <td><div className={s.rowActions}><button className={s.chip} onClick={()=>ver({nombre:d.nombre,url:d.archivo_url,mime:d.mime})}>Ver</button>{reload&&<button className={s.chipDanger} onClick={()=>eliminar(d.id,d.nombre)}>Eliminar</button>}</div></td></tr>)}
      </tbody></table></div>:<p className={s.empty}>El file no tiene documentos.</p>}</section>
  </>;
}

function Formacion({f,ver}:{f:FilePersonal;ver:(d:Visible)=>void}){
  return <>
    <section className={s.card}><h2>Certificados emitidos por la institución</h2>
      {f.certificados.length?<ul className={s.cobroList}>{f.certificados.map(c=><li key={c.codigo}><span><span className={`${s.code} ${s.codeIn}`}>{c.codigo}</span> {c.curso}</span><span className={s.muted}>{c.horas} h</span><span>{c.emitido_at?fechaCorta(c.emitido_at):'—'}</span></li>)}</ul>:<p className={s.empty}>Sin certificados vinculados (se buscan por carnet de identidad o nombre).</p>}</section>
    <section className={s.card}><h2>Capacitaciones y cursos</h2>
      {f.capacitaciones.length+f.cursos.length?<div className={s.tableWrap}><table className={s.table}><thead><tr><th>Curso</th><th>Tipo</th><th>Fecha</th><th className={s.num}>Horas</th><th>Estado</th></tr></thead><tbody>
        {f.capacitaciones.map((c,i)=><tr key={`c${i}`}><td><strong>{c.nombre}</strong><p>Capacitación institucional</p></td><td>{c.tipo}</td><td>{fechaCorta(c.fecha?.slice(0,10)??null)}</td><td className={s.num}>{c.horas}</td><td><span className={s.badge}>{c.estado}</span></td></tr>)}
        {f.cursos.map((c,i)=><tr key={`e${i}`}><td><strong>{c.nombre}</strong><p>{c.institucion}</p></td><td>{c.tipo}</td><td>{fechaCorta(c.fecha?.slice(0,10)??null)}</td><td className={s.num}>{c.horas}</td><td>{c.archivo_url?<button className={s.chip} onClick={()=>ver({nombre:c.nombre,url:c.archivo_url!})}>Ver respaldo</button>:'—'}</td></tr>)}
      </tbody></table></div>:<p className={s.empty}>Sin capacitaciones registradas.</p>}</section>
    <section className={s.card}><h2>Resoluciones y memos de presidencia</h2>
      {f.resoluciones.length?<ul className={s.cobroList}>{f.resoluciones.map(d=><li key={d.id}><span><strong>{labels[d.tipo]??d.tipo.charAt(0).toUpperCase()+d.tipo.slice(1)} {String(d.numero).padStart(3,'0')}/{d.anio}</strong> · {d.titulo}</span><span className={s.muted}>{d.rol??''}</span><span>{fechaCorta(d.fecha.slice(0,10))}</span></li>)}</ul>:<p className={s.empty}>Sin resoluciones ni memos vinculados.</p>}</section>
  </>;
}

/** Línea de tiempo de la bitácora (también usada en la vista general). */
export function ListaBitacora({items,conPersona=false}:{items:FilePersonal['bitacora'];conPersona?:boolean}){
  if(!items.length)return <p className={s.empty}>Sin movimientos en la bitácora.</p>;
  return <div className={s.tableWrap}><table className={s.table}><thead><tr><th>Fecha y hora</th>{conPersona&&<th>Persona</th>}<th>Acción</th><th>Detalle</th><th>Realizado por</th></tr></thead><tbody>
    {items.map(b=><tr key={b.id}><td style={{whiteSpace:'nowrap'}}>{fechaHora(b.created_at)}</td>
      {conPersona&&<td>{b.voluntario_id?<Link to={`/personal/file/${b.voluntario_id}`}>{b.persona}</Link>:b.persona}<p>{b.matricula}</p></td>}
      <td><span className={`${s.badge} ${['demerito','llamada'].includes(b.accion)?s.bad:['alta','merito'].includes(b.accion)?s.good:''}`}>{ACCIONES[b.accion]??b.accion}</span></td>
      <td>{b.detalle}</td><td>{b.registrado_nombre??'—'}{b.registrado_rol&&<p>{labels[b.registrado_rol]??b.registrado_rol.replace('_',' ')}</p>}</td></tr>)}
  </tbody></table></div>;
}
