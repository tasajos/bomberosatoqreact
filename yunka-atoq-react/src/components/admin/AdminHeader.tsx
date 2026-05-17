import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './AdminHeader.module.css';

export default function AdminHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const initials = user?.nombre
    ? user.nombre.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'A';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.logo}>
          <img src="/yunka_atoq_log.png" alt="Yunka Atoq" />
          <span className={styles.logoText}>
            <span className={styles.logoName}>Yunka Atoq</span>
            <span className={styles.logoBadge}>Panel Admin</span>
          </span>
        </Link>

        <div className={styles.right}>
          <Link to="/" className={styles.siteLink}>← Ver sitio</Link>

          <div className={styles.userChip}>
            <div className={styles.avatar}>{initials}</div>
            <span className={styles.userName}>{user?.nombre}</span>
            <span className={styles.roleBadge}>{user?.role}</span>
          </div>

          <button className={styles.logoutBtn} onClick={handleLogout}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span>Salir</span>
          </button>
        </div>
      </div>
    </header>
  );
}
