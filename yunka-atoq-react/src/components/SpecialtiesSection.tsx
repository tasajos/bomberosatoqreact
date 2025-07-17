// src/components/SpecialtiesSection.tsx

import React from "react";
// CAMBIO 1: La ruta de importación ahora es local
import styles from "./SpecialtiesSection.module.css"; 

// CAMBIO 2: Cambié el nombre del componente para ser más descriptivo
const SpecialtiesSection = () => {
  const cardsData = [
    {
      title: "Fuego y Rescate",
      image: "/especialidades/FuegoYA.png",
      description:
        "Especializados en combatir incendios y realizar rescates en situaciones de emergencia. Nuestro equipo está entrenado para actuar rápidamente y salvar vidas",
    },
    {
      title: "Ciencia, Investigacion y Tecnologia",
      image: "/especialidades/CienciaYA.png",
      description:
        "Innovamos con tecnología y métodos científicos para mejorar la prevención y respuesta ante desastres. Contribuimos al desarrollo de soluciones sostenibles.",
    },
    {
      title: "Soporte Vital",
      image: "/especialidades/SoporteVitalYA.png",
      description:
        "Brindamos atención médica de emergencia y soporte vital en situaciones críticas. Nuestro objetivo es estabilizar a los afectados hasta su traslado a centros médicos.",
    },
    {
      title: "Administracion",
      image: "/especialidades/Administracion.png",
      description:
        "Gestionamos recursos, logística y coordinación para asegurar una respuesta eficiente en cada operación. La organización es clave para el éxito en emergencias.",
    },
    {
      title: "Busqueda y Rescate",
      image: "/especialidades/BusquedayRescate.png",
      description:
        "Especializados en localizar y rescatar personas en zonas de difícil acceso o en situaciones de desastre. Cada segundo cuenta para salvar vidas.",
    },
  ];

  return (
    <section className={styles.cardsSection} id="proyectos">
      <h1 className={styles.title}>NUESTRAS ESPECIALIDADES</h1>
      <div className={styles.cardsContainer}>
        {cardsData.map((card, index) => (
          <div key={index} className={styles.card}>
            <img
              src={card.image}
              alt={card.title}
              className={styles.cardImage}
            />
            <div className={styles.cardContent}>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default SpecialtiesSection;