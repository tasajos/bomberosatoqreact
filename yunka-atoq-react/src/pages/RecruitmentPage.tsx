// src/pages/RecruitmentPage.tsx

import styles from "./RecruitmentPage.module.css";

export default function RecruitmentPage() {
  return (
    <main>
      {/* Sección del Título */}
      <div className={styles.heroSection}>
        <h1 className={styles.title}>Voluntarios</h1>
        <p className={styles.subtitle}>
          Las actividades de voluntario abarcan todas las iniciativas en las que
          participan nuestros colaboradores.
        </p>
      </div>

      {/* Sección del Contenido */}
      <div className={styles.content}>
        {/* Banner */}
        <div className={styles.bannerContainer}>
          <img
            src="/volunt/att5.png"
            alt="Banner Voluntarios"
            className={styles.banner}
          />
        </div>

        {/* Texto */}
        <div className={styles.textContent}>
          <p>
            Ser voluntario significa comprometerse con la misión de nuestra
            institución y poner en práctica valores como la solidaridad y la
            cooperación. Nuestros voluntarios participan en rescates, campañas
            de reforestación, talleres de educación ambiental y más.
          </p>
          <p>
            ¡Únete a nuestro equipo y sé parte del cambio que deseas ver en el
            mundo!
          </p>
        </div>

        {/* Sección de Información */}
        <div className={styles.infoSection}>
          {/* Requisitos */}
          <div className={styles.infoCard}>
            <h2 className={styles.infoTitle}>Requisitos Mínimos</h2>
            <ul className={styles.infoList}>
              <li>Ser mayor de 18 años.</li>
              <li>Disponibilidad de tiempo para participar en actividades.</li>
              <li>Compromiso con los valores de la institución.</li>
              <li>Participar en el proceso de capacitación inicial.</li>
            </ul>
          </div>

          {/* Beneficios */}
          <div className={styles.infoCard}>
            <h2 className={styles.infoTitle}>Beneficios</h2>
            <ul className={styles.infoList}>
              <li>Capacitación continua en áreas de rescate y medio ambiente.</li>
              <li>Experiencia en trabajo en equipo y liderazgo.</li>
              <li>Certificados de participación y reconocimiento.</li>
              <li>Oportunidades de crecimiento personal y profesional.</li>
            </ul>
          </div>

          {/* Ventajas */}
          <div className={styles.infoCard}>
            <h2 className={styles.infoTitle}>Ventajas</h2>
            <ul className={styles.infoList}>
              <li>Formar parte de una comunidad comprometida.</li>
              <li>Contribuir directamente a la protección del medio ambiente.</li>
              <li>Acceso a eventos y actividades exclusivas.</li>
              <li>Networking con profesionales y voluntarios.</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}