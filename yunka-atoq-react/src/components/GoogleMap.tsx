// src/components/GoogleMap.tsx
import styles from './GoogleMap.module.css';

function GoogleMap() {
  // Usamos el código iframe que nos da Google Maps
  // Nota: los atributos en JSX usan camelCase, como 'allowFullScreen'
  return (
    <div className={styles.mapContainer}>
      <iframe 
        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3799.873216824734!2d-63.19793582494537!3d-17.75167687841964!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x93f1e7ff3a333333%3A0x8b7b4e3b7b3b3b3b!2sBomberos%20Voluntarios%20de%20Santa%20Cruz%20de%20la%20Sierra%20-%20UUBVSC!5e0!3m2!1ses-419!2sbo!4f13.1!5e0!3m2!1ses-419!2sbo" 
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