// src/components/Header.tsx
import { Link } from 'react-router-dom';
import './Header.css'; // Importamos los estilos

function Header() {
  return (
    <header className="header">
      <div className="logo">
        <Link to="/">YUNKA ATOQ</Link>
      </div>
      <nav className="main-nav">
        <Link to="/">Inicio</Link>
        <Link to="/servicios">Servicios</Link>
        <Link to="/proyectos">Proyectos</Link>
        <Link to="/galeria">Galería</Link>
        <Link to="/contacto">Contacto</Link>
      </nav>
    </header>
  );
}
export default Header;