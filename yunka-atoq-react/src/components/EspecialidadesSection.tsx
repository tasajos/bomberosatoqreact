import styles from './EspecialidadesSection.module.css';
import { ESPECIALIDADES } from '../data/especialidades';

export default function EspecialidadesSection() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <div>
            <div className="section-tag">03 — Especialidades</div>
            <h2 className={styles.title}>
              Seis unidades,<br />un solo propósito.
            </h2>
          </div>
        </div>

        <div className={styles.grid}>
          {ESPECIALIDADES.map(({ img, name, desc }) => (
            <div key={name} className={styles.card}>
              <div className={styles.logoWrap}>
                <img src={img} alt={name} />
              </div>
              <div className={styles.cardBody}>
                <div className={styles.cardName}>{name}</div>
                <p className={styles.cardDesc}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
