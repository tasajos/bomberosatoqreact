import Card from './Card';
import './ServiceSection.css';

const services = [
    { img: 'https://i.imgur.com/gS4y6aR.png', title: 'Bomberos Voluntarios' },
    { img: 'https://i.imgur.com/gS4y6aR.png', title: 'Atención Médica' },
    { img: 'https://i.imgur.com/gS4y6aR.png', title: 'Soporte Vital' },
    { img: 'https://i.imgur.com/gS4y6aR.png', title: 'Administración' },
    { img: 'https://i.imgur.com/gS4y6aR.png', title: 'Búsqueda y Rescate' }
];

function ServicesSection() {
  return (
    <section className="services-section">
      <h2 className="section-title">NUESTROS SERVICIOS</h2>
      <div className="services-grid">
        {services.map(s => <Card key={s.title} imageSrc={s.img} title={s.title} />)}
      </div>
    </section>
  );
}
export default ServicesSection;