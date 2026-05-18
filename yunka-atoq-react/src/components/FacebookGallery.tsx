import styles from './FacebookGallery.module.css';

const FB_PAGE   = 'https://www.facebook.com/yunkabo';
const FB_PHOTOS = 'https://www.facebook.com/yunkabo/photos';
const FB_INSTA  = 'https://www.instagram.com/yunkabol/';
const FB_TIKTOK = 'https://www.tiktok.com/@yunkabo';

const albums = [
  { label: 'Incendios forestales · Santa Cruz', url: FB_PHOTOS },
  { label: 'Emergencia Beni · Riberalta',        url: FB_PHOTOS },
  { label: 'Capacitación CPI · S130 · S190',          url: FB_PHOTOS },
  { label: 'Desafío de la Mochila',              url: FB_PHOTOS },
  { label: 'Reconocimiento Asamblea Legislativa',      url: FB_PHOTOS },
  { label: 'Operativos ',            url: FB_PHOTOS },
];

const networks = [
  {
    name: 'Facebook',
    handle: '@yunkabo',
    desc: 'Álbumes, operativos en vivo y noticias institucionales',
    url: FB_PAGE,
    photosUrl: FB_PHOTOS,
    color: '#1877F2',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
        <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
      </svg>
    ),
  },
  {
    name: 'Instagram',
    handle: '@yunkabol',
    desc: 'Fotos y reels de operativos y la vida del cuartel',
    url: FB_INSTA,
    photosUrl: FB_INSTA,
    color: '#E1306C',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/>
        <circle cx="17.5" cy="6.5" r="1" fill="white" stroke="none"/>
      </svg>
    ),
  },
  {
    name: 'TikTok',
    handle: '@yunkabo',
    desc: 'Videos cortos de operativos y entrenamiento',
    url: FB_TIKTOK,
    photosUrl: FB_TIKTOK,
    color: '#010101',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/>
      </svg>
    ),
  },
];

export default function FacebookGallery() {
  return (
    <div className={styles.root}>

      {/* Redes sociales */}
      <div className={styles.networksGrid}>
        {networks.map(n => (
          <div key={n.name} className={styles.networkCard}>
            <div className={styles.networkTop}>
              <div className={styles.networkIcon} style={{ background: n.color }}>
                {n.icon}
              </div>
              <div>
                <div className={styles.networkName}>{n.name}</div>
                <div className={styles.networkHandle}>{n.handle}</div>
              </div>
            </div>
            <p className={styles.networkDesc}>{n.desc}</p>
            <div className={styles.networkActions}>
              <a href={n.url} target="_blank" rel="noreferrer"
                className={styles.networkBtn} style={{ background: n.color }}>
                Ir a {n.name} →
              </a>
              {n.photosUrl !== n.url && (
                <a href={n.photosUrl} target="_blank" rel="noreferrer" className={styles.networkBtnOutline}>
                  Ver fotos
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Álbumes destacados de Facebook */}
      <div className={styles.albumsCard}>
        <div className={styles.albumsHeader}>
          <div className={styles.albumsTitle}>
            <div className={styles.fbDot} />
            Álbumes destacados en Facebook
          </div>
          <a href={FB_PHOTOS} target="_blank" rel="noreferrer" className={styles.albumsAll}>
            Ver todos →
          </a>
        </div>
        <div className={styles.albumsGrid}>
          {albums.map(a => (
            <a key={a.label} href={a.url} target="_blank" rel="noreferrer" className={styles.albumItem}>
              <div className={styles.albumIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </div>
              <span>{a.label}</span>
              <svg className={styles.albumArrow} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
              </svg>
            </a>
          ))}
        </div>
      </div>

      {/* Nota informativa */}
      <div className={styles.note}>
        <span>💡</span>
        <p>
          Facebook no permite mostrar su contenido directamente en otros sitios web.
          Usa los botones de arriba para ver las fotos y publicaciones en cada red social.
          También puedes agregar imágenes directamente a esta galería desde el panel de administración.
        </p>
      </div>

    </div>
  );
}
