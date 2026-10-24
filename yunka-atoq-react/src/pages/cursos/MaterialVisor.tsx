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
// Office inicia el visor mediante un POST a PowerPointFrame.aspx dentro del iframe.
// Necesita formularios, sin habilitar descargas, ventanas nuevas ni navegación superior.
const SANDBOX_OFFICE = `${SANDBOX_EXTERNO} allow-forms`;

export default function MaterialVisor({ materialId, onVisto, onCerrar }: { materialId: number; onVisto?: (id: number) => void; onCerrar?: () => void }) {
  const { api } = useCursos();
  const [m, setM] = useState<ContenidoMaterial | null>(null), [error, setError] = useState('');
  const [ampliado, setAmpliado] = useState(() => window.matchMedia('(max-width: 900px)').matches);
  const [modoCine, setModoCine] = useState(false);
  const lector = useRef<HTMLDivElement>(null), ampliadoAnterior = useRef(false);
  const dialogo = useRef<HTMLDialogElement>(null), tituloId = useId();
  const html = useMemo(() => m?.tipo === 'html' ? htmlSoloLectura(m.html || '') : '', [m]);
  useEffect(() => {
    const cambio = () => {
      setModoCine(document.fullscreenElement === lector.current && !!lector.current);
    };
    document.addEventListener('fullscreenchange', cambio);
    return () => document.removeEventListener('fullscreenchange', cambio);
  }, []);
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
    if (document.fullscreenElement === lector.current && document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    setModoCine(false);
    setAmpliado(false);
    if (window.matchMedia('(max-width: 900px)').matches) onCerrar?.();
  };
  const maximizar = async () => {
    ampliadoAnterior.current = ampliado;
    setModoCine(true);
    try {
      if (!lector.current?.requestFullscreen) throw new Error('Fullscreen no disponible');
      // Se amplía el lector que ya existe: la presentación conserva su diapositiva actual.
      await lector.current.requestFullscreen();
    } catch {
      // Safari y navegadores que no ofrecen Fullscreen API usan toda la ventana del aula.
      setAmpliado(true);
    }
  };
  const restaurar = async () => {
    if (document.fullscreenElement === lector.current && document.fullscreenElement) {
      try { await document.exitFullscreen(); } catch { return; }
    } else setAmpliado(ampliadoAnterior.current);
    setModoCine(false);
  };
  const archivo = m?.archivo_path ? urlArchivo(m.archivo_path) : '';
  const contenido = <div ref={lector} className={`${c.materialReader} ${modoCine ? c.modoCine : ''}`} onContextMenu={e => e.preventDefault()}>
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
      {m?.tipo === 'presentacion' && <Presentacion archivo={archivo} titulo={m.titulo} maximizado={modoCine} onMaximizar={() => void maximizar()} onRestaurar={() => void restaurar()} />}
      {m?.tipo === 'enlace' && m.url && <Enlace url={m.url} titulo={m.titulo} />}
    </div>
  </div>;

  return ampliado ? createPortal(<dialog ref={dialogo} className={c.materialDialog} aria-modal="true" aria-label={modoCine ? m?.titulo || 'Presentación' : undefined} aria-labelledby={modoCine ? undefined : tituloId} onCancel={e => { e.preventDefault(); if (modoCine) void restaurar(); else cerrar(); }}>{contenido}</dialog>, document.body) : contenido;
}

function Presentacion({ archivo, titulo, maximizado, onMaximizar, onRestaurar }: { archivo: string; titulo: string; maximizado: boolean; onMaximizar: () => void; onRestaurar: () => void }) {
  const visor = visorOffice(archivo);
  if (!visor) return <p className={s.notice}>La presentación estará disponible para lectura cuando el sitio y la API estén publicados en HTTPS.</p>;
  return <div className={c.officeReader}>
    <div className={c.officeViewport}><iframe title={titulo} src={visor} sandbox={SANDBOX_OFFICE} allow="web-share 'none'" referrerPolicy="no-referrer" /></div>
    <div className={c.presentationControls}>
      <div><strong>{titulo}</strong><span>Toca la diapositiva o usa las flechas para avanzar.</span></div>
      <button className={c.fullscreenButton} onClick={maximizado ? onRestaurar : onMaximizar} aria-label={maximizado ? 'Salir de pantalla completa' : 'Pantalla completa'} title={maximizado ? 'Restaurar presentación' : 'Maximizar presentación'}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">{maximizado ? <path d="M9 3v6H3m12-6v6h6M9 21v-6H3m12 6v-6h6" /> : <path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6" />}</svg>
        <span>{maximizado ? 'Salir' : 'Pantalla completa'}</span>
      </button>
    </div>
  </div>;
}

function Enlace({ url, titulo }: { url: string; titulo: string }) {
  const embebida = urlEmbebida(url);
  if (embebida) return <iframe className={c.marco} title={titulo} src={embebida} sandbox={SANDBOX_EXTERNO} allow="accelerometer; encrypted-media; gyroscope; fullscreen; web-share 'none'" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />;
  return <iframe className={c.marco} title={titulo} src={url} sandbox={SANDBOX_EXTERNO} allow="web-share 'none'" referrerPolicy="no-referrer" />;
}
