import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './DashboardPage.module.css';

const Icon = ({ d }: { d: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const sections = [
  {
    title: 'Gestión de Usuarios',
    iconD: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
    iconClass: 'iconRed',
    count: '2 opciones',
    items: [
      { label: 'Usuarios y roles',  desc: 'Ver, editar y asignar roles',    to: '/admin/usuarios' },
      { label: 'Crear usuario',     desc: 'Registrar nuevo voluntario o admin', to: '/admin/usuarios/nuevo' },
    ],
  },
  {
    title: 'Gestión del Sitio',
    iconD: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z',
    iconClass: 'iconNavy',
    count: '6 secciones',
    items: [
      { label: 'Slider / Imágenes',    desc: 'Subir y ordenar fotos del slider', to: '/admin/slider' },
      { label: 'Campañas de donación', desc: 'Crear y actualizar campañas',       to: '/admin/campanias' },
      { label: 'Reconocimientos',      desc: 'Agregar certificados oficiales',    to: '/admin/reconocimientos' },
      { label: 'Servicios',            desc: 'Editar las líneas de servicio',     to: '/admin/servicios' },
      { label: 'Galería',              desc: 'Administrar fotos por categoría',   to: '/admin/galeria' },
      { label: 'Noticias',             desc: 'Publicar y editar noticias',        to: '/admin/noticias' },
    ],
  },
  {
    title: 'Gestión Operativa',
    iconD: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
    iconClass: 'iconAmber',
    count: '2 módulos',
    items: [
      { label: 'Operativos',     desc: 'Registrar y revisar emergencias',     to: '/admin/operativos' },
      { label: 'Estadísticas',   desc: 'Ver datos y métricas operativas',     to: '/admin/estadisticas' },
    ],
  },
  {
    title: 'Gestión de Voluntarios',
    iconD: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8z',
    iconClass: 'iconGreen',
    count: '3 módulos',
    items: [
      { label: 'Voluntarios activos', desc: 'Perfil, cargo y unidad de cada uno', to: '/admin/voluntarios' },
      { label: 'Postulaciones',        desc: 'Revisar y gestionar postulantes',    to: '/admin/postulaciones' },
      { label: 'Guardias',             desc: 'Registro semanal de guardias',       to: '/admin/guardias' },
    ],
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className={styles.page}>
      {/* Bienvenida */}
      <div className={styles.welcome}>
        <div className={styles.welcomeLeft}>
          <div className={styles.welcomeTag}>Panel de administración</div>
          <h1 className={styles.welcomeTitle}>{saludo}, {user?.nombre?.split(' ')[0]}.</h1>
          <p className={styles.welcomeSub}>
            {new Intl.DateTimeFormat('es-BO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}
          </p>
        </div>
        <div className={styles.welcomeStats}>
          <div className={styles.wStat}>
            <div className={styles.wStatNum}>4</div>
            <div className={styles.wStatLabel}>Módulos</div>
          </div>
          <div className={styles.wStat}>
            <div className={styles.wStatNum}>13</div>
            <div className={styles.wStatLabel}>Acciones</div>
          </div>
          <div className={styles.wStat}>
            <div className={styles.wStatNum}>{user?.role}</div>
            <div className={styles.wStatLabel}>Rol</div>
          </div>
        </div>
      </div>

      {/* Secciones */}
      <div className={styles.sections}>
        {sections.map(({ title, iconD, iconClass, count, items }) => (
          <div key={title} className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={`${styles.cardIconWrap} ${styles[iconClass as keyof typeof styles]}`}>
                <Icon d={iconD} />
              </div>
              <span className={styles.cardTitle}>{title}</span>
              <span className={styles.cardCount}>{count}</span>
            </div>
            <div className={styles.cardItems}>
              {items.map(({ label, desc, to }) => (
                <Link key={to} to={to} className={styles.cardItem}>
                  <div className={styles.cardItemLeft}>
                    <span className={styles.cardItemDot} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{label}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-gray)' }}>{desc}</div>
                    </div>
                  </div>
                  <span className={styles.cardItemArrow}>›</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
