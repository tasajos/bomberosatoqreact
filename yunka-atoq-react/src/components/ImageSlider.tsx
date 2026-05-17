import { useState, useEffect, useCallback } from 'react';
import styles from './ImageSlider.module.css';

const slides = [
  { src: '/history/7.jpg',        tag: 'Operativo',     caption: 'Incendio estructural · Cala Cala' },
  { src: '/history/4.jpg',        tag: 'Forestal',      caption: 'Brigada Tunari · 41 días de combate' },
  { src: '/history/9.jpg',        tag: 'Rescate',       caption: 'Extracción vehicular · Blanco Galindo' },
  { src: '/history/12.jpg',       tag: 'Capacitación',  caption: 'Entrenamiento NFPA 1001 · Cuartel central' },
  { src: '/history/15.jpg',       tag: 'Comunidad',     caption: 'Escuela bomberil · Quillacollo' },
  { src: '/history/18.jpg',       tag: 'Operativo',     caption: 'Respuesta nocturna · Zona Sur' },
  { src: '/trabajo/rr3.jpg',      tag: 'Unidad',        caption: 'Unidad B-04 en ruta de emergencia' },
  { src: '/history/atoq.png',     tag: 'Cuartel',       caption: 'Cuartel Yunka Atoq · Av. Heroínas 1456' },
];

const INTERVAL = 5000;

export default function ImageSlider() {
  const [current, setCurrent] = useState(0);
  const [key, setKey] = useState(0);

  const next = useCallback(() => {
    setCurrent(c => (c + 1) % slides.length);
    setKey(k => k + 1);
  }, []);

  const prev = () => {
    setCurrent(c => (c - 1 + slides.length) % slides.length);
    setKey(k => k + 1);
  };

  const goTo = (i: number) => {
    setCurrent(i);
    setKey(k => k + 1);
  };

  useEffect(() => {
    const id = setInterval(next, INTERVAL);
    return () => clearInterval(id);
  }, [next]);

  return (
    <div className={styles.slider}>
      {slides.map(({ src, tag, caption }, i) => (
        <div
          key={i}
          className={`${styles.slide} ${i === current ? styles.slideActive : ''}`}
        >
          <img
            src={src}
            alt={caption}
            loading={i === 0 ? 'eager' : 'lazy'}
          />
          {i === current && (
            <div className={styles.caption}>
              <span className={styles.captionTag}>{tag}</span>
              <span className={styles.captionText}>{caption}</span>
            </div>
          )}
        </div>
      ))}

      {/* Arrows */}
      <button className={styles.arrowPrev} onClick={prev} aria-label="Anterior">‹</button>
      <button className={styles.arrowNext} onClick={next} aria-label="Siguiente">›</button>

      {/* Dots */}
      <div className={styles.dots}>
        {slides.map((_, i) => (
          <button
            key={i}
            className={`${styles.dot} ${i === current ? styles.dotActive : ''}`}
            onClick={() => goTo(i)}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Progress bar */}
      <div key={key} className={styles.progress} />
    </div>
  );
}
