// src/components/Header.tsx
import { useState } from 'react'; // <-- 1. Importamos useState
import { Link, NavLink } from 'react-router-dom';
import styles from './Header.module.css';

function Header() {
  // 2. Creamos un estado para saber si el menú está abierto o cerrado
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <Link to="/">YUNKA ATOQ</Link>
      </div>

      {/* 3. Añadimos el botón de hamburguesa (solo se verá en móvil gracias a CSS) */}
      <button 
        className={styles.hamburgerButton}
        onClick={() => setIsMenuOpen(!isMenuOpen)} // Alterna el estado al hacer clic
        aria-label="Abrir menú"
      >
        <div className={styles.hamburgerIcon}></div>
      </button>

      {/* 4. La navegación ahora tiene una clase condicional */}
      <nav className={`${styles.mainNav} ${isMenuOpen ? styles.menuOpen : ''}`}>
        {/* Usamos NavLink para poder estilizar el enlace activo */}
        <NavLink to="/" className={({isActive}) => isActive ? styles.activeLink : ''} onClick={() => setIsMenuOpen(false)}>Inicio</NavLink>
        <NavLink to="/nosotros" className={({isActive}) => isActive ? styles.activeLink : ''} onClick={() => setIsMenuOpen(false)}>Nosotros</NavLink>
        <NavLink to="/proyectos" className={({isActive}) => isActive ? styles.activeLink : ''} onClick={() => setIsMenuOpen(false)}>Proyectos</NavLink>
        <NavLink to="/galeria" className={({isActive}) => isActive ? styles.activeLink : ''} onClick={() => setIsMenuOpen(false)}>Galería</NavLink>
        <NavLink to="/donaciones" className={({isActive}) => isActive ? styles.activeLink : ''} onClick={() => setIsMenuOpen(false)}>Donaciones</NavLink>
        <NavLink to="/contacto" className={({isActive}) => isActive ? styles.activeLink : ''} onClick={() => setIsMenuOpen(false)}>Contacto</NavLink>
      </nav>
    </header>
  );
}

export default Header;