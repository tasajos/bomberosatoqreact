import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { milestonesApi, type Milestone } from '../services/api';
import styles from './AboutPage.module.css';

const PAGE_SIZE = 6;

const principles = [
  {
    num: '01',
    title: 'Respondemos, sin excusas',
    desc: 'Cuando suena la alarma no preguntamos el barrio ni el apellido. Llegamos. Eso es todo.',
  },
  {
    num: '02',
    title: 'Vocación, no contrato',
    desc: 'Ninguno de nuestros bomberos cobra por entrar a un siniestro. El servicio es la recompensa y el compromiso es de por vida.',
  },
  {
    num: '03',
    title: 'Preparación constante',
    desc: 'Entrenamos cada semana porque la emergencia no avisa. Nuestros voluntarios se capacitan en rescate, primeros auxilios e incendio forestal.',
  },
  {
    num: '04',
    title: 'Cochabamba es nuestra familia',
    desc: 'Antes de apagar incendios, prevenimos. Trabajamos con colegios, juntas de vecinos y empresas para que la comunidad sepa qué hacer cuando el peligro llega.',
  },
];



function MilestonesTimeline() {
  const [items, setItems] = useState<Milestone[]>([]);
  const [page, setPage]   = useState(0);

  useEffect(() => {
    milestonesApi.list().then(setItems).catch(() => {});
  }, []);

  const totalPages = Math.ceil(items.length / PAGE_SIZE);
  const visible    = items.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  if (!items.length) return null;

  return (
    <>
      <div className={styles.timelineTrack}>
        {visible.map((m, i) => (
          <div key={m.id} className={styles.timelineItem}>
            <div className={styles.timelineYear}>
              <span className={styles.timelineYearText}>{page * PAGE_SIZE + i + 1 < 10 ? `0${page * PAGE_SIZE + i + 1}` : page * PAGE_SIZE + i + 1}</span>
            </div>
            <div className={styles.timelineEvent}>{m.fecha_label}</div>
            <p className={styles.timelineDesc}>{m.descripcion}</p>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className={styles.timelinePaginator}>
          <button onClick={() => setPage(p => p - 1)} disabled={page === 0}
            className={styles.timelinePageBtn}>←</button>

          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} onClick={() => setPage(i)}
              className={`${styles.timelinePageBtn} ${i === page ? styles.timelinePageBtnActive : ''}`}>
              {i + 1}
            </button>
          ))}

          <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages - 1}
            className={styles.timelinePageBtn}>→</button>

          <span className={styles.timelinePageInfo}>
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, items.length)} de {items.length}
          </span>
        </div>
      )}
    </>
  );
}

export default function AboutPage() {
  return (
    <main>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.breadcrumb}>
            <Link to="/">Inicio</Link>
            <span>/</span>
            Nosotros
          </div>
          <h1 className={styles.heroTitle}>
            3 años de servicio.
          </h1>
          <p className={styles.heroDesc}>
            Una compañía de bomberos voluntarios fundada por 7 voluntarios con alto espíritu altruista.
          </p>
        </div>
      </section>

      {/* Manifiesto */}
      <section className={styles.manifesto}>
        <div className={styles.manifestoInner}>
          <div className={styles.manifestoLeft}>
            <div className="section-tag">Manifiesto</div>
            <h2 className={styles.manifestoTitle}>
              Lo que creemos.<br />Lo que defendemos.<br />Lo que no negociamos.
            </h2>
            <p className={styles.manifestoSub}>
              Cuatro principios que guían cada guardia, cada operativo y cada decisión desde 2008.
            </p>
          </div>

          <div className={styles.principles}>
            {principles.map(({ num, title, desc }) => (
              <div key={num} className={styles.principle}>
                <span className={styles.principleNum}>{num}</span>
                <div className={styles.principleBody}>
                  <div className={styles.principleTitle}>{title}</div>
                  <p className={styles.principleDesc}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Línea de tiempo — datos desde el administrador */}
      <section className={styles.timeline}>
        <div className={styles.timelineInner}>
          <div className="section-tag">Línea de tiempo</div>
          <h2 className={styles.timelineTitle}>
            Nuestra historia,<br />hito a hito.
          </h2>
          <MilestonesTimeline />
        </div>
      </section>

    </main>
  );
}
