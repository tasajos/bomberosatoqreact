// src/pages/DonationsPage.tsx
import React from "react";
import styles from "./DonationsPage.module.css";

// Nota: El código original usaba clases de Tailwind CSS como "flex", "container", etc.
// Esas clases no funcionarán aquí a menos que instalemos y configuremos Tailwind.
// Por ahora, nos basaremos en los estilos de Donaciones.module.css.

export default function DonationsPage() {
  const enviarMensajeWhatsApp = (monto: string) => {
    const numero = "+59168503758";
    const mensaje = `Hola, quiero donar ${monto} para apoyar su causa.`;
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");
  };

  return (
    <main className={styles.pageContainer}>
      {/* Hero Section */}
      <div className={styles.heroSection}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>¡Tu ayuda hace la diferencia!</h1>
          <p className={styles.heroSubtitle}>Con tu donación, podemos salvar vidas y proteger el medio ambiente.</p>
          <div className={styles.donationButtons}>
            <button className={styles.donationButton} onClick={() => enviarMensajeWhatsApp("Bs10")}>Donar Bs10</button>
            <button className={styles.donationButton} onClick={() => enviarMensajeWhatsApp("Bs25")}>Donar Bs25</button>
            <button className={styles.donationButton} onClick={() => enviarMensajeWhatsApp("Bs50")}>Donar Bs50</button>
            <button className={styles.donationButton} onClick={() => enviarMensajeWhatsApp("un monto personalizado")}>Otro monto</button>
          </div>
        </div>
        <img src="/trabajo/rrblanco.jpg" alt="Hero Donaciones" className={styles.heroImage} />
      </div>

      {/* Sección de Objetivos */}
      <div className={styles.goalsSection}>
        <h2 className={styles.sectionTitle}>¿Para qué son las donaciones?</h2>
        <div className={styles.goalsGrid}>
          <div className={styles.goalCard}>
            <img src="/trabajo/bote-de-salvamentox.png" alt="Rescate" />
            <h3>Rescate y Salvamento</h3>
            <p>Equipos y herramientas para rescates en situaciones de emergencia.</p>
          </div>
          <div className={styles.goalCard}>
            <img src="/trabajo/capacitacion.png" alt="Capacitación" />
            <h3>Capacitación</h3>
            <p>Formación de voluntarios y personal especializado en rescate y primeros auxilios.</p>
          </div>
          <div className={styles.goalCard}>
            <img src="/trabajo/ambiental.png" alt="Medio Ambiente" />
            <h3>Protección Ambiental</h3>
            <p>Proyectos para conservar y proteger el medio ambiente.</p>
          </div>
        </div>
      </div>

      {/* Agrega aquí las otras secciones como Testimonios y Progreso si lo deseas */}

    </main>
  );
}