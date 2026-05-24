import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { noticiasApi, type Noticia } from '../services/api';
import styles from './NotePage.module.css';

export default function NotePage() {
  const { notaId } = useParams<{ notaId: string }>();
  const [nota, setNota] = useState<Noticia | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (notaId) {
      noticiasApi.get(Number(notaId))
        .then(setNota)
        .catch(() => setNota(null))
        .finally(() => setLoading(false));
    }
  }, [notaId]);

  if (loading) return <div className={styles.status}>Cargando nota...</div>;

  if (!nota) {
    return (
      <div className={styles.status}>
        <h2>Nota no encontrada</h2>
        <Link to="/noticias">Volver a Noticias</Link>
      </div>
    );
  }

  return (
    <main className={styles.pageContainer}>
      {nota.imagen_url && <img src={nota.imagen_url} alt={nota.titulo} className={styles.mainImage} />}
      <h1 className={styles.title}>{nota.titulo}</h1>
      <p className={styles.description}>{nota.contenido || nota.resumen}</p>
      {nota.fuente_url && (
        <a href={nota.fuente_url} target="_blank" rel="noopener noreferrer" className={styles.readMoreLink}>
          Leer la nota original
        </a>
      )}
    </main>
  );
}