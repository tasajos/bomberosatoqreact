import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import styles from './GalleryPage.module.css';
import { galeriaApi, type GaleriaItem, API_BASE } from '../services/api';
import FacebookGallery from '../components/FacebookGallery';

type Category = string;
const FB_CAT = 'Facebook';

function resolveUrl(src: string) {
  return src.startsWith('/uploads/') ? `${API_BASE}${src}` : src;
}

export default function GalleryPage() {
  const [photos, setPhotos]     = useState<GaleriaItem[]>([]);
  const [active, setActive]     = useState<Category>('Todos');
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    galeriaApi.list()
      .then(setPhotos)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const categories = ['Todos', ...Array.from(new Set(photos.map(p => p.category))), FB_CAT];
  const visible    = active === 'Todos' ? photos : photos.filter(p => p.category === active);

  const closeLb = useCallback(() => setLightbox(null), []);
  const prevLb  = useCallback(() => setLightbox(i => i !== null ? (i - 1 + visible.length) % visible.length : null), [visible.length]);
  const nextLb  = useCallback(() => setLightbox(i => i !== null ? (i + 1) % visible.length : null), [visible.length]);

  useEffect(() => {
    if (lightbox === null) return;
    document.body.style.overflow = 'hidden';
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape')     closeLb();
      if (e.key === 'ArrowLeft')  prevLb();
      if (e.key === 'ArrowRight') nextLb();
    };
    window.addEventListener('keydown', h);
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [lightbox, closeLb, prevLb, nextLb]);

  const currentPhoto = lightbox !== null ? visible[lightbox] : null;
  const isFacebook   = active === FB_CAT;

  return (
    <main>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.breadcrumb}>
            <Link to="/">Inicio</Link><span>/</span>Galería
          </div>
          <h1 className={styles.heroTitle}>Operativos<br />en imágenes.</h1>
          <p className={styles.heroDesc}>
            Archivo fotográfico de la compañía. Cada operativo es documentado con consentimiento expreso de los afectados.
          </p>
        </div>
      </section>

      {/* Filtros */}
      <div className={styles.controls}>
        <div className={styles.controlsInner}>
          <div className={styles.filters}>
            {categories.map(cat => (
              <button
                key={cat}
                className={`${styles.filterBtn} ${active === cat ? styles.filterBtnActive : ''} ${cat === FB_CAT ? styles.filterBtnFb : ''}`}
                onClick={() => { setActive(cat); setLightbox(null); }}
              >
                {cat === FB_CAT ? '📘 Facebook' : cat}
              </button>
            ))}
          </div>
          {!isFacebook && (
            <span className={styles.count}>{visible.length} imágenes</span>
          )}
        </div>
      </div>

      {/* Facebook embed */}
      {isFacebook && (
        <section className={styles.gallery} style={{ paddingTop: '1.5rem' }}>
          <FacebookGallery />
        </section>
      )}

      {/* Masonry normal */}
      {!isFacebook && (
        <section className={styles.gallery}>
          <div className={styles.galleryInner}>
            {loading && <p style={{ padding:'2rem', color:'var(--color-gray)' }}>Cargando galería…</p>}
            {visible.map((photo, i) => (
              <div key={photo.id} className={styles.photoCard} onClick={() => setLightbox(i)}>
                <img
                  src={resolveUrl(photo.src)}
                  alt={photo.label}
                  loading="lazy"
                  onError={e => { (e.target as HTMLImageElement).src = '/yunka_atoq_log.png'; }}
                />
                <span className={styles.zoomIcon}>⤢</span>
                <div className={styles.photoMeta}>
                  <span className={styles.photoLabel}>{photo.label}</span>
                  <span className={styles.photoCat}>{photo.category}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Lightbox */}
      {currentPhoto && (
        <div className={styles.lightbox} onClick={closeLb}>
          <button className={styles.lbClose} onClick={closeLb}>✕</button>
          {visible.length > 1 && (
            <>
              <button className={styles.lbPrev} onClick={e => { e.stopPropagation(); prevLb(); }}>‹</button>
              <button className={styles.lbNext} onClick={e => { e.stopPropagation(); nextLb(); }}>›</button>
            </>
          )}
          <img key={currentPhoto.id} src={resolveUrl(currentPhoto.src)} alt={currentPhoto.label}
            className={styles.lbImg} onClick={e => e.stopPropagation()} />
          <div className={styles.lbFooter}>
            <div className={styles.lbMeta}>
              <span className={styles.lbLabel}>{currentPhoto.label}</span>
              <span className={styles.lbCat}>{currentPhoto.category}</span>
            </div>
            <span className={styles.lbCounter}>{(lightbox ?? 0) + 1} / {visible.length}</span>
          </div>
        </div>
      )}
    </main>
  );
}
