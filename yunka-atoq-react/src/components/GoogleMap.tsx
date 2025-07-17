// src/components/GoogleMap.tsx
import styles from './GoogleMap.module.css';

function GoogleMap() {
  // Usamos el código iframe que nos da Google Maps
  // Nota: los atributos en JSX usan camelCase, como 'allowFullScreen'
  return (
    <div className={styles.mapContainer}>
      <iframe 
        src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d574.3259556691191!2d-66.12223106282717!3d-17.368535603407885!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e1!3m2!1ses-419!2sbo!4v1752795518062!5m2!1ses-419!2sbo" 
        width="600" 
        height="450" 
        className={styles.mapIframe} // Usamos una clase para hacerlo responsive
        allowFullScreen={true} 
        loading="lazy" 
        referrerPolicy="no-referrer-when-downgrade"
      ></iframe>
    </div>
  );
}

export default GoogleMap;