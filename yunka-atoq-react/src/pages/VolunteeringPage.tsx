import { useState, useEffect, useRef } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from './VolunteeringPage.module.css';
import { voluntariosApi, type Convocatoria } from '../services/api';
import { ESPECIALIDADES } from '../data/especialidades';
import {
  estadoConvocatoria, objetivoCuenta, partesRestantes, inicioDate, cierreDate, fmtFechaLarga, useNow,
} from '../utils/convocatoria';

const CONTACT_PHONE = '+591 70776212';
const CONTACT_EMAIL = 'informaciones@bomberosatoq.org';

const SIN_CONVOCATORIA: Convocatoria = { inicio: '', cierre: '', plazas: null, postulantes: null };

const Icon = ({ children }: { children: ReactNode }) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const requirements = [
  {
    icon: <Icon><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="11" r="2" /><path d="M15 10h3M15 14h3M6 16c.5-1.5 1.7-2 3-2s2.5.5 3 2" /></Icon>,
    name: 'Ser mayor de 18 años',
    desc: 'Con carnet de identidad vigente y sin antecedentes penales graves.',
  },
  {
    icon: <Icon><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 000-7.8z" /><path d="M3 12h4l2-3 3 6 2-3h7" /></Icon>,
    name: 'Buena salud física',
    desc: 'Presentas un certificado médico. Las pruebas físicas se hacen al ingresar, no al postular.',
  },
  {
    icon: <Icon><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon>,
    name: 'Tiempo disponible',
    desc: 'Dos guardias por semana (12 horas en total) durante al menos 3 años.',
  },
  {
    icon: <Icon><path d="M12 21s-7-6.2-7-11.5a7 7 0 0114 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></Icon>,
    name: 'Vivir en el área metropolitana',
    desc: 'Cercado, Sacaba, Tiquipaya, Quillacollo, Colcapirhua o Vinto.',
  },
];

const steps = [
  { num: '1', name: 'Postulación',         time: '10 minutos',         desc: 'Llenas el formulario de esta página.' },
  { num: '2', name: 'Entrevista',          time: '1 semana',           desc: 'Conversamos contigo y con dos personas que te conozcan.' },
  { num: '3', name: 'Pruebas físicas',     time: '1 día',              desc: 'Evaluación con estándar IFSAC en el cuartel.' },
  { num: '4', name: 'Escuela de bomberos', time: '6 meses',            desc: 'Los sábados, todo el día. Es gratuita.' },
  { num: '5', name: 'Juramentación',       time: 'Ceremonia',          desc: 'Recibes tu código y uniforme, y ya puedes asistir a emergencias y apoyos.' },
];

const zonas = ['Cercado', 'Sacaba', 'Tiquipaya', 'Quillacollo', 'Colcapirhua', 'Vinto'];

const MOTIVO_MAX = 600;

