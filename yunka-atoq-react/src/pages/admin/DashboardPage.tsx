// src/pages/admin/DashboardPage.tsx
import styles from './DashboardPage.module.css';
import { useAuth } from '../../context/UserContext';

export default function DashboardPage() {
  const { user } = useAuth();
  return (
    <div className={styles.container}>
      <h1>¡Bienvenido al Panel de Voluntario!</h1>
      <p>Has iniciado sesión como: <strong>{user?.email}</strong></p>
      <p>Tu rol es: <strong>{user?.rol}</strong></p>
    </div>
  );
}