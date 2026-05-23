import { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './VoluntarioLayout.module.css';

const navItems = [
  { to: '/voluntario',               label: 'Mi Panel',       end: true },
  { to: '/voluntario/capacitaciones', label: 'Capacitaciones'           },
];

export default function VoluntarioLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = user
    ? `${user.nombre[0]}${user.nombre.split(' ')[1]?.[0] ?? ''}`.toUpperCase()
    : 'V';

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className={styles.shell}>
      <nav className={styles.topNav}>
        <Link to="/" className={styles.navLogo}>
          <img src="/yunka_atoq_log.png" alt="Yunka Atoq" />
          <span className={styles.navLogoText}>
            <span className={styles.navLogoName}>Yunka Atoq</span>
            <span className={styles.navLogoSub}>Portal del Voluntario</span>
          </span>
        </Link>

        <div className={styles.navCenter}>
          {navItems.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
              }>
              {label}
            </NavLink>
          ))}
        </div>

        <div className={styles.navRight}>
          <div className={styles.userChip}>
            <div className={styles.userAvatar}>{initials}</div>
            <span className={styles.userName}>{user?.nombre}</span>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Salir
          </button>
          <button className={styles.mobileMenuBtn}
            onClick={() => setMobileOpen(o => !o)} aria-label="Menú">
            <span /><span /><span />
          </button>
        </div>
      </nav>

      <div className={`${styles.mobileNav} ${mobileOpen ? styles.open : ''}`}>
        {navItems.map(({ to, label }) => (
          <NavLink key={to} to={to} className={styles.mobileNavLink}
            onClick={() => setMobileOpen(false)}>
            {label}
          </NavLink>
        ))}
        <button className={styles.mobileLogout} onClick={handleLogout}>Cerrar sesión</button>
      </div>

      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
}