export default function VolunteeringPage() {
  const pad = (n: number) => String(n).padStart(2, '0');
  const now = useNow();

  // Convocatoria configurada desde el panel de Postulaciones
  const [conv, setConv] = useState<Convocatoria | null>(null);
  useEffect(() => {
    voluntariosApi.convocatoria().then(setConv).catch(() => setConv(SIN_CONVOCATORIA));
  }, []);

  const estado    = conv ? estadoConvocatoria(conv, now) : null;   // null = cargando
  const open      = estado === 'abierta';
  const objetivo  = conv ? objetivoCuenta(conv, now) : null;
  const cd        = objetivo ? partesRestantes(objetivo, now) : null;
  const ini       = conv ? inicioDate(conv) : null;
  const fin       = conv ? cierreDate(conv) : null;
  const inicioTxt = ini ? fmtFechaLarga(ini) : '';
  const cierreTxt = fin ? fmtFechaLarga(fin) : '';
  const year      = (fin ?? new Date(now)).getFullYear();
  const plazas    = conv?.plazas ?? null;
  const ctaLabel  = estado === null || open ? 'Postular ahora' : 'Registrar mi interés';

  const statusClass = estado === null ? styles.statusNeutral
    : estado === 'abierta' ? styles.statusOpen
    : estado === 'proxima' ? styles.statusSoon
    : styles.statusClosed;
  const statusText = estado === null ? 'Cargando convocatoria…'
    : estado === 'abierta'  ? `Convocatoria ${year} abierta`
    : estado === 'proxima'  ? `Convocatoria ${year} · abre pronto`
    : estado === 'cerrada'  ? `Convocatoria ${year} cerrada`
    : 'Sin convocatoria abierta';

  // Form state
  const [nombre, setNombre]       = useState('');
  const [ci, setCi]               = useState('');
  const [edad, setEdad]           = useState('');
  const [tel, setTel]             = useState('');
  const [email, setEmail]         = useState('');
  const [zona, setZona]           = useState('Cercado');
  const [ocupacion, setOcupacion] = useState('');
  const [motivo, setMotivo]       = useState('');
  const [confirm, setConfirm]     = useState(false);
  const [sending, setSending]     = useState(false);
  const [success, setSuccess]     = useState('');
  const [error, setError]         = useState('');
  const formRef = useRef<HTMLElement>(null);

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: 'smooth' });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!confirm) { setError('Debes confirmar que tienes tiempo los fines de semana para la instrucción.'); return; }
    setSending(true); setError('');
    try {
      const res = await voluntariosApi.postular({
        nombre: `${nombre} | CI: ${ci} | Zona: ${zona} | Ocupación: ${ocupacion}`,
        email,
        telefono: tel,
        edad: parseInt(edad) || undefined,
        mensaje: motivo,
      });
      setSuccess(res.mensaje);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No pudimos enviar tu postulación. Intenta de nuevo.');
    } finally {
      setSending(false);
    }
  };

  return (
    <main className={styles.page}>
      {/* ===== Hero ===== */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.breadcrumb}>
            <Link to="/">Inicio</Link><span>/</span>Voluntariado
          </div>

          <span className={`${styles.status} ${statusClass}`}>
            <span className={styles.statusDot} aria-hidden="true" />
            {statusText}
          </span>

          <h1 className={styles.heroTitle}>
            Ser voluntario no es un favor.<br />
            <em>Es un compromiso.</em>
          </h1>

          <p className={styles.heroDesc}>
            {estado === null && <>Buscamos personas que quieran formarse como bomberos voluntarios en Cochabamba.</>}
            {estado === 'abierta' && <>Buscamos {plazas != null ? `${plazas} personas` : 'personas'} que quieran formarse como bomberos voluntarios en Cochabamba. Puedes postular hasta el <strong>{cierreTxt}</strong>.</>}
            {estado === 'proxima' && <>La convocatoria {year} abre el <strong>{inicioTxt}</strong>. Déjanos tus datos y te avisaremos ese día.</>}
            {estado === 'cerrada' && <>La convocatoria cerró el {cierreTxt}. Déjanos tus datos y te avisaremos cuando abra la próxima.</>}
            {estado === 'sin_fecha' && <>Por ahora no hay una convocatoria abierta. Déjanos tus datos y te avisaremos cuando abra la próxima.</>}
          </p>

          <div className={styles.heroActions}>
            <button type="button" className={styles.btnPrimary} onClick={scrollToForm}>
              {ctaLabel}
            </button>
            <a href="#requisitos" className={styles.btnGhost}>Ver requisitos</a>
          </div>

          <dl className={styles.facts}>
            <div><dt>Plazas</dt><dd>{plazas ?? '—'}</dd></div>
            <div><dt>Formación</dt><dd>6 meses</dd></div>
            <div><dt>Costo de la escuela</dt><dd>Gratis</dd></div>
            <div><dt>Compromiso mínimo</dt><dd>3 años</dd></div>
          </dl>
        </div>
      </section>

      {/* ===== Requisitos + cuenta regresiva ===== */}
      <section id="requisitos" className={styles.reqSection}>
        <div className={styles.reqInner}>
          <div>
            <div className="section-tag">Requisitos</div>
            <h2 className={styles.sectionTitle}>¿Qué necesitas para postular?</h2>
            <p className={styles.sectionDesc}>
              Son cuatro requisitos básicos. Si cumples con todos, puedes enviar tu postulación hoy mismo.
            </p>

            <ul className={styles.reqList}>
              {requirements.map(({ icon, name, desc }) => (
                <li key={name} className={styles.reqItem}>
                  <span className={styles.reqIcon}>{icon}</span>
                  <div>
                    <h3 className={styles.reqName}>{name}</h3>
                    <p className={styles.reqDesc}>{desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <aside className={styles.countCard}>
            <div className={styles.countLabel}>
              {estado === null && 'Cargando…'}
              {estado === 'abierta' && `Cierre de postulación · ${cierreTxt}`}
              {estado === 'proxima' && `La convocatoria abre el ${inicioTxt}`}
              {estado === 'cerrada' && 'Postulación cerrada'}
              {estado === 'sin_fecha' && 'Sin convocatoria abierta'}
            </div>

            {estado === null || cd ? (
              <div className={styles.countGrid} role="timer" aria-live="off">
                {[
                  { num: cd ? pad(cd.days)  : '--', label: 'Días' },
                  { num: cd ? pad(cd.hours) : '--', label: 'Horas' },
                  { num: cd ? pad(cd.mins)  : '--', label: 'Minutos' },
                  { num: cd ? pad(cd.secs)  : '--', label: 'Segundos' },
                ].map(({ num, label }) => (
                  <div key={label} className={styles.countUnit}>
                    <span className={styles.countNum}>{num}</span>
                    <span className={styles.countUnitLabel}>{label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.countClosed}>
                {estado === 'cerrada'
                  ? 'La convocatoria terminó. Registra tus datos y te escribiremos cuando abramos la siguiente.'
                  : 'Aún no hay fechas para la próxima convocatoria. Registra tus datos y te escribiremos cuando abra.'}
              </p>
            )}

            {(plazas != null || conv?.postulantes != null) && (
              <div className={styles.countStats}>
                {plazas != null && (
                  <div>
                    <div className={styles.countStatNum}>{plazas}</div>
                    <div className={styles.countStatLabel}>{open ? 'Plazas abiertas' : 'Plazas'}</div>
                  </div>
                )}
                {conv?.postulantes != null && (
                  <div>
                    <div className={styles.countStatNum}>{conv.postulantes}</div>
                    <div className={styles.countStatLabel}>Personas postularon</div>
                  </div>
                )}
              </div>
            )}

            <button type="button" className={styles.btnPrimary} onClick={scrollToForm}>
              {ctaLabel}
            </button>
          </aside>
        </div>
      </section>

      {/* ===== Proceso ===== */}
      <section className={styles.process}>
        <div className={styles.inner}>
          <div className="section-tag">El proceso</div>
          <h2 className={styles.sectionTitle}>Cinco pasos para ser bombero voluntario</h2>
          <p className={styles.sectionDesc}>Desde que envías el formulario hasta que juras como bombero pasan unos seis meses.</p>

          <ol className={styles.timeline}>
            {steps.map(({ num, name, time, desc }) => (
              <li key={num} className={styles.tStep}>
                <span className={styles.tNum}>{num}</span>
                <span className={styles.tTime}>{time}</span>
                <h3 className={styles.tName}>{name}</h3>
                <p className={styles.tDesc}>{desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ===== Especialidades ===== */}
      <section className={styles.espSection}>
        <div className={styles.inner}>
          <div className={styles.espHead}>
            <div>
              <div className="section-tag">Después de la escuela</div>
              <h2 className={styles.sectionTitle}>Elige tu especialidad</h2>
            </div>
            <Link to="/servicios" className={styles.textLink}>Conoce cada especialidad →</Link>
          </div>

          <ul className={styles.espGrid}>
            {ESPECIALIDADES.map(e => (
              <li key={e.slug} className={styles.espItem}>
                <img src={e.img} alt="" />
                <span>{e.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ===== Formulario ===== */}
      <section className={styles.formSection} ref={formRef}>
        <div className={styles.formInner}>
          <div className={styles.formLeft}>
            <div className="section-tag section-tag--light">Postulación {year}</div>
            <h2 className={styles.formTitle}>{estado === null || open ? 'Empieza aquí' : 'Déjanos tus datos'}</h2>
            <p className={styles.formDesc}>
              Llenarlo toma unos 10 minutos. Te responderemos por correo en un plazo de 48 horas hábiles.
            </p>
            <p className={styles.formDesc}>
              Responde con sinceridad: preferimos conocerte tal como eres.
            </p>

            <div className={styles.contactBox}>
              <div className={styles.contactBoxLabel}>¿Tienes dudas? Escríbenos</div>
              <a href={`tel:${CONTACT_PHONE.replace(/\s/g, '')}`} className={styles.contactRow}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                </svg>
                {CONTACT_PHONE}
              </a>
              <a href={`mailto:${CONTACT_EMAIL}`} className={styles.contactRow}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 6l-10 7L2 6" />
                </svg>
                {CONTACT_EMAIL}
              </a>
            </div>
          </div>

          {success ? (
            <div className={styles.successCard} role="status">
              <div className={styles.successIcon} aria-hidden="true">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <h3 className={styles.successTitle}>¡Recibimos tu postulación!</h3>
              <p className={styles.successText}>{success}</p>
              <p className={styles.successText}>
                Revisa tu correo <strong>{email}</strong> en los próximos días, incluida la carpeta de spam.
              </p>
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit}>
              <p className={styles.formNote}>Los campos marcados con <span className={styles.req}>*</span> son obligatorios.</p>

              {error && <div className={styles.errorMsg} role="alert">{error}</div>}

              <fieldset className={styles.fieldset}>
                <legend className={styles.legend}><span>1</span> Tus datos</legend>

                <div className={styles.field}>
                  <label htmlFor="vol-nombre" className={styles.fieldLabel}>Nombre completo <span className={styles.req}>*</span></label>
                  <input id="vol-nombre" className={styles.input} placeholder="Ej. Rosa Mendoza Vargas" autoComplete="name"
                    value={nombre} onChange={e => setNombre(e.target.value)} required />
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label htmlFor="vol-ci" className={styles.fieldLabel}>Carnet de identidad <span className={styles.req}>*</span></label>
                    <input id="vol-ci" className={styles.input} placeholder="Ej. 6543210 CB"
                      value={ci} onChange={e => setCi(e.target.value)} required />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="vol-edad" className={styles.fieldLabel}>Edad <span className={styles.req}>*</span></label>
                    <input id="vol-edad" className={styles.input} type="number" inputMode="numeric" placeholder="Desde 18 años"
                      min="18" max="60" value={edad} onChange={e => setEdad(e.target.value)} required />
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label htmlFor="vol-zona" className={styles.fieldLabel}>Zona donde vives <span className={styles.req}>*</span></label>
                    <select id="vol-zona" className={styles.select} value={zona} onChange={e => setZona(e.target.value)}>
                      {zonas.map(z => <option key={z}>{z}</option>)}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="vol-ocupacion" className={styles.fieldLabel}>Ocupación actual</label>
                    <input id="vol-ocupacion" className={styles.input} placeholder="Estudiante, profesional, etc."
                      value={ocupacion} onChange={e => setOcupacion(e.target.value)} />
                  </div>
                </div>
              </fieldset>

              <fieldset className={styles.fieldset}>
                <legend className={styles.legend}><span>2</span> Cómo contactarte</legend>

                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label htmlFor="vol-tel" className={styles.fieldLabel}>Teléfono o celular <span className={styles.req}>*</span></label>
                    <input id="vol-tel" className={styles.input} type="tel" inputMode="tel" placeholder="Ej. 70012345" autoComplete="tel"
                      value={tel} onChange={e => setTel(e.target.value)} required />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="vol-email" className={styles.fieldLabel}>Correo electrónico <span className={styles.req}>*</span></label>
                    <input id="vol-email" className={styles.input} type="email" placeholder="tucorreo@ejemplo.com" autoComplete="email"
                      value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                </div>
                <p className={styles.hint}>Te enviaremos la respuesta a este correo.</p>
              </fieldset>

              <fieldset className={styles.fieldset}>
                <legend className={styles.legend}><span>3</span> Tu motivación</legend>

                <div className={styles.field}>
                  <label htmlFor="vol-motivo" className={styles.fieldLabel}>¿Por qué quieres ser bombero voluntario? <span className={styles.req}>*</span></label>
                  <textarea id="vol-motivo" className={styles.textarea} maxLength={MOTIVO_MAX}
                    placeholder="Cuéntanos con tus palabras. No necesitas escribir mucho."
                    value={motivo} onChange={e => setMotivo(e.target.value)} required />
                  <span className={styles.counter}>{motivo.length} / {MOTIVO_MAX}</span>
                </div>
              </fieldset>

              <label className={`${styles.checkRow} ${confirm ? styles.checkRowOn : ''}`}>
                <input type="checkbox" checked={confirm} onChange={e => setConfirm(e.target.checked)} />
                <span>Confirmo que tengo tiempo los <strong>fines de semana</strong> para asistir a la instrucción.</span>
              </label>

              <button type="submit" className={styles.submitBtn} disabled={sending}>
                {sending ? 'Enviando…' : 'Enviar postulación'}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
