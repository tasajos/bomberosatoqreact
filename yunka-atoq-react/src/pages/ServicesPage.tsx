import { useState, useEffect, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import styles from './ServicesPage.module.css';
import { serviciosApi, type Servicio } from '../services/api';
import { ServiceIcon } from '../utils/serviceIcons';
import { ESPECIALIDADES } from '../data/especialidades';

const PASOS = [
  { n: '01', t: 'Llamada',      d: 'Recibimos el aviso y registramos dirección, tipo de emergencia y personas afectadas.' },
  { n: '02', t: 'Despacho',     d: 'Asignamos la unidad y la especialidad adecuadas según la naturaleza del incidente.' },
  { n: '03', t: 'Intervención', d: 'Operamos bajo el Sistema de Comando de Incidentes, coordinando con otras instituciones.' },
  { n: '04', t: 'Cierre',       d: 'Documentamos la atención y auditamos los tiempos de respuesta cada mes.' },
];

const PhoneIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
  </svg>
);

const scrollToId = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

export default function ServicesPage() {
  const [services, setServices]           = useState<Servicio[]>([]);
  const [loading, setLoading]             = useState(true);
  const [activeService, setActiveService] = useState<number | null>(null);
  const [activeEsp, setActiveEsp]         = useState(ESPECIALIDADES[0].slug);

  useEffect(() => {
    serviciosApi.list()
      .then(setServices)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Resalta en el índice lateral el servicio visible
  useEffect(() => {
    if (!services.length) return;
    const io = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) setActiveService(Number((e.target as HTMLElement).dataset.id));
      }),
      { rootMargin: '-35% 0px -60% 0px' },
    );
    services.forEach(s => {
      const el = document.getElementById(`servicio-${s.id}`);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [services]);

  const esp = ESPECIALIDADES.find(e => e.slug === activeEsp) ?? ESPECIALIDADES[0];
  const espServices = services.filter(s => esp.servicios.includes(s.icono));

  const openEspecialidad = (slug: string) => {
    setActiveEsp(slug);
    scrollToId('especialidades');
  };

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys = ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const i = ESPECIALIDADES.findIndex(x => x.slug === activeEsp);
    const step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1;
    const next = ESPECIALIDADES[(i + step + ESPECIALIDADES.length) % ESPECIALIDADES.length];
    setActiveEsp(next.slug);
    document.getElementById(`tab-${next.slug}`)?.focus();
  };

  return (
    <main>
      {/* ===== Hero ===== */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.breadcrumb}>
            <Link to="/">Inicio</Link><span>/</span>Servicios
          </div>

          <div className={styles.heroGrid}>
            <div>
              <div className="section-tag section-tag--light">Servicios · Especialidades</div>
              <h1 className={styles.heroTitle}>
                Respuesta inmediata.<br />
                Unidades especializadas.<br />
                <em>Una sola misión.</em>
              </h1>
              <p className={styles.heroDesc}>
                Cobertura 24/7 en el área metropolitana de Cochabamba, sin costo para la ciudadanía.
                Cada servicio está respaldado por una especialidad entrenada para ese tipo de emergencia.
              </p>
              <nav className={styles.jumpNav} aria-label="Secciones de la página">
                <a href="#servicios">Servicios</a>
                <a href="#especialidades">Especialidades</a>
                <a href="#emergencia">Cómo respondemos</a>
              </nav>
            </div>

            <a href="tel:68503758" className={styles.hotline}>
              <span className={styles.hotlinePulse} aria-hidden="true" />
              <span className={styles.hotlineLabel}>Línea de emergencia · 24/7</span>
              <span className={styles.hotlineNum}>68503758</span>
              <span className={styles.hotlineCta}><PhoneIcon size={16} /> Llamar ahora</span>
            </a>
          </div>

          <dl className={styles.stats}>
            <div><dt>Líneas de servicio</dt><dd>{loading ? '…' : services.length || '—'}</dd></div>
            <div><dt>Especialidades</dt><dd>{ESPECIALIDADES.length}</dd></div>
            <div><dt>Cobertura</dt><dd>24/7</dd></div>
            <div><dt>Costo para la ciudadanía</dt><dd>Bs 0</dd></div>
          </dl>
        </div>
      </section>

      {/* ===== Servicios ===== */}
      <section id="servicios" className={styles.services}>
        <div className={styles.inner}>
          <header className={styles.sectionHead}>
            <div className="section-tag">01 — Servicios</div>
            <h2 className={styles.sectionTitle}>Lo que hacemos<br />por Cochabamba.</h2>
          </header>

          <div className={styles.servicesLayout}>
            {services.length > 0 && (
              <aside className={styles.index} aria-label="Índice de servicios">
                <span className={styles.indexLabel}>Índice</span>
                <ol>
                  {services.map(s => (
                    <li key={s.id}>
                      <a
                        href={`#servicio-${s.id}`}
                        className={activeService === s.id ? styles.indexActive : undefined}
                      >
                        <span>{s.numero}</span>{s.titulo}
                      </a>
                    </li>
                  ))}
                </ol>
              </aside>
            )}

            <div className={styles.cards}>
              {loading && [0, 1, 2].map(i => <div key={i} className={styles.skeleton} />)}

              {!loading && services.length === 0 && (
                <div className={styles.empty}>
                  No pudimos cargar los servicios en este momento.
                  Ante cualquier emergencia llama al <a href="tel:68503758">68503758</a>.
                </div>
              )}

              {services.map(s => {
                const related = ESPECIALIDADES.filter(e => e.servicios.includes(s.icono));
                return (
                  <article key={s.id} id={`servicio-${s.id}`} data-id={s.id} className={styles.card}>
                    <div className={styles.cardHead}>
                      <div className={styles.cardIcon}><ServiceIcon name={s.icono} size={30} /></div>
                      <div>
                        <span className={styles.cardNum}>Servicio {s.numero}</span>
                        <h3 className={styles.cardTitle}>{s.titulo}</h3>
                      </div>
                      <span className={styles.cardBigNum} aria-hidden="true">{s.numero}</span>
                    </div>

                    <p className={styles.cardDesc}>{s.descripcion}</p>

                    {(s.tags ?? []).length > 0 && (
                      <div className={styles.tags}>
                        {s.tags.map(t => <span key={t} className={styles.tag}>{t}</span>)}
                      </div>
                    )}

                    {(s.capacidades ?? []).length > 0 && (
                      <ul className={styles.capList}>
                        {s.capacidades.map(c => (
                          <li key={c} className={styles.capItem}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            {c}
                          </li>
                        ))}
                      </ul>
                    )}

                    {related.length > 0 && (
                      <div className={styles.cardFoot}>
                        <span className={styles.cardFootLabel}>Especialidades que intervienen</span>
                        <div className={styles.cardFootList}>
                          {related.map(e => (
                            <button key={e.slug} type="button" className={styles.espChip} onClick={() => openEspecialidad(e.slug)}>
                              <img src={e.img} alt="" />
                              {e.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ===== Especialidades ===== */}
      <section id="especialidades" className={styles.esp}>
        <div className={styles.inner}>
          <header className={styles.sectionHead}>
            <div className="section-tag">02 — Especialidades</div>
            <h2 className={styles.sectionTitle}>Seis unidades,<br />un solo propósito.</h2>
            <p className={styles.sectionDesc}>
              Cada voluntario se forma en una especialidad. Juntas cubren desde la extinción de incendios
              hasta la gestión que sostiene cada salida.
            </p>
          </header>

          <div className={styles.espLayout}>
            <div className={styles.tabs} role="tablist" aria-orientation="vertical" aria-label="Especialidades" onKeyDown={onTabKey}>
              {ESPECIALIDADES.map(e => {
                const selected = e.slug === activeEsp;
                return (
                  <button
                    key={e.slug}
                    id={`tab-${e.slug}`}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls="esp-panel"
                    tabIndex={selected ? 0 : -1}
                    className={`${styles.tab} ${selected ? styles.tabActive : ''}`}
                    onClick={() => setActiveEsp(e.slug)}
                  >
                    <img src={e.img} alt="" />
                    <span>{e.name}</span>
                  </button>
                );
              })}
            </div>

            <div
              key={esp.slug}
              id="esp-panel"
              role="tabpanel"
              aria-labelledby={`tab-${esp.slug}`}
              className={styles.panel}
            >
              <div className={styles.panelLogo}>
                <img src={esp.img} alt={`Insignia de ${esp.name}`} />
              </div>

              <div className={styles.panelBody}>
                <span className={styles.panelKicker}>Especialidad</span>
                <h3 className={styles.panelTitle}>{esp.name}</h3>
                <p className={styles.panelLead}>{esp.lead}</p>

                <ol className={styles.areas}>
                  {esp.areas.map(a => <li key={a}>{a}</li>)}
                </ol>

                {espServices.length > 0 && (
                  <div className={styles.panelServices}>
                    <span className={styles.cardFootLabel}>Servicios que respalda</span>
                    <div className={styles.cardFootList}>
                      {espServices.map(s => (
                        <a key={s.id} href={`#servicio-${s.id}`} className={styles.serviceChip}>
                          <ServiceIcon name={s.icono} size={16} />
                          {s.titulo}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <Link to="/voluntarios" className={styles.panelLink}>
                  Quiero formar parte de esta especialidad →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Protocolo + CTA ===== */}
      <section id="emergencia" className={styles.cta}>
        <div className={styles.inner}>
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
              <PhoneIcon />
              Emergencia · 68503758
            </a>
          </div>

          <ol className={styles.steps}>
            {PASOS.map(p => (
              <li key={p.n} className={styles.step}>
                <span className={styles.stepNum}>{p.n}</span>
                <h3 className={styles.stepTitle}>{p.t}</h3>
                <p className={styles.stepDesc}>{p.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}
