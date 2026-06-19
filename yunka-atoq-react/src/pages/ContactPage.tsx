import React, { useState, useEffect } from 'react';
import styles from './ContactPage.module.css';
import { contactoApi, configApi } from '../services/api';

const temas = ['Capacitación', 'Visita guiada', 'Empresas', 'Prensa', 'Sugerencia', 'Otro'];

const topics = [
  'Solicitar curso o capacitación',
  'Coordinar visita guiada',
  'Información para empresas',
  'Prensa y comunicación',
  'Quejas, sugerencias y reconocimientos',
];

interface Config {
  cuartel_nombre: string;
  cuartel_direccion: string;
  cuartel_barrio: string;
  cuartel_telefono: string;
  cuartel_horario: string;
  cuartel_emergencias: string;
  cuartel_email: string;
  cuartel_lat: string;
  cuartel_lng: string;
}

const DEFAULT_CONFIG: Config = {
  cuartel_nombre:     'Cuartel Yunka Atoq',
  cuartel_direccion:  'Av. Heroínas #1456',
  cuartel_barrio:     'Cercado · Cochabamba',
  cuartel_telefono:   '+591 70776212',
  cuartel_horario:    'Lunes a viernes · 8:00 – 18:00',
  cuartel_emergencias:'68503758',
  cuartel_email:      'informaciones@bomberosatoq.org',
  cuartel_lat:        '-17.393500',
  cuartel_lng:        '-66.156800',
};

export default function ContactPage() {
  const [nombre,  setNombre]  = useState('');
  const [correo,  setCorreo]  = useState('');
  const [telefono,setTelefono]= useState('');
  const [tema,    setTema]    = useState('Capacitación');
  const [mensaje, setMensaje] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');
  const [error,   setError]   = useState('');
  const [cfg,     setCfg]     = useState<Config>(DEFAULT_CONFIG);

  useEffect(() => {
    configApi.get()
      .then(data => setCfg({ ...DEFAULT_CONFIG, ...data } as Config))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true); setError(''); setSuccess('');
    try {
      const res = await contactoApi.send({ nombre, correo, telefono, tema, mensaje });
      setSuccess(res.mensaje);
      setNombre(''); setCorreo(''); setTelefono(''); setMensaje('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al enviar. Intenta de nuevo.');
    } finally {
      setSending(false);
    }
  };

  const mapFallback = `https://maps.google.com/maps?q=${cfg.cuartel_lat},${cfg.cuartel_lng}&z=16&output=embed`;

  return (
    <main>
      {/* Info strip */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.infoCard}>
            <span className={styles.infoLabel}>Cuartel central</span>
            <span className={styles.infoValue}>{cfg.cuartel_direccion}</span>
            <span className={styles.infoSub}>{cfg.cuartel_barrio}</span>
          </div>
          <div className={styles.infoCard}>
            <span className={styles.infoLabel}>Atención</span>
            <span className={styles.infoValue}>{cfg.cuartel_telefono}</span>
            <span className={styles.infoSub}>{cfg.cuartel_horario}</span>
          </div>
          <div className={styles.infoCard}>
            <span className={styles.infoLabel}>Emergencias 24/7</span>
            <span className={`${styles.infoValue} ${styles.infoEmergency}`}>{cfg.cuartel_emergencias}</span>
            <span className={styles.infoSub}>Línea gratuita · cualquier operadora</span>
          </div>
        </div>
      </section>

      {/* Form + Topics */}
      <section className={styles.main}>
        <div className={styles.mainInner}>
          <div className={styles.left}>
            <div className="section-tag">Escríbenos</div>
            <h1 className={styles.leftTitle}>
              ¿En qué podemos<br />ayudarte?
            </h1>
            <p className={styles.leftDesc}>
              Para emergencias, marca {cfg.cuartel_emergencias}. Para todo lo demás, este es el lugar.
            </p>
            <ul className={styles.topics}>
              {topics.map(t => (
                <li key={t} className={styles.topicItem}>
                  <span className={styles.topicArrow}>›</span>{t}
                </li>
              ))}
            </ul>
            <div className={styles.contactInfo}>
              <a href={`mailto:${cfg.cuartel_email}`} className={styles.contactEmail}>
                {cfg.cuartel_email}
              </a>
            </div>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            {error   && <div className={styles.errorMsg}>{error}</div>}
            {success && <div className={styles.successMsg}>✓ {success}</div>}

            <div className={styles.formGrid}>
              <div>
                <label className={styles.label}>Nombre</label>
                <input className={styles.input} placeholder="Tu nombre"
                  value={nombre} onChange={e => setNombre(e.target.value)} required />
              </div>
              <div>
                <label className={styles.label}>Correo</label>
                <input className={styles.input} type="email" placeholder="tu@correo.bo"
                  value={correo} onChange={e => setCorreo(e.target.value)} required />
              </div>
            </div>

            <div className={styles.formGrid}>
              <div>
                <label className={styles.label}>Teléfono</label>
                <input className={styles.input} placeholder="+591"
                  value={telefono} onChange={e => setTelefono(e.target.value)} />
              </div>
              <div>
                <label className={styles.label}>Tema</label>
                <select className={styles.select} value={tema} onChange={e => setTema(e.target.value)}>
                  {temas.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className={styles.formFull}>
              <label className={styles.label}>Mensaje</label>
              <textarea className={styles.textarea} placeholder="Cuéntanos qué necesitas..."
                value={mensaje} onChange={e => setMensaje(e.target.value)} required />
            </div>

            <button type="submit" className={styles.submitBtn} disabled={sending}>
              {sending ? 'Enviando…' : 'Enviar mensaje →'}
            </button>
          </form>
        </div>
      </section>

      {/* Mapa dinámico */}
      <section className={styles.mapSection}>
        <div className={styles.mapInner}>
          <h2 className={styles.mapTitle}>{cfg.cuartel_nombre}</h2>
          <p className={styles.mapAddr}>{cfg.cuartel_direccion} · {cfg.cuartel_barrio}</p>
          <div className={styles.mapFrame}>
            <iframe
              title={cfg.cuartel_nombre}
              src={mapFallback}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <a
            href={`https://www.google.com/maps?q=${cfg.cuartel_lat},${cfg.cuartel_lng}`}
            target="_blank" rel="noreferrer"
            className={styles.mapLink}
          >
            Abrir en Google Maps →
          </a>
        </div>
      </section>
    </main>
  );
}
