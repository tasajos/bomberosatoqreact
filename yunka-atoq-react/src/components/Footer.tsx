// src/components/Footer.tsx
import styles from './Footer.module.css';

function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className={styles.footer}>
      <p>&copy; {currentYear} Yunka Atoq - Bomberos Voluntarios. Todos los derechos reservados.</p>
    </footer>
  );
}
export default Footer;