import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { milestonesApi, type Milestone } from '../services/api';
import { groupMilestones } from '../utils/milestones';
import styles from './AboutPage.module.css';

const principles = [
  { num: '01', title: 'Respondemos, sin excusas', desc: 'Cuando suena la alarma no preguntamos el barrio ni el apellido. Llegamos. Estamos para ayudar.' },
  { num: '02', title: 'Vocación de servicio', desc: 'Somos bomberos voluntarios. Nos une la voluntad de proteger la vida y acompañar a quienes más nos necesitan.' },
  { num: '03', title: 'Preparación constante', desc: 'Nos capacitamos en rescate, primeros auxilios e incendios forestales. Cada aprendizaje nos prepara para la próxima emergencia.' },
  { num: '04', title: 'Una comunidad que cuidamos', desc: 'El servicio comienza con la prevención. Trabajamos junto a la comunidad para cuidar a las personas y nuestro entorno.' },
];

function MilestonesTimeline() {
  const [items, setItems] = useState<Milestone[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    milestonesApi.list().then(data => {
      if (active) { setItems(data); setStatus('ready'); }
    }).catch(() => {
      if (active) setStatus('error');
    });
    return () => { active = false; };
  }, [attempt]);

  if (status === 'loading') return <p className={styles.timelineNotice} role="status">Cargando nuestra historia…</p>;
  if (status === 'error') return (
    <div className={styles.timelineNotice} role="status">
      <p>No pudimos cargar los hitos de nuestra historia.</p>
      <button className={styles.retryButton} onClick={() => { setStatus('loading'); setAttempt(n => n + 1); }}>Volver a intentar <span aria-hidden="true">↻</span></button>
    </div>
  );
  if (!items.length) return <p className={styles.timelineNotice}>Pronto compartiremos aquí los hitos de nuestra historia.</p>;

  const groups = groupMilestones(items);
  const newestId = groups.find(group => group.year !== 'Sin fecha')?.items[0]?.id;

  return (
    <ol className={styles.timelineTrack} aria-label="Hitos del más reciente al más antiguo">
      {groups.map(({ year, items: milestones }) => (
        <li key={year} className={styles.yearGroup}>
          <div className={styles.yearMarker}>
            <h3>{year}</h3>
            <span>{milestones.length} {milestones.length === 1 ? 'hito' : 'hitos'}</span>
          </div>
          <ol className={styles.milestoneGrid} aria-label={`Hitos ${year}`}>
            {milestones.map(m => (
              <li key={m.id} className={`${styles.milestoneCard} ${m.id === newestId ? styles.latestCard : ''}`}>
                <article>
                  <div className={styles.cardMeta}>
                    <span className={styles.milestoneDate}>{m.fecha_label}</span>
                    {m.id === newestId && <span className={styles.latestBadge}>Más reciente</span>}
                  </div>
                  <h4>{m.titulo}</h4>
                  {m.descripcion && <p>{m.descripcion}</p>}
                </article>
              </li>
            ))}
          </ol>
        </li>
      ))}
    </ol>
  );
}

export default function AboutPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="about-title">
        <div className={styles.inner}>
          <nav className={styles.breadcrumb} aria-label="Ruta de navegación">
            <Link to="/">Inicio</Link><span aria-hidden="true">/</span><span aria-current="page">Nosotros</span>
          </nav>
          <div className={styles.heroGrid}>
            <div className={styles.heroContent}>
              <div className="section-tag">Bomberos voluntarios · Yunka Atoq</div>
              <h1 id="about-title" className={styles.heroTitle}>Nos une la voluntad.<br /><em>Nos mueve servir.</em></h1>
              <p className={styles.heroDesc}>Nacimos del compromiso de siete voluntarios con una misma convicción: estar presentes cuando alguien nos necesita.</p>
              <a href="#nuestra-historia" className={styles.storyLink}>Conoce nuestra historia <span aria-hidden="true">↘</span></a>
              <div className={styles.heroFacts}>
                <div><strong>2023</strong><span>El inicio de nuestra historia</span></div>
                <div><strong>7</strong><span>Voluntarios fundadores</span></div>
                <div><strong>Una misión</strong><span>Proteger la vida</span></div>
              </div>
            </div>
            <figure className={styles.heroPhoto}>
              <img src="/history/12.jpg" alt="Bomberos voluntarios trabajando juntos durante una operación contra incendios forestales" fetchPriority="high" width="1080" height="1433" />
              <figcaption><span>En el lugar donde hacemos falta</span><strong>Vocación que se convierte en acción.</strong></figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section id="nuestra-historia" className={styles.timeline} aria-labelledby="history-title">
        <div className={styles.inner}>
          <div className={styles.sectionHeader}>
            <div><div className="section-tag">Nuestra trayectoria</div><h2 id="history-title" className={styles.sectionTitle}>Cada hito cuenta<br />una parte de nosotros.</h2></div>
            <div className={styles.historyIntro}><p>Los momentos que han marcado nuestro camino: el servicio, los aprendizajes y los pasos que nos hicieron crecer.</p><span className={styles.orderLabel}><span aria-hidden="true">↓</span> Del presente a nuestros inicios</span></div>
          </div>
          <MilestonesTimeline />
        </div>
      </section>

      <section className={styles.manifesto} aria-labelledby="principles-title">
        <div className={styles.inner}>
          <div className={styles.sectionHeader}>
            <div><div className="section-tag">Lo que nos guía</div><h2 id="principles-title" className={styles.sectionTitle}>Nuestra esencia<br />en cada acción.</h2></div>
            <p className={styles.sectionDescription}>Nuestra historia sigue creciendo. Los principios que nos unen permanecen en cada guardia, cada operativo y cada decisión.</p>
          </div>
          <div className={styles.principles}>
            {principles.map(({ num, title, desc }) => (
              <article key={num} className={styles.principle}>
                <span className={styles.principleNum}>{num}</span><h3>{title}</h3><p>{desc}</p>
              </article>
            ))}
          </div>
          <div className={styles.joinBanner}><div><span>La historia continúa contigo</span><h2>También puedes ser parte.</h2></div><Link to="/voluntarios" className="btn-primary">Quiero ser voluntario <span aria-hidden="true">↗</span></Link></div>
        </div>
      </section>
    </main>
  );
}
