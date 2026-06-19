const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const API_BASE     = BASE_URL.replace('/api', '');   // http://localhost:5000
export const API_BASE_URL = BASE_URL;                       // http://localhost:5000/api

function getToken(): string | null {
  return localStorage.getItem('ya_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Error ${res.status}`);
  }
  return res.json();
}

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    request<{ token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<AuthUser>('/auth/me'),
};

// Operativos
export const operativosApi = {
  list: (page = 1, limit = 10) =>
    request<OperativosResponse>(`/operativos?page=${page}&limit=${limit}`),
  stats: () => request<Stats>('/operativos/stats'),
  create: (data: Partial<Operativo>) =>
    request<{ id: number }>('/operativos', { method: 'POST', body: JSON.stringify(data) }),
};

// Campañas
export const campaniasApi = {
  list: () => request<Campania[]>('/campanias'),
  activas: () => request<Campania[]>('/campanias').then(r => r.filter(c => c.estado === 'activa')),
  activa: () => request<Campania>('/campanias/activa'),
  create: (data: Partial<Campania>) =>
    request<{ id: number }>('/campanias', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Campania>) =>
    request<{ ok: boolean }>(`/campanias/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  uploadImage: (file: File) => {
    const token = getToken();
    const fd = new FormData();
    fd.append('imagen', file);
    return fetch(`${BASE_URL}/campanias/upload-image`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    }).then(async r => {
      if (!r.ok) { const b = await r.json().catch(() => ({})); throw new Error(b.error || `Error ${r.status}`); }
      return r.json() as Promise<{ url: string }>;
    });
  },
};

// Noticias
export const noticiasApi = {
  list: (page = 1, limit = 12, all = false) =>
    request<NoticiasResponse>(`/noticias?page=${page}&limit=${limit}${all ? '&all=true' : ''}`),
  get:    (id: number) => request<Noticia>(`/noticias/${id}`),
  create: (data: Partial<Noticia>) =>
    request<{ id: number }>('/noticias', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Noticia>) =>
    request<{ ok: boolean }>(`/noticias/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  togglePublish: (id: number, publicado: boolean) =>
    request<{ ok: boolean }>(`/noticias/${id}/publicar`, { method: 'PUT', body: JSON.stringify({ publicado }) }),
  delete: (id: number) =>
    request<{ ok: boolean }>(`/noticias/${id}`, { method: 'DELETE' }),
  uploadImage: (file: File) => {
    const token = getToken();
    const fd = new FormData();
    fd.append('imagen', file);
    return fetch(`${BASE_URL}/noticias/upload-image`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    }).then(async r => {
      if (!r.ok) { const b = await r.json().catch(()=>({})); throw new Error(b.error||`Error ${r.status}`); }
      return r.json() as Promise<{ url: string }>;
    });
  },
};

// Voluntarios
export interface PostulacionItem {
  id: number;
  nombre: string;
  email: string;
  telefono: string | null;
  edad: number | null;
  mensaje: string | null;
  revisado: number;
  created_at: string;
}

