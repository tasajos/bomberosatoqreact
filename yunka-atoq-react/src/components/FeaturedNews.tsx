import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './FeaturedNews.module.css';
import { noticiasApi, type Noticia, API_BASE } from '../services/api';

const LATEST_SIZE = 4;
const FALLBACK_IMG = '/history/7.jpg';

function resolveImg(url: string | null) {
  if (!url) return FALLBACK_IMG;
  return url.startsWith('/uploads/') ? `${API_BASE}${url}` : url;
}

function fmtDate(s: string) {
  return new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(s));
}

const onImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  if (!e.currentTarget.src.endsWith(FALLBACK_IMG)) e.currentTarget.src = FALLBACK_IMG;
};

export default function FeaturedNews() {
  const [featured, setFeatured] = useState<Noticia[]>([]);
  const [latest, setLatest]     = useState<Noticia[]>([]);

  useEffect(() => {
    Promise.all([noticiasApi.destacadas(), noticiasApi.list(1, LATEST_SIZE + 3)])
      .then(([dest, recientes]) => {
        const ids = new Set(dest.map(n => n.id));
        setFeatured(dest);
        setLatest(recientes.data.filter(n => !ids.has(n.id)).slice(0, LATEST_SIZE));
      })
      .catch(() => {});
  }, []);

  if (featured.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <div className="section-tag">Noticias destacadas</div>
          <Link to="/noticias" className={styles.allLink}>Ver todas →</Link>
        </div>

        {/* ── Destacadas: una casilla por noticia en el espacio preferencial ── */}
        <div className={`${styles.featured} ${styles[`featured${featured.length}`]}`}>
          {featured.map((n, i) => (
            <Link key={n.id} to={`/notas/${n.id}`}
              className={`${styles.feat} ${i === 0 ? styles.featMain : ''}`}>
              <img src={resolveImg(n.imagen_url)} alt="" onError={onImgError} />
              <div className={styles.featOverlay} />
              <span className={styles.featBadge}>★ Destacada</span>
              <div className={styles.featBody}>
                <div className={styles.featMeta}>
                  <span className={styles.featCat}>{n.categoria || 'General'}</span>
                  <span>{fmtDate(n.fecha)}</span>
                </div>
                <h2 className={styles.featTitle}>{n.titulo}</h2>
                {n.resumen && <p className={styles.featExcerpt}>{n.resumen}</p>}
                <span className={styles.featCta}>Leer noticia →</span>
              </div>
            </Link>
          ))}
        </div>

        {/* ── Demás noticias ── */}
        {latest.length > 0 && (
          <>
            <div className={styles.subHeader}>Últimas noticias</div>
            <div className={styles.grid}>
              {latest.map(n => (
                <Link key={n.id} to={`/notas/${n.id}`} className={styles.card}>
                  <div className={styles.cardMedia}>
                    <img src={resolveImg(n.imagen_url)} alt="" onError={onImgError} loading="lazy" />
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.kicker}>
                      {n.categoria || 'General'} <span className={styles.kickerDate}>· {fmtDate(n.fecha)}</span>
                    </div>
                    <h3 className={styles.cardTitle}>{n.titulo}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
