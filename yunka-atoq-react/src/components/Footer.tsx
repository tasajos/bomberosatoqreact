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
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/yunkabo',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
        <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
      </svg>
    ),
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/yunkabol/',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
  },
  {
    label: 'TikTok',
    href: 'https://www.tiktok.com/@yunkabo',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/>
      </svg>
    ),
  },
  {
    label: 'YouTube',
    href: '#',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
  },
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
            {social.map(({ label, href, icon }) => (
              <a key={label} href={href} className={styles.socialBtn} target="_blank" rel="noreferrer" aria-label={label}>
                {icon}
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
