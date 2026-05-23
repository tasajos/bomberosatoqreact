import styles from './FloatingWhatsAppButton.module.css';

const PHONE   = '59168503758';
const MESSAGE = 'Hola Bomberos Atoq, saludos desde el sitio https://bomberosatoq.org, tengo la siguiente consulta';
const WA_URL  = `https://wa.me/${PHONE}?text=${encodeURIComponent(MESSAGE)}`;

export default function FloatingWhatsAppButton() {
  return (
    <a
      href={WA_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.btn}
      aria-label="Contactar por WhatsApp"
    >
      {/* WhatsApp SVG oficial */}
      <svg className={styles.icon} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.163 0 0 7.163 0 16c0 2.83.738 5.484 2.027 7.793L0 32l8.418-2.004A15.94 15.94 0 0016 32c8.837 0 16-7.163 16-16S24.837 0 16 0z" fill="#25D366"/>
        <path d="M23.507 19.907c-.32-.16-1.893-.934-2.187-1.04-.293-.107-.507-.16-.72.16-.214.32-.828 1.04-1.015 1.254-.187.214-.374.24-.694.08-.32-.16-1.352-.499-2.575-1.589-.951-.847-1.593-1.893-1.779-2.213-.187-.32-.02-.493.14-.652.144-.143.32-.374.48-.561.16-.187.213-.32.32-.534.107-.213.053-.4-.027-.56-.08-.16-.72-1.733-.987-2.373-.26-.624-.524-.539-.72-.549l-.614-.01c-.213 0-.56.08-.853.4-.293.32-1.12 1.094-1.12 2.667 0 1.573 1.147 3.093 1.307 3.307.16.213 2.253 3.44 5.46 4.826.763.33 1.36.527 1.823.674.766.244 1.464.21 2.015.127.615-.092 1.893-.774 2.16-1.52.267-.747.267-1.387.187-1.52-.08-.134-.293-.214-.614-.374z" fill="#fff"/>
      </svg>

      <span className={styles.label}>¿Consultas? WhatsApp</span>
      <span className={styles.pulse} />
    </a>
  );
}
