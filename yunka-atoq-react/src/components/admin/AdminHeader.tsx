import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './AdminHeader.module.css';

export default function AdminHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className={styles.header}>
      <div className={styles.logo}>Panel de Voluntario</div>
      <nav className={styles.nav}>
        <NavLink to="/admin/dashboard">Inicio</NavLink>
      </nav>
      <div className={styles.userInfo}>
        <span>Hola, {user?.nombre}</span>
        <button onClick={handleLogout} className={styles.logoutButton}>
          Cerrar Sesión
        </button>
      </div>
    </header>
  );
}
