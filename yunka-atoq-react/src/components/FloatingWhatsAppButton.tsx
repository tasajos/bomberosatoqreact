// src/components/FloatingWhatsAppButton.tsx
import styles from './FloatingWhatsAppButton.module.css';

function FloatingWhatsAppButton() {
  const numero = "+59168503758"; // Tu número de WhatsApp
  const mensaje = "Hola, necesito más información.";
  const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={styles.whatsappButton}>
      <img src="/icons/whatsapp.svg" alt="WhatsApp" />
    </a>
  );
}
export default FloatingWhatsAppButton;