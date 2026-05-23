import { useState } from 'react';
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
    { to: '/operaciones/guardia',     label: 'Rol de Guardia',      icon: '🛡️' },
    { to: '/operaciones/ver-guardia', label: 'Ver Rol de Guardia',  icon: '📋' },
    { to: '/operaciones/libro',       label: 'Libro de Guardia',    icon: '📖' },
  ]},
  { section: 'Reconocimientos', items: [
    { to: '/operaciones/meritos',   label: 'Méritos y Antigüedad',icon: '🏆' },
  ]},
];

export default function OperacionesLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };
  const closeMenu = () => setMenuOpen(false);

  const sidebarContent = (
    <>
      {NAV.map(section => (
        <div key={section.section} className={styles.sideSection}>
          <div className={styles.sideSectionLabel}>{section.section}</div>
          {section.items.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={'end' in item ? item.end : undefined}
              onClick={closeMenu}
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
    </>
  );

  return (
    <div className={styles.shell}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <button className={styles.hamburger} onClick={() => setMenuOpen(o => !o)} aria-label="Menú">
          <span /><span /><span />
        </button>
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
        {/* Sidebar desktop */}
        <aside className={styles.sidebar}>
          {sidebarContent}
        </aside>

        {/* Drawer móvil */}
        {menuOpen && (
          <div className={styles.backdrop} onClick={closeMenu} />
        )}
        <aside className={`${styles.drawer} ${menuOpen ? styles.drawerOpen : ''}`}>
          <div className={styles.drawerHeader}>
            <span className={styles.drawerTitle}>Menú</span>
            <button className={styles.drawerClose} onClick={closeMenu}>✕</button>
          </div>
          {sidebarContent}
        </aside>

        {/* Content */}
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
