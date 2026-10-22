import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { credencialesApi } from '../services/credencialesApi';
import type { CredencialPublica } from '../services/credencialesApi';
import { fechaCredencial, gradoCredencial } from '../utils/credencialesPdf';
import s from './gestion/Gestion.module.css';
import { especialidadesCredencial, NOMBRE_FUNDACION } from '../utils/especialidadesCredencial';
import c from './presidente/CredencialesPresidencia.module.css';

const estados:Record<string,string>={vigente:'Credencial vigente',vencida:'Credencial vencida',reemplazada:'Credencial reemplazada',anulada:'Credencial anulada',inactivo:'Voluntario inactivo'};
export default function VerificarCredencialPage(){
  const {token=''}=useParams(),[datos,setDatos]=useState<CredencialPublica|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[intento,setIntento]=useState(0);
  useEffect(()=>{const ctrl=new AbortController();setLoading(true);setDatos(null);setError('');
    if(!/^[a-f0-9]{64}$/.test(token)){setError('El enlace de verificación no es válido. Revise el QR.');setLoading(false);return;}
    credencialesApi.publico(token,ctrl.signal).then(d=>{if(!ctrl.signal.aborted)setDatos(d);}).catch(e=>{if(!ctrl.signal.aborted)setError(e instanceof TypeError?'No se pudo conectar con el registro. Revise su conexión.':e.message);}).finally(()=>{if(!ctrl.signal.aborted)setLoading(false);});
    return()=>ctrl.abort();
  },[token,intento]);
  useEffect(()=>{
    const titulo=document.title;document.title='Verificación de credenciales | Yunka Atoq';
    const previo=document.querySelector<HTMLMetaElement>('meta[name="robots"]'),meta=previo??document.createElement('meta'),content=meta.getAttribute('content');meta.name='robots';meta.content='noindex, nofollow';if(!previo)document.head.appendChild(meta);
    return()=>{document.title=titulo;if(!previo)meta.remove();else if(content===null)meta.removeAttribute('content');else meta.content=content;};
  },[]);
  return <div className={c.publicPage}><div className={`${s.page} ${c.publicCard}`}><header className={c.publicHeader}><img className={c.publicLogo} src="/yunka_atoq_transparente.png" alt="Escudo Yunka Atoq"/><div><p className={s.muted}>{NOMBRE_FUNDACION}</p><h1>Verificación de credenciales</h1><p className={s.muted}>Información consultada directamente del registro.</p></div></header>
    {loading&&<p className={s.notice} role="status">Consultando credencial…</p>}{error&&<section className={s.card} role="alert"><h2>Credencial no disponible</h2><p>{error}</p><button className={s.button} onClick={()=>setIntento(i=>i+1)}>Volver a consultar</button></section>}
    {datos&&<article className={s.card}><div className={s.heading}><strong>{datos.codigo}</strong><strong className={datos.estado==='vigente'?c.statusGood:c.statusBad} role="status">{estados[datos.estado]??datos.estado}</strong></div>{datos.estado!=='vigente'&&<p className={s.error}>Esta credencial no acredita una identificación institucional vigente. Consulte con la institución.</p>}<div className={c.publicIdentity}><img className={c.publicPhoto} src={datos.foto} alt={`Foto de ${datos.nombre}`}/><div><p className={s.muted}>TITULAR DE LA CREDENCIAL</p><h2>{datos.nombre}</h2><p>{datos.funcion}</p><strong>{datos.codigo_voluntario}</strong></div></div>{especialidadesCredencial(datos.especialidad).length>0&&<div className={c.publicSpecialties} aria-label="Insignias de especialidad">{especialidadesCredencial(datos.especialidad).map(e=><img key={e.slug} src={e.img} alt={e.name} title={e.name}/>)}</div>}<dl className={c.publicDetails}>{([['Tipo de sangre',datos.tipo_sangre],['Especialidades',datos.especialidad],['Grado',gradoCredencial(datos.grado)||'Voluntario'],['Función',datos.funcion],['Fecha de emisión',fechaCredencial(datos.fecha_emision)],['Válida hasta',fechaCredencial(datos.fecha_vencimiento)],['Duración',datos.duracion],['Institución emisora','Bomberos Voluntarios Yunka Atoq']] as [string,string][]).filter(([,v])=>v?.trim()).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl><p className={s.muted}>El estado puede cambiar por renovación o anulación. Para consultas, indique el código {datos.codigo}.</p><Link to="/contacto">Contactar a la institución</Link></article>}
    <Link to="/">← Volver al sitio institucional</Link>
  </div></div>;
}
