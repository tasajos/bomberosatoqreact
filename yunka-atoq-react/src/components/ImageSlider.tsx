import { useState, useEffect, useCallback } from 'react';
import styles from './ImageSlider.module.css';
import { sliderApi, type SliderImage, API_BASE } from '../services/api';

const FALLBACK = [
  { id: 0, url: '/history/7.jpg',      caption: 'Incendio estructural · Cala Cala',     tag: 'Operativo',    activo: 1, orden: 1 },
  { id: 1, url: '/history/4.jpg',      caption: 'Brigada Tunari · 41 días de combate',  tag: 'Forestal',     activo: 1, orden: 2 },
  { id: 2, url: '/history/9.jpg',      caption: 'Extracción vehicular',                 tag: 'Rescate',      activo: 1, orden: 3 },
  { id: 3, url: '/history/12.jpg',     caption: 'Entrenamiento NFPA 1001',              tag: 'Capacitación', activo: 1, orden: 4 },
  { id: 4, url: '/history/15.jpg',     caption: 'Escuela bomberil · Quillacollo',       tag: 'Comunidad',    activo: 1, orden: 5 },
  { id: 5, url: '/history/18.jpg',     caption: 'Respuesta nocturna · Zona Sur',        tag: 'Operativo',    activo: 1, orden: 6 },
  { id: 6, url: '/trabajo/rr3.jpg',   caption: 'Unidad B-04 en ruta de emergencia',    tag: 'Unidad',       activo: 1, orden: 7 },
  { id: 7, url: '/history/atoq.png',   caption: 'Cuartel Yunka Atoq · Av. Heroínas',   tag: 'Cuartel',      activo: 1, orden: 8 },
] as SliderImage[];

const INTERVAL = 5000;

function resolveUrl(url: string): string {
  if (url.startsWith('/uploads/')) return `${API_BASE}${url}`;
  return url;
}

export default function ImageSlider() {
  const [slides, setSlides] = useState<SliderImage[]>(FALLBACK);
  const [current, setCurrent] = useState(0);
  const [key, setKey] = useState(0);

  useEffect(() => {
    sliderApi.list()
      .then(data => { if (data.length > 0) setSlides(data); })
      .catch(() => {}); // usa fallback si la API no responde
  }, []);

  const next = useCallback(() => {
    setCurrent(c => (c + 1) % slides.length);
    setKey(k => k + 1);
  }, [slides.length]);

  const prev = () => {
    setCurrent(c => (c - 1 + slides.length) % slides.length);
    setKey(k => k + 1);
  };

  useEffect(() => {
    const id = setInterval(next, INTERVAL);
    return () => clearInterval(id);
  }, [next]);

  return (
    <div className={styles.slider}>
      {slides.map((s, i) => (
        <div key={s.id} className={`${styles.slide} ${i === current ? styles.slideActive : ''}`}>
          <img
            src={resolveUrl(s.url)}
            alt={s.caption}
            loading={i === 0 ? 'eager' : 'lazy'}
            style={{ objectPosition: s.position || 'center center' }}
          />
          {i === current && (
            <div className={styles.caption}>
              <span className={styles.captionTag}>{s.tag}</span>
              <span className={styles.captionText}>{s.caption}</span>
            </div>
          )}
        </div>
      ))}

      <button className={styles.arrowPrev} onClick={prev} aria-label="Anterior">‹</button>
      <button className={styles.arrowNext} onClick={next} aria-label="Siguiente">›</button>

      <div className={styles.dots}>
        {slides.map((_, i) => (
          <button key={i}
            className={`${styles.dot} ${i === current ? styles.dotActive : ''}`}
            onClick={() => { setCurrent(i); setKey(k => k + 1); }}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>

      <div key={key} className={styles.progress} />
    </div>
  );
}
