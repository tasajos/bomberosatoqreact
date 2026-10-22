import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../../services/api';
import { credencialesApi, descargarArchivoCredencial, urlCredencial, VERSION_DISENO_CREDENCIAL } from '../../services/credencialesApi';
import type { Credencial, VoluntarioCredencial } from '../../services/credencialesApi';
import { crearCredencialPDF, fechaCredencial, prepararFotoCredencial } from '../../utils/credencialesPdf';
import { DIRECTIVA } from '../../utils/rankBadge';
import { especialidadesCredencial, NOMBRE_FUNDACION } from '../../utils/especialidadesCredencial';
import s from '../gestion/Gestion.module.css';
import c from './CredencialesPresidencia.module.css';

const nombre=(v:VoluntarioCredencial)=>[v.nombre,v.apellido_paterno,v.apellido_materno].filter(Boolean).join(' ');
const hoy=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/La_Paz'}).format(new Date());
const estadosPersonal:Record<string,string>={activo:'Activo',pasiva:'Pasivo',baja:'Baja',cooperador:'Cooperador',comision:'En comisión'};
const estadoPersonal=(v:VoluntarioCredencial)=>v.estado_personal==='pasivo'?'pasiva':v.estado_personal||'activo';
const etiquetas:Record<string,string>={vigente:'Vigente',vencida:'Vencida',inactivo:'Voluntario inactivo',anulada:'Anulada',reemplazada:'Reemplazada',pendiente:'Emisión pendiente'};
export default function CredencialesPresidencia(){
  const [voluntarios,setVoluntarios]=useState<VoluntarioCredencial[]>([]),[registros,setRegistros]=useState<Credencial[]>([]);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[aviso,setAviso]=useState('');
  const [filtroEstado,setFiltroEstado]=useState('');
  const [buscar,setBuscar]=useState(''),[seleccion,setSeleccion]=useState<VoluntarioCredencial|null>(null);
  const [foto,setFoto]=useState(''),[funcion,setFuncion]=useState(''),[emision,setEmision]=useState(hoy),[fotoBusy,setFotoBusy]=useState(false);
  const [anular,setAnular]=useState<Credencial|null>(null),[motivo,setMotivo]=useState('');
  const lock=useRef(false),emitiendo=useRef<{payload:string;clave:string}|null>(null);
  const [actualizacion,setActualizacion]=useState(0);
  const refrescar=()=>setActualizacion(v=>v+1);
  useEffect(()=>{let active=true;setLoading(true);Promise.all([credencialesApi.voluntarios(),credencialesApi.listar()]).then(([v,r])=>{if(active){setVoluntarios(v.data);setRegistros(r.data);}}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[actualizacion]);
  useEffect(()=>{
    if(!seleccion?.foto_url)return;let active=true;setFotoBusy(true);
    const path=seleccion.foto_url.startsWith('/')?`${API_BASE}${seleccion.foto_url}`:seleccion.foto_url;
    fetch(path).then(r=>{if(!r.ok)throw new Error();return r.blob();}).then(blob=>prepararFotoCredencial(new File([blob],'foto',{type:blob.type}))).then(f=>{if(active)setFoto(f);}).catch(()=>{if(active)setAviso('Adjunte una fotografía para esta credencial.');}).finally(()=>{if(active)setFotoBusy(false);});return()=>{active=false;};
  },[seleccion]);
  function seleccionar(v:VoluntarioCredencial){
    setSeleccion(v);setFoto('');setFotoBusy(false);setEmision(hoy());setFuncion((v.cargo_directiva&&DIRECTIVA.find(d=>d.value===v.cargo_directiva)?.label)||'Voluntario');setError('');setAviso('');emitiendo.current=null;
  }
  async function ejecutar(fn:()=>Promise<void>){if(lock.current)return;lock.current=true;setBusy(true);setError('');setAviso('');try{await fn();}catch(e){setError(e instanceof Error?e.message:'No se pudo completar la operación.');}finally{setBusy(false);lock.current=false;}}
  async function descargar(r:Credencial){
    if((r.diseno_version||1)<VERSION_DISENO_CREDENCIAL){
      const pdf=await crearCredencialPDF(r,urlCredencial(r));
      try{await credencialesApi.guardarPDF(r.id,pdf.output('blob'));}
      catch(e){
        const actual=(await credencialesApi.listar()).data.find(x=>x.id===r.id);
        if(!actual||actual.diseno_version<VERSION_DISENO_CREDENCIAL)throw e;
      }
      refrescar();
    }
    descargarArchivoCredencial(await credencialesApi.descargar(r.id),r.codigo);
    setAviso(`Descargada ${r.codigo}. Se conservaron su código y QR originales.`);
  }
  async function emitir(r:Credencial){
    if(r.estado==='emitida'){
      await descargar(r);refrescar();setSeleccion(null);setAviso(`Credencial ${r.codigo} ya emitida. Se descargó el original registrado.`);return;
    }
    const pdf=await crearCredencialPDF(r,urlCredencial(r)),blob=pdf.output('blob');
    await credencialesApi.guardarPDF(r.id,blob);descargarArchivoCredencial(blob,r.codigo);refrescar();setAviso(`Credencial ${r.codigo} emitida y guardada. El QR ya puede consultarse sin iniciar sesión.`);setSeleccion(null);
  }
  async function crear(e:FormEvent){e.preventDefault();if(!seleccion)return;await ejecutar(async()=>{
    if(!foto)throw new Error('Adjunte la fotografía del voluntario.');
    const datos={voluntario_id:seleccion.id,funcion,fecha_emision:emision,foto},payload=JSON.stringify(datos);
    if(emitiendo.current?.payload!==payload)emitiendo.current={payload,clave:crypto.randomUUID()};
    const r=await credencialesApi.reservar(datos,emitiendo.current.clave);refrescar();await emitir(r);emitiendo.current=null;
  });}
  const rows=voluntarios.filter(v=>{
    if(filtroEstado&&estadoPersonal(v)!==filtroEstado)return false;
    const codigos=registros.filter(r=>r.voluntario_id===v.id).map(r=>r.codigo).join(' ');
    return `${nombre(v)} ${v.matricula} ${v.codigo} ${codigos}`.toLowerCase().includes(buscar.trim().toLowerCase());
  });
  const idsVisibles=new Set(rows.map(v=>v.id));
  const registrosVisibles=registros.filter(r=>idsVisibles.has(r.voluntario_id));
  return <div className={s.page}>
    <div className={s.heading}><div><h1>Credenciales de voluntarios</h1><p className={s.muted}>Identificación para portar en el pecho · frente y reverso · QR público · vigencia de un año.</p></div><button className={s.secondary} disabled={busy||loading} onClick={refrescar}>Actualizar listado</button></div>
    {error&&<p role="alert" className={s.error}>{error}</p>}{aviso&&<p role="status" className={s.success}>{aviso}</p>}{loading&&<p role="status">Cargando voluntarios y credenciales…</p>}
    <p className={s.notice}>PDF para imprenta: corte de 54 × 85,6 mm, sangrado de 3 mm y marcas de corte. Imprimir al 100 %, sin ajustar a página. Verifique la foto antes de emitir. El QR muestra únicamente los datos impresos y el estado de vigencia.</p>
    {seleccion&&<section className={s.card}><div className={s.heading}><h2>Crear credencial · {nombre(seleccion)}</h2><button className={s.secondary} disabled={busy} onClick={()=>setSeleccion(null)}>Cerrar</button></div><div className={c.editor}><form className={s.form} onSubmit={crear}>
      <label className={`${s.field} ${s.wide}`}>Función institucional<input maxLength={90} required value={funcion} disabled={busy} onChange={e=>setFuncion(e.target.value)}/></label>
      <label className={s.field}>Fecha de emisión<input type="date" required max={hoy()} value={emision} disabled={busy} onChange={e=>setEmision(e.target.value)}/></label>
      <div><p className={c.meta}>Duración</p><strong>1 año desde la emisión</strong></div>
      <label className={`${s.field} ${s.wide}`}>Foto de frente (JPG, PNG o WebP)<input className={c.file} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy||fotoBusy} onChange={async e=>{const file=e.target.files?.[0];if(!file)return;setFotoBusy(true);setError('');try{setFoto(await prepararFotoCredencial(file));}catch(err){setError(err instanceof Error?err.message:'Foto inválida.');}finally{setFotoBusy(false);}}}/><span className={c.meta}>{fotoBusy?'Preparando foto…':'La foto se centra en formato vertical; el resultado se muestra a la derecha.'}</span></label>
      <dl className={`${s.details} ${s.wide}`}><div><dt>Código / matrícula</dt><dd>{seleccion.matricula||seleccion.codigo||'Falta registrar'}</dd></div><div><dt>Tipo de sangre</dt><dd>{seleccion.tipo_sangre||'Falta registrar'}</dd></div>{seleccion.especialidad?.trim()&&<div><dt>Especialidades</dt><dd>{seleccion.especialidad}</dd></div>}</dl>
      <div className={`${s.wide} ${s.actions}`}><button className={s.button} disabled={busy||fotoBusy||!foto}>{busy?'Emitiendo…':'Emitir y descargar PDF'}</button><Link to="/presidente/personal" className={s.secondary}>Editar datos del file</Link></div>
    </form><aside className={c.preview} aria-label="Vista de los datos de la credencial">
      <div className={c.brand}><span>Fundación de Voluntarios de Salvamento,</span><span>Rescate y Protección Ambiental</span><strong>“YUNKA ATOQ”</strong></div>
      <div className={c.previewBody}>
        <div className={c.logos}><img className={c.logo} src="/yunka_atoq_transparente.png" alt={NOMBRE_FUNDACION}/><div className={c.specialtyLogos}>{especialidadesCredencial(seleccion.especialidad).map(e=><img key={e.slug} src={e.img} alt={`Insignia de ${e.name}`} title={e.name}/>)}</div></div>
        <div className={c.portraitPanel}>{foto?<img className={c.foto} src={foto} alt="Fotografía preparada para la credencial"/>:<div className={c.photoEmpty}>Adjunte una fotografía</div>}<div className={c.identityPanel}><small>CÓDIGO / MATRÍCULA</small><strong>{seleccion.matricula||seleccion.codigo}</strong><small>FUNCIÓN</small><span>{funcion}</span><b>SANGRE · {seleccion.tipo_sangre}</b></div></div>
        <h3>{nombre(seleccion)}</h3>
        {seleccion.especialidad?.trim()&&<p className={c.specialtiesText}>{seleccion.especialidad}</p>}
        <div className={c.validity}>IDENTIFICACIÓN INSTITUCIONAL · VIGENCIA DE UN AÑO</div>
      </div><div className={c.previewFooter}>Bomberos Voluntarios</div>
    </aside></div></section>}
    <section className={s.card}>
      <div className={s.heading}><h2>Listado de voluntarios ({rows.length} de {voluntarios.length})</h2></div>
      <div className={c.tools}>
        <label className={s.field}>Estado del personal<select value={filtroEstado} onChange={e=>setFiltroEstado(e.target.value)}><option value="">Todos los estados</option>{Object.entries(estadosPersonal).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
        <label className={s.field}>Buscar<input className={s.search} aria-label="Buscar voluntarios" placeholder="Nombre, matrícula o código…" value={buscar} onChange={e=>setBuscar(e.target.value)}/></label>
      </div>
      <div className={s.tableWrap}><table className={s.table}><thead><tr><th>Voluntario</th><th>Estado</th><th>Código del voluntario</th><th>Sangre / especialidades</th><th>Código de emisión</th><th>Acciones</th></tr></thead><tbody>{rows.map(v=>{
        const r=registros.find(r=>r.voluntario_id===v.id);
        return <tr key={v.id}><td><strong>{nombre(v)}</strong>{!v.activo&&<p className={s.muted}>Sin acceso al sistema</p>}</td><td>{estadosPersonal[estadoPersonal(v)]||estadoPersonal(v)}</td><td>{v.matricula||v.codigo||'Sin código'}</td><td>{v.tipo_sangre||'Sin dato'}<p>{v.especialidad||'Sin especialidades'}</p></td><td>{r?<><strong>{r.codigo}</strong><p>{etiquetas[r.estado_verificacion]} · hasta {fechaCredencial(r.fecha_vencimiento)}</p></>:'Sin credencial'}</td><td><div className={s.actions}>
          {r?.tiene_pdf&&<button className={s.button} disabled={busy} onClick={()=>ejecutar(()=>descargar(r))}>Descargar credencial</button>}
          {r?.estado==='pendiente'?<button className={s.button} disabled={busy} onClick={()=>ejecutar(()=>emitir(r))}>Completar emisión</button>:<button className={s.secondary} disabled={busy||!v.activo||estadoPersonal(v)==='baja'} onClick={()=>seleccionar(v)}>{r?'Renovar credencial':'Crear credencial'}</button>}
        </div></td></tr>;
      })}</tbody></table></div>{!loading&&!rows.length&&<p className={s.empty}>No hay voluntarios con los filtros seleccionados.</p>}
    </section>
    <section className={s.card}><h2>Registro de credenciales</h2><p className={s.muted}>Descargar conserva el mismo código y QR. Solo «Renovar credencial» crea otra emisión y reemplaza la anterior.</p><div className={s.tableWrap}><table className={s.table}><thead><tr><th>Credencial / titular</th><th>Emisión</th><th>Vencimiento</th><th>Estado</th><th>Opciones</th></tr></thead><tbody>{registrosVisibles.map(r=><tr key={r.id}><td><strong>{r.codigo}</strong><p>{r.datos.nombre}</p></td><td>{fechaCredencial(r.fecha_emision)}</td><td>{fechaCredencial(r.fecha_vencimiento)}</td><td>{etiquetas[r.estado_verificacion]}{r.anulacion_motivo&&<p>{r.anulacion_motivo}</p>}</td><td><div className={s.actions}>{r.estado==='pendiente'?<button className={s.button} disabled={busy} onClick={()=>ejecutar(()=>emitir(r))}>Completar emisión</button>:<><button className={s.secondary} disabled={busy||!r.tiene_pdf} onClick={()=>ejecutar(()=>descargar(r))}>Descargar PDF</button><Link className={s.secondary} to={r.verificacion_path} target="_blank" rel="noreferrer">Verificar QR</Link></>}{['pendiente','emitida'].includes(r.estado)&&<button className={s.danger} disabled={busy} onClick={()=>{setAnular(r);setMotivo('');}}>Anular</button>}</div></td></tr>)}</tbody></table></div>{!loading&&!registrosVisibles.length&&<p className={s.empty}>Todavía no se han emitido credenciales.</p>}</section>
    {anular&&<section className={s.card}><h2>Anular {anular.codigo}</h2><form className={s.form} onSubmit={async e=>{e.preventDefault();await ejecutar(async()=>{await credencialesApi.anular(anular.id,motivo);setAnular(null);refrescar();setAviso('Credencial anulada. El QR muestra el nuevo estado.');});}}><label className={`${s.field} ${s.wide}`}>Motivo de anulación<textarea required maxLength={500} value={motivo} onChange={e=>setMotivo(e.target.value)} disabled={busy}/></label><div className={s.actions}><button className={s.danger} disabled={busy}>Confirmar anulación</button><button className={s.secondary} type="button" disabled={busy} onClick={()=>setAnular(null)}>Cancelar</button></div></form></section>}
  </div>;
}
