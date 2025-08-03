// src/components/VolunteerActivitiesFeed.tsx
import { useState, useEffect } from "react";
import styles from "./VolunteerActivitiesFeed.module.css";
import { db } from "../firebaseConfig";
import { ref, onValue } from "firebase/database";

interface Activity {
  id: string;
  imagen?: string;
  Titulo?: string;
  ciudad?: string;
  descripcion?: string;
  estado?: string;
  fecha?: string;
  link?: string;

}

const ITEMS_PER_PAGE = 3;

const VolunteerActivitiesFeed = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const activitiesRef = ref(db, "actividadesVoluntarios");

    const unsubscribe = onValue(activitiesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const activitiesArray: Activity[] = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));

        // --- INICIO DEL NUEVO CÓDIGO DE ORDENAMIENTO ---

        // 1. Función para convertir el texto "DD/MM/YYYY" a un objeto Date de JavaScript
        const parseDate = (dateString: string): Date => {
          // Dividimos el string en [día, mes, año]
          const parts = dateString.split('/');
          // Ojo: en JavaScript los meses van de 0 a 11 (Enero=0, Diciembre=11)
          return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        };

        // 2. Ordenamos el arreglo usando nuestra función
        activitiesArray.sort((a, b) => {
          // Si alguna actividad no tiene fecha, la ponemos al final
          const dateA = a.fecha ? parseDate(a.fecha) : new Date(0);
          const dateB = b.fecha ? parseDate(b.fecha) : new Date(0);
          // Restamos las fechas. Un resultado positivo o negativo determina el orden.
          // b - a nos da un orden descendente (más reciente primero).
          return dateB.getTime() - dateA.getTime();
        });

        // 3. Actualizamos el estado con el arreglo ya ordenado por fecha
        setActivities(activitiesArray);
        
        // --- FIN DEL NUEVO CÓDIGO DE ORDENAMIENTO ---

        setCurrentPage(1);
      } else {
        setActivities([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Lógica de paginación (sin cambios)
  const totalItems = activities.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentItems = activities.slice(startIndex, endIndex);

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
  };

 const handlePrev = () => {
  if (currentPage > 1) setCurrentPage((prev) => prev - 1); // <-- Corregido a - 1
};

  return (
    // El resto del JSX no necesita cambios...
    <section className={styles.feedSection}>
      <h2 className={styles.feedTitle}>Actividades de los Voluntarios</h2>
      {activities.length === 0 ? (
        <p>No hay actividades de voluntarios disponibles en este momento.</p>
      ) : (
        <>
        <div className={styles.feedContainer}>
  {currentItems.map((item) => {
    // Creamos el contenido interno de la tarjeta para no repetirlo
    const cardContent = (
      <>
        {item.imagen && (
          <img src={item.imagen} alt={item.Titulo || "Actividad"} className={styles.cardImage} />
        )}
        <div className={styles.cardContent}>
          <h3>{item.Titulo || "Sin título"}</h3>
          <p><strong>Ciudad:</strong> {item.ciudad || "No especificado"}</p>
          <p><strong>Descripción:</strong> {item.descripcion || "Sin descripción"}</p>
          <p><strong>Estado:</strong> {item.estado || "Desconocido"}</p>
          <p><strong>Fecha:</strong> {item.fecha || "No registrada"}</p>
        </div>
      </>
    );

    // Lógica condicional:
    // Si la actividad tiene un enlace, la envolvemos en una etiqueta <a>
    if (item.link) {
      return (
        <a 
          href={item.link} 
          key={item.id} 
          target="_blank" 
          rel="noopener noreferrer" 
          className={styles.cardLink}
        >
          <div className={styles.card}>
            {cardContent}
          </div>
        </a>
      );
    }

    // Si NO tiene enlace, es un <div> con un onClick que muestra una alerta
    return (
      <div 
        key={item.id} 
        className={`${styles.card} ${styles.noLink}`} 
        onClick={() => alert('No existe más información para esta actividad.')}
      >
        {cardContent}
      </div>
    );
  })}
</div>
          <div className={styles.pagination}>
            <button onClick={handlePrev} disabled={currentPage === 1} className={styles.pageButton}>Anterior</button>
            <span className={styles.pageInfo}>Página {currentPage} de {totalPages}</span>
            <button onClick={handleNext} disabled={currentPage === totalPages} className={styles.pageButton}>Siguiente</button>
          </div>
        </>
      )}
    </section>
  );
};

export default VolunteerActivitiesFeed;