import { Link } from 'react-router-dom';
import styles from './StatsPage.module.css';

function formatDate() {
  return new Intl.DateTimeFormat('es-BO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date()).replace(/^\w/, c => c.toUpperCase());
}

const mainStats = [
  {
    value: '30',
    label: 'Operaciones\nLocales',
    desc: 'Atenciones en el área metropolitana de Cochabamba.',
    color: '#C41E1E',
  },
  {
    value: '04',
    label: 'Operaciones\nNacionales',
    desc: 'Despliegues en apoyo interinstitucional fuera del departamento.',
    color: '#f59e0b',
  },
  {
    value: '03',
    label: 'Capacitación\nInternacional',
    desc: 'Cursos y entrenamientos con certificación internacional.',
    color: '#38bdf8',
  },
];

const secondary = [
  { value: '12 min', label: 'Tiempo de respuesta', desc: 'Mediana en zona urbana' },
  { value: '100%',   label: 'Servicio voluntario',  desc: 'Sin fines de lucro' },
  { value: '24/7',   label: 'Disponibilidad',       desc: 'Guardia permanente' },
  { value: '2023',   label: 'Fundación',            desc: 'Cochabamba, Bolivia' },
];

export default function StatsPage() {
  const today = formatDate();

  return (
    <main>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.breadcrumb}>
            <Link to="/">Inicio</Link><span>/</span>Estadísticas
          </div>
          <h1 className={styles.heroTitle}>
            Datos públicos.<br />Decisiones públicas.
          </h1>
          <p className={styles.heroDesc}>
            Cada operativo se registra. Esta página refleja el historial real de actividad de la compañía desde su fundación.
          </p>
        </div>
      </section>

      {/* Dashboard principal */}
      <section className={styles.dashboard}>
        <div className={styles.dashInner}>
          <div className={styles.dashHeader}>
            <div className={styles.dashTag}>Resumen operacional · Historial</div>
            <div className={styles.dashDate}>{today}</div>
          </div>

          <div className={styles.mainGrid}>
            {mainStats.map(({ value, label, desc, color }) => (
              <div key={label} className={styles.mainCard}>
                <div className={styles.mainAccent} style={{ background: color }} />
                <div className={styles.mainValue} style={{ color }}>{value}</div>
                <div className={styles.mainLabel}>
                  {label.split('\n').map((line, i) => (
                    <span key={i}>{line}{i === 0 && <br />}</span>
                  ))}
                </div>
                <p className={styles.mainDesc}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats secundarias */}
      <section className={styles.secondary}>
        <div className={styles.secondaryInner}>
          {secondary.map(({ value, label, desc }) => (
            <div key={label} className={styles.secItem}>
              <div className={styles.secValue}>{value}</div>
              <div className={styles.secLabel}>{label}</div>
              <p className={styles.secDesc}>{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
