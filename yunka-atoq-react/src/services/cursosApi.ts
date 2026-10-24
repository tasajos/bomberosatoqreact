import { API_BASE_URL } from './api';

// Los miembros de la fundación usan su sesión institucional (ya_token). Los participantes e
// instructores externos tienen una sesión propia de cursos que no sirve en el resto del sistema.
export type ModoCursos = 'interno' | 'externo';
export const TOKEN_EXTERNO = 'ya_curso_token';
const token = (modo: ModoCursos) => localStorage.getItem(modo === 'externo' ? TOKEN_EXTERNO : 'ya_token');

export type EstadoCurso = 'borrador' | 'publicado' | 'finalizado' | 'cancelado';
export type TipoMaterial = 'pdf' | 'presentacion' | 'video' | 'html' | 'enlace';
export type EstadoInscripcion = 'pendiente' | 'activa' | 'rechazada' | 'retirada';
export type EstadoAcademico = 'sin_evaluacion' | 'en_curso' | 'aprobado' | 'reprobado';

export interface CursoPublico {
  id: number; titulo: string; descripcion: string; visibilidad: 'interno' | 'publico'; horas: number;
  fecha_inicio: string; fecha_fin: string; costo: number; info_pago: string | null; cupo: number; inscritos: number;
  nota_minima: number; estado: EstadoCurso; instructor_nombre: string | null; instructor_institucion: string | null; modulos: number;
}
export interface CursoOnline extends CursoPublico {
  instructor_user_id: number | null; instructor_cuenta_id: number | null; instructor_tipo: 'interno' | 'externo';
  instructor_email: string | null; pendientes: number; created_at: string;
}
export type DatosCurso = Pick<CursoOnline, 'titulo' | 'descripcion' | 'visibilidad' | 'horas' | 'fecha_inicio' | 'fecha_fin' | 'costo' |
  'info_pago' | 'cupo' | 'nota_minima' | 'estado' | 'instructor_user_id' | 'instructor_cuenta_id'>;
export interface CuentaExterna { id: number; nombre: string; apellidos: string; email: string; documento: string; telefono: string | null; institucion: string | null; es_instructor: boolean }
export interface UsuarioInstructor { id: number; nombre: string; role: string; grado: string | null }
export interface CuentaExternaGestion extends CuentaExterna {
  activo: boolean; email_verificado: boolean; created_at: string; inscripciones: number; cursos_dictados: number;
}

export interface MaterialStaff { id: number; modulo_id: number; titulo: string; tipo: TipoMaterial; nombre_original: string | null; tamano: number | null; url: string | null; orden: number; html_largo: number | null }
export interface ModuloStaff { id: number; titulo: string; descripcion: string | null; orden: number; materiales: MaterialStaff[] }
export interface OpcionPregunta { texto: string; correcta: boolean }
export interface Pregunta { texto: string; tipo: 'unica' | 'multiple'; puntos: number; opciones: OpcionPregunta[] }
export interface Examen { id: number; curso_id: number; modulo_id: number | null; titulo: string; instrucciones: string | null; intentos_max: number; publicado: boolean; preguntas: Pregunta[]; intentos: number }
export type DatosExamen = Pick<Examen, 'modulo_id' | 'titulo' | 'instrucciones' | 'intentos_max' | 'publicado' | 'preguntas'>;
export interface DetalleStaff { curso: CursoOnline; gestion: boolean; modulos: ModuloStaff[]; examenes: Examen[] }

export interface Evaluacion {
  nota: number | null; estado: EstadoAcademico; rendidos: number; total: number;
  notas: Record<string, number>; intentos: Record<string, number>; progreso: { vistos: number; total: number };
}
export interface Participante {
  id: number; estado: EstadoInscripcion; pago_referencia: string | null; observacion: string | null; created_at: string;
  tipo: 'interno' | 'externo'; nombre: string; documento: string; email: string; telefono: string; institucion: string | null;
  correo_verificado: boolean; evaluacion: Evaluacion; certificable: boolean; certificado: { id: number; codigo: string; verificacion_path: string } | null;
}
export interface ListaParticipantes { curso: CursoOnline; concluido: boolean; examenes: { id: number; modulo_id: number | null; titulo: string }[]; participantes: Participante[] }