export const voluntariosApi = {
  list: () => request<Voluntario[]>('/voluntarios'),
  postular: (data: PostulacionData) =>
    request<{ ok: boolean; mensaje: string }>('/voluntarios/postular', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  postulaciones: () => request<PostulacionItem[]>('/voluntarios/postulaciones'),
  revisarPostulacion: (id: number) =>
    request<{ ok: boolean }>(`/voluntarios/postulaciones/${id}/revisar`, { method: 'PATCH' }),
};

// Departamento de Operaciones
export const opsDptoApi = {
  resumen:       () => request<OpsDptoResumen>('/operaciones-dpto/resumen'),
  listOps:       (p?: Record<string,string>) => {
    const qs = p ? '?' + new URLSearchParams(p).toString() : '';
    return request<OpsResponse>(`/operaciones-dpto${qs}`);
  },
  createOp:      (d: Partial<Operacion>) => request<{id:number}>('/operaciones-dpto',{method:'POST',body:JSON.stringify(d)}),
  validarOp:     (id:number,d:{estado:string;puntos_asignados?:number;observacion_validacion?:string}) =>
    request<{ok:boolean}>(`/operaciones-dpto/${id}/validar`,{method:'PUT',body:JSON.stringify(d)}),
  deleteOp:      (id:number) => request<{ok:boolean}>(`/operaciones-dpto/${id}`,{method:'DELETE'}),

  listGuardias:  (p?: Record<string,string>) => {
    const qs = p ? '?' + new URLSearchParams(p).toString() : '';
    return request<Guardia[]>(`/operaciones-dpto/guardias${qs}`);
  },
  createGuardia: (d: Partial<Guardia>) => request<{id:number}>('/operaciones-dpto/guardias',{method:'POST',body:JSON.stringify(d)}),
  deleteGuardia: (id:number) => request<{ok:boolean}>(`/operaciones-dpto/guardias/${id}`,{method:'DELETE'}),

  getPuntos:     (vid:number) => request<PuntosResponse>(`/operaciones-dpto/puntos/${vid}`),
  addPuntos:     (d:{voluntario_id:number;puntos:number;concepto:string}) =>
    request<{ok:boolean}>('/operaciones-dpto/puntos',{method:'POST',body:JSON.stringify(d)}),

  listMeritos:   (vid?:number) => {
    const qs = vid ? `?voluntario_id=${vid}` : '';
    return request<Merito[]>(`/operaciones-dpto/meritos${qs}`);
  },
  createMerito:  (d: Partial<Merito>) => request<{ok:boolean}>('/operaciones-dpto/meritos',{method:'POST',body:JSON.stringify(d)}),
};

// Admin Users
export const adminUsersApi = {
  list: () => request<AdminUser[]>('/admin/users'),
  get:  (id: number) => request<AdminUser>(`/admin/users/${id}`),
  nextMatricula: (codigo: string) =>
    request<{ matricula: string; siguiente: number }>(`/admin/users/next-matricula?codigo=${codigo}`),
  create: (data: Partial<AdminUser> & { password: string }) =>
    request<{ id: number }>('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<AdminUser> & { password?: string }) =>
    request<{ ok: boolean }>(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateGrado: (id: number, grado: string, cargo_directiva: string) =>
    request<{ ok: boolean }>(`/admin/users/${id}/grado`, { method: 'PATCH', body: JSON.stringify({ grado, cargo_directiva }) }),
  recalculatePoints: () =>
    request<{ ok: boolean }>('/admin/users/recalculate-points', { method: 'POST' }),
  delete: (id: number) =>
    request<{ ok: boolean }>(`/admin/users/${id}`, { method: 'DELETE' }),
};

// Contacto
export const contactoApi = {
  send: (data: { nombre: string; correo: string; telefono?: string; tema?: string; mensaje: string }) =>
    request<{ ok: boolean; mensaje: string }>('/contacto', { method: 'POST', body: JSON.stringify(data) }),
  list: () => request<ContactoResponse>('/contacto'),
  markRead: (id: number) => request<{ ok: boolean }>(`/contacto/${id}/leido`, { method: 'PUT' }),
  delete: (id: number) => request<{ ok: boolean }>(`/contacto/${id}`, { method: 'DELETE' }),
};

// Configuración
export const configApi = {
  get: () => request<Record<string, string>>('/config'),
  update: (data: Record<string, string>) =>
    request<{ ok: boolean }>('/config', { method: 'PUT', body: JSON.stringify(data) }),
};

// Suscriptores
export const suscriptoresApi = {
  subscribe: (email: string, fuente = 'noticias') =>
    request<{ ok: boolean; mensaje: string }>('/suscriptores', {
      method: 'POST', body: JSON.stringify({ email, fuente }),
    }),
  list: () => request<SuscriptoresResponse>('/suscriptores'),
  delete: (id: number) => request<{ ok: boolean }>(`/suscriptores/${id}`, { method: 'DELETE' }),
};

// Galería
export const galeriaApi = {
  list: (all = false) => request<GaleriaItem[]>(`/galeria${all ? '?all=true' : ''}`),
  create: (data: { src: string; label: string; category: string }) =>
    request<{ id: number }>('/galeria', { method: 'POST', body: JSON.stringify(data) }),
  upload: (file: File, label: string, category: string) => {
    const token = getToken();
    const fd = new FormData();
    fd.append('imagen', file); fd.append('label', label); fd.append('category', category);
    return fetch(`${BASE_URL}/galeria/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    }).then(async r => {
      if (!r.ok) { const b = await r.json().catch(()=>({})); throw new Error(b.error || `Error ${r.status}`); }
      return r.json() as Promise<{ id: number; src: string }>;
    });
  },
  update: (id: number, data: Partial<GaleriaItem>) =>
    request<{ ok: boolean }>(`/galeria/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) =>
    request<{ ok: boolean }>(`/galeria/${id}`, { method: 'DELETE' }),
};

// Servicios
export const serviciosApi = {
  list: (all = false) => request<Servicio[]>(`/servicios${all ? '?all=true' : ''}`),
  get:  (id: number)  => request<Servicio>(`/servicios/${id}`),
  create: (data: Partial<Servicio>) =>
    request<{ id: number }>('/servicios', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Servicio>) =>
    request<{ ok: boolean }>(`/servicios/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) =>
    request<{ ok: boolean }>(`/servicios/${id}`, { method: 'DELETE' }),
};

// Reconocimientos
export const reconocimientosApi = {
  list: (all = false) => request<Reconocimiento[]>(`/reconocimientos${all ? '?all=true' : ''}`),
  get:  (id: number)  => request<Reconocimiento>(`/reconocimientos/${id}`),
  create: (data: Partial<Reconocimiento>) =>
    request<{ id: number }>('/reconocimientos', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Reconocimiento>) =>
    request<{ ok: boolean }>(`/reconocimientos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) =>
    request<{ ok: boolean }>(`/reconocimientos/${id}`, { method: 'DELETE' }),
  uploadImage: (file: File) => {
    const token = getToken();
    const fd = new FormData();
    fd.append('imagen', file);
    return fetch(`${BASE_URL}/reconocimientos/upload-image`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    }).then(async r => {
      if (!r.ok) { const b = await r.json().catch(() => ({})); throw new Error(b.error || `Error ${r.status}`); }
      return r.json() as Promise<{ url: string }>;
    });
  },
};

// Slider
export const sliderApi = {
  list: (all = false) => request<SliderImage[]>(`/slider${all ? '?all=true' : ''}`),
  upload: (formData: FormData) => {
    const token = getToken();
    return fetch(`${BASE_URL}/slider`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }).then(async r => {
      if (!r.ok) { const b = await r.json().catch(() => ({})); throw new Error(b.error || `Error ${r.status}`); }
      return r.json() as Promise<SliderImage>;
    });
  },
  update: (id: number, data: Partial<SliderImage>) =>
    request<{ ok: boolean }>(`/slider/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  reorder: (items: { id: number; orden: number }[]) =>
    request<{ ok: boolean }>('/slider/reorder/batch', { method: 'PUT', body: JSON.stringify({ items }) }),
  delete: (id: number) =>
    request<{ ok: boolean }>(`/slider/${id}`, { method: 'DELETE' }),
};

// Resumen ejecutivo
export const resumenApi = {
  get: () => request<ResumenData>('/resumen'),
};

// Types
export interface ResumenData {
  voluntarios: {
    total: number;
    por_rol: { role: string; total: number }[];
    por_codigo: { codigo: string; total: number }[];
  };
  operativos: { total: number; anio: number };
  campanias: Campania[];
  contacto: { total: number; no_leidos: number };
  jefes: { nombre: string; apellido_paterno: string; role: string; matricula: string; especialidad: string; telefono: string }[];
  noticias: { total: number; publicadas: number };
  generado_en: string;
}

export interface AdminUser {
  id: number;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  fecha_nacimiento: string | null;
  carnet_identidad: string;
  domicilio: string;
  telefono: string;
  contacto_nombre: string;
  contacto_telefono: string;
  codigo: string;
  matricula: string;
  especialidad: string;
  tipo_sangre: string;
  grado: string;
  cargo_directiva: string;
  email: string;
  role: string;
  activo: number;
  created_at: string;
  total_puntos?: number;
}

export interface ContactoItem {
  id: number;
  nombre: string;
  correo: string;
  telefono: string | null;
  tema: string | null;
  mensaje: string;
  leido: number;
  created_at: string;
}
export interface ContactoResponse {
  data: ContactoItem[];
  total: number;
  no_leidos: number;
}

export interface Suscriptor {
  id: number;
  email: string;
  activo: number;
  fuente: string;
  created_at: string;
}
export interface SuscriptoresResponse {
  data: Suscriptor[];
  total: number;
  activos: number;
}

export interface Operacion {
  id: number;
  tipo: 'local' | 'nacional' | 'internacional';
  clasificacion_ro: string;
  calificacion_tipo: string;
  calificacion_puntos: string;
  titulo: string;
  descripcion: string;
  lugar: string;
  fecha: string;
  duracion_horas: number;
  voluntario_id: number | null;
  voluntario_nombre: string;
  matricula: string;
  oficial_responsable_id: number | null;
  oficial_nombre: string;
  oficial_role: string;
  personal_participante: string; // JSON array de IDs
  imagen_respaldo: string;
  registrado_nombre: string;
  validado_nombre: string;
  estado: 'pendiente' | 'validado' | 'rechazado';
  puntos_asignados: number;
  observacion_validacion: string;
  created_at: string;
}
export interface OpsResponse { data: Operacion[]; total: number; page: number; pages: number; }

export interface Guardia {
  id: number;
  fecha: string;
  turno: 'diurno' | 'nocturno' | '24h';
  voluntario_id: number;
  voluntario_nombre: string;
  matricula: string;
  codigo: string;
  rol_guardia: string;
  novedades: string;
  operativos_count: number;
  registrado_nombre: string;
  created_at: string;
}

export interface PuntosResponse {
  historial: { id:number; puntos:number; concepto:string; asignado_nombre:string; created_at:string }[];
  total: number;
}

export interface Merito {
  id: number;
  voluntario_id: number;
  voluntario_nombre: string;
  matricula: string;
  tipo: 'merito' | 'demerito' | 'antiguedad';
  titulo: string;
  descripcion: string;
  puntos_extra: number;
  fecha: string;
  registrado_nombre: string;
  created_at: string;
}

export interface OpsDptoResumen {
  operaciones: { total:number; validadas:number; pendientes:number };
  guardias: { total:number };
  puntos_totales: number;
  top5_puntos: { id:number; nombre:string; apellido_paterno:string; matricula:string; total_puntos:number }[];
  recientes: Operacion[];
}

export interface GaleriaItem {
  id: number;
  src: string;
  label: string;
  category: string;
  source_type: 'upload' | 'url';
  activo: number;
  orden: number;
  created_at: string;
}

export interface Servicio {
  id: number;
  numero: string;
  titulo: string;
  descripcion: string;
  icono: string;
  capacidades: string[];
  tags: string[];
  activo: number;
  orden: number;
  created_at: string;
}

export interface Reconocimiento {
  id: number;
  badge: string;
  fecha: string;
  institucion: string;
  titulo: string;
  descripcion: string;
  texto_completo: string;
  firmante: string;
  icono: string;
  img_url: string | null;
  activo: number;
  orden: number;
  created_at: string;
}

export interface SliderImage {
  id: number;
  filename: string;
  url: string;
  caption: string;
  tag: string;
  position: string;
  activo: number;
  orden: number;
  created_at: string;
}

export type UserRole =
  | 'admin' | 'presidente' | 'coordinador' | 'fundador'
  | 'voluntario' | 'postulante'
  | 'jefe_operaciones' | 'jefe_personal' | 'jefe_logistica'
  | 'jefe_marketing' | 'jefe_enlaces' | 'jefe_finanzas';

export interface AuthUser {
  id: number;
  nombre: string;
  email: string;
  role: UserRole;
}

export interface Operativo {
  id: number;
  tipo: string;
  descripcion: string;
  fecha: string;
  estado: string;
  unidad: string;
  created_at: string;
}

export interface OperativosResponse {
  data: Operativo[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface Stats {
  operativos_anio: number;
  voluntarios_activos: number;
}

export interface Campania {
  id: number;
  nombre: string;
  descripcion: string;
  meta: number;
  recaudado: number;
  donantes: number;
  estado: string;
  imagen_url: string | null;
  created_at: string;
}

export interface Noticia {
  id: number;
  titulo: string;
  resumen: string;
  contenido: string;
  imagen_url: string | null;
  fecha: string;
  autor: string;
  publicado: number;
  tipo: 'propia' | 'externa';
  fuente_nombre: string;
  fuente_url: string;
  categoria: string;
  created_at: string;
}

export interface NoticiasResponse {
  data: Noticia[];
  total: number;
  page: number;
  pages: number;
}

export interface Voluntario {
  id: number;
  nombre: string;
  cargo: string;
  unidad: string;
  foto_url: string | null;
}

export interface PostulacionData {
  nombre: string;
  email: string;
  telefono?: string;
  edad?: number;
  mensaje?: string;
}

// ── Capacitaciones ────────────────────────────────────────────────

export interface Capacitacion {
  id: number;
  nombre: string;
  descripcion: string;
  tipo: 'interna' | 'externa' | 'certificacion';
  institucion: string;
  instructor: string;
  lugar: string;
  fecha: string;
  horas: number;
  cupo: number;
  estado: 'planificada' | 'activa' | 'cerrada';
  invitacion_abierta: number;
  inscritos: number;
  completados: number;
  created_at: string;
}

export interface CursoExterno {
  id: number;
  voluntario_id: number;
  nombre: string;
  institucion: string;
  tipo: 'curso' | 'certificacion' | 'diplomado' | 'taller' | 'seminario';
  fecha: string;
  horas: number;
  descripcion: string;
  archivo_url: string | null;
  created_at: string;
}

export interface Inscripcion {
  id: number;
  capacitacion_id: number;
  voluntario_id: number;
  nombre_voluntario: string;
  matricula: string;
  codigo: string;
  especialidad: string;
  estado: 'inscrito' | 'completado' | 'ausente';
  notas: string;
  fecha_inscripcion: string;
}

export interface VoluntarioPerfil {
  usuario: {
    id: number; nombre: string; apellido_paterno: string;
    matricula: string; codigo: string; especialidad: string;
    grado: string; cargo_directiva: string; total_puntos: number;
    activo: number; created_at: string;
  };
  stats: { guardias: number; operaciones: number; apoyos: number; puntos: number };
  meritos: { id:number; titulo:string; descripcion:string; puntos_extra:number; fecha:string }[];
  sanciones: { id:number; titulo:string; descripcion:string; puntos_extra:number; fecha:string }[];
  capacitaciones: {
    id:number; capacitacion_id:number; estado:string; notas:string;
    cap_nombre:string; cap_tipo:string; cap_institucion:string; instructor:string; cap_fecha:string; horas:number;
  }[];
  cursos_externos: CursoExterno[];
}

// ── Voluntario Dashboard ─────────────────────────────────────────

export interface VoluntarioDashboardData {
  usuario: {
    id: number; nombre: string; apellido_paterno: string; apellido_materno: string;
    matricula: string; codigo: string; especialidad: string;
    grado: string; cargo_directiva: string; total_puntos: number;
    activo: number; created_at: string; telefono: string; email: string;
  };
  stats: {
    puntos: number; guardias: number; operaciones: number;
    llamadas_atencion: number; caps_inscritas: number;
    faltas: number; permisos: number; finanzas_balance: number;
  };
  guardias_recientes: {
    id: number; fecha: string; turno: string; rol_guardia: string; novedades: string;
  }[];
  llamadas_lista: { id: number; titulo: string; descripcion: string; fecha: string; puntos_extra: number }[];
  meritos_lista:  { id: number; titulo: string; descripcion: string; fecha: string; puntos_extra: number }[];
  caps_abiertas: (Capacitacion & { ya_inscrito: number })[];
  caps_mis: {
    inscripcion_id: number; estado: string; notas: string;
    nombre: string; cap_tipo: string; institucion: string; instructor: string; fecha: string; horas: number;
  }[];
  file_caps: {
    inscripcion_id: number; estado: string; fecha_inscripcion: string;
    nombre: string; cap_tipo: string; institucion: string; instructor: string; fecha: string; horas: number;
  }[];
  cursos_externos: {
    id: number; nombre: string; institucion: string;
    tipo: string; fecha: string; horas: number; descripcion: string; archivo_url: string | null;
  }[];
}

export interface DirectorioVoluntario {
  id: number;
  nombre: string; apellido_paterno: string; apellido_materno: string;
  matricula: string; codigo: string; especialidad: string;
  grado: string; cargo_directiva: string;
  telefono: string; tipo_sangre: string;
  total_puntos: number; activo: number;
  guardias: number; operaciones: number; capacitaciones: number;
}

export interface PerfilPuntos {
  historial: { puntos: number; concepto: string; created_at: string; asignado_nombre: string }[];
  total: number;
}
export interface PerfilOperacion {
  id: number; titulo: string; tipo: string; fecha: string;
  estado: string; puntos_asignados: number; lugar: string; duracion_horas: number;
}
export interface PerfilCapacitacion {
  id: number; estado: string; fecha_inscripcion: string;
  nombre: string; cap_tipo: string; institucion: string; instructor: string; fecha: string; horas: number;
}

export const voluntarioApi = {
  miPerfil:    () => request<VoluntarioDashboardData>('/voluntario/mi-perfil'),
  directorio:  () => request<DirectorioVoluntario[]>('/voluntario/directorio'),
  perfilPuntos:  (id: number) => request<PerfilPuntos>(`/voluntario/perfil/${id}/puntos`),
  perfilOps:     (id: number) => request<PerfilOperacion[]>(`/voluntario/perfil/${id}/operaciones`),
  perfilCaps:    (id: number) => request<PerfilCapacitacion[]>(`/voluntario/perfil/${id}/capacitaciones`),
};

export const capacitacionesApi = {
  list:         ()                  => request<Capacitacion[]>('/capacitaciones'),
  create:       (d: Partial<Capacitacion>) => request<{id:number}>('/capacitaciones', { method:'POST', body:JSON.stringify(d) }),
  update:       (id:number, d: Partial<Capacitacion>) => request<{ok:boolean}>(`/capacitaciones/${id}`, { method:'PUT', body:JSON.stringify(d) }),
  remove:       (id:number)         => request<{ok:boolean}>(`/capacitaciones/${id}`, { method:'DELETE' }),

  getInscripciones: (id:number)     => request<Inscripcion[]>(`/capacitaciones/${id}/inscripciones`),
  addInscripcion:   (id:number, voluntario_id:number, notas?:string) =>
    request<{id:number}>(`/capacitaciones/${id}/inscripciones`, { method:'POST', body:JSON.stringify({ voluntario_id, notas }) }),
  updateInscripcion: (inscId:number, estado:string, notas?:string) =>
    request<{ok:boolean}>(`/capacitaciones/inscripciones/${inscId}`, { method:'PUT', body:JSON.stringify({ estado, notas }) }),
  removeInscripcion: (inscId:number) =>
    request<{ok:boolean}>(`/capacitaciones/inscripciones/${inscId}`, { method:'DELETE' }),
  invitarTodos:      (id:number) => request<{ok:boolean}>(`/capacitaciones/${id}/invitar-todos`,    { method:'POST' }),
  cerrarInvitacion:  (id:number) => request<{ok:boolean}>(`/capacitaciones/${id}/cerrar-invitacion`,{ method:'POST' }),
  getAbiertas:       ()          => request<(Capacitacion & { ya_inscrito: number })[]>('/capacitaciones/abiertas'),
  inscribirse:       (id:number) => request<{ok:boolean}>(`/capacitaciones/${id}/inscribirse`,      { method:'POST' }),
  desinscribirse:    (id:number) => request<{ok:boolean}>(`/capacitaciones/${id}/desinscribirse`,   { method:'DELETE' }),

  getPerfilVoluntario: (id:number)  => request<VoluntarioPerfil>(`/capacitaciones/voluntario/${id}/perfil`),

  getCursosExternos: (volId:number) => request<CursoExterno[]>(`/capacitaciones/voluntario/${volId}/cursos`),
  addCursoExterno: (volId:number, fd:FormData) => {
    const token = localStorage.getItem('ya_token');
    return fetch(`${BASE_URL}/capacitaciones/voluntario/${volId}/cursos`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    }).then(async r => {
      if (!r.ok) { const b = await r.json().catch(()=>({})); throw new Error(b.error||`Error ${r.status}`); }
      return r.json() as Promise<{id:number}>;
    });
  },
  removeCursoExterno: (id:number) => request<{ok:boolean}>(`/capacitaciones/voluntario/cursos/${id}`, { method:'DELETE' }),
};

// ── Milestones (hitos de historia) ───────────────────────────────

export interface Milestone {
  id: number;
  orden: number;
  fecha_label: string;
  titulo: string;
  descripcion: string | null;
  created_at: string;
}

export const milestonesApi = {
  list:   ()                    => request<Milestone[]>('/milestones'),
  create: (data: Omit<Milestone,'id'|'created_at'>) =>
    request<{id:number}>('/milestones', { method:'POST', body: JSON.stringify(data) }),
  update: (id:number, data: Omit<Milestone,'id'|'created_at'>) =>
    request<{ok:boolean}>(`/milestones/${id}`, { method:'PUT',  body: JSON.stringify(data) }),
  remove: (id:number) =>
    request<{ok:boolean}>(`/milestones/${id}`, { method:'DELETE' }),
};
