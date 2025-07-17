// src/components/WorkWithUsSection.tsx
import Card from './Card';
import './WorkWithUsSection.css';

const workItems = [
  {
    img: 'https://i.imgur.com/gS4y6aR.png', // Reemplaza con tus iconos
    title: 'Donación',
    desc: 'Las donaciones nos permiten mantener nuestros equipos y operaciones.'
  },
  {
    img: 'https://i.imgur.com/gS4y6aR.png',
    title: 'Voluntariado',
    desc: 'Únete a nuestro equipo de voluntarios y marca la diferencia en tu comunidad.'
  },
  {
    img: 'https://i.imgur.com/gS4y6aR.png',
    title: 'Alianzas',
    desc: 'Colaboramos con empresas y organizaciones para ampliar nuestro alcance.'
  },
  {
    img: 'https://i.imgur.com/gS4y6aR.png',
    title: 'Programas',
    desc: 'Desarrollamos programas de prevención y capacitación para la comunidad.'
  }
];

function WorkWithUsSection() {
  return (
    <section className="work-section">
      <h2 className="section-title">Así Trabajamos</h2>
      <div className="work-grid">
        {workItems.map(item => (
          <Card
            key={item.title}
            imageSrc={item.img}
            title={item.title}
            description={item.desc}
          />
        ))}
      </div>
    </section>
  );
}

export default WorkWithUsSection;