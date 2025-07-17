// src/components/WorkFeedSection.tsx


// CAMBIO 1: Importamos Link de react-router-dom
import { Link } from "react-router-dom"; 
// CAMBIO 2: Ajustamos la ruta del CSS
import styles from "./WorkFeedSection.module.css"; 

// Datos estáticos de ejemplo
const trabajosData = [
  {
    id: "1",
    tipo: "Donaciones",
    titulo: "Donación",
    descripcion:
      "Las donaciones que recibimos son destinadas a financiar el trabajo de nuestra institución.",
    fecha: "15/03/2025",
    imagen: "/trabajo/donacion.png",
  },
  {
    id: "2",
    tipo: "Convenios",
    titulo: "Instituciones, Empresas",
    descripcion:
      "Los convenios representan el trabajo conjunto y coordinado con distintas instituciones para beneficio mutuo.",
    fecha: "02/04/2025",
    imagen: "/trabajo/convenio.png",
  },
  {
    id: "3",
    tipo: "Apoyos",
    titulo: "Apoyo Logístico",
    descripcion:
      "El apoyo se refiere a actividades voluntarias eventuales para la realización de actividades específicas.",
    fecha: "20/04/2025",
    imagen: "/trabajo/apoyo.png",
  },
  {
    id: "4",
    tipo: "Voluntarios",
    titulo: "Reclutamiento de Voluntarios",
    descripcion:
      "Las actividades de voluntario abarcan todas las iniciativas en las que participan nuestros voluntarios.",
    fecha: "05/05/2025",
    imagen: "/trabajo/voluntario.png",
  },
  {
    id: "5",
    tipo: "Proyectos",
    titulo: "Gestión de Proyectos",
    descripcion:
      "Nuestros voluntarios realizan y gestionan proyectos en las múltiples especialidades para un objetivo específico.",
    fecha: "05/05/2025",
    imagen: "/trabajo/gestion-de-proyectos.png",
  },
];

const WorkFeedSection = () => {
  return (
    <section className={styles.feedSection}>
      <h2 className={styles.title}>Así Trabajamos</h2>
      <div className={styles.gridContainer}>
        {trabajosData.map((item) => {
          // Creamos el contenido del card
          const cardContent = (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.chip}>{item.tipo}</span>
              </div>
              {item.imagen && (
                <img
                  src={item.imagen}
                  alt={item.titulo}
                  className={styles.cardImage}
                />
              )}
              <div className={styles.cardContent}>
                <h3>{item.titulo}</h3>
                <p>{item.descripcion}</p>
                <p className={styles.date}>Fecha: {item.fecha}</p>
              </div>
            </div>
          );

          // Definimos la ruta en función del tipo
          let path = "#"; // Por defecto no redirige
          const tipoLower = item.tipo.toLowerCase();
          
          // Mapeamos los tipos a las rutas de nuestra app
          if (tipoLower === "donaciones") path = "/donaciones";
          else if (tipoLower === "convenios") path = "/convenios";
          else if (tipoLower === "apoyos") path = "/apoyos";
          else if (tipoLower === "voluntarios") path = "/voluntarios";
          else if (tipoLower === "proyectos") path = "/proyectos";

          // Si no es un enlace válido, renderiza el card sin Link
          if (path === "#") {
            return <div key={item.id}>{cardContent}</div>;
          }

          // Envolvemos el card en Link si corresponde
          return (
            // CAMBIO 3: Usamos 'to' en lugar de 'href'
            <Link key={item.id} to={path} className={styles.cardLink}>
              {cardContent}
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default WorkFeedSection;