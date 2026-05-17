import { Link } from 'react-router-dom';
import styles from './RecruitSection.module.css';

const reqs = [
  { value: '18+', label: 'Mayor de edad' },
  { value: '6 m', label: 'Entrenamiento gratis' },
  { value: '1 / sem', label: 'Guardias mínimas' },
  
];

export default function RecruitSection() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <div className="section-tag section-tag--light">05 — Únete</div>
          <h2 className={styles.title}>
            No necesitamos<br />héroes. Necesitamos<br />vecinos<br />comprometidos.
          </h2>
          <p className={styles.desc}>
            Cuarenta y dos plazas abiertas para la convocatoria 2026. Entrenamiento gratuito de seis meses, y un compromiso: una guardia semanal.
          </p>
          <div className={styles.ctas}>
            <Link to="/voluntarios" className="btn-primary">Postular ahora →</Link>
            <Link to="/voluntarios" className="btn-secondary btn-secondary--light">Ver programa</Link>
          </div>
        </div>

        <div className={styles.grid}>
          {reqs.map(({ value, label }) => (
            <div key={label} className={styles.req}>
              <div className={styles.reqValue}>{value}</div>
              <div className={styles.reqLabel}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
