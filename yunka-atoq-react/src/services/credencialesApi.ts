import { API_BASE_URL, request } from './api';
export const VERSION_DISENO_CREDENCIAL=2;

export interface VoluntarioCredencial {
  id:number;nombre:string;apellido_paterno:string;apellido_materno:string;codigo:string;matricula:string;
  tipo_sangre:string;especialidad:string;grado:string;cargo_directiva:string;role:string;activo:number;estado_personal:string;foto_url:string|null;
}
export interface DatosCredencial {nombre:string;codigo_voluntario:string;tipo_sangre:string;especialidad:string;funcion:string;grado:string;foto:string}
export interface Credencial {
  id:number;voluntario_id:number;codigo:string;estado:'pendiente'|'emitida'|'reemplazada'|'anulada';
  estado_verificacion:string;diseno_version:number;datos:DatosCredencial;fecha_emision:string;fecha_vencimiento:string;
  verificacion_path:string;verificacion_url:string;tiene_pdf:boolean;anulacion_motivo:string|null;
}
export interface CredencialPublica extends Omit<DatosCredencial,'foto'> {foto:string;codigo:string;estado:string;fecha_emision:string;fecha_vencimiento:string;duracion:string}
export function urlCredencial(r:Credencial) {return r.verificacion_url;}
export function descargarArchivoCredencial(blob:Blob,codigo:string) {
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${codigo}.pdf`;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
export const credencialesApi={
  voluntarios:()=>request<{data:VoluntarioCredencial[]}>('/credenciales/voluntarios'),
  listar:()=>request<{data:Credencial[]}>('/credenciales'),
  reservar:(datos:{voluntario_id:number;funcion:string;fecha_emision:string;foto:string},clave:string)=>request<Credencial>('/credenciales',{method:'POST',body:JSON.stringify({datos,clave_solicitud:clave})}),
  anular:(id:number,motivo:string)=>request<{ok:boolean}>(`/credenciales/${id}/anular`,{method:'POST',body:JSON.stringify({motivo})}),
  guardarPDF:async(id:number,blob:Blob)=>{
    const form=new FormData();form.append('archivo',blob,'credencial.pdf');form.append('diseno_version',String(VERSION_DISENO_CREDENCIAL));
    const r=await fetch(`${API_BASE_URL}/credenciales/${id}/pdf`,{method:'PUT',headers:{Authorization:`Bearer ${localStorage.getItem('ya_token')}`},body:form});
    if(!r.ok){const b=await r.json().catch(()=>({}));throw new Error(b.error||'No se pudo guardar la credencial.');}return r.json() as Promise<Credencial>;
  },
  descargar:async(id:number)=>{
    const r=await fetch(`${API_BASE_URL}/credenciales/${id}/pdf`,{headers:{Authorization:`Bearer ${localStorage.getItem('ya_token')}`}});
    if(!r.ok)throw new Error('No se pudo descargar el PDF original.');return r.blob();
  },
  publico:async(token:string,signal?:AbortSignal)=>{
    const r=await fetch(`${API_BASE_URL}/credenciales/publico/${encodeURIComponent(token)}`,{signal});
    if(!r.ok)throw new Error(r.status===404?'No se encontró una credencial con este enlace.':'No se pudo consultar la credencial. Intente nuevamente.');
    return r.json() as Promise<CredencialPublica>;
  },
};
