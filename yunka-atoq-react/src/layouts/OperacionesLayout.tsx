import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './OperacionesLayout.module.css';

const NAV = [
  { section: 'Principal', items: [
    { to: '/operaciones',           label: 'Dashboard',          icon: '📊', end: true },
  ]},
  { section: 'Operaciones', items: [
    { to: '/operaciones/registrar', label: 'Registrar Operación', icon: '➕' },
    { to: '/operaciones/validar',   label: 'Validar Operaciones', icon: '✅' },
    { to: '/operaciones/puntos',    label: 'Asignar Puntos',      icon: '⭐' },
  ]},
  { section: 'Guardia', items: [
    { to: '/operaciones/guardia',   label: 'Rol de Guardia',      icon: '🛡️' },
    { to: '/operaciones/libro',     label: 'Libro de Guardia',    icon: '📖' },
  ]},
  { section: 'Reconocimientos', items: [
    { to: '/operaciones/meritos',   label: 'Méritos y Antigüedad',icon: '🏆' },
  ]},
];

export default function OperacionesLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className={styles.shell}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <Link to="/" className={styles.topLogo}>
          <img src="/yunka_atoq_log.png" alt="Yunka Atoq" />
          <span>
            <div className={styles.topLogoName}>Yunka Atoq</div>
            <div className={styles.topLogoBadge}>Dpto. Operaciones</div>
          </span>
        </Link>
        <span className={styles.topTitle}>🚒 Sistema Operativo</span>
        <div className={styles.topRight}>
          <span className={styles.topUser}>{user?.nombre} · {user?.role}</span>
          <Link to="/presidente" className={styles.topBtn}>← Presidencia</Link>
          <button className={styles.topBtn} onClick={handleLogout}>Salir</button>
        </div>
      </div>

      <div className={styles.body}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          {NAV.map(section => (
            <div key={section.section} className={styles.sideSection}>
              <div className={styles.sideSectionLabel}>{section.section}</div>
              {section.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={'end' in item ? item.end : undefined}
                  className={({ isActive }) =>
                    `${styles.sideItem} ${isActive ? styles.sideItemActive : ''}`
                  }
                >
                  <span className={styles.sideIcon}>{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
              <div className={styles.sideDivider} />
            </div>
          ))}
        </aside>

        {/* Content */}
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
