import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './ContactPage.module.css';

const topics = [
  'Solicitar curso o capacitación',
  'Coordinar visita guiada',
  'Información para empresas',
  'Prensa y comunicación',
  'Quejas, sugerencias y reconocimientos',
];

const temas = ['Capacitación', 'Visita guiada', 'Empresas', 'Prensa', 'Sugerencia', 'Otro'];

export default function ContactPage() {
  const [nombre, setNombre]   = useState('');
  const [correo, setCorreo]   = useState('');
  const [telefono, setTelefono] = useState('');
  const [tema, setTema]       = useState('Capacitación');
  const [mensaje, setMensaje] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true); setError('');
    try {
      await new Promise(r => setTimeout(r, 800));
      setSuccess(true);
    } catch {
      setError('Error al enviar. Por favor intenta de nuevo.');
    } finally {
      setSending(false);
    }
  };

  return (
    <main>
      {/* Info strip */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.infoCard}>
            <span className={styles.infoLabel}>Cuartel central</span>
            <span className={styles.infoValue}>Av. Heroínas #1456</span>
            <span className={styles.infoSub}>Cercado · Cochabamba</span>
          </div>
          <div className={styles.infoCard}>
            <span className={styles.infoLabel}>Atención</span>
            <span className={styles.infoValue}>+591 4 422 0000</span>
            <span className={styles.infoSub}>Lunes a viernes · 8:00 – 18:00</span>
          </div>
          <div className={styles.infoCard}>
            <span className={styles.infoLabel}>Emergencias 24/7</span>
            <span className={`${styles.infoValue} ${styles.infoEmergency}`}>119</span>
            <span className={styles.infoSub}>Línea gratuita · cualquier operadora</span>
          </div>
        </div>
      </section>

      {/* Form + Topics */}
      <section className={styles.main}>
        <div className={styles.mainInner}>
          {/* Left */}
          <div>
            <div className="section-tag">Escríbenos</div>
            <h1 className={styles.leftTitle}>
              ¿En qué podemos<br />ayudarte?
            </h1>
            <p className={styles.leftDesc}>
              Para emergencias, marca 119. Para todo lo demás, este es el lugar.
            </p>
            <ul className={styles.topics}>
              {topics.map(t => (
                <li key={t} className={styles.topicItem}>
                  <span className={styles.topicArrow}>›</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Form */}
          <form className={styles.form} onSubmit={handleSubmit}>
            {error && <div className={styles.errorMsg}>{error}</div>}

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

            {success
              ? <div className={styles.successMsg}>
                  ✓ Mensaje enviado. Te responderemos en 48 horas hábiles.
                </div>
              : <button type="submit" className={styles.submitBtn} disabled={sending}>
                  {sending ? 'Enviando…' : 'Enviar mensaje →'}
                </button>
            }
          </form>
        </div>
      </section>

      {/* Mapa */}
      <section className={styles.mapSection}>
        <div className={styles.mapInner}>
          <h2 className={styles.mapTitle}>Nuestra ubicación</h2>
          <div className={styles.mapFrame}>
            <iframe
              title="Cuartel Yunka Atoq"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3787.7!2d-66.1568!3d-17.3935!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x93e2e8b5a6a5b5a5%3A0x1b2c3d4e5f6a7b8c!2sAv.+Hero%C3%ADnas+1456%2C+Cochabamba!5e0!3m2!1ses!2sbo!4v1"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
