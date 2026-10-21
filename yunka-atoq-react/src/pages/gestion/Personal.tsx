import { useState } from 'react';
import { Link } from 'react-router-dom';
import { gestionApi } from '../../services/gestionApi';
import type { PersonaLista } from '../../services/gestionApi';
import { descargarNominaPersonal } from '../../utils/personalExcel';
import { Badge, Feedback, FieldsForm, labels, useMutation, useRemote } from './shared';
import s from './Gestion.module.css';

const ESTADOS:[string,string][]=[['','Todos'],['activo','Activos'],['comision','En comisión'],['pasiva','Pasivos'],['cooperador','Cooperadores'],['baja','Bajas']];
/** Matrícula con el color de su código (VF verde, VC dorado, VR azul). */
export function Matricula({codigo,matricula}:{codigo:string;matricula:string}){
  return <span className={`${s.code} ${codigo==='VF'?s.codeIn:codigo==='VR'?s.codeAzul:codigo==='VC'?'':s.codeGris}`}>{matricula||'Sin matrícula'}</span>;
}
const porcentaje=(p:PersonaLista)=>{const base=Number(p.asist_presentes)+Number(p.asist_faltas);return base?Math.round(Number(p.asist_presentes)/base*100):null;};

/** Nómina de personal: estado, matrícula, asistencia y disciplina; acceso al file de cada persona. */
export default function Personal(){
  const r=useRemote(gestionApi.personal);
  const [estado,setEstado]=useState(''),[codigo,setCodigo]=useState(''),[q,setQ]=useState(''),[excel,setExcel]=useState(false);
  const lista=r.data?.personal??[];
  const cuenta=(e:string)=>lista.filter(p=>p.estado===e&&p.role!=='postulante').length;
  const rows=lista.filter(p=>(!estado||p.estado===estado)&&(!codigo||p.codigo===codigo)&&`${p.nombre_completo} ${p.matricula} ${p.carnet_identidad??''} ${p.grado??''}`.toLowerCase().includes(q.toLowerCase()));
  async function nomina(){setExcel(true);try{await descargarNominaPersonal(rows,r.data?.codigos??{});}finally{setExcel(false);}}
  return <div className={s.page}>
    <div className={s.heading}><div><h1>Personal</h1><p className={s.muted}>Nómina institucional con matrícula correlativa (VF, VC, VR). Cada cambio queda registrado en la bitácora.</p></div>
      <div className={s.actions} style={{marginTop:0}}><button className={s.secondary} onClick={r.reload}>Actualizar</button><button className={s.secondary} disabled={excel||!rows.length} onClick={nomina}>{excel?'Generando…':'Nómina en Excel'}</button><Link className={s.button} to="/personal/nuevo">Registrar personal</Link></div></div>
    <Feedback loading={r.loading} error={r.error}/>
    {r.data&&<div className={s.kpis} style={{marginBottom:20}}>
      {([['Activos',cuenta('activo'),s.kIn],['En comisión',cuenta('comision'),s.kCom],['Pasivos',cuenta('pasiva'),s.kSaldo],['Cooperadores',cuenta('cooperador'),s.kRes],['Bajas',cuenta('baja'),s.kOut],['Postulantes',lista.filter(p=>p.role==='postulante').length,s.kSaldo]] as [string,number,string][])
        .map(([l,v,c])=><div className={`${s.kpi} ${c}`} key={l}><small>{l}</small><strong>{v}</strong></div>)}
    </div>}
    <section className={s.card}>
      <div className={s.cardHead}><h2>Nómina</h2><div className={s.toolbar}>
        <div className={s.tabs}>{ESTADOS.map(([v,l])=><button key={v} aria-pressed={estado===v} className={estado===v?s.tabActive:''} onClick={()=>setEstado(v)}>{l}</button>)}</div>
        <select className={s.search} style={{width:170}} aria-label="Código" value={codigo} onChange={e=>setCodigo(e.target.value)}><option value="">Todos los códigos</option>{Object.entries(r.data?.codigos??{}).map(([k,v])=><option key={k} value={k}>{k} · {v}</option>)}</select>
        <input className={s.search} placeholder="Nombre, matrícula, C.I. o grado…" aria-label="Buscar personal" value={q} onChange={e=>setQ(e.target.value)}/>
      </div></div>
      {rows.length?<div className={s.tableWrap}><table className={s.table}><thead><tr><th>Matrícula</th><th>Nombre</th><th>Estado</th><th className={s.num}>Asistencia</th><th>Disciplina</th><th className={s.num}>Puntos</th><th></th></tr></thead><tbody>
        {rows.map(p=>{const pct=porcentaje(p);return <tr key={p.id}>
          <td><Matricula codigo={p.codigo} matricula={p.matricula}/></td>
          <td><strong>{p.nombre_completo}</strong><p>{[p.grado,p.cargo_directiva,p.role!=='voluntario'?labels[p.role]??p.role.replace('_',' '):null].filter(Boolean).join(' · ')||'—'}</p></td>
          <td><Badge value={p.estado}/>{p.comision_destino&&<p>{p.comision_destino}</p>}</td>
          <td className={s.num}><strong className={pct!==null&&pct<75?s.minus:''}>{pct===null?'—':`${pct}%`}</strong><p>{p.asist_faltas} falta(s)</p></td>
          <td><p style={{margin:0}}>{p.meritos} mérito(s) · <span className={p.demeritos?s.minus:''}>{p.demeritos} demérito(s)</span></p><p className={p.llamadas?s.minus:''}>{p.llamadas} llamada(s) de atención</p></td>
          <td className={`${s.num} ${s.mono}`}>{p.total_puntos}</td>
          <td><Link className={s.chip} to={`/personal/file/${p.id}`}>Ver file</Link></td>
        </tr>;})}
      </tbody></table></div>:<p className={s.empty}>No hay personal para mostrar.</p>}
    </section>
  </div>;
}

