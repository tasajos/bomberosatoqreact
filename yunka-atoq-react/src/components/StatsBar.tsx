import { useEffect, useState } from 'react';
import styles from './StatsBar.module.css';
import { operativosApi, type Stats } from '../services/api';

const STATIC_STATS = [
  { value: '1.247', label: 'Operativos 2026', desc: 'Atenciones al día de hoy.' },
  { value: '45',    label: 'Voluntarios activos', desc: 'Cuerpo operativo + brigada de soporte.' },
  { value: '12',    label: 'Min · tiempo de respuesta', desc: 'Mediana en el área urbana.' },
  { value: '100%',  label: 'Servicio voluntario', desc: 'Sin fines de lucro.' },
];

export default function StatsBar() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    operativosApi.stats().catch(() => null).then(s => { if (s) setStats(s); });
  }, []);

  const items = stats
    ? [
        { value: stats.operativos_anio.toLocaleString('es-BO'), label: 'Operativos 2026', desc: 'Atenciones del 1º de enero al día de hoy.' },
        { value: '45', label: 'Voluntarios activos', desc: 'Cuerpo operativo + brigada de soporte.' },
        STATIC_STATS[2],
        STATIC_STATS[3],
      ]
    : STATIC_STATS;

  return (
    <section className={styles.bar}>
      <div className={styles.inner}>
        {items.map(({ value, label, desc }) => (
          <div key={label} className={styles.item}>
            <div className={styles.value}>{value}</div>
            <div className={styles.label}>{label}</div>
            <p className={styles.desc}>{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
