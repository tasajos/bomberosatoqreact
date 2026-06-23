import { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './PresidenteLayout.module.css';

const navItems = [
  { to: '/presidente',           label: 'Dashboard',     end: true },
  { to: '/presidente/voluntarios',   label: 'Voluntarios'    },
  { to: '/presidente/personal',      label: 'Personal'       },
  { to: '/presidente/postulaciones', label: 'Postulaciones'  },
  { to: '/operaciones',           label: '🚒 Operaciones'           },
  { to: '/ordenes-emergencia',    label: '🚨 Órdenes'               },
  { to: '/presidente/capacitaciones',     label: 'Capacitaciones'      },
  { to: '/presidente/mis-capacitaciones', label: 'Mis Inscripciones'  },
  { to: '/presidente/campanas',   label: 'Campañas'                 },
  { to: '/presidente/contactos',  label: 'Contacto'                 },
  { to: '/admin/noticias',        label: 'Noticias'                 },
];

export default function PresidenteLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = user ? `${user.nombre[0]}${user.nombre.split(' ')[1]?.[0] ?? ''}`.toUpperCase() : 'P';

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className={styles.shell}>
      <nav className={styles.topNav}>
        <Link to="/" className={styles.navLogo}>
          <img src="/yunka_atoq_log.png" alt="Yunka Atoq" />
          <span className={styles.navLogoText}>
            <span className={styles.navLogoName}>Yunka Atoq</span>
            <span className={styles.navLogoSub}>Vista presidencial</span>
          </span>
        </Link>

        <div className={styles.navCenter}>
          {navItems.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}>
              {label}
            </NavLink>
          ))}
        </div>

        <div className={styles.navRight}>
          <div className={styles.userChip}>
            <div className={styles.userAvatar}>{initials}</div>
            <span className={styles.userName}>{user?.nombre}</span>
            <span className={styles.userRole}>Presidente</span>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Salir
          </button>
          <button className={styles.mobileMenuBtn} onClick={() => setMobileOpen(o => !o)}>☰</button>
        </div>
      </nav>

      {/* Mobile menu */}
      <div className={`${styles.mobileNav} ${mobileOpen ? styles.open : ''}`}>
        {navItems.map(({ to, label }) => (
          <NavLink key={to} to={to} className={styles.mobileNavLink} onClick={() => setMobileOpen(false)}>
            {label}
          </NavLink>
        ))}
      </div>

      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
}
