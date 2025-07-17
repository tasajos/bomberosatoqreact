// src/components/OperationsFeed.tsx

import React, { useState, useEffect } from "react";
// CAMBIO 1: Ajustamos las rutas de importación
import styles from "./OperationsFeed.module.css";
import { db } from "../firebaseConfig"; // Apuntamos a nuestra configuración
import { ref, onValue } from "firebase/database";

// BUENA PRÁCTICA: Definimos una interfaz para nuestros datos
interface Emergency {
  id: string;
  Titulo?: string;
  descripcion?: string;
  estado?: string;
  subestado?: string;
  unidad?: string;
}

const ITEMS_PER_PAGE = 3;

const OperationsFeed = () => {
  // Usamos nuestra interfaz con useState
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const emergenciesRef = ref(db, "ultimasEmergencias");

    const unsubscribe = onValue(emergenciesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const emergencyArray: Emergency[] = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));

        // Filtrado (sin cambios, la lógica es universal)
        const filtered = emergencyArray.filter((item) => {
          const estadoVal = item.estado?.trim().toLowerCase() || "";
          const unidadVal = item.unidad?.trim().toLowerCase() || "";
          const subestadoVal = item.subestado?.trim().toLowerCase() || "";

          if (estadoVal === "vencido") return false;

          const unidadMatch = unidadVal === "atoq" || unidadVal === "yunka atoq";
          const estadoMatch = estadoVal === "activo" || estadoVal === "atendido";
          const subestadoMatch = subestadoVal === "completado";

          return unidadMatch && (estadoMatch || subestadoMatch);
        });

        setEmergencies(filtered.reverse()); // .reverse() para mostrar las más nuevas primero
        setCurrentPage(1);
      } else {
        setEmergencies([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Lógica de Paginación (sin cambios)
  const totalItems = emergencies.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentItems = emergencies.slice(startIndex, endIndex);

  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  if (emergencies.length === 0) {
    return (
      <section className={styles.feedSection}>
        <h2 className={styles.feedTitle}>Últimas Operaciones</h2>
        <p>No hay emergencias activas para mostrar.</p>
      </section>
    );
  }

  return (
    <section className={styles.feedSection} id="operaciones">
      <h2 className={styles.feedTitle}>Últimas Operaciones</h2>
      <div className={styles.feedContainer}>
        {currentItems.map((item) => (
          <div key={item.id} className={styles.card}>
            <div className={styles.iconContainer}>
              <span className={styles.icon} role="img" aria-label="Alerta">🚨</span>
            </div>
            <div className={styles.cardContent}>
              <h3>{item.Titulo || "Sin título"}</h3>
              <p>{item.descripcion || "Sin descripción"}</p>
              <p><strong>Estado:</strong> {item.estado}</p>
              <p><strong>Subestado:</strong> {item.subestado}</p>
              <p><strong>Unidad:</strong> {item.unidad}</p>
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
    </section>
  );
};

export default OperationsFeed;