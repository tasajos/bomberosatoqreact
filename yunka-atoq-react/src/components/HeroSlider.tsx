// src/components/HeroSlider.tsx
import { useState, useEffect } from "react";
import Slider from "react-slick";
import styles from "./HeroSlider.module.css";
// 1. Importamos la configuración de Firebase que creamos
import { storage } from "../firebaseConfig"; 
import { ref, listAll, getDownloadURL } from "firebase/storage";

// --- Componentes de flechas personalizadas (sin cambios) ---
const NextArrow = (props: any) => {
  const { className, style, onClick } = props;
  return (
    <div
      className={`${className} ${styles.customArrow} ${styles.nextArrow}`}
      style={{ ...style }}
      onClick={onClick}
    />
  );
};

const PrevArrow = (props: any) => {
  const { className, style, onClick } = props;
  return (
    <div
      className={`${className} ${styles.customArrow} ${styles.prevArrow}`}
      style={{ ...style }}
      onClick={onClick}
    />
  );
};

// --- Configuración del Slider (sin cambios) ---
const sliderSettings = {
  dots: true,
  arrows: true,
  infinite: true,
  speed: 500,
  slidesToShow: 1,
  slidesToScroll: 1,
  autoplay: true, // Habilitado para que se vea más dinámico
  autoplaySpeed: 4000,
  nextArrow: <NextArrow />,
  prevArrow: <PrevArrow />,
};

const HeroSlider = () => {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // La referencia a tu carpeta de imágenes en Firebase Storage
    const listRef = ref(storage, "atoqweb/banner"); 
    
    listAll(listRef)
      .then((res) => {
        const promises = res.items.map((itemRef) => getDownloadURL(itemRef));
        return Promise.all(promises);
      })
      .then((urls) => {
        setImageUrls(urls);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error al cargar imágenes: ", error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className={styles.loadingState}>Cargando Imágenes...</div>;
  }

  return (
    <section className={styles.sliderContainer} id="inicio">
      <Slider {...sliderSettings}>
        {imageUrls.map((url, index) => (
          <div key={index} className={styles.slide}>
            {/* 2. REEMPLAZO de <Image> de Next.js por <img> estándar */}
            <img
              src={url}
              alt={`Slide ${index + 1}`}
              className={styles.image}
            />
            <div className={styles.overlay}></div>
          </div>
        ))}
      </Slider>
    </section>
  );
};

export default HeroSlider;