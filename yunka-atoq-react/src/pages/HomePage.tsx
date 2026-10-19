import HeroSection from '../components/HeroSection';
import ImageSlider from '../components/ImageSlider';
import FeaturedNewsSlider from '../components/FeaturedNewsSlider';
import StatsBar from '../components/StatsBar';
import HistorySection from '../components/HistorySection';
import ServicesSection from '../components/ServicesSection';
import EspecialidadesSection from '../components/EspecialidadesSection';
import RecognitionsSection from '../components/RecognitionsSection';
import RecruitSection from '../components/RecruitSection';
import TikTokSection from '../components/TikTokSection';

function HomePage() {
  return (
    <>
      <ImageSlider />
      <FeaturedNewsSlider />
      <HeroSection />
      <StatsBar />
      <TikTokSection />
      <HistorySection />
      <RecognitionsSection />
      <ServicesSection />
      <EspecialidadesSection />
      
      <RecruitSection />
    </>
  );
}

export default HomePage;
