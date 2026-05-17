import { Link } from 'react-router-dom';
import styles from './ServicesSection.module.css';

const services = [
  {
    num: '01',
    title: 'Incendios estructurales',
    desc: 'Respuesta a incendios en vivienda, comercio e industria. Equipos de ataque, ventilación y rescate.',
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
    desc: 'Brigada especializada en el Tunari y zonas rurales. Líneas de control y combate sostenido.',
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
    desc: 'Soporte vital básico, trauma y traslado. Convenio con Hospital Viedma y red de salud.',
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
    desc: 'Formación continua en técnicas operativas, seguridad y certificaciones nacionales e internacionales.',
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
    desc: 'Coordinación táctica y estratégica de operaciones complejas bajo el modelo SCI/ICS estandarizado.',
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
    desc: 'Estructuras colapsadas, alta montaña y víctimas en espacios confinados. Equipo USAR.',
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

export default function ServicesSection() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <div>
            <div className="section-tag">02 — Lo que hacemos</div>
            <h2 className={styles.title}>
              Seis líneas<br />de servicio<br />para Cochabamba.
            </h2>
          </div>
          <Link to="/servicios" className={styles.viewAll}>Ver todos los servicios →</Link>
        </div>

        <div className={styles.grid}>
          {services.map(({ num, title, desc, icon }) => (
            <div key={num} className={styles.card}>
              <div>
                <div className={styles.cardTop}>
                  <span className={styles.cardNum}>{num}</span>
                  <span className={styles.cardIcon}>{icon}</span>
                </div>
                <h3 className={styles.cardTitle}>{title}</h3>
                <p className={styles.cardDesc}>{desc}</p>
              </div>
              <span className={styles.cardArrow}>→</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
