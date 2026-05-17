import { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './HistorySection.module.css';

const milestones = [
  {
    num: '01',
    year: '2023 · Nacimiento',
    text: 'Un grupo de voluntarios con pasión por el servicio se reúne para formar las bases de lo que se convertiría la Fundación Yunka Atoq.',
  },
  {
    num: '02',
    year: '2023 · Primer apoyo oficial',
    text: 'Realizamos nuestro primer apoyo exitoso, consolidando al equipo y definiendo nuestro propósito de servicio.',
  },
  {
    num: '03',
    year: '5 Ago 2023 · Laguna Corani',
    text: 'Participación de apoyo y prácticas en espacios confinados. Instrucción y capacitación en espacios confinados en Laguna Corani.',
  },
  {
    num: '04',
    year: '16 Sep 2023 · CPI · S130 · S190',
    text: 'Inicio de capacitación y certificación en los cursos CPI, S130 y S190 en conjunto con otras unidades de bomberos voluntarios.',
  },
  {
    num: '05',
    year: '5 May 2024 · Desafío de la Mochila',
    text: 'Nuestros bomberos voluntarios participan del Desafío de la Mochila, prueba física de resistencia y capacidad operativa.',
  },
  {
    num: '06',
    year: '12 Sep 2024 · Río Blanco, Santa Cruz',
    text: 'Fuerza de tarea conjunta combatiendo incendios forestales en Río Blanco, Santa Cruz — Chiquitanía. 2da Emergencia Nacional.',
  },
  {
    num: '07',
    year: '20 Sep 2024 · Riberalta, Beni',
    text: 'La 3ra Patrulla de Bomberos Voluntarios Yunka Atoq rumbo al Beni con insumos esenciales para el combate de incendios forestales.',
  },
  {
    num: '08',
    year: '18 Dic 2024 · Reconocimiento UCB',
    text: 'Reconocimiento de la Fundación Sedes Sapientiae y la UCB Cochabamba por las operaciones de sofocación en el Oriente Boliviano.',
  },
  {
    num: '09',
    year: '18 Abr 2025 · Muro de la Voluntad',
    text: 'Plaqueta de reconocimiento en el Muro de la Voluntad en Viernes Santo, símbolo de unidad, sacrificio y compromiso con Cochabamba.',
  },
  {
    num: '10',
    year: '11 Jul 2025 · Asamblea Legislativa',
    text: 'Reconocimiento institucional en la 2da Convención Nacional de Voluntariados en Bolivia, Asamblea Legislativa Plurinacional.',
  },
  {
    num: '11',
    year: '18 Jul 2025 · Personería Jurídica',
    text: 'La Fundación de Voluntarios de Salvamento, Rescate y Protección Ambiental Yunka Atoq obtiene oficialmente su Personería Jurídica.',
  },
];

const PAGE_SIZE = 5;
const totalPages = Math.ceil(milestones.length / PAGE_SIZE);

export default function HistorySection() {
  const [page, setPage] = useState(0);

  const visible = milestones.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <div className="section-tag section-tag--light">01 — Identidad</div>
          <h2 className={styles.title}>
            El zorro<br />del valle
          </h2>
          <p className={styles.body}>
            Vigilante, rápido y comprometido con su territorio. Desde 2023 respondemos a emergencias en Cochabamba y Bolivia con voluntad, formación y equipamiento propio.
          </p>
          <Link to="/nosotros" className="btn-secondary btn-secondary--light">
            Conocer nuestra historia →
          </Link>
        </div>

        <div>
          <div className={styles.timeline}>
            {visible.map(({ num, year, text }) => (
              <div key={num} className={styles.timelineItem}>
                <span className={styles.timelineNum}>{num}</span>
                <div className={styles.timelineContent}>
                  <div className={styles.timelineYear}>{year}</div>
                  <p className={styles.timelineText}>{text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Paginador */}
          <div className={styles.paginator}>
            <button
              className={styles.pageBtn}
              onClick={() => setPage(p => p - 1)}
              disabled={page === 0}
              aria-label="Página anterior"
            >
              ←
            </button>

            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                className={`${styles.pageNum} ${i === page ? styles.pageNumActive : ''}`}
                onClick={() => setPage(i)}
                aria-label={`Página ${i + 1}`}
              >
                {i + 1}
              </button>
            ))}

            <button
              className={styles.pageBtn}
              onClick={() => setPage(p => p + 1)}
              disabled={page === totalPages - 1}
              aria-label="Página siguiente"
            >
              →
            </button>

            <span className={styles.pageInfo}>
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, milestones.length)} de {milestones.length}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
