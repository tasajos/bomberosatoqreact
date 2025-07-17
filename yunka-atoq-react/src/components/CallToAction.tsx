// src/components/CallToAction.tsx
import './CallToAction.css';

function CallToAction() {
  return (
    <section className="cta-section">
      <div className="cta-content">
        <h2>¿Listo para unirte a nuestro equipo de voluntarios?</h2>
        <p>Juntos podemos hacer la diferencia. ¡Contáctanos para más información!</p>
        <button className="cta-button">¡Quiero Unirme!</button>
      </div>
    </section>
  );
}

export default CallToAction;