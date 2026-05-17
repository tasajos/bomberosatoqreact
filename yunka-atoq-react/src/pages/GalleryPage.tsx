import { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './GalleryPage.module.css';

type Category = 'Todos' | 'Estructurales' | 'Forestales' | 'Rescate' | 'Comunidad' | 'Entrenamiento';

interface Photo {
  id: string;
  src: string;
  label: string;
  category: Category;
}

const photos: Photo[] = [
  { id: '1',  src: '/history/2.jpg',        label: 'Operativo estructural',    category: 'Estructurales' },
  { id: '2',  src: '/history/4.jpg',         label: 'Incendio forestal Tunari', category: 'Forestales'    },
  { id: '3',  src: '/history/5.jpg',         label: 'Rescate vehicular',        category: 'Rescate'       },
  { id: '4',  src: '/history/6.jpg',         label: 'Capacitación NFPA',        category: 'Entrenamiento' },
  { id: '5',  src: '/history/7.jpg',         label: 'Brigada forestal',         category: 'Forestales'    },
  { id: '6',  src: '/history/8.jpg',         label: 'Intervención comunidad',   category: 'Comunidad'     },
  { id: '7',  src: '/history/9.jpg',         label: 'Operativo estructural',    category: 'Estructurales' },
  { id: '8',  src: '/history/10.jpg',        label: 'Entrenamiento físico',     category: 'Entrenamiento' },
  { id: '9',  src: '/history/12.jpg',        label: 'Incendio forestal',        category: 'Forestales'    },
  { id: '10', src: '/history/13.jpg',        label: 'Rescate alto ángulo',      category: 'Rescate'       },
  { id: '11', src: '/history/15.jpg',        label: 'Jornada comunitaria',      category: 'Comunidad'     },
  { id: '12', src: '/history/16.jpg',        label: 'Simulacro USAR',           category: 'Entrenamiento' },
  { id: '13', src: '/history/18.jpg',        label: 'Ataque ofensivo',          category: 'Estructurales' },
  { id: '14', src: '/trabajo/rr3.jpg',       label: 'Operativo en ruta',        category: 'Rescate'       },
  { id: '15', src: '/trabajo/rrblanco.jpg',  label: 'Guardia nocturna',         category: 'Estructurales' },
  { id: '16', src: '/history/atoq.png',      label: 'Cuartel Yunka Atoq',       category: 'Comunidad'     },
];

const CATEGORIES: Category[] = ['Todos','Estructurales','Forestales','Rescate','Comunidad','Entrenamiento'];

export default function GalleryPage() {
  const [active, setActive] = useState<Category>('Todos');
  const [lightbox, setLightbox] = useState<Photo | null>(null);

  const visible = active === 'Todos' ? photos : photos.filter(p => p.category === active);

  return (
    <main>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.breadcrumb}>
            <Link to="/">Inicio</Link><span>/</span>Galería
          </div>
          <h1 className={styles.heroTitle}>
            Operativos<br />en imágenes.
          </h1>
          <p className={styles.heroDesc}>
            Archivo fotográfico de la compañía. Cada operativo es documentado por nuestro equipo de comunicación con consentimiento expreso de los afectados.
          </p>
        </div>
      </section>

      {/* Filtros */}
      <div className={styles.controls}>
        <div className={styles.controlsInner}>
          <div className={styles.filters}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`${styles.filterBtn} ${active === cat ? styles.filterBtnActive : ''}`}
                onClick={() => setActive(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
          <span className={styles.count}>
            {visible.length} elementos · Archivo 2025-2026
          </span>
        </div>
      </div>

      {/* Galería masonry */}
      <section className={styles.gallery}>
        <div className={styles.galleryInner}>
          {visible.map(photo => (
            <div
              key={photo.id}
              className={styles.photoCard}
              onClick={() => setLightbox(photo)}
            >
              <img
                src={photo.src}
                alt={photo.label}
                loading="lazy"
                onError={e => {
                  (e.target as HTMLImageElement).style.minHeight = '200px';
                }}
              />
              <div className={styles.photoOverlay}>
                <div className={styles.photoMeta}>
                  <span className={styles.photoLabel}>{photo.label}</span>
                  <span className={styles.photoTag}>{photo.category}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Lightbox */}
      {lightbox && (
        <div className={styles.lightbox} onClick={() => setLightbox(null)}>
          <img
            src={lightbox.src}
            alt={lightbox.label}
            className={styles.lightboxImg}
            onClick={e => e.stopPropagation()}
          />
          <button className={styles.lightboxClose} onClick={() => setLightbox(null)}>×</button>
          <span className={styles.lightboxCaption}>{lightbox.label} · {lightbox.category}</span>
        </div>
      )}
    </main>
  );
}
