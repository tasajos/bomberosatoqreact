import { Link } from 'react-router-dom';
import styles from './Footer.module.css';

const compania = [
  { to: '/nosotros', label: 'Nuestra historia' },
  { to: '/servicios', label: 'Servicios' },
  { to: '/estadisticas', label: 'Transparencia' },
  { to: '/estadisticas', label: 'Operativos' },
  { to: '/noticias', label: 'Noticias' },
];

const participar = [
  { to: '/voluntarios', label: 'Únete como voluntario' },
  { to: '/donaciones', label: 'Hacer una donación' },
  { to: '/capacitaciones', label: 'Capacitaciones' },
  { to: '/donaciones', label: 'Apadrina un equipo' },
  { to: '/login', label: 'Acceso voluntarios' },
];

const social = [
  { label: 'fb', href: '#' },
  { label: 'ig', href: '#' },
  { label: 'tk', href: '#' },
  { label: 'yt', href: '#' },
];

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.top}>
        <div className={styles.brand}>
          <div className={styles.brandLogo}>
            <img src="/yunka_atoq_log.png" alt="Logo" className={styles.brandImg} />
            <span className={styles.brandText}>
              <span className={styles.brandName}>Yunka Atoq</span>
              <span className={styles.brandSub}>Bomberos Voluntarios</span>
            </span>
          </div>
          <p className={styles.brandDesc}>
            El zorro del valle, vigilante. Compañía de bomberos voluntarios al servicio de Cochabamba desde 2023.
          </p>
          <div className={styles.social}>
            {social.map(({ label, href }) => (
              <a key={label} href={href} className={styles.socialBtn} target="_blank" rel="noreferrer">
                {label}
              </a>
            ))}
          </div>
        </div>

        <div className={styles.col}>
          <h4 className={styles.colTitle}>Compañía</h4>
          <ul className={styles.colList}>
            {compania.map(({ to, label }) => (
              <li key={label}><Link to={to}>{label}</Link></li>
            ))}
          </ul>
        </div>

        <div className={styles.col}>
          <h4 className={styles.colTitle}>Participar</h4>
          <ul className={styles.colList}>
            {participar.map(({ to, label }) => (
              <li key={label}><Link to={to}>{label}</Link></li>
            ))}
          </ul>
        </div>

        <div className={styles.col}>
          <h4 className={styles.colTitle}>Contacto</h4>
          <ul className={styles.colList}>
       
            <li><a href="mailto:contacto@yunkaatoq.bo">informaciones@bomberosatoq.org</a></li>
            <li className={styles.emergency}>Emergencias · 68503758</li>
          </ul>
        </div>
      </div>

      <div className={styles.bottom}>
        <p>© {year} Yunka Atoq · Bomberos Voluntarios. Personería jurídica Nº 304/2025 - Registro de SIDUREPEJC Nº 711</p>
        <p>NIT 680272021 · Hecho por Carlos Andres Azcarraga Esquivel Cochabamba, Bolivia.</p>
      </div>
    </footer>
  );
}

export default Footer;
