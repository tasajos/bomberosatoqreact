import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { gestionApi } from '../../services/gestionApi';
import { CABECERA_POR_DEFECTO, obtenerCabecera } from '../../utils/documentosPdf';
import { contenidoVoucher, descargarVoucherPDF, dineroBs, fechaHora, montoEnLetras } from '../../utils/voucherPdf';
import type { Comprobante } from '../../utils/voucherPdf';
import { Feedback, useRemote } from './shared';
import s from './Gestion.module.css';

export default function Voucher(){
  const {codigo=''}=useParams();
  const load=useCallback(()=>gestionApi.voucher(codigo),[codigo]),r=useRemote(load),v=r.data;
  return <ComprobantePagina titulo={`Voucher ${codigo.toUpperCase()}`} subtitulo="Respaldo digital del movimiento. Descárguelo en PDF o imprímalo para archivo físico."
    loading={r.loading} error={r.error} pdf={v?()=>descargarVoucherPDF(v):undefined}
    comprobante={v&&{codigo:v.codigo,fecha:v.fecha,rotulo:'Voucher',detalle:v.detalle,monto:v.monto,contenido:contenidoVoucher(v)}}
    pie="Las autorizaciones corresponden a las cuentas registradas en el sistema institucional. La firma de recepción se completa al entregar el dinero."/>;
}

/** Página de comprobante institucional (voucher o acta): vista digital, impresión y PDF. */
export function ComprobantePagina({titulo,subtitulo,loading,error,pdf,comprobante,pie}:{titulo:string;subtitulo:string;loading:boolean;error:string;pdf?:()=>Promise<void>;comprobante:Comprobante|null|undefined|false;pie:ReactNode}){
  const navigate=useNavigate(),cab=useRemote(obtenerCabecera).data??CABECERA_POR_DEFECTO;
  const [generando,setGenerando]=useState(''),[errorPdf,setErrorPdf]=useState('');
  async function descargar(){
    if(!pdf)return;setGenerando('Generando PDF…');setErrorPdf('');
    try{await pdf();}catch{setErrorPdf('No se pudo generar el PDF. Intente nuevamente.');}finally{setGenerando('');}
  }
  const v=comprobante||null,c=v?.contenido;
  return <div className={s.page}>
    <div className={`${s.heading} ${s.noPrint}`}>
      <div><button className={s.link} onClick={()=>navigate(-1)}>← Volver</button><h1>{titulo}</h1><p className={s.muted}>{subtitulo}</p></div>
      <div className={s.actions}><button className={s.secondary} disabled={!v} onClick={()=>window.print()}>Imprimir</button><button className={s.button} disabled={!v||!!generando} onClick={descargar}>{generando||'Descargar PDF'}</button></div>
    </div>
    <Feedback loading={loading} error={error||errorPdf}/>
    {v&&c&&<article className={`${s.print} ${s.voucher} ${s[`tono_${c.tono}`]}`}>
      <header className={s.vHeader}>
        <img src="/yunka_atoq_log.png" alt="Yunka Atoq"/>
        <div><small>{cab.subtitulo}</small><h2>{cab.nombre}</h2><p>{cab.nombre_legal}</p></div>
        <div className={s.vNumero}><span>{v.rotulo.toUpperCase()} Nº</span><strong>{v.codigo}</strong><small>{fechaHora(v.fecha)}</small></div>
      </header>
      <div className={s.vTitulo}><h3>{c.titulo}</h3><span>{c.estado}</span></div>
      {v.monto!==undefined&&<div className={s.vMonto}><div><small>Monto</small><strong>{dineroBs(v.monto)}</strong></div><div><small>Son</small><p>{montoEnLetras(v.monto)}</p></div></div>}
      <dl className={s.vDatos}>{c.datos.map(([k,val])=><div key={k}><dt>{k}</dt><dd>{val}</dd></div>)}</dl>
      <section><h4>{c.motivoTitulo}</h4><p className={`${s.vMotivo} ${s.line}`}>{v.detalle||'—'}</p></section>
      <section><h4>Autorizaciones y registro</h4>
        <ol className={s.vAutorizaciones}>{c.autorizaciones.map(a=><li key={a.instancia}><span className={s.vCheck} aria-hidden>✓</span><div><small>{a.instancia}</small><strong>{a.nombre}</strong></div><div><small>Fecha y hora</small><strong>{a.fecha}</strong></div><em>{a.estado}</em></li>)}</ol>
      </section>
      <div className={s.vFirmas}>{c.firmas.map(f=><div key={f.rol}><strong>{f.nombre||' '}</strong><span>{f.rol}</span></div>)}</div>
      <footer className={s.vPie}>{v.rotulo} {v.codigo} · {c.copias.length?`El PDF incluye ${c.copias.join(' y ').toLowerCase()}. `:''}{pie}</footer>
    </article>}
  </div>;
}
