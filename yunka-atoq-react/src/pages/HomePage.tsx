// src/pages/HomePage.tsx
import HeroSlider from '../components/HeroSlider'; // <-- CAMBIAR

import WorkFeedSection from '../components/WorkFeedSection';
import CallToAction from '../components/CallToAction';
import SpecialtiesSection from '../components/SpecialtiesSection'; // <-- 1. Importar
import OperationsFeed from '../components/OperationsFeed'; 

function HomePage() {
  return (
    <div>
      <HeroSlider /> {/* <-- CAMBIAR */}
   
      <SpecialtiesSection /> {/* <-- 2. Añadir donde quieras que aparezca */}
       <OperationsFeed />
     <WorkFeedSection />
      <CallToAction />
    </div>
  );
}

export default HomePage;