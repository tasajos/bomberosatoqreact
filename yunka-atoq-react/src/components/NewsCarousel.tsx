import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './NewsCarousel.module.css';

interface Props { images: string[]; title: string; }

const Arrow = ({ dir }: { dir: 'left' | 'right' }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d={dir === 'left' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
  </svg>
);

export default function NewsCarousel({ images, title }: Props) {
  const [current, setCurrent] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const touchX   = useRef<number | null>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const total = images.length;

  const go   = useCallback((i: number) => setCurrent((i + total) % total), [total]);
  const next = useCallback(() => go(current + 1), [go, current]);
  const prev = useCallback(() => go(current - 1), [go, current]);

  // Mantiene visible la miniatura activa
  useEffect(() => {
    const el = thumbsRef.current?.children[current] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [current]);

  useEffect(() => {
    if (!lightbox) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(false);
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [lightbox, next, prev]);

  if (total === 0) return null;

  const swipe = {
    onTouchStart: (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; },
    onTouchEnd: (e: React.TouchEvent) => {
      if (touchX.current === null) return;
      const dx = e.changedTouches[0].clientX - touchX.current;
      if (Math.abs(dx) > 50) (dx < 0 ? next : prev)();
      touchX.current = null;
    },
  };

  return (
    <div className={styles.carousel}>
      <div className={styles.header}>
        <span className={styles.label}>Galería de fotos</span>
        <span className={styles.count}>{String(current + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
      </div>

      <div className={styles.stage} {...swipe}>
        <div className={styles.track} style={{ transform: `translateX(-${current * 100}%)` }}>
          {images.map((src, i) => (
            <button key={src + i} className={styles.slide} onClick={() => setLightbox(true)}
              tabIndex={i === current ? 0 : -1} aria-label={`Ver foto ${i + 1} en pantalla completa`}>
              {/* Fondo desenfocado con la misma foto para rellenar fotos verticales */}
              <span className={styles.slideBg} style={{ backgroundImage: `url("${src}")` }} />
              <img src={src} alt={`${title} — foto ${i + 1}`} loading={i === 0 ? 'eager' : 'lazy'} />
            </button>
          ))}
        </div>

        {total > 1 && (
          <>
            <button className={`${styles.arrow} ${styles.arrowLeft}`} onClick={prev} aria-label="Foto anterior"><Arrow dir="left" /></button>
            <button className={`${styles.arrow} ${styles.arrowRight}`} onClick={next} aria-label="Foto siguiente"><Arrow dir="right" /></button>
          </>
        )}
        <span className={styles.zoomHint}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
          Ampliar
        </span>
      </div>

      {total > 1 && (
        <div className={styles.thumbs} ref={thumbsRef}>
          {images.map((src, i) => (
            <button key={src + i} className={`${styles.thumb} ${i === current ? styles.thumbActive : ''}`}
              onClick={() => go(i)} aria-label={`Foto ${i + 1}`}>
              <img src={src} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div className={styles.lightbox} onClick={() => setLightbox(false)} {...swipe}>
          <button className={styles.lbClose} aria-label="Cerrar">✕</button>
          <img src={images[current]} alt={`${title} — foto ${current + 1}`} className={styles.lbImg} onClick={e => e.stopPropagation()} />
          {total > 1 && (
            <>
              <button className={`${styles.arrow} ${styles.arrowLeft}`} onClick={e => { e.stopPropagation(); prev(); }} aria-label="Foto anterior"><Arrow dir="left" /></button>
              <button className={`${styles.arrow} ${styles.arrowRight}`} onClick={e => { e.stopPropagation(); next(); }} aria-label="Foto siguiente"><Arrow dir="right" /></button>
            </>
          )}
          <span className={styles.lbCount}>{current + 1} / {total}</span>
        </div>
      )}
    </div>
  );
}
