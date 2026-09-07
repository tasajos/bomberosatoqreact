import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './PresidenteLayout.module.css';

const I = {
  dash:   <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></>,
  users:  <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /></>,
  id:     <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="10" r="2" /><path d="M14 9h4M14 13h4M5.5 16h7" /></>,
  inbox:  <><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l5 5v14a2 2 0 0 1-2 2z" /></>,
  alarm:  <><path d="M12 2a5 5 0 0 0-5 5v3l-2 4h14l-2-4V7a5 5 0 0 0-5-5z" /><path d="M9 18a3 3 0 0 0 6 0" /></>,
  book:   <><path d="M12 6.5C10.5 5.5 8.5 5 6.5 5S3 5.5 3 5.5v13S4.5 18 6.5 18s3.5.5 5 1.5M12 6.5c1.5-1 3.5-1.5 5.5-1.5S21 5.5 21 5.5v13S19.5 18 17.5 18 14 18.5 12.5 19.5" /></>,
  mark:   <><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></>,
  mega:   <><path d="M3 11l16-5v12L3 14z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></>,
  mail:   <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>,
  news:   <><path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10l4 4v12a2 2 0 0 1-2 2z" /><path d="M7 8h6M7 12h8M7 16h5" /></>,
  gavel:  <><path d="M14 13l6 6M9 8l7-7 3 3-7 7-3-3zM3 21l7-7 3 3-7 7H3v-3z" /></>,
  list:   <><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4" cy="6" r="1.3" /><circle cx="4" cy="12" r="1.3" /><circle cx="4" cy="18" r="1.3" /></>,
  shield: <><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" /></>,
  bullhorn: <><path d="M3 11v2a2 2 0 0 0 2 2h1l3 5V4L6 9H5a2 2 0 0 0-2 2z" /><path d="M13 8a3 3 0 0 1 0 8" /><path d="M17 5a7 7 0 0 1 0 14" /></>,
};

type NavItem = { to: string; label: string; icon: React.ReactNode; end?: boolean };
const groups: { label: string; items: NavItem[] }[] = [
  { label: 'PRINCIPAL', items: [
    { to: '/presidente', label: 'Dashboard', icon: I.dash, end: true },
  ] },
  { label: 'PERSONAS', items: [
    { to: '/presidente/voluntarios',   label: 'Voluntarios',   icon: I.users },
    { to: '/presidente/personal',      label: 'Personal',      icon: I.id },
    { to: '/presidente/postulaciones', label: 'Postulaciones', icon: I.inbox },
  ] },
  { label: 'OPERACIÓN', items: [
    { to: '/presidente/operaciones', label: 'Operaciones', icon: I.alarm },
    { to: '/presidente/ordenes',     label: 'Órdenes',     icon: I.alarm },
  ] },
  { label: 'FORMACIÓN', items: [
    { to: '/presidente/capacitaciones',     label: 'Capacitaciones',   icon: I.book },
    { to: '/presidente/mis-capacitaciones', label: 'Mis Inscripciones', icon: I.mark },
  ] },
  { label: 'COMUNICACIÓN', items: [
    { to: '/presidente/campanas',  label: 'Campañas', icon: I.mega },
    { to: '/presidente/contactos', label: 'Contacto', icon: I.mail },
    { to: '/admin/noticias',       label: 'Noticias', icon: I.news },
  ] },
  { label: 'DOCUMENTOS', items: [
    { to: '/presidente/resoluciones',   label: 'Resoluciones',   icon: I.gavel },
    { to: '/presidente/procedimientos', label: 'Procedimientos', icon: I.list },
    { to: '/presidente/protocolos',     label: 'Protocolos',     icon: I.shield },
    { to: '/presidente/comunicados',    label: 'Comunicados',    icon: I.bullhorn },
  ] },
];

const TITLES: Record<string, [string, string]> = {
  '/presidente': ['Dashboard presidencial', 'Resumen institucional'],
  '/presidente/voluntarios': ['Voluntarios', 'Directorio y gestión'],
  '/presidente/personal': ['Personal', 'Gestión integral del personal'],
  '/presidente/postulaciones': ['Postulaciones', 'Solicitudes de ingreso'],
  '/presidente/capacitaciones': ['Capacitaciones', 'Programa de formación'],
  '/presidente/mis-capacitaciones': ['Mis inscripciones', 'Tus capacitaciones'],
  '/presidente/campanas': ['Campañas', 'Recaudación y difusión'],
  '/presidente/contactos': ['Contacto', 'Mensajes recibidos'],
  '/presidente/ordenes': ['Órdenes de emergencia', 'Solicitudes activas de operación'],
  '/presidente/resoluciones':   ['Resoluciones',   'Numeración correlativa y firma institucional'],
  '/presidente/procedimientos': ['Procedimientos', 'Documentación de procesos institucionales'],
  '/presidente/protocolos':     ['Protocolos',     'Protocolos oficiales de actuación'],
  '/presidente/comunicados':    ['Comunicados',    'Avisos institucionales para voluntarios'],
};

function tituloDe(pathname: string): [string, string] {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith('/presidente/operaciones')) return ['Operaciones', 'Departamento de operaciones'];
  return ['Vista presidencial', 'Yunka Atoq'];
}

const DIAS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const pad = (n: number) => String(n).padStart(2, '0');

export default function PresidenteLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const initials = user ? `${user.nombre[0]}${user.nombre.split(' ')[1]?.[0] ?? ''}`.toUpperCase() : 'P';
  const handleLogout = () => { logout(); navigate('/login'); };

  const [titulo, subtitulo] = tituloDe(location.pathname);
  const reloj = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const fecha = `${DIAS[now.getDay()]} ${pad(now.getDate())} ${MESES[now.getMonth()]}`;

  const svg = (paths: React.ReactNode) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths}</svg>
  );

  return (
    <div className={styles.shell}>
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ''}`}>
        <Link to="/" className={styles.brand}>
          <img src="/yunka_atoq_log.png" alt="Yunka Atoq" />
          <div>
            <div className={styles.brandName}>YUNKA ATOQ</div>
            <div className={styles.brandSub}>PRESIDENCIA</div>
          </div>
        </Link>

        {groups.map(g => (
          <div key={g.label} className={styles.group}>
            <div className={styles.groupLabel}>{g.label}</div>
            <nav className={styles.nav}>
              {g.items.map(({ to, label, icon, end }) => (
                <NavLink key={to + label} to={to} end={end} onClick={() => setOpen(false)}
                  className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}>
                  {svg(icon)}
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        ))}

        <div className={styles.spacer} />
        <div className={styles.userArea}>
          <div className={styles.userRow}>
            <div className={styles.avatar}>{initials}</div>
            <div style={{ minWidth: 0 }}>
              <div className={styles.userName}>{user?.nombre}</div>
              <div className={styles.userRole}>PRESIDENTE</div>
            </div>
          </div>
          <button className={styles.logout} onClick={handleLogout}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {open && <div className={styles.backdrop} onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className={styles.main}>
        <header className={styles.topbar}>
          <button className={styles.hamb} onClick={() => setOpen(o => !o)} aria-label="Menú">☰</button>
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
      </div>
    </div>
  );
}
