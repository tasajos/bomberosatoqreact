import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { noticiasApi, type Noticia, API_BASE } from '../services/api';
import styles from './NotePage.module.css';

function resolveImg(url: string | null) {
  if (!url) return null;
  return url.startsWith('/uploads/') ? `${API_BASE}${url}` : url;
}

function fmtDate(s: string) {
  return new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(s));
}

export default function NotePage() {
  const { notaId } = useParams<{ notaId: string }>();
  const [nota, setNota] = useState<Noticia | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (notaId) {
      setLoading(true);
      window.scrollTo(0, 0);
      noticiasApi.get(Number(notaId))
        .then(setNota)
        .catch(() => setNota(null))
        .finally(() => setLoading(false));
    }
  }, [notaId]);

  if (loading) return <div className={styles.status}>Cargando nota...</div>;

  if (!nota) {
    return (
      <div className={styles.status}>
        <h2>Nota no encontrada</h2>
        <Link to="/noticias">Volver a Noticias</Link>
      </div>
    );
  }

  const img = resolveImg(nota.imagen_url);
  const shareFb = () => window.open(
    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`,
    '_blank', 'width=600,height=400'
  );

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        {img && <img src={img} alt="" className={styles.heroImg} onError={e => (e.currentTarget.style.display = 'none')} />}
        <div className={styles.heroOverlay} />
        <div className={styles.heroInner}>
          <div className={styles.breadcrumb}>
            <Link to="/">Inicio</Link><span>/</span><Link to="/noticias">Noticias</Link>
          </div>
          <div className={styles.meta}>
            <span className={styles.cat}>{nota.categoria || 'General'}</span>
            <span className={styles.date}>{fmtDate(nota.fecha)}</span>
          </div>
          <h1 className={styles.title}>{nota.titulo}</h1>
        </div>
      </header>

      <article className={styles.body}>
        {nota.resumen && <p className={styles.lead}>{nota.resumen}</p>}
        {nota.contenido && <div className={styles.description}>{nota.contenido}</div>}

        <div className={styles.actions}>
          {nota.tipo === 'externa' && nota.fuente_url && (
            <a href={nota.fuente_url} target="_blank" rel="noopener noreferrer" className={styles.readMoreLink}>
              Leer la nota original{nota.fuente_nombre ? ` en ${nota.fuente_nombre}` : ''} →
            </a>
          )}
          <button className={styles.btnShare} onClick={shareFb}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
            </svg>
            Compartir
          </button>
          <Link to="/noticias" className={styles.backLink}>← Todas las noticias</Link>
        </div>
      </article>
    </main>
  );
}
