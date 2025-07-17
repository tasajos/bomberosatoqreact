// src/pages/AboutPage.tsx
import { useEffect, useState } from "react";
import styles from "./AboutPage.module.css";
import GoogleMap from "../components/GoogleMap"; // Importamos nuestro marcador de posición
import { db } from "../firebaseConfig";
import { ref, onValue } from "firebase/database";
import { Link } from 'react-router-dom'; // Añadir esta importación

interface Nota {
  id: string;
  titulo: string;
  descripcion: string;
  link: string;
  imagen: string;
}

const cardsData = [
  {
    id: "1",
    titulo: "Nuestra Misión",
    descripcion: "Trabajamos en el salvamento, rescate y protección ambiental, comprometidos con la comunidad y la naturaleza.",
    imagen: "/nospublic/objetivo.png",
  },
  {
    id: "2",
    titulo: "Nuestro Equipo",
    descripcion: "Contamos con un equipo de bomberos voluntarios y especialistas comprometidos en salvar vidas y cuidar el medio ambiente.",
    imagen: "/nospublic/bombero.png",
  },
  {
    id: "3",
    titulo: "Nuestros Valores",
    descripcion: "Solidaridad, compromiso, integridad y responsabilidad son los pilares de nuestra institución.",
    imagen: "/nospublic/propuesta-de-valor.png",
  },
];

export default function AboutPage() {
  const [notas, setNotas] = useState<Nota[]>([]);

  useEffect(() => {
    const notasRef = ref(db, "/notasprensa");
    const unsubscribe = onValue(notasRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const notasArray = Object.keys(data).map((key) => ({
          id: key, ...data[key],
        }));
        setNotas(notasArray);
      }
    });
    return () => unsubscribe(); // Limpiamos la suscripción
  }, []);

  return (
    <main>
      <h1 className={styles.title}>Nosotros</h1>
      <div className={styles.cardContainer}>
        {cardsData.map((card) => (
          <div key={card.id} className={styles.card}>
            {card.imagen && <img src={card.imagen} alt={card.titulo} className={styles.cardImage} />}
            <div className={styles.cardContent}>
              <h3>{card.titulo}</h3>
              <p>{card.descripcion}</p>
            </div>
          </div>
        ))}
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Notas de Prensa</h2>
        <div className={styles.notasContainer}>
          {notas.map((nota) => (


             // === INICIO DEL CAMBIO ===
    <Link to={`/notas/${nota.id}`} key={nota.id} className={styles.notaLinkWrapper}>
      <div className={styles.nota}>
        {nota.imagen && <img src={nota.imagen} alt={nota.titulo} className={styles.notaImagen} />}
        <div className={styles.notaContent}>
          <h3>{nota.titulo}</h3>
          <p>{nota.descripcion}</p>
        </div>
      </div>
    </Link>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Síguenos en Redes Sociales</h2>
        <div className={styles.redesContainer}>
          <a href="https://facebook.com/yunkabo" target="_blank" rel="noopener noreferrer">
            <img src="/icons/facebook.svg" alt="Facebook" className={styles.redesIcon} />
          </a>
          <a href="https://instagram.com/yunkabol" target="_blank" rel="noopener noreferrer">
            <img src="/icons/instagram.svg" alt="Instagram" className={styles.redesIcon} />
          </a>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Nuestra Ubicación</h2>
        <GoogleMap />
      </section>
    </main>
  );
}