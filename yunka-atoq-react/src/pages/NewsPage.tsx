import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import styles from './NewsPage.module.css';
import { noticiasApi, suscriptoresApi, type Noticia, API_BASE } from '../services/api';

const PER_PAGE = 5;

function resolveImg(url: string | null) {
  if (!url) return null;
  return url.startsWith('/uploads/') ? `${API_BASE}${url}` : url;
}

function fmtDate(s: string) {
  return new Intl.DateTimeFormat('es-BO', { day:'numeric', month:'short', year:'numeric' }).format(new Date(s));
}

function shareOnFacebook(url: string) {
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');
}

const CATS = ['Todas','Operativo','Forestal','Comunidad','Institucional','Capacitación'];

export default function NewsPage() {
  const [allNews,    setAllNews]    = useState<Noticia[]>([]);
  const [email,      setEmail]      = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [cat,        setCat]        = useState('Todas');
  const [page,       setPage]       = useState(1);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    noticiasApi.list(1, 100)
      .then(res => setAllNews(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Filtrar por categoría y resetear página
  const filtered = cat === 'Todas'
    ? allNews
    : allNews.filter(n => n.categoria === cat);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const pageItems  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // 1er item grande, resto pequeños (hasta 4)
  const mainCard  = pageItems[0] ?? null;
  const sideCards = pageItems.slice(1);

  const goPage = useCallback((p: number) => {
    setPage(p);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  }, []);

  const handleCat = (c: string) => {
    setCat(c);
    setPage(1);
  };

  const currentUrl = window.location.href;

  function NewsCard({ n, large }: { n: Noticia; large?: boolean }) {
    const img = resolveImg(n.imagen_url);
    const isExternal = n.tipo === 'externa';
    const shareUrl = isExternal ? n.fuente_url : currentUrl;
    return (
      <article className={`${styles.card} ${large ? styles.cardLarge : styles.cardSmall}`}>
        <div className={styles.cardPhoto}>
          {img
            ? <img src={img} alt={n.titulo} onError={e=>{(e.target as HTMLImageElement).style.display='none';}} />
            : <span className={styles.cardPhotoPlaceholder}>{isExternal ? '🔗' : '📰'}</span>
          }
          {isExternal && <span className={styles.externalBadge}>🔗 {n.fuente_nombre || 'Fuente externa'}</span>}
        </div>
        <div className={styles.cardBody}>
          <div className={styles.cardMeta}>
            <span className={styles.cardCategory}>{n.categoria || 'General'}</span>
            <span className={styles.cardDot}>·</span>
            <span className={styles.cardDate}>{fmtDate(n.fecha)}</span>
          </div>
          <h2 className={styles.cardTitle}>{n.titulo}</h2>
          {n.resumen && <p className={styles.cardExcerpt}>{large ? n.resumen : n.resumen.slice(0,100) + (n.resumen.length > 100 ? '…' : '')}</p>}
          <div className={styles.cardActions}>
            {isExternal
              ? <a href={n.fuente_url} target="_blank" rel="noreferrer" className={styles.btnSource}>Ver noticia original →</a>
              : <span />
            }
            <button className={styles.btnShare} onClick={() => shareOnFacebook(shareUrl)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
              </svg>
              Compartir
            </button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <main>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.breadcrumb}>
            <Link to="/">Inicio</Link><span>/</span>Noticias
          </div>
          <h1 className={styles.heroTitle}>Lo que pasa<br />en el cuartel.</h1>
          <p className={styles.heroDesc}>
            Operativos, convocatorias, capacitaciones y comunicados oficiales de la compañía.
          </p>
        </div>
      </section>

      {/* Filtros */}
      <div className={styles.catBar}>
        <div className={styles.catBarInner}>
          {CATS.map(c => (
            <button key={c}
              className={`${styles.catBtn} ${cat === c ? styles.catBtnActive : ''}`}
              onClick={() => handleCat(c)}>{c}</button>
          ))}
          <span className={styles.catCount}>{filtered.length} noticias</span>
        </div>
      </div>

      {/* Grid 1 grande + hasta 4 pequeños */}
      <section className={styles.featured}>
        {loading && <p style={{ padding:'3rem', textAlign:'center', color:'var(--color-gray)' }}>Cargando noticias…</p>}

        {!loading && filtered.length === 0 && (
          <p style={{ padding:'3rem', textAlign:'center', color:'var(--color-gray)' }}>
            No hay noticias en esta categoría.
          </p>
        )}

        {!loading && mainCard && (
          <div className={styles.pageGrid}>
            {/* Card principal grande */}
            <div className={styles.mainCol}>
              <NewsCard n={mainCard} large />
            </div>
            {/* Cards secundarias */}
            {sideCards.length > 0 && (
              <div className={styles.sideCol}>
                {sideCards.map(n => <NewsCard key={n.id} n={n} />)}
              </div>
            )}
          </div>
        )}

        {/* Paginador */}
        {totalPages > 1 && (
          <div className={styles.paginator}>
            <button className={styles.pageBtn} onClick={() => goPage(page - 1)} disabled={page === 1}>← Anterior</button>

            <div className={styles.pageNums}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  className={`${styles.pageNum} ${p === page ? styles.pageNumActive : ''}`}
                  onClick={() => goPage(p)}
                >
                  {p}
                </button>
              ))}
            </div>

            <button className={styles.pageBtn} onClick={() => goPage(page + 1)} disabled={page === totalPages}>Siguiente →</button>

            <span className={styles.pageInfo}>
              {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} de {filtered.length}
            </span>
          </div>
        )}
      </section>

      {/* Newsletter */}
      <section className={styles.newsletter}>
        <div className={styles.newsletterInner}>
          <div className={styles.newsletterBox}>
            <div className={styles.newsletterLeft}>
              <div className="section-tag">Boletín mensual</div>
              <div className={styles.newsletterTitle}>Lo importante del cuartel, una vez al mes.</div>
              <p className={styles.newsletterDesc}>Operativos destacados, transparencia financiera y oportunidades. Sin spam.</p>
            </div>
            {subscribed
              ? <div style={{ color:'var(--color-gray)', fontSize:'0.9rem' }}>✓ ¡Gracias por suscribirte!</div>
              : <form className={styles.newsletterForm} onSubmit={async e=>{ e.preventDefault(); if(email){ try{ await suscriptoresApi.subscribe(email); }catch{} setSubscribed(true); } }}>
                  <input className={styles.newsletterInput} type="email" placeholder="tu@correo.bo"
                    value={email} onChange={e=>setEmail(e.target.value)} required />
                  <button type="submit" className={styles.newsletterBtn}>Suscribirme</button>
                </form>
            }
          </div>
        </div>
      </section>
    </main>
  );
}
