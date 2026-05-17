import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './ServicesPage.module.css';
import { serviciosApi, type Servicio } from '../services/api';
import { ServiceIcon } from '../utils/serviceIcons';

export default function ServicesPage() {
  const [services, setServices] = useState<Servicio[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    serviciosApi.list()
      .then(setServices)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <main>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.breadcrumb}>
            <Link to="/">Inicio</Link><span>/</span>Servicios
          </div>
          <h1 className={styles.heroTitle}>
            Seis líneas de servicio.<br />Una sola misión.
          </h1>
          <p className={styles.heroDesc}>
            Cobertura 24/7 en el área metropolitana de Cochabamba, sin costo para la ciudadanía. Tiempos de respuesta auditados mensualmente.
          </p>
        </div>
      </section>

      {/* Lista */}
      <section className={styles.list}>
        <div className={styles.listInner}>
          {loading && (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-gray)' }}>
              Cargando servicios…
            </div>
          )}
          {services.map(s => (
            <div key={s.id} className={styles.serviceRow}>
              <div className={styles.serviceLeft}>
                <span className={styles.serviceNum}>{s.numero}</span>
                <div className={styles.serviceThumb}>
                  <ServiceIcon name={s.icono} size={32} />
                </div>
              </div>

              <div className={styles.serviceCenter}>
                <h2 className={styles.serviceTitle}>{s.titulo}</h2>
                <p className={styles.serviceDesc}>{s.descripcion}</p>
                <div className={styles.tags}>
                  {(s.tags ?? []).map(t => (
                    <span key={t} className={styles.tag}>{t}</span>
                  ))}
                </div>
              </div>

              <div className={styles.serviceRight}>
                <ul className={styles.capList}>
                  {(s.capacidades ?? []).map(c => (
                    <li key={c} className={styles.capItem}>{c}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className={styles.cta}>
        <div className={styles.ctaInner}>
          <div>
            <div className="section-tag section-tag--light">¿Emergencia ahora?</div>
            <h2 className={styles.ctaTitle}>
              Marca 68503758.<br />Estamos en camino.
            </h2>
            <p className={styles.ctaDesc}>
              Línea gratuita 24/7 desde cualquier operadora boliviana. Indica dirección, tipo de emergencia y número de personas afectadas.
            </p>
          </div>
          <a href="tel:68503758" className={styles.ctaBtn}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
            </svg>
            Emergencia · 68503758
          </a>
        </div>
      </section>
    </main>
  );
}
