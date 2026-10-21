import { useState } from 'react';
import { gestionApi } from '../../services/gestionApi';
import { API_BASE, documentosPresidenciaApi } from '../../services/api';
import { descargarDocumentoPDF } from '../../utils/documentosPdf';
import { Feedback,fechaCorta,useRemote } from './shared';
import s from './Gestion.module.css';

export default function DocumentosVoluntario({embedded=false}:{embedded?:boolean}){
  const r=useRemote(gestionApi.file),[error,setError]=useState(''),[busy,setBusy]=useState<number|null>(null);
  return <div className={embedded?'':s.page}><h1>Memos, resoluciones y documentos</h1><p className={s.muted}>Documentos y registros asignados a su file personal.</p><Feedback loading={r.loading} error={r.error||error}/>
    <section className={s.card}><h2>Resoluciones y documentos de presidencia</h2>{r.data?.resoluciones.length?r.data.resoluciones.map(d=><div key={d.id} className={s.heading}><div><strong>{d.titulo}</strong><p className={s.muted}>{d.tipo} · {d.numero}/{d.anio} · {fechaCorta(d.fecha)}</p></div><button className={s.secondary} disabled={busy!==null} onClick={async()=>{setBusy(d.id);setError('');try{await descargarDocumentoPDF(await documentosPresidenciaApi.get(d.id));}catch(e){setError(e instanceof Error?e.message:'No se pudo descargar');}finally{setBusy(null);}}}>{busy===d.id?'Preparando…':'Descargar PDF'}</button></div>):<p className={s.empty}>Sin documentos de presidencia asignados.</p>}</section>
    <section className={s.card}><h2>File documental · memos y respaldos</h2>{r.data?.documentos.length?r.data.documentos.map(d=><div className={s.heading} key={d.id}><div><strong>{d.nombre}</strong><p className={s.muted}>{d.categoria} · {d.descripcion}</p></div><a className={s.secondary} href={`${API_BASE}${d.archivo_url}`} target="_blank" rel="noreferrer">Abrir documento</a></div>):<p className={s.empty}>Sin documentos cargados en su file.</p>}</section>
    <section className={s.card}><h2>Méritos y llamadas de atención</h2>{r.data?.memos.length?r.data.memos.map(d=><article key={d.id}><h3>{d.titulo}</h3><p className={s.muted}>{d.tipo==='demerito'?'Llamada de atención':'Mérito'} · {fechaCorta(d.fecha)}</p><p className={s.line}>{d.descripcion}</p></article>):<p className={s.empty}>Sin registros.</p>}</section>
  </div>;
}
