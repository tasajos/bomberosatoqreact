// Etiquetas Open Graph / Twitter para compartir en redes sociales.
// Los robots de Facebook, WhatsApp, X, etc. no ejecutan JavaScript, así que
// estas rutas se sirven con el index.html del frontend + las meta de la página.
import fs from 'fs/promises';
import path from 'path';
import pool from '../db.js';

const SITE_NAME = 'Yunka Atoq · Bomberos Voluntarios';
const DEFAULT_IMAGE = '/yunka_atoq_log.png';
const MAX_IMAGES = 5;

const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
  .replace(/</g, '&lt;').replace(/>/g, '&gt;');

function excerpt(text = '', max = 200) {
  const plain = String(text).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return plain.length > max ? `${plain.slice(0, max - 1).trimEnd()}…` : plain;
}

function siteUrl(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const proto = (req.get('x-forwarded-proto') || req.protocol).split(',')[0];
  return `${proto}://${req.get('host')}`;
}

const absolute = (base, url) => (/^https?:\/\//i.test(url) ? url : `${base}${url.startsWith('/') ? '' : '/'}${url}`);

// Genera las meta comunes. images: rutas relativas o absolutas (la primera es la principal)
function buildTags({ title, description, url, images, type = 'website', extra = [] }, base) {
  const imgs = [...new Set(images.filter(Boolean))].slice(0, MAX_IMAGES).map(u => absolute(base, u));
  if (imgs.length === 0) imgs.push(absolute(base, DEFAULT_IMAGE));

  return [
    `<title>${esc(title)} · Yunka Atoq</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:site_name" content="${esc(SITE_NAME)}" />`,
    `<meta property="og:locale" content="es_BO" />`,
    `<meta property="og:type" content="${type}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    ...imgs.flatMap(img => [
      `<meta property="og:image" content="${esc(img)}" />`,
      `<meta property="og:image:alt" content="${esc(title)}" />`,
    ]),
    ...extra,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<meta name="twitter:image" content="${esc(imgs[0])}" />`,
  ].join('\n    ');
}

// Quita las meta genéricas del index.html para no duplicarlas
function stripDefaultMeta(html) {
  return html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/<meta\s+(?:name|property)="(?:description|og:[^"]*|twitter:[^"]*|article:[^"]*)"[^>]*>\s*/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, '');
}

async function sendWithTags(res, frontendDir, tags, fallbackBody) {
  let html;
  try {
    html = stripDefaultMeta(await fs.readFile(path.join(frontendDir, 'index.html'), 'utf8'));
    html = html.replace(/<\/head>/i, `    ${tags}\n  </head>`);
  } catch {
    // Sin build del frontend (p.ej. en desarrollo): página mínima con las meta
    html = `<!doctype html><html lang="es"><head><meta charset="UTF-8" />\n    ${tags}\n  </head><body>${fallbackBody}</body></html>`;
  }
  res.set('Cache-Control', 'public, max-age=300').type('html').send(html);
}

// ── /notas/:id ────────────────────────────────────────────────────
export function noticiaOgHandler(frontendDir) {
  return async (req, res, next) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return next();

    try {
      const [[n]] = await pool.query(
        `SELECT id, titulo, resumen, contenido, imagen_url, fecha, categoria
         FROM noticias WHERE id = ? AND publicado = 1`, [id]
      );
      if (!n) return next(); // no publicada: index.html normal

      const [imgs] = await pool.query(
        'SELECT url FROM noticia_imagenes WHERE noticia_id = ? ORDER BY orden, id', [id]
      ).catch(() => [[]]);
      const base = siteUrl(req);
      const description = excerpt(n.resumen || n.contenido) || 'Noticias de la Compañía de Bomberos Voluntarios Yunka Atoq, Cochabamba.';

      const tags = buildTags({
        title: n.titulo,
        description,
        url: `${base}/notas/${n.id}`,
        images: [n.imagen_url, ...imgs.map(i => i.url)],
        type: 'article',
        extra: [
          `<meta property="article:published_time" content="${new Date(n.fecha).toISOString()}" />`,
          `<meta property="article:section" content="${esc(n.categoria || 'General')}" />`,
        ],
      }, base);

      await sendWithTags(res, frontendDir, tags,
        `<h1>${esc(n.titulo)}</h1><p>${esc(excerpt(n.resumen || n.contenido, 400))}</p>`);
    } catch (err) {
      console.error('[og] noticia', id, err);
      next();
    }
  };
}

// ── Páginas fijas ─────────────────────────────────────────────────
// dynamicImage: consulta opcional para usar una foto actual del contenido
const PAGES = {
  noticias: {
    title: 'Noticias · Lo que pasa en el cuartel',
    description: 'Operativos, convocatorias, capacitaciones y comunicados oficiales de la Compañía de Bomberos Voluntarios Yunka Atoq, Cochabamba.',
    image: '/history/7.jpg',
    dynamicImage: `SELECT imagen_url AS url FROM noticias
                   WHERE publicado = 1 AND imagen_url IS NOT NULL AND imagen_url <> ''
                   ORDER BY destacada DESC, fecha DESC LIMIT 1`,
  },
  donaciones: {
    title: 'Donaciones · Tu donación, nuestra misión',
    description: 'Cada peso boliviano se convierte en equipamiento, formación y servicio para Cochabamba. Apoya a los bomberos voluntarios Yunka Atoq.',
    image: '/history/12.jpg',
    dynamicImage: `SELECT imagen_url AS url FROM campanias
                   WHERE estado = 'activa' AND imagen_url IS NOT NULL AND imagen_url <> ''
                   ORDER BY created_at DESC LIMIT 1`,
  },
  historia: {
    title: 'Nuestra Historia',
    description: 'Un viaje de compromiso, rescate y protección. Conoce la historia de la Compañía de Bomberos Voluntarios Yunka Atoq en Cochabamba.',
    image: '/history/4.jpg',
  },
  servicios: {
    title: 'Servicios · Una sola misión',
    description: 'Cobertura 24/7 en el área metropolitana de Cochabamba, sin costo para la ciudadanía: incendios, rescate, emergencias y prevención.',
    image: '/trabajo/rr3.jpg',
  },
  nosotros: {
    title: 'Nosotros · Bomberos Voluntarios Yunka Atoq',
    description: 'Una compañía de bomberos voluntarios fundada por 7 voluntarios con alto espíritu altruista, al servicio de Cochabamba.',
    image: '/history/atoq.png',
  },
};

export const OG_PAGE_PATHS = Object.keys(PAGES).map(p => `/${p}`);

export function pageOgHandler(frontendDir) {
  return async (req, res, next) => {
    const slug = req.path.replace(/^\/|\/$/g, '');
    const page = PAGES[slug];
    if (!page) return next();

    try {
      let image = page.image;
      if (page.dynamicImage) {
        const [[row]] = await pool.query(page.dynamicImage).catch(() => [[]]);
        if (row?.url) image = row.url;
      }
      const base = siteUrl(req);
      const tags = buildTags({
        title: page.title,
        description: page.description,
        url: `${base}/${slug}`,
        images: [image],
      }, base);

      await sendWithTags(res, frontendDir, tags, `<h1>${esc(page.title)}</h1><p>${esc(page.description)}</p>`);
    } catch (err) {
      console.error('[og] página', slug, err);
      next();
    }
  };
}
