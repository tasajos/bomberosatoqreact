// src/pages/LoginPage.tsx
import React, { useState } from 'react';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault(); // Evita que la página se recargue

    // Lógica de login (por ahora, solo muestra una alerta)
    alert(`¡Login simulado!\nUsuario: ${username}\nContraseña: ${password}`);

    // Limpia los campos del formulario
    setUsername('');
    setPassword('');
  };

  return (
    <main className={styles.container}>
      <div className={styles.loginCard}>
        <div className={styles.avatarContainer}>
          <img src="/yunka_atoq_log.png" alt="atoq" className={styles.avatar} />
        </div>

        <h1 className={styles.title}>INICIAR SESION</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <input
              type="text"
              placeholder="Email o nombre de usuario"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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

          <button type="submit" className={styles.submitButton}>
            Iniciar Sesión
          </button>
        </form>
      </div>
    </main>
  );
}