import { Link } from 'react-router-dom';
import styles from './HistorySection.module.css';

const milestones = [
  {
    num: '01',
    year: '2008 · El origen',
    text: 'Catorce vecinos del Distrito 9 organizaron la primera brigada después del incendio del mercado La Pampa. Sin recursos del Estado, compraron su primer carro de bomberos con rifas y kermeses durante dieciocho meses.',
  },
  {
    num: '02',
    year: '2014 · Cuartel central',
    text: 'Inauguración del cuartel propio en Av. Heroínas, con capacidad para cuatro vehículos y sala de entrenamiento. Primer convenio con el Hospital Viedma para atención prehospitalaria.',
  },
  {
    num: '03',
    year: '2019 · Certificación NFPA',
    text: 'El cuerpo operativo completo obtiene certificación internacional NFPA 1001 en asociación con la Academia de Bomberos de Santa Cruz, siendo la primera compañía voluntaria de Bolivia en lograrlo.',
  },
  {
    num: '04',
    year: '2024 · Equipo USAR',
    text: 'Activación del equipo de búsqueda y rescate en estructuras colapsadas (USAR), con capacidad de intervención en alta montaña y espacios confinados.',
  },
];

export default function HistorySection() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <div className="section-tag section-tag--light">01 — Identidad</div>
          <h2 className={styles.title}>
            El zorro<br />del valle
          </h2>
          <p className={styles.body}>
            Vigilante, rápido y comprometido con su territorio. El zorro del valle andino es el símbolo de quien conoce cada rincón de su tierra y la defiende. Somos eso para Cochabamba.
          </p>
          <Link to="/nosotros" className="btn-secondary btn-secondary--light">
            Conocer nuestra historia →
          </Link>
        </div>

        <div className={styles.timeline}>
          {milestones.map(({ num, year, text }) => (
            <div key={num} className={styles.timelineItem}>
              <span className={styles.timelineNum}>{num}</span>
              <div className={styles.timelineContent}>
                <div className={styles.timelineYear}>{year}</div>
                <p className={styles.timelineText}>{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
