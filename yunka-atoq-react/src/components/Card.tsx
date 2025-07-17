// src/components/Card.tsx
import './Card.css';

interface CardProps {
  imageSrc: string;
  title: string;
  description?: string; // El '?' hace que esta propiedad sea opcional
}

function Card({ imageSrc, title, description }: CardProps) {
  return (
    <div className="card">
      <img src={imageSrc} alt={title} className="card-image" />
      <h3 className="card-title">{title}</h3>
      {/* Esto renderizará el párrafo solo si existe una descripción */}
      {description && <p className="card-description">{description}</p>}
    </div>
  );
}

export default Card;