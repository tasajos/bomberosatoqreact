// src/pages/LoginPage.tsx
import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { ref, get, child } from 'firebase/database';
import styles from './LoginPage.module.css';
import WelcomeModal from '../components/WelcomeModal';
import { useAuth } from '../context/UserContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Cargando...</div>;
  }

  // La redirección automática solo se activa si el usuario ya está logueado
  // Y no está en medio de un intento de login.
  if (user && !isSubmitting) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const loggedInUser = userCredential.user;
      const dbRef = ref(db);
      const snapshot = await get(child(dbRef, `Atoqweb/usuarios/${loggedInUser.uid}`));

      if (snapshot.exists()) {
        const userData = snapshot.val();
        const userRole = userData.rol;

        if (userRole === 'Voluntario') {
          setModalMessage(`¡Bienvenido, ${userData.nombre}! Serás redirigido al panel.`);
          setShowModal(true);
          setTimeout(() => {
            setShowModal(false);
            // No necesitamos cambiar isSubmitting aquí porque estamos navegando fuera de la página
            navigate('/admin/dashboard');
          }, 3000);
        } else {
          setModalMessage(`Acceso denegado. Tu rol (${userRole}) no tiene permisos.`);
          setShowModal(true);
          await signOut(auth);
          setIsSubmitting(false); // Reseteamos si hay error de permisos
        }
      } else {
        setModalMessage('Usuario no encontrado en la base de datos.');
        setShowModal(true);
        await signOut(auth);
        setIsSubmitting(false); // Reseteamos si el usuario no está en la DB
      }
    } catch (error: any) {
      setError('Credenciales inválidas. Por favor, inténtalo de nuevo.');
      setIsSubmitting(false); // Reseteamos si las credenciales son incorrectas
    }
  };

  return (
    <main className={styles.container}>
      <div className={styles.loginCard}>
        <div className={styles.avatarContainer}>
          <img src="/yunka_atoq_log.png" alt="atoq" className={styles.avatar} />
        </div>
        <h1 className={styles.title}>INICIAR SESION</h1>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.inputGroup}>
            <input
              type="email"
              placeholder="Correo electrónico"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
            />
          </div>
          <div className={styles.inputGroup}>
            <input
              type="password"
              placeholder="Contraseña"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
            />
          </div>
          <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? 'Verificando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
      {showModal && (
        <WelcomeModal
          message={modalMessage}
          onClose={() => setShowModal(false)}
          showButton={modalMessage.includes("acceso denegado")}
        />
      )}
    </main>
  );
}