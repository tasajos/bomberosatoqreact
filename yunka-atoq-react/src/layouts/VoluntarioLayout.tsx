import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './VoluntarioLayout.module.css';

const ICONS = {
  home: <><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></>,
  book: <><path d="M12 6.5C10.5 5.5 8.5 5 6.5 5S3 5.5 3 5.5v13S4.5 18 6.5 18s3.5.5 5 1.5M12 6.5c1.5-1 3.5-1.5 5.5-1.5S21 5.5 21 5.5v13S19.5 18 17.5 18 14 18.5 12.5 19.5" /></>,
  alert: <><path d="M12 2a5 5 0 0 0-5 5v3l-2 4h14l-2-4V7a5 5 0 0 0-5-5z" /><path d="M9 18a3 3 0 0 0 6 0" /></>,
  medal: <><circle cx="12" cy="8" r="5" /><path d="M8.5 12.5L7 22l5-3 5 3-1.5-9.5" /></>,
  file: <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2z" /><path d="M14 3v5h5" /></>,
};

const navItems = [
  { to: '/voluntario',                label: 'Mi Panel',       icon: ICONS.home, end: true },
  { to: '/voluntario/meritos',        label: 'Méritos',        icon: ICONS.medal },
  { to: '/voluntario/file',           label: 'File personal',  icon: ICONS.file },
  { to: '/voluntario/capacitaciones', label: 'Capacitaciones', icon: ICONS.book },
  { to: '/voluntario/ordenes',        label: 'Órdenes',        icon: ICONS.alert },
];

const TITLES: Record<string, [string, string]> = {
  '/voluntario': ['Centro del voluntario', 'Resumen, desempeño y actividad'],
  '/voluntario/meritos': ['Méritos y deméritos', 'Índice de desempeño individual'],
  '/voluntario/file': ['File personal', 'Datos, formación y equipo asignado'],
  '/voluntario/capacitaciones': ['Capacitaciones', 'Formación y cursos disponibles'],
  '/voluntario/ordenes': ['Órdenes de emergencia', 'Solicitudes activas · inscríbete'],
};

const DIAS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const pad = (n: number) => String(n).padStart(2, '0');

export default function VoluntarioLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const initials = user
    ? `${user.nombre[0]}${user.nombre.split(' ')[1]?.[0] ?? ''}`.toUpperCase()
    : 'V';

  const handleLogout = () => { logout(); navigate('/login'); };

  const [titulo, subtitulo] = TITLES[location.pathname] ?? ['Centro del voluntario', 'Portal del voluntario'];
  const reloj = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const fecha = `${DIAS[now.getDay()]} ${pad(now.getDate())} ${MESES[now.getMonth()]}`;

  const svg = (paths: React.ReactNode) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths}</svg>
  );

  return (
    <div className={styles.shell}>
      {/* Sidebar (desktop) */}
      <aside className={styles.sidebar}>
        <Link to="/" className={styles.brand}>
          <img src="/yunka_atoq_log.png" alt="Yunka Atoq" />
          <div>
            <div className={styles.brandName}>YUNKA ATOQ</div>
            <div className={styles.brandSub}>ATOQ · MONITOREO</div>
          </div>
        </Link>

        <div className={styles.navLabel}>NAVEGACIÓN</div>
        <nav className={styles.nav}>
          {navItems.map(({ to, label, icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}>
              {svg(icon)}
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.spacer} />

        <div className={styles.userArea}>
          <div className={styles.userRow}>
            <div className={styles.avatar}>{initials}</div>
            <div style={{ minWidth: 0 }}>
              <div className={styles.userName}>{user?.nombre}</div>
              <div className={styles.userRole}>{user?.role?.replace(/_/g, ' ')}</div>
            </div>
          </div>
          <div className={styles.statusPill}>
            <span className={styles.statusDot} />
            <span className={styles.statusText}>EN SERVICIO</span>
          </div>
          <button className={styles.logout} onClick={handleLogout}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className={styles.main}>
        <header className={styles.topbar}>
          <img className={styles.topbarLogo} src="/yunka_atoq_log.png" alt="Yunka Atoq" />
          <div style={{ minWidth: 0 }}>
            <div className={styles.topTitle}>{titulo}</div>
            <div className={styles.topSub}>{subtitulo}</div>
          </div>
          <div className={styles.topRight}>
            <div className={styles.clockBox}>
              <div className={styles.clock}>{reloj}</div>
              <div className={styles.clockDate}>{fecha}</div>
            </div>
            <div className={styles.topAvatar}>{initials}</div>
          </div>
        </header>

        <div className={styles.content}>
          <Outlet />
        </div>

        {/* Bottom nav (móvil) */}
        <nav className={styles.bottomNav}>
          {navItems.map(({ to, label, icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `${styles.bottomItem} ${isActive ? styles.bottomItemActive : ''}`}>
              {svg(icon)}
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
