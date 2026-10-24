import { useEffect, useState } from 'react';
import { ETIQUETAS, urlArchivo, type ContenidoMaterial } from '../../services/cursosApi';
import { tamanoArchivo, urlEmbebida, visorOffice } from '../../utils/cursosMedia';
import { useCursos } from './zona';
import s from '../gestion/Gestion.module.css';
import c from './Cursos.module.css';

// El HTML del instructor se ejecuta en un iframe aislado (sin allow-same-origin): sus scripts no
// pueden leer la sesión, el almacenamiento ni la página del sitio.
const SANDBOX_HTML = 'allow-scripts allow-forms allow-modals allow-popups';

export default function MaterialVisor({ materialId, onVisto }: { materialId: number; onVisto?: (id: number) => void }) {
  const { api } = useCursos();
  const [m, setM] = useState<ContenidoMaterial | null>(null), [error, setError] = useState('');
  useEffect(() => {
    let activo = true;
    setM(null); setError('');
    api.contenido(materialId).then(d => { if (activo) { setM(d); onVisto?.(d.id); } }).catch(e => { if (activo) setError(e.message); });
    return () => { activo = false; };
    // onVisto puede cambiar en cada render del padre; solo se recarga al cambiar de material.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, materialId]);

  if (error) return <div role="alert" className={s.error}>{error}</div>;
  if (!m) return <p role="status" className={s.muted}>Cargando material…</p>;
  const archivo = m.archivo_path ? urlArchivo(m.archivo_path) : '';
  const descarga = archivo && <a className={s.secondary} href={archivo} target="_blank" rel="noopener noreferrer">{m.tipo === 'presentacion' ? 'Descargar' : 'Abrir en otra pestaña'}{m.tamano ? ` · ${tamanoArchivo(m.tamano)}` : ''}</a>;

  return <div>
    <div className={c.visorHead}>
      <div><span className={s.badge}>{ETIQUETAS[m.tipo]}</span><h2 style={{ marginTop: 8 }}>{m.titulo}</h2></div>
      {descarga}
    </div>
    {m.tipo === 'html' && <iframe className={c.marco} title={m.titulo} sandbox={SANDBOX_HTML} srcDoc={m.html} referrerPolicy="no-referrer" />}
    {m.tipo === 'pdf' && <iframe className={c.marco} title={m.titulo} src={archivo} />}
    {m.tipo === 'video' && <video className={c.video} src={archivo} controls preload="metadata" playsInline controlsList="nodownload" />}
    {m.tipo === 'presentacion' && <Presentacion archivo={archivo} titulo={m.titulo} />}
    {m.tipo === 'enlace' && m.url && <Enlace url={m.url} titulo={m.titulo} />}
  </div>;
}

function Presentacion({ archivo, titulo }: { archivo: string; titulo: string }) {
  const visor = visorOffice(archivo);
  if (!visor) return <div className={s.notice}>La vista previa de presentaciones usa el visor de Microsoft Office y solo funciona con el sitio publicado en internet (HTTPS). Mientras tanto, descarga el archivo para verlo.</div>;
  return <>
    <iframe className={c.marco} title={titulo} src={visor} allowFullScreen />
    <p className={s.muted}>Si la presentación no carga, usa “Descargar”. El enlace del archivo es temporal.</p>
  </>;
}

function Enlace({ url, titulo }: { url: string; titulo: string }) {
  const embebida = urlEmbebida(url);
  if (embebida) return <iframe className={c.marco} title={titulo} src={embebida} allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />;
  return <div className={c.bienvenida}>
    <p>Este material está en un sitio externo.</p>
    <a className={s.button} href={url} target="_blank" rel="noopener noreferrer">Abrir enlace</a>
    <p className={s.muted} style={{ overflowWrap: 'anywhere' }}>{url}</p>
  </div>;
}
