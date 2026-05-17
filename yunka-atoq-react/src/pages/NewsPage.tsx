import { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './NewsPage.module.css';

const featured = [
  {
    id: 1,
    category: 'Operativo',
    date: '12 MAY 2026',
    title: 'Yunka Atoq controla incendio estructural en Cala Cala tras 4 horas de combate',
    excerpt: 'Tres unidades y 14 voluntarios respondieron al llamado. El incendio afectó dos pisos de una vivienda y amenazaba las propiedades adyacentes.',
    img: '/history/7.jpg',
    size: 'large',
  },
  {
    id: 2,
    category: 'Comunidad',
    date: '08 MAY 2026',
    title: 'Convocatoria 2026 abierta: 42 plazas para nuevos voluntarios',
    excerpt: '',
    img: '/history/9.jpg',
    size: 'small',
  },
  {
    id: 3,
    category: 'Capacitación',
    date: '02 MAY 2026',
    title: 'Curso de descarcelación junto a Holmatro y bomberos de Santa Cruz',
    excerpt: '',
    img: '/history/12.jpg',
    size: 'small',
  },
];

const listNews = [
  { id: 4, category: 'Institucional', date: '28 ABR 2026', title: 'Publicamos la Memoria Anual 2025: auditoría externa por tercer año' },
  { id: 5, category: 'Operativo',     date: '21 ABR 2026', title: 'Tres operativos simultáneos en una madrugada: cómo nos coordinamos' },
  { id: 6, category: 'Comunidad',     date: '14 ABR 2026', title: 'Escuela bomberil llega a 1.200 niñas y niños en Quillacollo' },
];

export default function NewsPage() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setSubscribed(true);
  };

  return (
    <main>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.breadcrumb}>
            <Link to="/">Inicio</Link><span>/</span>Noticias
          </div>
          <h1 className={styles.heroTitle}>
            Lo que pasa<br />en el cuartel.
          </h1>
          <p className={styles.heroDesc}>
            Operativos, convocatorias, capacitaciones y comunicados oficiales de la compañía.
          </p>
        </div>
      </section>

      {/* Noticias destacadas */}
      <section className={styles.featured}>
        <div className={styles.featuredInner}>
          {featured.map(({ id, category, date, title, excerpt, img, size }) => (
            <article
              key={id}
              className={`${styles.card} ${size === 'large' ? styles.cardLarge : styles.cardSmall}`}
            >
              <div className={styles.cardPhoto}>
                <img
                  src={img}
                  alt={title}
                  loading="lazy"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <span className={styles.cardPhotoPlaceholder}>Foto</span>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.cardMeta}>
                  <span className={styles.cardCategory}>{category}</span>
                  <span className={styles.cardDot}>·</span>
                  <span className={styles.cardDate}>{date}</span>
                </div>
                <h2 className={styles.cardTitle}>{title}</h2>
                {excerpt && <p className={styles.cardExcerpt}>{excerpt}</p>}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Lista de noticias */}
      <section className={styles.list}>
        <div className={styles.listInner}>
          {listNews.map(({ id, category, date, title }) => (
            <div key={id} className={styles.listItem}>
              <div className={styles.listMeta}>
                <span className={styles.listCategory}>{category}</span>
                <span className={styles.listDate}>{date}</span>
              </div>
              <div className={styles.listTitle}>{title}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className={styles.newsletter}>
        <div className={styles.newsletterInner}>
          <div className={styles.newsletterBox}>
            <div className={styles.newsletterLeft}>
              <div className="section-tag">Boletín mensual</div>
              <div className={styles.newsletterTitle}>Lo importante del cuartel, una vez al mes.</div>
              <p className={styles.newsletterDesc}>
                Operativos destacados, transparencia financiera y oportunidades para participar. Sin spam.
              </p>
            </div>
            {subscribed
              ? <div style={{ color: 'var(--color-gray)', fontSize: '0.9rem' }}>
                  ✓ Suscripción confirmada. ¡Gracias!
                </div>
              : <form className={styles.newsletterForm} onSubmit={handleSubscribe}>
                  <input
                    className={styles.newsletterInput}
                    type="email"
                    placeholder="tu@correo.bo"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                  <button type="submit" className={styles.newsletterBtn}>Suscribirme</button>
                </form>
            }
          </div>
        </div>
      </section>
    </main>
  );
}
