import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { milestonesApi, type Milestone } from '../services/api';
import styles from './HistorySection.module.css';

const PAGE_SIZE = 5;

export default function HistorySection() {
  const [items, setItems]   = useState<Milestone[]>([]);
  const [page, setPage]     = useState(0);

  useEffect(() => {
    milestonesApi.list().then(setItems).catch(() => {});
  }, []);

  const totalPages = Math.ceil(items.length / PAGE_SIZE);
  const visible    = items.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <div className="section-tag section-tag--light">01 — Identidad</div>
          <h2 className={styles.title}>
            El zorro<br />del valle
          </h2>
          <p className={styles.body}>
            Vigilante, rápido y comprometido con su territorio. Desde 2023 respondemos a emergencias en Cochabamba y Bolivia con voluntad, formación y equipamiento propio.
          </p>
          <Link to="/nosotros" className="btn-secondary btn-secondary--light">
            Conocer nuestra historia →
          </Link>
        </div>

        <div>
          <div className={styles.timeline}>
            {visible.map((m, i) => (
              <div key={m.id} className={styles.timelineItem}>
                <span className={styles.timelineNum}>
                  {String(page * PAGE_SIZE + i + 1).padStart(2, '0')}
                </span>
                <div className={styles.timelineContent}>
                  <div className={styles.timelineYear}>{m.fecha_label}</div>
                  <p className={styles.timelineText}>{m.descripcion}</p>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className={styles.paginator}>
              <button className={styles.pageBtn} onClick={() => setPage(p => p - 1)}
                disabled={page === 0} aria-label="Anterior">←</button>

              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i}
                  className={`${styles.pageNum} ${i === page ? styles.pageNumActive : ''}`}
                  onClick={() => setPage(i)}>
                  {i + 1}
                </button>
              ))}

              <button className={styles.pageBtn} onClick={() => setPage(p => p + 1)}
                disabled={page === totalPages - 1} aria-label="Siguiente">→</button>

              <span className={styles.pageInfo}>
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, items.length)} de {items.length}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
