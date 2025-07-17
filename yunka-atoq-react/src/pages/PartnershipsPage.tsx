// src/pages/PartnershipsPage.tsx
import React from "react";
import styles from "./PartnershipsPage.module.css";

export default function PartnershipsPage() {
  return (
    // El div principal y Header/Footer los maneja App.tsx
    // Solo necesitamos el contenido principal de la página.
    <main className={styles.pageWrapper}>
      {/* Sección del Título */}
      <div className={styles.heroSection}>
        <h1 className={styles.title}>Convenios</h1>
        <p className={styles.subtitle}>
          Trabajando de manera conjunta y coordinada con distintas instituciones.
        </p>
      </div>

      {/* Sección del Contenido */}
      <div className={styles.content}>
        {/* Banner */}
        <div className={styles.bannerContainer}>
          <img
            src="/trabajo/rr3.jpg"
            alt="Banner Convenios"
            className={styles.banner}
          />
        </div>

        {/* Texto */}
        <div className={styles.textContent}>
          <p>
            Los convenios representan el trabajo conjunto y coordinado con distintas
            instituciones para beneficio mutuo. Mediante estos acuerdos, ampliamos
            nuestra capacidad de acción y garantizamos mejores resultados en
            salvamento, rescate y protección ambiental.
          </p>
          <p>
            Agradecemos a todas las entidades que confían en nuestro compromiso y
            se suman a nuestras iniciativas. ¡Juntos podemos lograr más!
          </p>
        </div>

        {/* Tarjetas de Instituciones */}
        <div className={styles.institutionsGrid}>
          {/* Tarjeta 1 */}
          <div className={styles.institutionCard}>
            <img src="/convenios/multinacional.png" alt="Empresas Privadas" className={styles.institutionLogo} />
            <h3>Empresas Privadas</h3>
            <p>Apoyo bilateral entre las empresas privadas y nuestra institucion</p>
          </div>
          {/* Tarjeta 2 */}
          <div className={styles.institutionCard}>
            <img src="/convenios/hachas.png" alt="Alianzas con Bomberos" className={styles.institutionLogo} />
            <h3>Alianzas con Bomberos Voluntarios</h3>
            <p>Apoyo y cooperacion entre las distintas unidades hermanas de Bomberos Voluntarios</p>
          </div>
          {/* Tarjeta 3 */}
          <div className={styles.institutionCard}>
            <img src="/convenios/colaboracion-colectiva.png" alt="Instituciones Publicas" className={styles.institutionLogo} />
            <h3>Instituciones Publicas</h3>
            <p>El apoyo para proteger el medio ambiente, fauna y flora</p>
          </div>
          {/* ... (Puedes seguir añadiendo las otras tarjetas de la misma forma) ... */}
        </div>
      </div>
    </main>
  );
}