/** Alta de personal: la matrícula se asigna automáticamente en la serie del código elegido. */
export function PersonalNuevo(){
  const r=useRemote(gestionApi.personal),m=useMutation(r.reload);
  const codigos=Object.entries(r.data?.codigos??{});
  const siguiente=(c:string)=>{const max=(r.data?.personal??[]).filter(p=>p.codigo===c&&/^[A-Z]{2}-\d+$/.test(p.matricula)).reduce((t,p)=>Math.max(t,Number(p.matricula.split('-')[1])),0);return `${c}-${String(max+1).padStart(3,'0')}`;};
  const creado=m.resultado?.id&&m.resultado.matricula?m.resultado:null;
  return <div className={s.page}>
    <div className={s.heading}><div><h1>Registrar personal</h1><p className={s.muted}>La matrícula se asigna sola, siguiendo el correlativo vigente de cada código. El alta queda en la bitácora.</p></div></div>
    <Feedback loading={r.loading} error={r.error||m.error} message={m.message}>{creado&&<Link to={`/personal/file/${creado.id}`}>Abrir file · matrícula {creado.matricula}</Link>}</Feedback>
    {r.data&&<div className={s.kpis} style={{marginBottom:18}}>{codigos.map(([k,v])=><div key={k} className={`${s.kpi} ${s.kSaldo}`}><small>{v}</small><strong>{siguiente(k)}</strong><p className={s.muted}>Siguiente matrícula</p></div>)}</div>}
    <section className={`${s.card} ${s.formCard} ${s.tono_entrega}`}>
      <div className={s.cardHead}><h2>Datos de la persona</h2><span className={s.nextCode}>Rol inicial: voluntario</span></div>
      <FieldsForm busy={m.busy} label="Registrar y asignar matrícula" onSubmit={d=>m.save('/personal',d)} fields={[
        {name:'codigo',label:'Código',options:codigos.map(([k,v])=>[k,`${k} · ${v}`])},
        {name:'estado',label:'Estado inicial',options:[['activo','Activo'],['pasiva','Pasivo'],['cooperador','Cooperador']],value:'activo'},
        {name:'nombre',label:'Nombre(s)',max:120},{name:'apellido_paterno',label:'Apellido paterno',max:100},
        {name:'apellido_materno',label:'Apellido materno',max:100,required:false},{name:'carnet_identidad',label:'Carnet de identidad',max:30},
        {name:'fecha_nacimiento',label:'Fecha de nacimiento',type:'date',required:false},
        {name:'tipo_sangre',label:'Tipo de sangre',options:['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t=>[t,t]),required:false},
        {name:'telefono',label:'Teléfono',max:30,required:false},{name:'email',label:'Correo (usuario del portal)',type:'email',max:180},
        {name:'password',label:'Contraseña inicial (mínimo 8)',type:'password',max:100},{name:'especialidad',label:'Especialidad',max:150,required:false},
        {name:'contacto_nombre',label:'Contacto de emergencia',max:200,required:false},{name:'contacto_telefono',label:'Teléfono de contacto',max:30,required:false},
        {name:'domicilio',label:'Domicilio',max:300,required:false,wide:true},
      ]}/>
    </section>
  </div>;
}
