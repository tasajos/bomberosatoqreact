// src/components/VolunteerActivitiesFeed.tsx
import React, { useState, useEffect } from "react";
import styles from "./VolunteerActivitiesFeed.module.css";
import { db } from "../firebaseConfig"; // 1. Ruta corregida
import { ref, onValue } from "firebase/database";

// 2. Interfaz para tipado fuerte
interface Activity {
  id: string;
  imagen?: string;
  Titulo?: string;
  ciudad?: string;
  descripcion?: string;
  estado?: string;
  fecha?: string;
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
        setActivities(activitiesArray.reverse()); // .reverse() para mostrar las más nuevas primero
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
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  return (
    <section className={styles.feedSection}>
      <h2 className={styles.feedTitle}>Actividades de los Voluntarios</h2>

      {activities.length === 0 ? (
        <p>No hay actividades de voluntarios disponibles en este momento.</p>
      ) : (
        <>
          <div className={styles.feedContainer}>
            {currentItems.map((item) => (
              <div key={item.id} className={styles.card}>
                {item.imagen && (
                  <img
                    src={item.imagen}
                    alt={item.Titulo || "Actividad"}
                    className={styles.cardImage}
                  />
                )}
                <div className={styles.cardContent}>
                  <h3>{item.Titulo || "Sin título"}</h3>
                  <p><strong>Ciudad:</strong> {item.ciudad || "No especificado"}</p>
                  <p><strong>Descripción:</strong> {item.descripcion || "Sin descripción"}</p>
                  <p><strong>Estado:</strong> {item.estado || "Desconocido"}</p>
                  <p><strong>Fecha:</strong> {item.fecha || "No registrada"}</p>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.pagination}>
            <button onClick={handlePrev} disabled={currentPage === 1} className={styles.pageButton}>
              Anterior
            </button>
            <span className={styles.pageInfo}>
              Página {currentPage} de {totalPages}
            </span>
            <button onClick={handleNext} disabled={currentPage === totalPages} className={styles.pageButton}>
              Siguiente
            </button>
          </div>
        </>
      )}
    </section>
  );
};

export default VolunteerActivitiesFeed;