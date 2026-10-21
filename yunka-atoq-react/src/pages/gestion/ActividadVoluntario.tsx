import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { request } from '../../services/api';
import { Badge,fechaCorta,Feedback,FieldsForm,hoy,useRemote } from './shared';
import { ROLES_GUARDIA } from '../../utils/guardias';
import { enlaceWhatsApp, mensajeOperacion } from '../../utils/whatsapp';
import s from './Gestion.module.css';

interface Actividad {id:number;fecha:string;titulo?:string;estado?:string;observacion_validacion?:string;tipo?:string;turno?:string;rol_guardia?:string;novedades?:string;lugar?:string;puntos_asignados?:number;personal_participante?:string|number[]}
interface Companero {id:number;nombre:string;matricula:string|null;grado:string|null}
interface Contacto {nombre:string;cargo:string;telefono:string}
const operaciones=()=>request<{data:Actividad[]}>('/operaciones-dpto?limit=200').then(r=>r.data);
const guardias=()=>request<Actividad[]>('/operaciones-dpto/guardias');
const companeros=()=>request<Companero[]>('/operaciones-dpto/companeros');
const contactos=()=>request<Contacto[]>('/operaciones-dpto/contactos-validacion');
// Reglamento RO-001/25: puntos por participante según el alcance (lo aplica el servidor al aprobar).
const PUNTOS:Record<string,number>={local:2,nacional:10,internacional:15};
const cantidad=(p?:string|number[])=>{try{const l=typeof p==='string'?JSON.parse(p||'[]'):p??[];return Array.isArray(l)?l.length:0;}catch{return 0;}};

export default function ActividadVoluntario({tipo}:{tipo:'operaciones'|'guardias'}){
  const esOp=tipo==='operaciones',r=useRemote(esOp?operaciones:guardias),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  return <div className={s.page}><div className={s.heading}><div><h1>{esOp?'Mis operaciones':'Mis guardias'}</h1><p className={s.muted}>{esOp?'Registre la operación y etiquete a los compañeros que participaron. Los puntos se suman según el reglamento cuando el jefe de operaciones o presidencia la aprueba.':'Registre su turno y las novedades del servicio.'}</p></div><button className={s.secondary} onClick={r.reload}>Actualizar</button></div>
    {esOp?<RegistrarOperacion recargar={r.reload}/>:<><Feedback loading={r.loading} error={r.error||error} message={message}/><section className={s.card}><h2>Registrar guardia</h2><FieldsForm key={tipo} busy={busy} fields={[{name:'fecha',label:'Fecha',type:'date',value:hoy()},{name:'turno',label:'Turno',options:[['diurno','Diurno'],['nocturno','Nocturno'],['24h','24 horas']]},{name:'rol_guardia',label:'Rol en la guardia',options:ROLES_GUARDIA.map(r=>[r,r])},{name:'novedades',label:'Novedades',type:'textarea',wide:true}]} onSubmit={async d=>{setBusy(true);setError('');setMessage('');try{await request('/operaciones-dpto/guardias',{method:'POST',body:JSON.stringify(d)});setMessage('Guardia registrada.');r.reload();return true;}catch(e){setError(e instanceof Error?e.message:'No se pudo registrar');return false;}finally{setBusy(false);}}}/></section></>}
    <section className={s.card}><h2>Mi historial {esOp?'(últimas 200 operaciones)':''}</h2>{r.data?.length?<div className={s.tableWrap}><table className={s.table}><thead><tr><th>Fecha</th><th>{esOp?'Operación':'Turno / rol'}</th><th>{esOp?'Estado y observaciones':'Novedades'}</th></tr></thead><tbody>{r.data.map(a=><tr key={a.id}><td>{fechaCorta(a.fecha)}</td><td>{esOp?a.titulo:`${a.turno} · ${a.rol_guardia}`}<p>{a.lugar}{esOp&&cantidad(a.personal_participante)>1?` · ${cantidad(a.personal_participante)} participantes`:''}</p></td><td>{esOp?<><Badge value={a.estado??'pendiente'}/>{a.estado==='validado'&&!!a.puntos_asignados&&<p>+{a.puntos_asignados} pts</p>}<p>{a.observacion_validacion}</p></>:a.novedades}</td></tr>)}</tbody></table></div>:<p className={s.empty}>Todavía no tiene registros.</p>}</section>
  </div>;
}

