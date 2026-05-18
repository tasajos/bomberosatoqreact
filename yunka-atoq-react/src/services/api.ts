const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const API_BASE = BASE_URL.replace('/api', '');

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
  list: (page = 1, limit = 10) =>
    request<NoticiasResponse>(`/noticias?page=${page}&limit=${limit}`),
  get: (id: number) => request<Noticia>(`/noticias/${id}`),
};

// Voluntarios
export const voluntariosApi = {
  list: () => request<Voluntario[]>('/voluntarios'),
  postular: (data: PostulacionData) =>
    request<{ ok: boolean; mensaje: string }>('/voluntarios/postular', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
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

// Types
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

export interface AuthUser {
  id: number;
  nombre: string;
  email: string;
  role: 'admin' | 'voluntario';
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