export interface InscripcionPropia { id: number; estado: EstadoInscripcion; pago_referencia: string | null; observacion: string | null }
export interface Catalogo { disponibles: CursoPublico[]; inscritos: { curso: CursoPublico; inscripcion: InscripcionPropia; evaluacion: Evaluacion; concluido: boolean; certificado: boolean }[] }
export interface Aula {
  curso: CursoPublico; vista_previa: boolean; acceso: boolean; motivo: string | null; inscripcion: InscripcionPropia | null;
  modulos: { id: number; titulo: string; descripcion: string | null; materiales: { id: number; titulo: string; tipo: TipoMaterial; visto: boolean }[] }[];
  examenes: { id: number; modulo_id: number | null; titulo: string; intentos_max: number; intentos: number; mejor: number | null }[];
  examenes_abiertos: boolean; concluido: boolean; evaluacion: Evaluacion | null; certificado: { codigo: string; verificacion_path: string } | null;
}
export interface ContenidoMaterial { id: number; titulo: string; tipo: TipoMaterial; nombre_original: string | null; tamano: number | null; html?: string; url?: string; archivo_path?: string }
export interface ExamenParaRendir { id: number; titulo: string; instrucciones: string | null; intentos_max: number; intentos_usados: number; vista_previa: boolean; preguntas: { texto: string; tipo: 'unica' | 'multiple'; puntos: number; opciones: string[] }[] }
export interface ResultadoExamen { puntaje: number; correctas: number; total: number; aprobado: boolean; nota_minima: number; intento: number; intentos_restantes: number }
export interface DatosCertificadoCurso { inscripcion_id: number; participante: string; documento: string; curso: string; modalidad: 'participacion' | 'aprobacion'; horas: string; fechaInicio: string; fechaFin: string; instructor: string; temario: string; nota: number | null }
export interface SesionCursos { tipo: 'usuario' | 'cuenta'; nombre: string; cuenta: CuentaExterna | null; gestion: boolean; dictando: number }

