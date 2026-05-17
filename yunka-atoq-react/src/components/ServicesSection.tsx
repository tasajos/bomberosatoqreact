import { Link } from 'react-router-dom';
import styles from './ServicesSection.module.css';

const services = [
  { num: '01', title: 'Incendios estructurales', desc: 'Respuesta a incendios en vivienda, comercio e industria. Equipos de ataque, ventilación y rescate.' },
  { num: '02', title: 'Incendios forestales', desc: 'Brigada especializada en el Tunari y zonas rurales. Líneas de control y combate sostenido.' },
  { num: '03', title: 'Atención prehospitalaria', desc: 'Soporte vital básico, trauma y traslado. Convenio con Hospital Viedma y red de salud.' },
  { num: '04', title: 'Rescate vehicular', desc: 'Liberación de víctimas en accidentes de tránsito con equipo hidráulico de descarcelación.' },
  { num: '05', title: 'Materiales peligrosos', desc: 'Contención y descontaminación de fugas químicas, combustibles y materiales industriales.' },
  { num: '06', title: 'Búsqueda y rescate', desc: 'Estructuras colapsadas, alta montaña y víctimas en espacios confinados. Equipo USAR.' },
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
          {services.map(({ num, title, desc }) => (
            <div key={num} className={styles.card}>
              <div>
                <div className={styles.cardNum}>{num}</div>
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
