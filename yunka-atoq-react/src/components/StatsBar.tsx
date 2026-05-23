import styles from './StatsBar.module.css';

const stats = [
  {
    value: '30',
    label: 'Operaciones Locales',
    desc: 'Atenciones en el valle metropolitano de Cochabamba.',
    accent: '#C41E1E',
  },
  {
    value: '04',
    label: 'Operaciones Nacionales',
    desc: 'Despliegues fuera del departamento en apoyo interinstitucional.',
    accent: '#f59e0b',
  },
  {
    value: '03',
    label: 'Capacitación Internacional',
    desc: 'Cursos y entrenamientos con instrucción internacional certificada.',
    accent: '#38bdf8',
  },
];

export default function StatsBar() {
  return (
    <section className={styles.bar}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <div className={styles.tag}>Alcance operacional</div>
          <h2 className={styles.title}>Números que<br />nos respaldan.</h2>
        </div>

        <div className={styles.grid}>
          {stats.map(({ value, label, desc, accent }) => (
            <div key={label} className={styles.card}>
              <div className={styles.accent} style={{ background: accent }} />
              <div className={styles.value} style={{ color: accent }}>{value}</div>
              <div className={styles.label}>{label}</div>
              <p className={styles.desc}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