async function pedir<T>(modo: ModoCursos, ruta: string, opciones: RequestInit = {}): Promise<T> {
  const t = token(modo), headers: Record<string, string> = { ...(opciones.headers as Record<string, string>) };
  if (!(opciones.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (t) headers.Authorization = `Bearer ${t}`;
  const r = await fetch(`${API_BASE_URL}/cursos${ruta}`, { ...opciones, headers });
  if (!r.ok) {
    const b = await r.json().catch(() => ({}));
    throw Object.assign(new Error(b.error || (r.status === 413 ? 'El contenido es demasiado grande.' : `Error ${r.status}`)), { status: r.status, codigo: b.codigo as string | undefined });
  }
  return r.json();
}
const cuerpo = (metodo: string, datos?: unknown): RequestInit => ({ method: metodo, body: datos === undefined ? undefined : JSON.stringify(datos) });

/** URL absoluta de un archivo con enlace firmado (sirve para <video>, <iframe> y el visor de Office). */
export const urlArchivo = (ruta: string) => `${API_BASE_URL}${ruta}`;

export function crearCursosApi(modo: ModoCursos) {
  const p = <T,>(ruta: string, opciones?: RequestInit) => pedir<T>(modo, ruta, opciones);
  return {
    modo,
    yo: () => p<SesionCursos>('/yo'),
    cambiarPassword: (actual: string, nueva: string) => p<{ ok: boolean }>('/yo/password', cuerpo('PUT', { actual, nueva })),
    // Participante
    catalogo: () => p<Catalogo>('/aula'),
    aula: (id: number) => p<Aula>(`/aula/${id}`),
    inscribirse: (id: number, pago_referencia = '') => p<{ id: number; estado: EstadoInscripcion }>(`/aula/${id}/inscripcion`, cuerpo('POST', { pago_referencia })),
    registrarPago: (id: number, pago_referencia: string) => p<{ ok: boolean }>(`/aula/${id}/pago`, cuerpo('PUT', { pago_referencia })),
    certificado: async (id: number) => {
      const r = await fetch(`${API_BASE_URL}/cursos/aula/${id}/certificado`, { headers: { Authorization: `Bearer ${token(modo)}` } });
      if (!r.ok) throw new Error('No se pudo descargar el certificado.');
      return r.blob();
    },
    contenido: (materialId: number) => p<ContenidoMaterial>(`/materiales/${materialId}/contenido`),
    examen: (id: number) => p<ExamenParaRendir>(`/examenes/${id}`),
    rendir: (id: number, respuestas: number[][]) => p<ResultadoExamen>(`/examenes/${id}/intentos`, cuerpo('POST', { respuestas })),
    // Instructor
    dictados: () => p<{ data: CursoOnline[] }>('/dictar'),
    detalle: (id: number) => p<DetalleStaff>(`/dictar/${id}`),
    participantes: (id: number) => p<ListaParticipantes>(`/dictar/${id}/participantes`),
    crearModulo: (cursoId: number, datos: { titulo: string; descripcion: string }) => p<{ id: number }>(`/dictar/${cursoId}/modulos`, cuerpo('POST', datos)),
    actualizarModulo: (id: number, datos: { titulo: string; descripcion: string }) => p<{ ok: boolean }>(`/modulos/${id}`, cuerpo('PUT', datos)),
    eliminarModulo: (id: number) => p<{ ok: boolean }>(`/modulos/${id}`, cuerpo('DELETE')),
    moverModulo: (id: number, direccion: 'arriba' | 'abajo') => p<{ ok: boolean }>(`/modulos/${id}/mover`, cuerpo('POST', { direccion })),
    crearMaterial: (moduloId: number, datos: FormData | { titulo: string; tipo: TipoMaterial; html?: string; url?: string }) =>
      p<{ id: number }>(`/modulos/${moduloId}/materiales`, datos instanceof FormData ? { method: 'POST', body: datos } : cuerpo('POST', datos)),
    /** Carga con barra de progreso: fetch no informa el avance de subida de archivos grandes. */
    subirMaterial: (moduloId: number, datos: FormData, progreso: (pct: number) => void) => new Promise<{ id: number }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/cursos/modulos/${moduloId}/materiales`);
      const t = token(modo); if (t) xhr.setRequestHeader('Authorization', `Bearer ${t}`);
      xhr.upload.onprogress = e => { if (e.lengthComputable) progreso(Math.round(e.loaded / e.total * 100)); };
      xhr.onload = () => {
        let b: { error?: string; id?: number } = {};
        try { b = JSON.parse(xhr.responseText); } catch { /* respuesta no JSON */ }
        if (xhr.status >= 200 && xhr.status < 300) resolve(b as { id: number });
        else reject(new Error(b.error || (xhr.status === 413 ? 'El archivo supera el límite del servidor.' : `Error ${xhr.status}`)));
      };
      xhr.onerror = () => reject(new Error('Se interrumpió la conexión durante la carga.'));
      xhr.send(datos);
    }),
    actualizarMaterial: (id: number, datos: { titulo: string; html?: string; url?: string }) => p<{ ok: boolean }>(`/materiales/${id}`, cuerpo('PUT', datos)),
    eliminarMaterial: (id: number) => p<{ ok: boolean }>(`/materiales/${id}`, cuerpo('DELETE')),
    moverMaterial: (id: number, direccion: 'arriba' | 'abajo') => p<{ ok: boolean }>(`/materiales/${id}/mover`, cuerpo('POST', { direccion })),
    crearExamen: (cursoId: number, datos: DatosExamen) => p<{ id: number }>(`/dictar/${cursoId}/examenes`, cuerpo('POST', datos)),
    actualizarExamen: (id: number, datos: DatosExamen) => p<{ id: number }>(`/examenes/${id}`, cuerpo('PUT', datos)),
    eliminarExamen: (id: number) => p<{ ok: boolean }>(`/examenes/${id}`, cuerpo('DELETE')),
  };
}
export type CursosApi = ReturnType<typeof crearCursosApi>;

// Presidencia (solo con la sesión institucional)
const g = <T,>(ruta: string, opciones?: RequestInit) => pedir<T>('interno', `/gestion${ruta}`, opciones);
export const cursosGestionApi = {
  listarCuentas: () => g<{ data: CuentaExternaGestion[] }>('/cuentas'),
  eliminarCuenta: (id: number) => g<{ ok: boolean }>(`/cuentas/${id}`, cuerpo('DELETE')),
  listar: () => g<{ data: CursoOnline[] }>(''),
  opciones: () => g<{ usuarios: UsuarioInstructor[]; externos: CuentaExterna[] }>('/opciones'),
  crear: (datos: DatosCurso) => g<CursoOnline>('', cuerpo('POST', datos)),
  actualizar: (id: number, datos: DatosCurso) => g<CursoOnline>(`/${id}`, cuerpo('PUT', datos)),
  eliminar: (id: number) => g<{ ok: boolean }>(`/${id}`, cuerpo('DELETE')),
  crearInstructor: (datos: { nombre: string; apellidos: string; documento: string; email: string; telefono: string; institucion: string }) =>
    g<{ cuenta: CuentaExterna; password: string | null; existente: boolean; correo_enviado?: boolean }>('/instructores', cuerpo('POST', datos)),
  restablecerPassword: (cuentaId: number) => g<{ password: string; correo_enviado: boolean }>(`/cuentas/${cuentaId}/password`, cuerpo('POST', {})),
  revisarInscripcion: (id: number, estado: 'activa' | 'rechazada' | 'retirada', observacion = '') => g<{ ok: boolean }>(`/inscripciones/${id}`, cuerpo('PUT', { estado, observacion })),
  datosCertificado: (inscripcionId: number) => g<DatosCertificadoCurso>(`/inscripciones/${inscripcionId}/certificado`),
  vincularCertificado: (inscripcionId: number, certificado_id: number) => g<{ ok: boolean }>(`/inscripciones/${inscripcionId}/certificado`, cuerpo('PUT', { certificado_id })),
};

// Público y sesión externa
export const cursosPublicoApi = {
  catalogo: () => pedir<{ data: CursoPublico[] }>('externo', '/publico'),
  detalle: (id: number) => pedir<CursoPublico & { temario: { titulo: string; descripcion: string | null }[] }>('externo', `/publico/${id}`),
  /** Pre-registro: no inicia sesión; la cuenta se activa con el enlace enviado al correo. */
  registrar: (datos: { nombre: string; apellidos: string; documento: string; email: string; telefono: string; institucion: string; password: string; curso_id?: number | null }) =>
    pedir<{ email: string; correo_enviado: boolean }>('externo', '/publico/registro', cuerpo('POST', datos)),
  verificar: (token: string) => pedir<{ token: string; cuenta: CuentaExterna } | { ya_confirmado: true; email: string }>('externo', '/publico/verificar', cuerpo('POST', { token })),
  reenviar: (email: string) => pedir<{ ok: boolean }>('externo', '/publico/reenviar', cuerpo('POST', { email })),
  ingresar: (email: string, password: string) => pedir<{ token: string; cuenta: CuentaExterna }>('externo', '/publico/ingresar', cuerpo('POST', { email, password })),
};
export const sesionExterna = {
  guardar: (t: string) => localStorage.setItem(TOKEN_EXTERNO, t),
  cerrar: () => localStorage.removeItem(TOKEN_EXTERNO),
  existe: () => !!localStorage.getItem(TOKEN_EXTERNO),
};

export const ETIQUETAS: Record<string, string> = {
  borrador: 'Borrador', publicado: 'Publicado', finalizado: 'Finalizado', cancelado: 'Cancelado',
  interno: 'Solo fundación', publico: 'Abierto al público',
  pendiente: 'Por habilitar', activa: 'Habilitado', rechazada: 'Rechazada', retirada: 'Retirado',
  sin_evaluacion: 'Sin evaluación', en_curso: 'En curso', aprobado: 'Aprobado', reprobado: 'Reprobado',
  pdf: 'PDF', presentacion: 'Presentación', video: 'Video', html: 'Práctica HTML', enlace: 'Enlace / video externo',
};
export const fechaCurso = (v: string) => new Date(`${v.slice(0, 10)}T12:00:00`).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
export const precio = (n: number) => n > 0 ? new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(n) : 'Gratuito';
export const textoNota = (evaluacion: Evaluacion | null) => !evaluacion || evaluacion.nota === null ? '—' : `${evaluacion.nota}%`;
