// src/components/admin/AdminHeader.tsx
import { NavLink, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import { useAuth } from '../../context/UserContext';
import styles from './AdminHeader.module.css';

export default function AdminHeader() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/'); // Redirige a la página de inicio tras cerrar sesión
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        Panel de Voluntario
      </div>
      <nav className={styles.nav}>
        <NavLink to="/admin/dashboard">Inicio</NavLink>
        {/* Aquí irán otros enlaces del panel */}
      </nav>
      <div className={styles.userInfo}>
        <span>Hola, {user?.rol}</span>
        <button onClick={handleLogout} className={styles.logoutButton}>
          Cerrar Sesión
        </button>
      </div>
    </header>
  );
}