// src/components/Header.tsx
import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import styles from './Header.module.css';

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className={styles.header}>
      {/* 1. Logo ahora con ícono y texto */}
      <div className={styles.logo}>
        <Link to="/" onClick={closeMenu}>
          <img src="/yunka_atoq_log.png" alt="Logo Yunka Atoq" className={styles.logoIcon} />
          <span>YUNKA ATOQ</span>
        </Link>
      </div>

      <button 
        className={styles.hamburgerButton}
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        aria-label="Abrir menú"
      >
        <div className={styles.hamburgerIcon}></div>
      </button>

      <nav className={`${styles.mainNav} ${isMenuOpen ? styles.menuOpen : ''}`}>
        <NavLink to="/" className={({isActive}) => isActive ? styles.activeLink : ''} onClick={closeMenu}>Inicio</NavLink>
        <NavLink to="/nosotros" className={({isActive}) => isActive ? styles.activeLink : ''} onClick={closeMenu}>Nosotros</NavLink>
        <NavLink to="/historia" className={({isActive}) => isActive ? styles.activeLink : ''} onClick={closeMenu}>Historia</NavLink>
        <NavLink to="/reconocimientos" className={({isActive}) => isActive ? styles.activeLink : ''} onClick={closeMenu}>Reconocimientos</NavLink>
        <NavLink to="/proyectos" className={({isActive}) => isActive ? styles.activeLink : ''} onClick={closeMenu}>Proyectos</NavLink>
        <NavLink to="/donaciones" className={({isActive}) => isActive ? styles.activeLink : ''} onClick={closeMenu}>Donaciones</NavLink>
        <NavLink to="/contacto" className={({isActive}) => isActive ? styles.activeLink : ''} onClick={closeMenu}>Contacto</NavLink>

        {/* 2. Botón de Iniciar Sesión añadido al final del nav */}
        <div className={styles.headerActions}>
          <Link to="/login" className={styles.loginButton} onClick={closeMenu}>
            Iniciar sesión
          </Link>
        </div>
      </nav>
    </header>
  );
}

export default Header;