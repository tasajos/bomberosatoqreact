// src/pages/HomePage.tsx
import HeroSection from '../components/HeroSection';

import WorkWithUsSection from '../components/WorkWithUsSection';
import CallToAction from '../components/CallToAction';
import SpecialtiesSection from '../components/SpecialtiesSection'; // <-- 1. Importar

function HomePage() {
  return (
    <div>
      <HeroSection />
   
      <SpecialtiesSection /> {/* <-- 2. Añadir donde quieras que aparezca */}
      <WorkWithUsSection />
      <CallToAction />
    </div>
  );
}

export default HomePage;