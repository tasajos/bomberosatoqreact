import { useState, useEffect, useRef } from 'react';
import styles from './TikTokSection.module.css';

const TIKTOK_URL = 'https://www.tiktok.com/@yunkabo';

const videos = [
  { id: '7552695008676039948', thumb: null },
  { id: '7303142904132848901', thumb: null },
  { id: '7419680139195239685', thumb: null },
];

function TikTokCard({ id }: { id: string }) {
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setLoaded(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={styles.card}>
      {loaded ? (
        <iframe
          src={`https://www.tiktok.com/embed/v2/${id}`}
          className={styles.iframe}
          allow="encrypted-media"
          allowFullScreen
          title={`TikTok video ${id}`}
          scrolling="no"
        />
      ) : (
        <div className={styles.placeholder}>
          <div className={styles.placeholderIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="white" opacity="0.9">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.19 8.19 0 004.79 1.53V6.77a4.85 4.85 0 01-1.02-.08z"/>
            </svg>
          </div>
          <div className={styles.placeholderText}>Cargando video...</div>
        </div>
      )}
    </div>
  );
}

function TikTokSection() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.tikIcon}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.19 8.19 0 004.79 1.53V6.77a4.85 4.85 0 01-1.02-.08z"/>
              </svg>
            </span>
            <div>
              <h2 className={styles.title}>Síguenos en TikTok</h2>
              <a href={TIKTOK_URL} target="_blank" rel="noopener noreferrer" className={styles.handle}>
                @yunkabo
              </a>
            </div>
          </div>
          <a href={TIKTOK_URL} target="_blank" rel="noopener noreferrer" className={styles.followBtn}>
            Ver perfil
          </a>
        </div>

        <div className={styles.grid}>
          {videos.map(({ id }) => <TikTokCard key={id} id={id} />)}
        </div>
      </div>
    </section>
  );
}

export default TikTokSection;