/** Registro de operación con compañeros etiquetados y aviso por WhatsApp a quienes la aprueban. */
function RegistrarOperacion({recargar}:{recargar:()=>void}){
  const {user}=useAuth(),lista=useRemote(companeros),cont=useRemote(contactos);
  const [elegidos,setElegidos]=useState<number[]>([]),[buscar,setBuscar]=useState('');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[aviso,setAviso]=useState<string|null>(null);
  const todos=lista.data??[],nombre=(id:number)=>todos.find(c=>c.id===id)?.nombre??'';
  const visibles=todos.filter(c=>!elegidos.includes(c.id)&&`${c.nombre} ${c.matricula??''}`.toLowerCase().includes(buscar.toLowerCase())).slice(0,8);
  async function guardar(d:Record<string,string>){
    setBusy(true);setError('');setAviso(null);
    try{
      await request('/operaciones-dpto',{method:'POST',body:JSON.stringify({...d,participantes:elegidos})});
      setAviso(mensajeOperacion({titulo:d.titulo,tipo:d.tipo,fecha:d.fecha,lugar:d.lugar,duracion_horas:d.duracion_horas,descripcion:d.descripcion,
        registrado_por:user?.nombre??'',participantes:[user?.nombre??'',...elegidos.map(nombre)],puntos:PUNTOS[d.tipo]??2,enlace:`${window.location.origin}/operaciones/validar`}));
      setElegidos([]);setBuscar('');recargar();return true;
    }catch(e){setError(e instanceof Error?e.message:'No se pudo registrar');return false;}
    finally{setBusy(false);}
  }
  return <>
    <Feedback error={error||lista.error}/>
    {aviso&&<section className={`${s.card} ${s.formCard} ${s.tono_ingreso}`}>
      <div className={s.cardHead}><div><h2>Operación registrada · avise por WhatsApp</h2><p className={s.muted}>Queda pendiente de aprobación. Envíe el aviso a quien aprueba o compártalo en el grupo de la unidad.</p></div><button className={s.chip} onClick={()=>setAviso(null)}>Cerrar</button></div>
      <pre className={s.whatsTexto}>{aviso}</pre>
      <div className={s.actions}>
        {(cont.data??[]).map(c=><a key={c.telefono} className={`${s.button} ${s.whatsBoton}`} href={enlaceWhatsApp(aviso,c.telefono)} target="_blank" rel="noreferrer">Enviar a {c.cargo} · {c.nombre}</a>)}
        <a className={`${s.secondary}`} href={enlaceWhatsApp(aviso)} target="_blank" rel="noreferrer">Compartir en un chat o grupo</a>
      </div>
      {cont.data&&!cont.data.length&&<p className={s.muted}>El jefe de operaciones y presidencia no tienen teléfono registrado: use «Compartir en un chat o grupo».</p>}
    </section>}
    <section className={s.card}><h2>Registrar operación</h2>
      <div className={s.etiquetas}>
        <span className={s.etiquetasTitulo}>Participantes ({elegidos.length+1})</span>
        <div className={s.chips}>
          <span className={s.chipFijo}>{user?.nombre} (usted)</span>
          {elegidos.map(id=><span key={id} className={s.chipQuitar}>{nombre(id)}<button type="button" aria-label={`Quitar a ${nombre(id)}`} onClick={()=>setElegidos(e=>e.filter(x=>x!==id))}>×</button></span>)}
        </div>
        <input className={s.search} style={{width:'100%',margin:'8px 0 0'}} placeholder="Etiquetar compañeros: escriba nombre o matrícula…" aria-label="Buscar compañeros" value={buscar} onChange={e=>setBuscar(e.target.value)} disabled={busy}/>
        {buscar&&<ul className={s.sugerencias}>{visibles.map(c=><li key={c.id}><button type="button" onClick={()=>{setElegidos(e=>[...e,c.id]);setBuscar('');}}><strong>{c.nombre}</strong> <span className={s.muted}>{[c.matricula,c.grado].filter(Boolean).join(' · ')}</span></button></li>)}{!visibles.length&&<li className={s.muted} style={{padding:'8px 12px'}}>Sin coincidencias</li>}</ul>}
      </div>
      <FieldsForm busy={busy} label="Registrar y avisar" onSubmit={guardar} fields={[
        {name:'titulo',label:'Título de la operación'},
        {name:'tipo',label:'Tipo (puntos según RO-001/25)',options:[['local','Local · 2 pts'],['nacional','Emergencia nacional · 10 pts'],['internacional','Emergencia internacional · 15 pts']]},
        {name:'fecha',label:'Fecha y hora',type:'datetime-local'},
        {name:'lugar',label:'Lugar'},
        {name:'duracion_horas',label:'Duración (horas)',type:'number',min:'0.1',step:'0.1'},
        {name:'descripcion',label:'Descripción y actividades realizadas',type:'textarea',wide:true},
      ]}/>
    </section>
  </>;
}
