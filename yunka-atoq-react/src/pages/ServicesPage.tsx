import { Link } from 'react-router-dom';
import styles from './ServicesPage.module.css';

const services = [
  {
    num: '01',
    title: 'Incendios estructurales',
    desc: 'Ataque ofensivo, ventilación táctica y rescate de víctimas en viviendas, comercios e industria.',
    tags: ['24/7', 'Voluntario', 'Sin costo'],
    caps: ['Cuerpo de ataque con BA-2026', 'Aparatos de respiración SCBA', 'Termocámaras FLIR K53', 'Tiempo objetivo: 12 min'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18M5 21V7l7-4 7 4v14"/>
        <path d="M9 21v-6h6v6"/>
        <path d="M12 3c0 3-3 4-3 7a3 3 0 006 0c0-3-3-4-3-7z"/>
      </svg>
    ),
  },
  {
    num: '02',
    title: 'Incendios forestales',
    desc: 'Brigada certificada para el Parque Nacional Tunari y zonas rurales. Combate sostenido en interfaz urbano-forestal.',
    tags: ['24/7', 'Voluntario', 'Sin costo'],
    caps: ['Líneas de control', 'Quemas prescritas', 'Brigada helitransportada', 'Convenio SERNAP'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 8C8 10 5.9 16.17 3.82 19.34A1 1 0 004.7 21 5.6 5.6 0 008 20c2 0 3.5-1.5 5-1.5S15 20 17 20a5.6 5.6 0 003.3-1 1 1 0 00.38-1.16C18.5 14.5 17 11 17 8z"/>
        <path d="M17 8a5 5 0 00-5-5"/>
        <line x1="12" y1="21" x2="12" y2="10"/>
      </svg>
    ),
  },
  {
    num: '03',
    title: 'Atención prehospitalaria',
    desc: 'Soporte vital básico, manejo de trauma y traslado coordinado con la red de salud pública.',
    tags: ['24/7', 'Voluntario', 'Sin costo'],
    caps: ['Ambulancias tipo II', 'Desfibriladores AED', 'Protocolo ITLS / PHTLS', 'Red Hospital Viedma'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <line x1="12" y1="8" x2="12" y2="16"/>
        <line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
    ),
  },
  {
    num: '04',
    title: 'Capacitación',
    desc: 'Formación continua para voluntarios y comunidad: primeros auxilios, prevención de incendios y certificaciones internacionales.',
    tags: ['Voluntario', 'Sin costo'],
    caps: ['Certificación NFPA 1001', 'Cursos de primeros auxilios', 'Simulacros comunitarios', 'Capacitación a empresas'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z"/>
        <path d="M6 12v5c3 3 9 3 12 0v-5"/>
      </svg>
    ),
  },
  {
    num: '05',
    title: 'Sistema de Comando de Incidentes',
    desc: 'Coordinación táctica y estratégica de operaciones complejas bajo el modelo SCI/ICS estandarizado a nivel nacional.',
    tags: ['24/7', 'Voluntario', 'Sin costo'],
    caps: ['Modelo ICS/SCI certificado', 'Coordinación interinstitucional', 'Sala de situación móvil', 'Gestión de recursos en campo'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="5" r="2"/>
        <circle cx="5" cy="19" r="2"/>
        <circle cx="19" cy="19" r="2"/>
        <line x1="12" y1="7" x2="12" y2="13"/>
        <line x1="12" y1="13" x2="5" y2="17"/>
        <line x1="12" y1="13" x2="19" y2="17"/>
      </svg>
    ),
  },
  {
    num: '06',
    title: 'Búsqueda y rescate',
    desc: 'Intervención en estructuras colapsadas, alta montaña y espacios confinados con equipo USAR certificado.',
    tags: ['24/7', 'Voluntario', 'Sin costo'],
    caps: ['Equipo USAR certificado', 'Rescate en altura', 'Espacios confinados', 'Canes de búsqueda'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        <line x1="11" y1="8" x2="11" y2="14"/>
        <line x1="8" y1="11" x2="14" y2="11"/>
      </svg>
    ),
  },
];

export default function ServicesPage() {
  return (
    <main>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.breadcrumb}>
            <Link to="/">Inicio</Link>
            <span>/</span>
            Servicios
          </div>
          <h1 className={styles.heroTitle}>
            Seis líneas de servicio.<br />Una sola misión.
          </h1>
          <p className={styles.heroDesc}>
            Cobertura 24/7 en el área metropolitana de Cochabamba, sin costo para la ciudadanía. Tiempos de respuesta auditados mensualmente.
          </p>
        </div>
      </section>

      {/* Lista de servicios */}
      <section className={styles.list}>
        <div className={styles.listInner}>
          {services.map(({ num, title, desc, tags, caps, icon }) => (
            <div key={num} className={styles.serviceRow}>
              <div className={styles.serviceLeft}>
                <span className={styles.serviceNum}>{num}</span>
                <div className={styles.serviceThumb}>{icon}</div>
              </div>

              <div className={styles.serviceCenter}>
                <h2 className={styles.serviceTitle}>{title}</h2>
                <p className={styles.serviceDesc}>{desc}</p>
                <div className={styles.tags}>
                  {tags.map(t => <span key={t} className={styles.tag}>{t}</span>)}
                </div>
              </div>

              <div className={styles.serviceRight}>
                <ul className={styles.capList}>
                  {caps.map(c => <li key={c} className={styles.capItem}>{c}</li>)}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Emergencia */}
      <section className={styles.cta}>
        <div className={styles.ctaInner}>
          <div>
            <div className="section-tag section-tag--light">¿Emergencia ahora?</div>
            <h2 className={styles.ctaTitle}>
              Marca 119.<br />Estamos en camino.
            </h2>
            <p className={styles.ctaDesc}>
              Línea gratuita 24/7 desde cualquier operadora boliviana. Indica dirección, tipo de emergencia y número de personas afectadas.
            </p>
          </div>
          <a href="tel:119" className={styles.ctaBtn}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
            </svg>
            Emergencia · 119
          </a>
        </div>
      </section>
    </main>
  );
}
