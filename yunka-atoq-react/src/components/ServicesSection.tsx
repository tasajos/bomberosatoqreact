import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './ServicesSection.module.css';
import { serviciosApi, type Servicio } from '../services/api';
import { ServiceIcon } from '../utils/serviceIcons';

const FALLBACK: Servicio[] = [
  { id:1, numero:'01', titulo:'Incendios estructurales', descripcion:'Respuesta a incendios en vivienda, comercio e industria. Equipos de ataque, ventilación y rescate.', icono:'building-fire', capacidades:[], tags:[], activo:1, orden:1, created_at:'' },
  { id:2, numero:'02', titulo:'Incendios forestales',    descripcion:'Brigada especializada en el Tunari y zonas rurales. Líneas de control y combate sostenido.', icono:'forest-fire', capacidades:[], tags:[], activo:1, orden:2, created_at:'' },
  { id:3, numero:'03', titulo:'Atención prehospitalaria',descripcion:'Soporte vital básico, trauma y traslado. Convenio con Hospital Viedma y red de salud.', icono:'medical-cross', capacidades:[], tags:[], activo:1, orden:3, created_at:'' },
  { id:4, numero:'04', titulo:'Capacitación',            descripcion:'Formación continua para voluntarios y comunidad con certificaciones internacionales.', icono:'graduation', capacidades:[], tags:[], activo:1, orden:4, created_at:'' },
  { id:5, numero:'05', titulo:'Sistema de Comando de Incidentes', descripcion:'Coordinación táctica bajo el modelo SCI/ICS estandarizado.', icono:'command', capacidades:[], tags:[], activo:1, orden:5, created_at:'' },
  { id:6, numero:'06', titulo:'Búsqueda y rescate',      descripcion:'Estructuras colapsadas, alta montaña y espacios confinados. Equipo USAR.', icono:'search-rescue', capacidades:[], tags:[], activo:1, orden:6, created_at:'' },
];

export default function ServicesSection() {
  const [services, setServices] = useState<Servicio[]>(FALLBACK);

  useEffect(() => {
    serviciosApi.list().then(data => { if (data.length > 0) setServices(data); }).catch(() => {});
  }, []);

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
          {services.map(s => (
            <div key={s.id} className={styles.card}>
              <div>
                <div className={styles.cardTop}>
                  <span className={styles.cardNum}>{s.numero}</span>
                  <span className={styles.cardIcon}>
                    <ServiceIcon name={s.icono} size={40} />
                  </span>
                </div>
                <h3 className={styles.cardTitle}>{s.titulo}</h3>
                <p className={styles.cardDesc}>{s.descripcion}</p>
              </div>
              <span className={styles.cardArrow}>→</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
