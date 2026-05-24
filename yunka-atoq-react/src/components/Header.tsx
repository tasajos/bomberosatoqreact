import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import styles from './Header.module.css';

const navItems = [
  { to: '/',              label: 'Inicio' },
  { to: '/nosotros',      label: 'Nosotros' },
  { to: '/servicios',     label: 'Servicios' },
  { to: '/estadisticas',  label: 'Estadísticas' },
  { to: '/galeria',       label: 'Galería' },
  { to: '/voluntarios',   label: 'Voluntariado' },
  { to: '/donaciones',    label: 'Donaciones' },
  { to: '/noticias',      label: 'Noticias' },
  { to: '/contacto',      label: 'Contacto' },
];

function Header() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.logo} onClick={close}>
          <img src="/yunka_atoq_log.png" alt="Logo Yunka Atoq" />
          <span className={styles.logoText}>
            <span className={styles.logoName}>Yunka Atoq</span>
            <span className={styles.logoSub}>Bomberos Voluntarios</span>
          </span>
        </Link>

        <nav className={`${styles.nav} ${open ? styles.navOpen : ''}`}>
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
              }
              onClick={close}
            >
              {label}
            </NavLink>
          ))}
          <div className={styles.actions}>
            <Link to="/login" className={styles.accessLink} onClick={close}>
              <span>🔒</span> Acceso Voluntarios
            </Link>
            <Link to="/donaciones" className={styles.donateBtn} onClick={close}>
              Donar
            </Link>
          </div>
        </nav>

        <button
          className={`${styles.hamburger} ${open ? styles.hamburgerOpen : ''}`}
          onClick={() => setOpen(!open)}
          aria-label="Abrir menú"
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </header>
  );
}

export default Header;
