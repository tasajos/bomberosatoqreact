import { Link } from 'react-router-dom';
import styles from './AboutPage.module.css';

const principles = [
  {
    num: '01',
    title: 'Llegamos cuando otros se van',
    desc: 'No discriminamos emergencia ni domicilio. La alarma suena y respondemos en menos de 12 minutos a cualquier punto del valle metropolitano.',
  },
  {
    num: '02',
    title: 'Voluntad antes que recurso',
    desc: 'Somos voluntarios. Eso no es un eslogan: nadie aquí cobra un boliviano por entrar a un incendio.',
  },
  {
    num: '03',
    title: 'Transparencia o nada',
    desc: 'Cada peso donado se publica. Auditoría externa anual, presupuesto abierto y reportes trimestrales en la web.',
  },
  {
    num: '04',
    title: 'Comunidad antes que medalla',
    desc: 'Preferimos prevenir mil emergencias que apagar una. Por eso entrenamos a la comunidad: escolares, juntas vecinales y empresas.',
  },
];

const timeline = [
  { year: '2008', event: 'Fundación', desc: '14 vecinos del Distrito 9 organizaron la primera brigada tras el incendio del mercado La Pampa.' },
  { year: '2010', event: 'Primera unidad', desc: 'Mack CF-600 donado por la comunidad tras 18 meses de rifas y kermeses.' },
  { year: '2014', event: 'Cuartel central', desc: 'Inauguración del cuartel propio en Av. Heroínas 1456, Cercado.' },
  { year: '2017', event: 'Cía. forestal', desc: 'Activación de la brigada forestal especializada en el Parque Tunari.' },
  { year: '2019', event: '41 días en el Tunari', desc: '14.000 hectáreas salvadas durante el mega incendio del Tunari.' },
  { year: '2025', event: 'Equipo USAR', desc: 'Activación del equipo de búsqueda y rescate en estructuras colapsadas.' },
];

const leadership = [
  {
    name: 'Cmte. Rosa Mendoza V.',
    role: 'Comandante de Compañía',
    desc: 'Ingeniera civil. 14 años en la compañía.',
    photo: null,
  },
  {
    name: 'Sub. Cmte. Diego Almaraz',
    role: 'Sub-Comandante Operativo',
    desc: 'Especialista en incendio forestal.',
    photo: null,
  },
  {
    name: 'Tte. Carla Iriarte L.',
    role: 'Oficial de Capacitación',
    desc: 'Instructora certificada NFPA.',
    photo: null,
  },
  {
    name: 'Tte. Marco Vargas P.',
    role: 'Oficial de Equipamiento',
    desc: 'Encargado del taller y flota.',
    photo: null,
  },
];

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

      {/* Línea de tiempo */}
      <section className={styles.timeline}>
        <div className={styles.timelineInner}>
          <div className="section-tag">Línea de tiempo</div>
          <h2 className={styles.timelineTitle}>
            Del primer balde<br />al equipo USAR.
          </h2>

          <div className={styles.timelineTrack}>
            {timeline.map(({ year, event, desc }) => (
              <div key={year} className={styles.timelineItem}>
                <div className={styles.timelineYear}>
                  <span className={styles.timelineYearText}>{year}</span>
                </div>
                <div className={styles.timelineEvent}>{event}</div>
                <p className={styles.timelineDesc}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comandancia */}
      <section className={styles.leadership}>
        <div className={styles.leadershipInner}>
          <div className={styles.leadershipHeader}>
            <div>
              <div className="section-tag">Comandancia</div>
              <h2 className={styles.leadershipTitle}>Quien lleva el casco.</h2>
            </div>
            <span className={styles.leadershipPeriod}>Período 2025 — 2027</span>
          </div>

          <div className={styles.leadershipGrid}>
            {leadership.map(({ name, role, desc, photo }) => (
              <div key={name} className={styles.memberCard}>
                <div className={styles.memberPhoto}>
                  {photo
                    ? <img src={photo} alt={name} />
                    : <span className={styles.memberPhotoPlaceholder}>Retrato</span>
                  }
                  <span className={styles.memberBadge}>Oficial</span>
                </div>
                <div className={styles.memberInfo}>
                  <div className={styles.memberName}>{name}</div>
                  <div className={styles.memberRole}>{role}</div>
                  <p className={styles.memberDesc}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
