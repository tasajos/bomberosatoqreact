import HeroSection from '../components/HeroSection';
import ImageSlider from '../components/ImageSlider';
import StatsBar from '../components/StatsBar';
import HistorySection from '../components/HistorySection';
import ServicesSection from '../components/ServicesSection';
import EspecialidadesSection from '../components/EspecialidadesSection';
import RecognitionsSection from '../components/RecognitionsSection';
import RecruitSection from '../components/RecruitSection';

function HomePage() {
  return (
    <>
    <ImageSlider />
      <HeroSection />
      <StatsBar />
      <HistorySection />
      <RecognitionsSection />
      <ServicesSection />
      <EspecialidadesSection />
      
      <RecruitSection />
    </>
  );
}

export default HomePage;
