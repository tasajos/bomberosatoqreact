import './HeroSection.css';

function HeroSection() {
  const imageUrl = 'https://images.unsplash.com/photo-1571589001152-03b857c503f3?q=80&w=2072&auto=format&fit=crop';
  return (
    <section className="hero-section">
      <img src={imageUrl} alt="Equipo de rescate trabajando" className="hero-image" />
    </section>
  );
}
export default HeroSection;