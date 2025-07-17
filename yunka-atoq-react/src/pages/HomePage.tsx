// src/pages/HomePage.tsx
import styles from './HomePage.module.css'; // <-- 1. Importar los nuevos estilos

// Componentes de la página
import HeroSlider from '../components/HeroSlider';
import SpecialtiesSection from '../components/SpecialtiesSection';
import OperationsFeed from '../components/OperationsFeed';
import VolunteerActivitiesFeed from '../components/VolunteerActivitiesFeed'; // <-- 2. Importar el feed de actividades
import WorkFeedSection from '../components/WorkFeedSection';
import CallToAction from '../components/CallToAction';

function HomePage() {
  return (
    <div>
      <HeroSlider />
      <SpecialtiesSection />

      {/* 3. Aquí empieza nuestro nuevo layout de dos columnas */}
      <div className={styles.mainContentLayout}>
        
        {/* Columna Izquierda */}
        <div className={styles.leftColumn}>
          <OperationsFeed />
        </div>

        {/* Columna Derecha */}
        <div className={styles.rightColumn}>
          <VolunteerActivitiesFeed />
        </div>

      </div>
      {/* Aquí termina el layout de dos columnas */}

      <WorkFeedSection />
      <CallToAction />
    </div>
  );
}

export default HomePage;