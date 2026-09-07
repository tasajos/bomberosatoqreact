import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RankBadgeSVG } from './rankBadge';

const ASPECTO = 80 / 56; // alto/ancho del viewBox de RankBadgeSVG
const cache = new Map<string, string>();

// Renderiza la insignia de grado (RankBadgeSVG) a un PNG en base64, para poder
// incrustarla en un PDF (jsPDF no soporta SVG directamente).
export async function gradoBadgePNG(grado: string, anchoPx = 240): Promise<string> {
  const key = `${grado}|${anchoPx}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const svgMarkup = renderToStaticMarkup(createElement(RankBadgeSVG, { grado, size: anchoPx }));
  const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('No se pudo renderizar la insignia'));
      img.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = anchoPx;
    canvas.height = Math.round(anchoPx * ASPECTO);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/png');
    cache.set(key, dataUrl);
    return dataUrl;
  } finally {
    URL.revokeObjectURL(url);
  }
}
