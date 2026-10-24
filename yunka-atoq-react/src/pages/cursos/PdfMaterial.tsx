import { useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy, type RenderTask } from 'pdfjs-dist';
import worker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import c from './Cursos.module.css';

GlobalWorkerOptions.workerSrc = worker;

/** Solo muestra las páginas, sin barra nativa de descarga, impresión o compartir. */
export default function PdfMaterial({ archivo, titulo }: { archivo: string; titulo: string }) {
  const [documento, setDocumento] = useState<PDFDocumentProxy | null>(null);
  const [pagina, setPagina] = useState(1), [zoom, setZoom] = useState(1), [ancho, setAncho] = useState(0);
  const [error, setError] = useState(''), [cargando, setCargando] = useState(true);
  const [paginaRenderizada, setPaginaRenderizada] = useState<number | null>(null);
  const contenedor = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const elemento = contenedor.current;
    if (!elemento) return;
    const observer = new ResizeObserver(([entry]) => setAncho(entry.contentRect.width));
    observer.observe(elemento);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let activo = true;
    setDocumento(null); setPagina(1); setError(''); setCargando(true);
    const tarea = getDocument({ url: archivo });
    tarea.promise.then(pdf => { if (activo) setDocumento(pdf); }).catch(() => {
      if (activo) { setError('No se pudo cargar el PDF. Cierra el material y vuelve a abrirlo.'); setCargando(false); }
    });
    return () => { activo = false; void tarea.destroy(); };
  }, [archivo]);
  useEffect(() => {
    if (!documento || !ancho || !canvas.current) return;
    const elemento = canvas.current;
    let activo = true;
    let tarea: RenderTask | undefined;
    setCargando(true); setError('');
    documento.getPage(pagina).then(p => {
      if (!activo) return;
      const original = p.getViewport({ scale: 1 });
      const viewport = p.getViewport({ scale: Math.max(0.1, (ancho - 32) / original.width) * zoom });
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      elemento.width = Math.ceil(viewport.width * ratio); elemento.height = Math.ceil(viewport.height * ratio);
      elemento.style.width = `${viewport.width}px`; elemento.style.height = `${viewport.height}px`;
      tarea = p.render({ canvas: elemento, viewport, transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0] });
      return tarea.promise;
    }).then(() => { if (activo) { setPaginaRenderizada(pagina); setCargando(false); } }).catch(e => {
      if (activo && e.name !== 'RenderingCancelledException') { setError('No se pudo mostrar esta página. Intenta con otra página.'); setCargando(false); }
    });
    return () => { activo = false; tarea?.cancel(); };
  }, [documento, pagina, ancho, zoom]);

  return <div className={c.pdfReader}>
    <div className={c.pdfControls} aria-label="Navegación del PDF">
      <button disabled={!documento || pagina <= 1 || cargando} onClick={() => setPagina(p => p - 1)} aria-label="Página anterior">←</button>
      <span aria-live="polite">Página {pagina} de {documento?.numPages ?? '…'}</span>
      <button disabled={!documento || pagina >= documento.numPages || cargando} onClick={() => setPagina(p => p + 1)} aria-label="Página siguiente">→</button>
      <button disabled={zoom <= 1} onClick={() => setZoom(z => Math.max(1, z - .25))} aria-label="Reducir PDF">−</button>
      <span>{Math.round(zoom * 100)}%</span>
      <button disabled={zoom >= 2} onClick={() => setZoom(z => Math.min(2, z + .25))} aria-label="Ampliar PDF">+</button>
    </div>
    <div ref={contenedor} className={c.pdfViewport} aria-busy={cargando} onContextMenu={e => e.preventDefault()}>
      {cargando && <p role="status" className={c.readerMessage}>Cargando página…</p>}
      {error && <p role="alert" className={c.readerMessage}>{error}</p>}
      <canvas ref={canvas} role="img" aria-label={`${titulo}, página ${paginaRenderizada ?? 'cargando'}`} style={{ visibility: cargando || error ? 'hidden' : 'visible' }} />
    </div>
  </div>;
}
