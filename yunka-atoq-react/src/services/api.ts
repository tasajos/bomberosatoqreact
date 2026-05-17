const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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
  activa: () => request<Campania>('/campanias/activa'),
  create: (data: Partial<Campania>) =>
    request<{ id: number }>('/campanias', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Campania>) =>
    request<{ ok: boolean }>(`/campanias/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
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

// Types
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
