import './Card.css';
interface CardProps { imageSrc: string; title: string; }
function Card({ imageSrc, title }: CardProps) {
  return (
    <div className="card">
      <img src={imageSrc} alt={title} className="card-image" />
      <h3 className="card-title">{title}</h3>
    </div>
  );
}
export default Card;