import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import styles from './HeroSection.module.css';
import { campaniasApi, type Campania, API_BASE } from '../services/api';

function formatBs(n: number) {
  return new Intl.NumberFormat('es-BO', { minimumFractionDigits: 0 }).format(n);
}

function resolveImg(url: string | null) {
  if (!url) return null;
  return url.startsWith('/uploads/') ? `${API_BASE}${url}` : url;
}

const FALLBACK: Campania[] = [{
  id: 0, nombre: 'Equipos de respiración autónoma · ERA-2026',
  descripcion: '', meta: 275000, recaudado: 186420,
  donantes: 412, estado: 'activa', imagen_url: null, created_at: '',
}];

export default function HeroSection() {
  const [camps, setCamps]   = useState<Campania[]>(FALLBACK);
  const [idx, setIdx]       = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    campaniasApi.activas()
      .then(data => {
        if (data.length > 0) { setCamps(data); setLoaded(true); }
      })
      .catch(() => {});
  }, []);

  const prev = useCallback(() => setIdx(i => (i - 1 + camps.length) % camps.length), [camps.length]);
  const next = useCallback(() => setIdx(i => (i + 1) % camps.length), [camps.length]);

  // Auto-rotate si hay más de una campaña
  useEffect(() => {
    if (camps.length <= 1) return;
    const id = setInterval(next, 6000);
    return () => clearInterval(id);
  }, [camps.length, next]);

  const campania = camps[idx] ?? FALLBACK[0];
  const pct = Math.min(100, Math.round((campania.recaudado / campania.meta) * 100));
  const imgSrc = resolveImg(campania.imagen_url);

  return (
    <section className={styles.hero}>
      <div className={styles.inner}>
        {/* Left */}
        <div>
          <h1 className={styles.headline}>
            Cuando suena<br />
            la alarma,<br />
            respondemos.<br />
            <span className={styles.headlineAccent}>Cuando tú<br />
            donas,<br />
            existimos.</span>
          </h1>

          <div className={styles.ctas}>
            <Link to="/donaciones" className="btn-primary">Donar ahora</Link>
            <Link to="/voluntarios" className="btn-secondary">Ser voluntario</Link>
          </div>
        </div>

        {/* Campaign card */}
        <div className={styles.card}>
          {/* Imagen de campaña con header superpuesto */}
          {imgSrc ? (
            <div className={styles.cardImageWrap}>
              <img src={imgSrc} alt={campania.nombre} className={styles.cardImage} />
              <div className={styles.cardImageOverlay} />
              <div className={styles.cardHeaderOverImage}>
                <span className={styles.cardLabel}>Campaña activa</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className={styles.cardBadge}>En curso</span>
                  {camps.length > 1 && loaded && (
                    <span className={styles.cardCounter}>{idx + 1}/{camps.length}</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.cardHeader}>
              <span className={styles.cardLabel}>Campaña activa</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className={styles.cardBadge}>En curso</span>
                {camps.length > 1 && loaded && (
                  <span className={styles.cardCounter}>{idx + 1}/{camps.length}</span>
                )}
              </div>
            </div>
          )}

          <h2 className={styles.cardTitle}>{campania.nombre}</h2>

          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${pct}%` }} />
          </div>
          <div className={styles.progressMeta}>
            <span>Bs {formatBs(campania.recaudado)}</span>
            <span>Meta: Bs {formatBs(campania.meta)}</span>
          </div>

          <div className={styles.cardStats}>
            <div className={styles.stat}>
              <div className={styles.statValue}>{pct}%</div>
              <div className={styles.statLabel}>Recaudado</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statValue}>{campania.donantes}</div>
              <div className={styles.statLabel}>Donantes 2026</div>
            </div>
          </div>

          <Link to="/donaciones" className={styles.donateFullBtn}>
            Donar a esta campaña →
          </Link>
          <p className={styles.methods}>Transferencia · QR · Tigo Money · Tarjeta</p>

          {/* Navegación entre campañas */}
          {camps.length > 1 && loaded && (
            <div className={styles.cardNav}>
              <button className={styles.cardNavBtn} onClick={prev} aria-label="Anterior">‹</button>
              <div className={styles.cardDots}>
                {camps.map((_, i) => (
                  <button
                    key={i}
                    className={`${styles.cardDot} ${i === idx ? styles.cardDotActive : ''}`}
                    onClick={() => setIdx(i)}
                  />
                ))}
              </div>
              <button className={styles.cardNavBtn} onClick={next} aria-label="Siguiente">›</button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
