import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import AdminHeader from '../components/admin/AdminHeader';
import styles from './AdminLayout.module.css';

const Icon = ({ d, size = 16 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className={styles.sideLinkIcon}>
    <path d={d} />
  </svg>
);

const menu = [
  {
    section: 'Gestión de Usuarios',
    items: [
      { label: 'Usuarios y roles',   to: '/admin/usuarios',   icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' },
      { label: 'Crear usuario',      to: '/admin/usuarios/nuevo', icon: 'M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M12.5 7a4 4 0 100-8 4 4 0 000 8zM20 8v6M23 11h-6' },
    ],
  },
  {
    section: 'Gestión del Sitio',
    items: [
      { label: 'Slider / Imágenes',  to: '/admin/slider',        icon: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7' },
      { label: 'Campañas',           to: '/admin/campanias',     icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
      { label: 'Reconocimientos',    to: '/admin/reconocimientos', icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
      { label: 'Servicios',          to: '/admin/servicios',     icon: 'M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18' },
      { label: 'Galería',            to: '/admin/galeria',       icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
      { label: 'Noticias',           to: '/admin/noticias',      icon: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l4 4v12a2 2 0 01-2 2zM7 8h3m-3 4h8m-8 4h6' },
      { label: 'Suscriptores',         to: '/admin/suscriptores',  icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
      { label: 'Solicitudes contacto', to: '/admin/contactos',      icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
      { label: 'Ubicación cuartel',    to: '/admin/configuracion',  icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z' },
    ],
  },
  {
    section: 'Gestión Operativa',
    items: [
      { label: 'Operativos',         to: '/admin/operativos',    icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z' },
      { label: 'Estadísticas',       to: '/admin/estadisticas',  icon: 'M18 20V10M12 20V4M6 20v-6' },
    ],
  },
  {
    section: 'Gestión de Voluntarios',
    items: [
      { label: 'Voluntarios activos', to: '/admin/voluntarios',  icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8z' },
      { label: 'Postulaciones',       to: '/admin/postulaciones', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5l5 5v14a2 2 0 01-2 2z' },
      { label: 'Guardias',            to: '/admin/guardias',      icon: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01' },
    ],
  },
];

function SidebarContent({ onClose }: { onClose?: () => void }) {
  return (
    <>
      {menu.map(({ section, items }) => (
        <div key={section} className={styles.sideSection}>
          <div className={styles.sideSectionTitle}>{section}</div>
          <nav className={styles.sideNav}>
            {items.map(({ label, to, icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `${styles.sideLink} ${isActive ? styles.sideLinkActive : ''}`
                }
                onClick={onClose}
              >
                <Icon d={icon} />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      ))}
    </>
  );
}

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className={styles.shell}>
      <AdminHeader />

      <div className={styles.body}>
        {/* Contenido principal */}
        <main className={styles.main}>
          {/* Botón menú móvil */}
          <button className={styles.mobileMenuBtn} onClick={() => setMobileOpen(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
            Menú
          </button>
          <Outlet />
        </main>

        {/* Sidebar derecho — desktop */}
        <aside className={styles.sidebar}>
          <SidebarContent />
        </aside>
      </div>

      {/* Sidebar móvil */}
      {mobileOpen && (
        <div className={`${styles.mobileSidebar} ${styles.mobileSidebarOpen}`}
          onClick={() => setMobileOpen(false)}>
          <div className={styles.mobileSidebarPanel} onClick={e => e.stopPropagation()}>
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
