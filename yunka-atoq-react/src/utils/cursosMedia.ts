// Utilidades para mostrar los materiales de los cursos online.

/** Reproductor embebible para enlaces de YouTube, Vimeo o Google Drive; null si el enlace debe abrirse aparte. */
export function urlEmbebida(enlace: string): string | null {
  let u: URL;
  try { u = new URL(enlace); } catch { return null; }
  const host = u.hostname.replace(/^www\.|^m\./, '');
  const id = (v: string | null | undefined) => (v && /^[\w-]{6,}$/.test(v) ? v : null);
  if (host === 'youtu.be') { const v = id(u.pathname.slice(1)); return v && `https://www.youtube-nocookie.com/embed/${v}`; }
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const [, tipo, valor] = u.pathname.split('/');
    const v = id(tipo === 'watch' || !tipo ? u.searchParams.get('v') : ['embed', 'shorts', 'live'].includes(tipo) ? valor : null);
    return v && `https://www.youtube-nocookie.com/embed/${v}`;
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const v = u.pathname.split('/').find(p => /^\d+$/.test(p));
    return v ? `https://player.vimeo.com/video/${v}` : null;
  }
  if (host === 'drive.google.com') {
    const v = id(u.pathname.match(/\/file\/d\/([^/]+)/)?.[1]);
    return v && `https://drive.google.com/file/d/${v}/preview`;
  }
  return null;
}

/** El visor de Office descarga el archivo desde sus servidores: no puede leer un backend local. */
export function visorOffice(urlArchivo: string): string | null {
  try {
    const { hostname, protocol } = new URL(urlArchivo);
    if (protocol !== 'https:' || ['localhost', '127.0.0.1', '::1'].includes(hostname) || /^(10|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(hostname)) return null;
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(urlArchivo)}`;
  } catch { return null; }
}

export function tamanoArchivo(bytes: number | null | undefined): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(bytes < 100 * 1024 * 1024 ? 1 : 0)} MB`;
}
