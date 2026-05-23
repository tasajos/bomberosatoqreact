import { useState, useEffect, useRef, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import styles from './VolunteeringPage.module.css';
import { voluntariosApi } from '../services/api';

// Fecha de cierre: 30 de junio de 2026
const DEADLINE = new Date('2026-06-30T23:59:59');

function useCountdown(target: Date) {
  const calc = () => {
    const diff = Math.max(0, target.getTime() - Date.now());
    return {
      days:  Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      mins:  Math.floor((diff % 3600000) / 60000),
      secs:  Math.floor((diff % 60000) / 1000),
    };
  };
  const [t, setT] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

const requirements = [
  { tag: '18+', name: 'Mayor de edad', desc: 'Carnet de identidad vigente. Sin antecedentes penales graves.' },
  { tag: 'FÍS', name: 'Salud física compatible', desc: 'Certificado médico. Las pruebas físicas son al ingreso, no al postular.' },
  { tag: 'TPO', name: 'Disponibilidad', desc: 'Dos guardias semanales (12 h) por al menos 3 años. Sí, es serio.' },
  { tag: 'RES', name: 'Residencia metropolitana', desc: 'Cochabamba, Sacaba, Tiquipaya, Quillacollo, Colcapirhua o Vinto.' },
];

const steps = [
  { num: '01', name: 'Postulación', desc: 'Llenas el formulario en línea. 10 minutos.' },
  { num: '02', name: 'Entrevista', desc: 'Conversamos contigo y dos referentes. Una semana.' },
  { num: '03', name: 'Pruebas físicas', desc: 'Estándar IFSAC. Día completo en cuartel.' },
  { num: '04', name: 'Escuela de bomberos', desc: '6 meses, sábados completos, sin costo.' },
  { num: '05', name: 'Juramentación', desc: 'Te entregamos casco, traje y placa. Eres uno.' },
];

const zonas = ['Cercado','Sacaba','Tiquipaya','Quillacollo','Colcapirhua','Vinto'];

export default function VolunteeringPage() {
  const cd = useCountdown(DEADLINE);
  const pad = (n: number) => String(n).padStart(2, '0');

  // Form state
  const [nombre, setNombre]   = useState('');
  const [ci, setCi]           = useState('');
  const [edad, setEdad]       = useState('');
  const [tel, setTel]         = useState('');
  const [email, setEmail]     = useState('');
  const [zona, setZona]       = useState('Cercado');
  const [ocupacion, setOcupacion] = useState('');
  const [motivo, setMotivo]   = useState('');
  const [confirm, setConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError]     = useState('');
  const formRef = useRef<HTMLElement>(null);

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: 'smooth' });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!confirm) { setError('Debes confirmar el compromiso de guardias.'); return; }
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
      setError(err instanceof Error ? err.message : 'Error al enviar. Intenta de nuevo.');
    } finally {
      setSending(false);
    }
  };

  return (
    <main>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.breadcrumb}>
            <Link to="/">Inicio</Link><span>/</span>Voluntariado
          </div>
          <h1 className={styles.heroTitle}>
            Ser voluntario<br />no es un favor.<br />Es un compromiso.
          </h1>
          <p className={styles.heroDesc}>
            Convocatoria 2026 abierta. 42 plazas para nuevos bomberos voluntarios. La inscripción cierra el 30 de junio.
          </p>
        </div>
      </section>

      {/* Requisitos + Countdown */}
      <section className={styles.reqSection}>
        <div className={styles.reqInner}>
          <div>
            <div className="section-tag">Lo mínimo</div>
            <h2 className={styles.reqTitle}>Cuatro requisitos.<br />Cero excusas.</h2>
            <div className={styles.reqList}>
              {requirements.map(({ tag, name, desc }) => (
                <div key={tag} className={styles.reqItem}>
                  <span className={styles.reqTag}>{tag}</span>
                  <div>
                    <div className={styles.reqName}>{name}</div>
                    <p className={styles.reqDesc}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.countCard}>
            <div className={styles.countLabel}>Cierre de postulación</div>
            <div className={styles.countGrid}>
              {[
                { num: pad(cd.days),  label: 'Días' },
                { num: pad(cd.hours), label: 'Hrs'  },
                { num: pad(cd.mins),  label: 'Min'  },
                { num: pad(cd.secs),  label: 'Seg'  },
              ].map(({ num, label }) => (
                <div key={label} className={styles.countUnit}>
                  <span className={styles.countNum}>{num}</span>
                  <span className={styles.countUnitLabel}>{label}</span>
                </div>
              ))}
            </div>
            <div className={styles.countStats}>
              <div className={styles.countStat}>
                <div className={styles.countStatNum}>42</div>
                <div className={styles.countStatLabel}>Plazas abiertas</div>
              </div>
              <div className={styles.countStat}>
                <div className={styles.countStatNum}>186</div>
                <div className={styles.countStatLabel}>Postulantes</div>
              </div>
            </div>
            <button className={styles.countBtn} onClick={scrollToForm}>
              Postular ahora →
            </button>
          </div>
        </div>
      </section>

      {/* Proceso */}
      <section className={styles.process}>
        <div className={styles.processInner}>
          <div className="section-tag">El proceso</div>
          <h2 className={styles.processTitle}>Cinco pasos. Seis meses. Una decisión.</h2>
          <div className={styles.processGrid}>
            {steps.map(({ num, name, desc }) => (
              <div key={num} className={styles.processStep}>
                <div className={styles.stepNum}>{num}</div>
                <div className={styles.stepLine} />
                <div className={styles.stepName}>{name}</div>
                <p className={styles.stepDesc}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Formulario */}
      <section className={styles.formSection} ref={formRef}>
        <div className={styles.formInner}>
          <div className={styles.formLeft}>
            <div className="section-tag">Postulación 2026</div>
            <h2 className={styles.formTitle}>Empieza aquí.</h2>
            <p className={styles.formDesc}>
              10 minutos. Te respondemos por correo en 48 horas hábiles. Si algo no encaja, dilo. Vale más una postulación honesta que una rechazada al mes.
            </p>
            <div className={styles.contactBox}>
              <div className={styles.contactBoxLabel}>¿Dudas?</div>
              <span className={styles.contactPhone}>+591 4 422 0000</span>
              <a href="mailto:voluntariado@yunkaatoq.bo" className={styles.contactEmail}>
                voluntariado@yunkaatoq.bo
              </a>
            </div>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            {error && <div className={styles.errorMsg}>{error}</div>}

            <div className={styles.formGrid}>
              <div>
                <label className={styles.fieldLabel}>Nombre completo</label>
                <input className={styles.input} placeholder="Ej. Rosa Mendoza Vargas"
                  value={nombre} onChange={e => setNombre(e.target.value)} required />
              </div>
              <div>
                <label className={styles.fieldLabel}>Carnet de identidad</label>
                <input className={styles.input} placeholder="Ej. 6543210 CB"
                  value={ci} onChange={e => setCi(e.target.value)} required />
              </div>
            </div>

            <div className={styles.formGrid}>
              <div>
                <label className={styles.fieldLabel}>Edad</label>
                <input className={styles.input} type="number" placeholder="18+"
                  min="18" max="60" value={edad} onChange={e => setEdad(e.target.value)} required />
              </div>
              <div>
                <label className={styles.fieldLabel}>Teléfono</label>
                <input className={styles.input} placeholder="+591"
                  value={tel} onChange={e => setTel(e.target.value)} required />
              </div>
            </div>

            <div className={styles.formFull}>
              <label className={styles.fieldLabel}>Correo electrónico</label>
              <input className={styles.input} type="email" placeholder="tu@correo.bo"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>

            <div className={styles.formGrid}>
              <div>
                <label className={styles.fieldLabel}>Zona de residencia</label>
                <select className={styles.select} value={zona} onChange={e => setZona(e.target.value)}>
                  {zonas.map(z => <option key={z}>{z}</option>)}
                </select>
              </div>
              <div>
                <label className={styles.fieldLabel}>Ocupación actual</label>
                <input className={styles.input} placeholder="Estudiante, profesional, etc."
                  value={ocupacion} onChange={e => setOcupacion(e.target.value)} />
              </div>
            </div>

            <div className={styles.formFull}>
              <label className={styles.fieldLabel}>¿Por qué quieres ser bombero voluntario?</label>
              <textarea className={styles.textarea}
                placeholder="Cuéntanos en pocas palabras. Honestidad › perfección."
                value={motivo} onChange={e => setMotivo(e.target.value)} required />
            </div>

            <label className={styles.checkRow}>
              <input type="checkbox" checked={confirm} onChange={e => setConfirm(e.target.checked)} />
              Confirmo que dispongo de tiempo los fines de semana para instruccion
            </label>

            {success
              ? <div className={styles.successMsg}>{success}</div>
              : <button type="submit" className={styles.submitBtn} disabled={sending}>
                  {sending ? 'Enviando…' : 'Enviar postulación →'}
                </button>
            }
          </form>
        </div>
      </section>
    </main>
  );
}
