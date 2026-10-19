// Etiquetas Open Graph / Twitter para compartir noticias en redes sociales.
// Los robots de Facebook, WhatsApp, X, etc. no ejecutan JavaScript, así que
// /notas/:id se sirve con el index.html del frontend + las meta de la noticia.
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

function buildTags(n, imagenes, base) {
  const url = `${base}/notas/${n.id}`;
  const description = excerpt(n.resumen || n.contenido) || 'Noticias de la Compañía de Bomberos Voluntarios Yunka Atoq, Cochabamba.';
  const images = [...new Set([n.imagen_url, ...imagenes].filter(Boolean))]
    .slice(0, MAX_IMAGES)
    .map(u => absolute(base, u));
  if (images.length === 0) images.push(absolute(base, DEFAULT_IMAGE));
  const published = new Date(n.fecha).toISOString();

  return [
    `<title>${esc(n.titulo)} · Yunka Atoq</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:site_name" content="${esc(SITE_NAME)}" />`,
    `<meta property="og:locale" content="es_BO" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:title" content="${esc(n.titulo)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    ...images.flatMap(img => [
      `<meta property="og:image" content="${esc(img)}" />`,
      `<meta property="og:image:alt" content="${esc(n.titulo)}" />`,
    ]),
    `<meta property="article:published_time" content="${published}" />`,
    `<meta property="article:section" content="${esc(n.categoria || 'General')}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(n.titulo)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<meta name="twitter:image" content="${esc(images[0])}" />`,
  ].join('\n    ');
}

// Quita las meta genéricas del index.html para no duplicarlas
function stripDefaultMeta(html) {
  return html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/<meta\s+(?:name|property)="(?:description|og:[^"]*|twitter:[^"]*|article:[^"]*)"[^>]*>\s*/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, '');
}

export function noticiaOgHandler(frontendDir) {
  const indexPath = path.join(frontendDir, 'index.html');

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
      const tags = buildTags(n, imgs.map(i => i.url), siteUrl(req));

      let html;
      try {
        html = stripDefaultMeta(await fs.readFile(indexPath, 'utf8'));
        html = html.replace(/<\/head>/i, `    ${tags}\n  </head>`);
      } catch {
        // Sin build del frontend (p.ej. en desarrollo): página mínima con las meta
        html = `<!doctype html><html lang="es"><head><meta charset="UTF-8" />\n    ${tags}\n  </head>` +
               `<body><h1>${esc(n.titulo)}</h1><p>${esc(excerpt(n.resumen || n.contenido, 400))}</p></body></html>`;
      }

      res.set('Cache-Control', 'public, max-age=300').type('html').send(html);
    } catch (err) {
      console.error('[og] noticia', id, err);
      next();
    }
  };
}
