import styles from './FloatingWhatsAppButton.module.css';

function FloatingEmergencyButton() {
  const numero = '+59168503758';
  const url = `https://wa.me/${numero}?text=${encodeURIComponent('Hola, necesito información.')}`;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={styles.btn} aria-label="Contacto de emergencia WhatsApp">
      <span className={styles.label}>Emergencia · 68503758</span>
      <span className={styles.dot} />
    </a>
  );
}

export default FloatingEmergencyButton;
