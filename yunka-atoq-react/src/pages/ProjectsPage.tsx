// src/pages/ProjectsPage.tsx

import styles from "./ProjectsPage.module.css";

// 1. Creamos un arreglo con los datos de los proyectos para no repetir código
const projectsData = [
  {
    id: 1,
    title: "Rescate Animal",
    description: "Campaña para rescatar y rehabilitar animales en situación de riesgo.",
    image: "/convenios/asilo-animal.png",
    progress: 60,
  },
  {
    id: 2,
    title: "Reforestación",
    description: "Plantación de árboles para recuperar áreas deforestadas.",
    image: "/proyectos/reforestacion.png",
    progress: 40,
  },
  {
    id: 3,
    title: "Equipamiento",
    description: "Equipamiento para asistir a las emergencias, rescates e incendios.",
    image: "/proyectos/bombero_equipamiento.png",
    progress: 25,
  },
];

export default function ProjectsPage() {
  const enviarMensajeWhatsApp = (proyecto: string) => {
    const numero = "+59168503758";
    const mensaje = `Hola, quiero apoyar el proyecto: ${proyecto}. ¿Cómo puedo ayudar?`;
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");
  };

  return (
    <main>
      {/* Sección del Título */}
      <div className={styles.heroSection}>
        <h1 className={styles.title}>Proyectos</h1>
        <p className={styles.subtitle}>
          Gestión de proyectos en múltiples especialidades con un objetivo específico.
        </p>
      </div>

      {/* Sección del Contenido */}
      <div className={styles.content}>
        {/* Banner */}
        <div className={styles.bannerContainer}>
          <img
            src="/volunt/att6.png"
            alt="Banner Proyectos"
            className={styles.banner}
          />
        </div>

        {/* Texto */}
        <div className={styles.textContent}>
          <p>
            Nuestros voluntarios realizan y gestionan proyectos en diversas
            especialidades, desde la planificación de rescates hasta la
            implementación de programas de conservación ambiental. Cada
            proyecto se desarrolla con un objetivo específico, logrando
            resultados tangibles para la comunidad.
          </p>
          <p>
            Tu apoyo y participación son clave para que estos proyectos
            alcancen el mayor impacto posible. ¡Súmate a nosotros!
          </p>
        </div>

        {/* Lista de Proyectos (ahora se renderiza con .map) */}
        <div className={styles.projectsGrid}>
          {projectsData.map((project) => (
            <div key={project.id} className={styles.projectCard}>
              <img
                src={project.image}
                alt={project.title}
                className={styles.projectImage}
              />
              <h2 className={styles.projectTitle}>{project.title}</h2>
              <p className={styles.projectDescription}>{project.description}</p>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${project.progress}%` }}></div>
              </div>
              <p className={styles.progressText}>{project.progress}% de la meta alcanzada</p>
              <button
                className={styles.whatsappButton}
                onClick={() => enviarMensajeWhatsApp(project.title)}
              >
                Impulsar este proyecto
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}