// src/pages/NotePage.tsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom'; // useParams para leer el ID de la URL
import { db } from '../firebaseConfig';
import { ref, onValue } from 'firebase/database';
import styles from './NotePage.module.css';

interface Nota {
  titulo: string;
  descripcion: string;
  link: string;
  imagen: string;
}

export default function NotePage() {
  const { notaId } = useParams<{ notaId: string }>(); // Obtenemos el ID de la nota desde la URL
  const [nota, setNota] = useState<Nota | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (notaId) {
      const notaRef = ref(db, `/notasprensa/${notaId}`); // Apuntamos a la nota específica
      const unsubscribe = onValue(notaRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setNota(data);
        } else {
          setNota(null); // La nota no fue encontrada
        }
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [notaId]); // Se ejecuta cada vez que el ID de la URL cambie

  if (loading) {
    return <div className={styles.status}>Cargando nota...</div>;
  }

  if (!nota) {
    return (
      <div className={styles.status}>
        <h2>Nota no encontrada</h2>
        <Link to="/nosotros">Volver a la página Nosotros</Link>
      </div>
    );
  }

  return (
    <main className={styles.pageContainer}>
      <img src={nota.imagen} alt={nota.titulo} className={styles.mainImage} />
      <h1 className={styles.title}>{nota.titulo}</h1>
      <p className={styles.description}>{nota.descripcion}</p>
      <a href={nota.link} target="_blank" rel="noopener noreferrer" className={styles.readMoreLink}>
        Leer la nota original
      </a>
    </main>
  );
}