import { API_BASE_URL } from './api';
import type { DatosCertificado } from '../utils/certificadosPdf';

export interface CertificadoRegistrado {
  id: number;
  numero: number;
  codigo: string;
  estado: 'pendiente' | 'emitido';
  datos: DatosCertificado;
  descarga_path: string;
  verificacion_path: string;
  created_at: string;
  emitido_at: string | null;
}

export interface CertificadoPublico {
  codigo: string;
  estado: 'emitido';
  participante: string;
  curso: string;
  modalidad: 'participacion' | 'aprobacion';
  horas: string;
  fechaInicio: string;
  fechaFin: string;
  fechaEmision: string;
  lugar: string;
  temario: string;
  firmantes: { nombre:string; cargo:string }[];
  libro: string;
}

export function urlVerificacionCertificado(registro: CertificadoRegistrado): string {
  return new URL(registro.verificacion_path,window.location.origin).href;
}

export async function consultarCertificadoPublico(token: string, signal?: AbortSignal): Promise<CertificadoPublico> {
  const response = await fetch(`${API_BASE_URL}/certificados/publico/${encodeURIComponent(token)}`,{ signal });
  if (response.status === 404) throw new Error('No se encontró un certificado emitido con este enlace. Revisa el QR o consulta con la institución.');
  if (!response.ok) throw new Error('No se pudo consultar el registro. Intenta nuevamente en unos momentos.');
  return response.json();
}

async function solicitud<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('ya_token');
  const response = await fetch(`${API_BASE_URL}/certificados${path}`, {
    ...options, headers: { ...(token ? { Authorization:`Bearer ${token}` } : {}), ...options.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'No se pudo registrar el certificado. Verifica que el backend esté actualizado.');
  }
  return response.json();
}

export function urlDescargaCertificado(registro: CertificadoRegistrado): string {
  return new URL(`${API_BASE_URL.replace(/\/$/,'')}${registro.descarga_path}`, window.location.origin).href;
}

export const certificadosApi = {
  listar: () => solicitud<{ data:CertificadoRegistrado[] }>(''),
  reservar: (datos: DatosCertificado, clave: string) => solicitud<CertificadoRegistrado>('', {
    method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ datos, clave_solicitud:clave }),
  }),
  subirPDF: (id: number, blob: Blob) => {
    const form = new FormData(); form.append('archivo', blob, 'certificado.pdf');
    return solicitud<CertificadoRegistrado>(`/${id}/pdf`, { method:'PUT', body:form });
  },
  descargar: async (registro: CertificadoRegistrado) => {
    const token = localStorage.getItem('ya_token');
    const response = await fetch(urlDescargaCertificado(registro),{ headers:token ? { Authorization:`Bearer ${token}` } : {} });
    if (!response.ok) throw new Error('No se pudo descargar el PDF registrado. Intenta nuevamente.');
    return response.blob();
  },
};
