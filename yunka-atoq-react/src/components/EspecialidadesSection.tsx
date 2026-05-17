import styles from './EspecialidadesSection.module.css';

const especialidades = [
  {
    img: '/especialidades/FuegoYA.png',
    name: 'Fuego',
    desc: 'Ataque, control y extinción de incendios estructurales, vehiculares y forestales',
  },
  {
    img: '/especialidades/Administracion.png',
    name: 'Administración',
    desc: 'Gestión institucional, logística operativa, recursos humanos y coordinación de la compañía.',
  },
  {
    img: '/especialidades/SoporteVitalYA.png',
    name: 'Soporte Vital',
    desc: 'Atención prehospitalaria, soporte vital básico y avanzado, trauma y traslado con convenio Hospital Viedma.',
  },
  {
    img: '/especialidades/rescate_animal.png',
    name: 'Guardianes de la Naturaleza',
    desc: 'Rescate animal, conservación ambiental e intervención en ecosistemas afectados por incendios o desastres.',
  },
  {
    img: '/especialidades/ciencia_inve_tecn.png',
    name: 'Ciencia e Investigación',
    desc: 'Desarrollo tecnológico, investigación aplicada y formación científica para mejorar la respuesta operativa.',
  },
  {
    img: '/especialidades/busqueda_rescate.png',
    name: 'Búsqueda y Rescate',
    desc: 'Rescate en estructuras colapsadas, alta montaña y espacios confinados.',
  },
];

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
          {especialidades.map(({ img, name, desc }) => (
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
