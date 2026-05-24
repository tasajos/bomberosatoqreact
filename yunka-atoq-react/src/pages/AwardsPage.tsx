import { useState, useEffect } from "react";
import styles from "./AwardsPage.module.css";
import { reconocimientosApi, type Reconocimiento } from "../services/api";

export default function AwardsPage() {
  const [awards, setAwards] = useState<Reconocimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAward, setSelectedAward] = useState<Reconocimiento | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    reconocimientosApi.list().then(setAwards).finally(() => setLoading(false));
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
                <img src={award.badge} alt={award.titulo} />
              </div>
              <div className={styles.cardContent}>
                <span className={styles.date}>{award.fecha}</span>
                <h2 className={styles.awardTitle}>{award.titulo}</h2>
                <p className={styles.awardIssuer}>Otorgado por: <strong>{award.institucion}</strong></p>
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
            <img src={selectedAward.badge} alt={selectedAward.titulo} className={styles.modalImage}
              onClick={(e) => { e.stopPropagation(); setIsZoomed(true); }} />

            <h2 className={styles.modalTitle}>{selectedAward.titulo}</h2>
            <p className={styles.modalIssuer}>Otorgado por: <strong>{selectedAward.institucion}</strong></p>
            <span className={styles.modalDate}>{selectedAward.fecha}</span>
            {selectedAward.texto_completo && (
              <p className={styles.modalDescription}>{selectedAward.texto_completo}</p>
            )}
          </div>
        </div>
      )}
 {/* 5. Vista de Zoom (Lightbox) */}
  {isZoomed && selectedAward && (
    <div className={styles.zoomBackdrop} onClick={() => setIsZoomed(false)}>
      <img
        src={selectedAward.badge}
        alt={`Zoom de ${selectedAward.titulo}`}
        className={styles.zoomedImage}
      />
    </div>
  )}

    </main>
  );
}