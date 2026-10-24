import { lazy, Suspense, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ETIQUETAS, urlArchivo, type ContenidoMaterial } from '../../services/cursosApi';
import { urlEmbebida, visorOffice } from '../../utils/cursosMedia';
import { htmlSoloLectura } from '../../utils/materialHtml';
import { useCursos } from './zona';
import s from '../gestion/Gestion.module.css';
import c from './Cursos.module.css';

const PdfMaterial = lazy(() => import('./PdfMaterial'));
// Sin permisos de descarga, ventanas emergentes ni navegación de la página principal.
const SANDBOX_HTML = 'allow-scripts';
const SANDBOX_EXTERNO = 'allow-scripts allow-same-origin';

export default function MaterialVisor({ materialId, onVisto, onCerrar }: { materialId: number; onVisto?: (id: number) => void; onCerrar?: () => void }) {
  const { api } = useCursos();
  const [m, setM] = useState<ContenidoMaterial | null>(null), [error, setError] = useState('');
  const [ampliado, setAmpliado] = useState(() => window.matchMedia('(max-width: 900px)').matches);
  const dialogo = useRef<HTMLDialogElement>(null), tituloId = useId();
  const html = useMemo(() => m?.tipo === 'html' ? htmlSoloLectura(m.html || '') : '', [m]);
  useEffect(() => {
    let activo = true;
    setM(null); setError('');
    api.contenido(materialId).then(d => { if (activo) { setM(d); onVisto?.(d.id); } }).catch(e => { if (activo) setError(e.message); });
    return () => { activo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, materialId]);
  useEffect(() => {
    if (!ampliado) return;
    const elemento = dialogo.current;
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    elemento?.showModal(); document.body.style.overflow = 'hidden';
    return () => { elemento?.close(); document.body.style.overflow = overflow; anterior?.focus(); };
  }, [ampliado]);

  const cerrar = () => {
    setAmpliado(false);
    if (window.matchMedia('(max-width: 900px)').matches) onCerrar?.();
  };
  const archivo = m?.archivo_path ? urlArchivo(m.archivo_path) : '';
  const contenido = <div className={c.materialReader} onContextMenu={e => e.preventDefault()}>
    <header className={c.readerHead}>
      <img src="/yunka_atoq_log.png" alt="Yunka Atoq" />
      <div><small>{m ? ETIQUETAS[m.tipo] : 'MATERIAL DEL CURSO'}</small><h2 id={tituloId}>{m?.titulo || 'Cargando material…'}</h2></div>
      <button className={c.readerButton} onClick={ampliado ? cerrar : () => setAmpliado(true)} autoFocus={ampliado}>{ampliado ? '← Volver al curso' : '⛶ Ampliar'}</button>
    </header>
    <div className={c.readerContent}>
      {error && <div role="alert" className={s.error}>{error}</div>}
      {!m && !error && <p role="status" className={c.readerMessage}>Cargando material…</p>}
      {m?.tipo === 'html' && <iframe className={c.marco} title={m.titulo} sandbox={SANDBOX_HTML} srcDoc={html} allow="web-share 'none'" referrerPolicy="no-referrer" />}
      {m?.tipo === 'pdf' && <Suspense fallback={<p role="status" className={c.readerMessage}>Preparando PDF…</p>}><PdfMaterial archivo={archivo} titulo={m.titulo} /></Suspense>}
      {m?.tipo === 'video' && <video className={c.video} src={archivo} controls preload="metadata" playsInline controlsList="nodownload noremoteplayback" disablePictureInPicture disableRemotePlayback />}
      {m?.tipo === 'presentacion' && <Presentacion archivo={archivo} titulo={m.titulo} />}
      {m?.tipo === 'enlace' && m.url && <Enlace url={m.url} titulo={m.titulo} />}
    </div>
  </div>;

  return ampliado ? createPortal(<dialog ref={dialogo} className={c.materialDialog} aria-modal="true" aria-labelledby={tituloId} onCancel={e => { e.preventDefault(); cerrar(); }}>{contenido}</dialog>, document.body) : contenido;
}

function Presentacion({ archivo, titulo }: { archivo: string; titulo: string }) {
  const visor = visorOffice(archivo);
  if (!visor) return <p className={s.notice}>La presentación estará disponible para lectura cuando el sitio y la API estén publicados en HTTPS.</p>;
  return <div className={c.officeReader}>
    <div className={c.officeViewport}><iframe title={titulo} src={visor} sandbox={SANDBOX_EXTERNO} allow="web-share 'none'" referrerPolicy="no-referrer" /></div>
    <p>Para avanzar, toca la diapositiva o utiliza las flechas del teclado.</p>
  </div>;
}

function Enlace({ url, titulo }: { url: string; titulo: string }) {
  const embebida = urlEmbebida(url);
  if (embebida) return <iframe className={c.marco} title={titulo} src={embebida} sandbox={SANDBOX_EXTERNO} allow="accelerometer; encrypted-media; gyroscope; fullscreen; web-share 'none'" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />;
  return <iframe className={c.marco} title={titulo} src={url} sandbox={SANDBOX_EXTERNO} allow="web-share 'none'" referrerPolicy="no-referrer" />;
}
