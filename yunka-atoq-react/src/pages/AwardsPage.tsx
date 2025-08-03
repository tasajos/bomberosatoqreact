// src/pages/AwardsPage.tsx
import  { useState, useEffect } from "react";
import styles from "./AwardsPage.module.css";
import { db } from "../firebaseConfig";
import { ref, onValue } from "firebase/database";

// 1. Actualizamos la interfaz para incluir la descripción detallada
interface Award {
  id: string;
  titulo: string;
  otorgado_por: string;
  fecha: string;
  imagen: string;
  descripcion_detallada?: string; // Nuevo campo opcional
}

export default function AwardsPage() {
  const [awards, setAwards] = useState<Award[]>([]);
  const [loading, setLoading] = useState(true);
  // 2. Nuevo estado para guardar el reconocimiento seleccionado
  const [selectedAward, setSelectedAward] = useState<Award | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    const awardsRef = ref(db, "reconocimientos");
    const unsubscribe = onValue(awardsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const awardsArray: Award[] = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        setAwards(awardsArray);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Función para cerrar el modal
  const handleCloseModal = () => {
    setSelectedAward(null);
  };

  return (
    <main className={styles.pageContainer}>
      <div className={styles.heroSection}>
        <h1 className={styles.title}>Cuadro de Honor</h1>
        <p className={styles.subtitle}>
          Un reconocimiento al esfuerzo, la dedicación y el valor de nuestra gente.
        </p>
      </div>

      {loading ? (
        <p className={styles.loadingText}>Cargando reconocimientos...</p>
      ) : (
        <div className={styles.awardsGrid}>
          {awards.map((award) => (
            // 3. Añadimos el onClick a cada tarjeta
            <div 
              key={award.id} 
              className={styles.awardCard} 
              onClick={() => setSelectedAward(award)}
            >
              <div className={styles.imageContainer}>
                <img src={award.imagen} alt={award.titulo} />
              </div>
              <div className={styles.cardContent}>
                <span className={styles.date}>{award.fecha}</span>
                <h2 className={styles.awardTitle}>{award.titulo}</h2>
                <p className={styles.awardIssuer}>Otorgado por: <strong>{award.otorgado_por}</strong></p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Renderizado condicional del Modal */}
      {selectedAward && (
        <div className={styles.modalBackdrop} onClick={handleCloseModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeButton} onClick={handleCloseModal}>&times;</button>
            <img src={selectedAward.imagen} alt={selectedAward.titulo} className={styles.modalImage}
onClick={(e) => {
    e.stopPropagation(); // Evita que se cierre el modal principal
    setIsZoomed(true); // Activa el modo zoom
  }} />

            <h2 className={styles.modalTitle}>{selectedAward.titulo}</h2>
            <p className={styles.modalIssuer}>Otorgado por: <strong>{selectedAward.otorgado_por}</strong></p>
            <span className={styles.modalDate}>{selectedAward.fecha}</span>
            {selectedAward.descripcion_detallada && (
              <p className={styles.modalDescription}>{selectedAward.descripcion_detallada}</p>
            )}
          </div>
        </div>
      )}
 {/* 5. Vista de Zoom (Lightbox) */}
  {isZoomed && selectedAward && (
    <div className={styles.zoomBackdrop} onClick={() => setIsZoomed(false)}>
      <img 
        src={selectedAward.imagen} 
        alt={`Zoom de ${selectedAward.titulo}`} 
        className={styles.zoomedImage} 
      />
    </div>
  )}

    </main>
  );
}