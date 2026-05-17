import styles from './DashboardPage.module.css';
import { useAuth } from '../../context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();
  return (
    <div className={styles.container}>
      <h1>¡Bienvenido al Panel!</h1>
      <p>Sesión iniciada como: <strong>{user?.email}</strong></p>
      <p>Rol: <strong>{user?.role}</strong></p>
    </div>
  );
}
