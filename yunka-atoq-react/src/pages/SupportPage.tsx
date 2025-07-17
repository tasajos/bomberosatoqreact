// src/pages/SupportPage.tsx

import styles from "./SupportPage.module.css";

export default function SupportPage() {
  return (
    <main>
      {/* Sección del Título */}
      <div className={styles.heroSection}>
        <h1 className={styles.title}>Apoyos</h1>
        <p className={styles.subtitle}>
          Actividades voluntarias eventuales para la realización de objetivos específicos.
        </p>
      </div>

      {/* Sección del Contenido */}
      <div className={styles.content}>
        {/* Banner */}
        <div className={styles.bannerContainer}>
          <img
            src="/apoyos/att4.png"
            alt="Banner Apoyos"
            className={styles.banner}
          />
        </div>

        {/* Texto */}
        <div className={styles.textContent}>
          <p>
            El apoyo se refiere a actividades voluntarias eventuales que
            surgen para colaborar en tareas puntuales, como logística,
            eventos benéficos o campañas de sensibilización.
          </p>
          <p>
            Cada aporte, por pequeño que sea, nos ayuda a seguir cumpliendo
            nuestra misión de salvamento, rescate y cuidado del medio ambiente.
          </p>
        </div>

        {/* Roadmap */}
        <div className={styles.roadmap}>
          <h2 className={styles.roadmapTitle}>Nuestras acciones</h2>
          <div className={styles.roadmapSteps}>
            <div className={styles.roadmapStep}>
              <div className={styles.stepIcon}>1</div>
              <h3>Identificación de Necesidades</h3>
              <p>Detectamos áreas donde se requiere apoyo voluntario.</p>
            </div>
            <div className={styles.roadmapStep}>
              <div className={styles.stepIcon}>2</div>
              <h3>Planificación</h3>
              <p>Organizamos las actividades y asignamos recursos.</p>
            </div>
            <div className={styles.roadmapStep}>
              <div className={styles.stepIcon}>3</div>
              <h3>Ejecución</h3>
              <p>Llevamos a cabo las actividades con el apoyo de voluntarios.</p>
            </div>
            <div className={styles.roadmapStep}>
              <div className={styles.stepIcon}>4</div>
              <h3>Evaluación</h3>
              <p>Analizamos los resultados y mejoramos continuamente.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}