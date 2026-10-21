import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { gestionApi } from '../../services/gestionApi';
import { comprobanteActa, descargarActaPDF } from '../../utils/actaPdf';
import { useRemote } from './shared';
import { ComprobantePagina } from './Voucher';

/** Acta LOG de entrega, devolución o baja: vista digital, impresión y PDF. */
export default function Acta(){
  const {codigo=''}=useParams();
  const load=useCallback(()=>gestionApi.acta(codigo),[codigo]),r=useRemote(load),a=r.data;
  return <ComprobantePagina titulo={`Acta ${codigo.toUpperCase()}`} subtitulo="Respaldo del movimiento del equipo. Descárguela en PDF o imprímala para archivo físico."
    loading={r.loading} error={r.error} pdf={a?()=>descargarActaPDF(a):undefined} comprobante={a&&comprobanteActa(a)}
    pie="Las autorizaciones corresponden a las cuentas registradas en el sistema institucional. Las firmas se completan en la entrega o recepción física del equipo."/>;
}
