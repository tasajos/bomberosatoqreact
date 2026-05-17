import { Link } from 'react-router-dom';
import styles from './TransparencySection.module.css';

const reports = [
  {
    year: 'Informe 2025',
    title: 'Rendición de cuentas anual',
    items: [
      { label: 'Ingresos totales', value: 'Bs 312.450' },
      { label: 'Donaciones', value: 'Bs 198.200' },
      { label: 'Gastos operativos', value: 'Bs 145.600' },
      { label: 'Inversión en equipos', value: 'Bs 89.300' },
    ],
  },
  {
    year: 'Informe 2024',
    title: 'Rendición de cuentas anual',
    items: [
      { label: 'Ingresos totales', value: 'Bs 285.100' },
      { label: 'Donaciones', value: 'Bs 172.400' },
      { label: 'Gastos operativos', value: 'Bs 138.900' },
      { label: 'Inversión en equipos', value: 'Bs 67.800' },
    ],
  },
  {
    year: 'Informe 2023',
    title: 'Rendición de cuentas anual',
    items: [
      { label: 'Ingresos totales', value: 'Bs 241.800' },
      { label: 'Donaciones', value: 'Bs 143.600' },
      { label: 'Gastos operativos', value: 'Bs 121.200' },
      { label: 'Inversión en equipos', value: 'Bs 52.100' },
    ],
  },
];

export default function TransparencySection() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <div>
            <div className="section-tag">04 — Transparencia</div>
            <h2 className={styles.title}>
              Tus donaciones,<br />auditadas y publicadas.
            </h2>
          </div>
          <Link to="/estadisticas" className={styles.reportBtn}>Ver informe completo →</Link>
        </div>

        <div className={styles.cards}>
          {reports.map(({ year, title, items }) => (
            <div key={year} className={styles.card}>
              <div className={styles.cardYear}>{year}</div>
              <div className={styles.cardTitle}>{title}</div>
              <div className={styles.cardItems}>
                {items.map(({ label, value }) => (
                  <div key={label} className={styles.cardItem}>
                    <span className={styles.itemLabel}>{label}</span>
                    <span className={styles.itemValue}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
