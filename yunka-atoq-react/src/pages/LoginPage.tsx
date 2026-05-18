import React, { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const { user, login, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  if (authLoading) return null;
  if (user) return <Navigate to={user.role === 'presidente' ? '/presidente' : '/admin/dashboard'} replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/admin/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Top bar */}
      <div className={styles.topBar}>
        <span className={styles.topDot} />
        <span className={styles.topText}>Emergencias · +591 68503758</span>
        <span className={styles.topSep}>·</span>
        <span className={styles.topText}>Cochabamba, Bolivia</span>
      </div>

      <div className={styles.page}>
        {/* Left */}
        <div className={styles.left}>
          <Link to="/" className={styles.leftLogo}>
            <img src="/yunka_atoq_log.png" alt="Yunka Atoq" />
            <span className={styles.leftLogoText}>
              <span className={styles.leftLogoName}>Yunka Atoq</span>
              <span className={styles.leftLogoSub}>Bomberos Voluntarios</span>
            </span>
          </Link>

          <div className={styles.leftCenter}>
            <div className={styles.leftTag}>Sistema interno · YA-OPS</div>
            <h1 className={styles.leftTitle}>
              Donde se coordina<br />cada operativo.
            </h1>
            <p className={styles.leftDesc}>
              Acceso al sistema operativo interno: guardias, partes de servicio, formación continua y reporte de incidentes.
            </p>
          </div>

          <div className={styles.leftFooter}>
            YA-OPS V4.2 · Latencia 38 ms · 89 usuarios
          </div>
        </div>

        {/* Right */}
        <div className={styles.right}>
          <h2 className={styles.title}>Bienvenido<br />de vuelta.</h2>
          <p className={styles.subtitle}>Ingresa con tu correo y contraseña.</p>

          <form className={styles.form} onSubmit={handleSubmit}>
            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.field}>
              <label className={styles.label}>Correo electrónico</label>
              <input
                className={styles.input}
                type="email"
                placeholder="voluntario@yunkaatoq.bo"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Contraseña</label>
              <input
                className={styles.input}
                type="password"
                placeholder="··········"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <div className={styles.formRow}>
              <label className={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                />
                Recordar este equipo
              </label>
              <a href="#" className={styles.forgotLink}>Olvidé mi contraseña</a>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Verificando…' : 'Ingresar al sistema →'}
            </button>
          </form>

          <p className={styles.signupLine}>
            ¿Aún no eres voluntario?{' '}
            <Link to="/voluntarios" className={styles.signupLink}>
              Postula a la convocatoria 2026 →
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
