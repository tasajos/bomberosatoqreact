import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import styles from './NewsPage.module.css';
import { noticiasApi, suscriptoresApi, type Noticia, API_BASE } from '../services/api';

const PER_PAGE = 8; // 1 ancha (2 columnas) + 7 = 3 filas completas en escritorio

function resolveImg(url: string | null) {
  if (!url) return null;
  return url.startsWith('/uploads/') ? `${API_BASE}${url}` : url;
}

function fmtDate(s: string) {
  return new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(s));
}

function readTime(n: Noticia) {
  const words = `${n.resumen} ${n.contenido}`.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

function shareOnFacebook(url: string) {
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');
}

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const FbIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
  </svg>
);

function NewsCard({ n, wide }: { n: Noticia; wide?: boolean }) {
  const img = resolveImg(n.imagen_url);
  const isExternal = n.tipo === 'externa';
  const noteUrl = `/notas/${n.id}`;
  const shareUrl = isExternal ? n.fuente_url : `${window.location.origin}${noteUrl}`;

  return (
    <article className={`${styles.card} ${wide ? styles.cardWide : ''}`}>
      <Link to={noteUrl} className={styles.cardPhoto} aria-label={n.titulo}>
        {img
          ? <img src={img} alt="" loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }} />
          : <span className={styles.cardPhotoPlaceholder}>{isExternal ? '🔗' : '📰'}</span>}
        <span className={styles.cardCat}>{n.categoria || 'General'}</span>
        {!!n.destacada && <span className={styles.cardStar} title="Destacada">★</span>}
      </Link>
      <div className={styles.cardBody}>
        <div className={styles.cardMeta}>
          <span>{fmtDate(n.fecha)}</span>
          <span className={styles.dot} />
          {isExternal
            ? <span className={styles.cardSource}>🔗 {n.fuente_nombre || 'Fuente externa'}</span>
            : <span>{readTime(n)} min de lectura</span>}
        </div>
        <h2 className={styles.cardTitle}><Link to={noteUrl}>{n.titulo}</Link></h2>
        {n.resumen && <p className={styles.cardExcerpt}>{n.resumen}</p>}
        <div className={styles.cardActions}>
          {isExternal
            ? <a href={n.fuente_url} target="_blank" rel="noreferrer" className={styles.btnRead}>Ver original ↗</a>
            : <Link to={noteUrl} className={styles.btnRead}>Leer más <span aria-hidden>→</span></Link>}
          <button className={styles.btnShare} onClick={() => shareOnFacebook(shareUrl)} aria-label="Compartir en Facebook">
            <FbIcon /> Compartir
          </button>
        </div>
      </div>
    </article>
  );
}

export default function NewsPage() {
  const [allNews,    setAllNews]    = useState<Noticia[]>([]);
  const [email,      setEmail]      = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [cat,        setCat]        = useState('Todas');
  const [query,      setQuery]      = useState('');
  const [page,       setPage]       = useState(1);
  const [loading,    setLoading]    = useState(true);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    noticiasApi.list(1, 100)
      .then(res => setAllNews(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Portada: la destacada más reciente, si no la última publicada
  const spotlight = useMemo(() => allNews.find(n => n.destacada) ?? allNews[0] ?? null, [allNews]);

  // Categorías presentes, ordenadas por cantidad
  const cats = useMemo(() => {
    const count = new Map<string, number>();
    allNews.forEach(n => { const c = n.categoria || 'General'; count.set(c, (count.get(c) ?? 0) + 1); });
    return [...count.entries()].sort((a, b) => b[1] - a[1]);
  }, [allNews]);

  const browsing = cat === 'Todas' && !query.trim();
  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return allNews.filter(n =>
      (cat === 'Todas' || (n.categoria || 'General') === cat) &&
      (!q || normalize(`${n.titulo} ${n.resumen}`).includes(q)) &&
      // La portada no se repite en la grilla cuando se navega sin filtros
      !(browsing && spotlight && n.id === spotlight.id)
    );
  }, [allNews, cat, query, browsing, spotlight]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const pageItems  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const goPage = useCallback((p: number) => {
    setPage(p);
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleCat = (c: string) => { setCat(c); setPage(1); };

  const spotImg = spotlight ? resolveImg(spotlight.imagen_url) : null;

  return (
    <main className={styles.page}>
      {/* ── Hero con noticia de portada ── */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <div className={styles.breadcrumb}>
              <Link to="/">Inicio</Link><span>/</span>Noticias
            </div>
            <h1 className={styles.heroTitle}>Lo que pasa<br /><em>en el cuartel.</em></h1>
            <p className={styles.heroDesc}>
              Operativos, convocatorias, capacitaciones y comunicados oficiales de la compañía.
            </p>
            {!loading && allNews.length > 0 && (
              <div className={styles.heroStats}>
                <div><strong>{allNews.length}</strong><span>noticias</span></div>
                <div><strong>{cats.length}</strong><span>categorías</span></div>
                <div><strong>{fmtDate(allNews[0].fecha)}</strong><span>última publicación</span></div>
              </div>
            )}
          </div>

          {loading && <div className={`${styles.spotlight} ${styles.skeleton}`} />}
          {!loading && spotlight && (
            <Link to={`/notas/${spotlight.id}`} className={styles.spotlight}>
              {spotImg && <img src={spotImg} alt="" onError={e => { e.currentTarget.style.display = 'none'; }} />}
              <div className={styles.spotOverlay} />
              <span className={styles.spotBadge}>{spotlight.destacada ? '★ Destacada' : 'Lo último'}</span>
              <div className={styles.spotBody}>
                <div className={styles.spotMeta}>
                  <span className={styles.spotCat}>{spotlight.categoria || 'General'}</span>
                  <span>{fmtDate(spotlight.fecha)}</span>
                </div>
                <h2 className={styles.spotTitle}>{spotlight.titulo}</h2>
                {spotlight.resumen && <p className={styles.spotExcerpt}>{spotlight.resumen}</p>}
                <span className={styles.spotCta}>Leer noticia →</span>
              </div>
            </Link>
          )}
        </div>
      </section>

      {/* ── Filtros ── */}
      <div className={styles.catBar}>
        <div className={styles.catBarInner}>
          <div className={styles.catList}>
            <button className={`${styles.catBtn} ${cat === 'Todas' ? styles.catBtnActive : ''}`}
              onClick={() => handleCat('Todas')}>
              Todas <span className={styles.catNum}>{allNews.length}</span>
            </button>
            {cats.map(([c, count]) => (
              <button key={c}
                className={`${styles.catBtn} ${cat === c ? styles.catBtnActive : ''}`}
                onClick={() => handleCat(c)}>
                {c} <span className={styles.catNum}>{count}</span>
              </button>
            ))}
          </div>
          <label className={styles.search}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
            <input type="search" placeholder="Buscar noticias…" value={query}
              onChange={e => { setQuery(e.target.value); setPage(1); }} />
          </label>
        </div>
      </div>

      {/* ── Grilla ── */}
      <section className={styles.listSection}>
        <div className={styles.listInner} ref={gridRef}>
          <div className={styles.listHead}>
            <h2 className={styles.listTitle}>
              {query.trim() ? `Resultados para “${query.trim()}”` : cat === 'Todas' ? 'Más noticias' : cat}
            </h2>
            <span className={styles.listCount}>{filtered.length} {filtered.length === 1 ? 'noticia' : 'noticias'}</span>
          </div>

          {loading && (
            <div className={styles.grid}>
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className={`${styles.card} ${styles.cardSkeleton}`}>
                  <div className={`${styles.cardPhoto} ${styles.skeleton}`} />
                  <div className={styles.cardBody}>
                    <span className={`${styles.skelLine} ${styles.skeleton}`} style={{ width: '40%' }} />
                    <span className={`${styles.skelLine} ${styles.skeleton}`} style={{ height: 22 }} />
                    <span className={`${styles.skelLine} ${styles.skeleton}`} style={{ width: '75%' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>🔎</span>
              <p className={styles.emptyTitle}>No encontramos noticias</p>
              <p className={styles.emptyText}>Prueba con otra categoría o cambia la búsqueda.</p>
              {(cat !== 'Todas' || query) && (
                <button className={styles.emptyBtn} onClick={() => { setCat('Todas'); setQuery(''); setPage(1); }}>
                  Ver todas las noticias
                </button>
              )}
            </div>
          )}

          {!loading && pageItems.length > 0 && (
            <div className={styles.grid}>
              {pageItems.map((n, i) => <NewsCard key={n.id} n={n} wide={i === 0 && pageItems.length > 2} />)}
            </div>
          )}

          {totalPages > 1 && (
            <div className={styles.paginator}>
              <button className={styles.pageBtn} onClick={() => goPage(page - 1)} disabled={page === 1}>← Anterior</button>
              <div className={styles.pageNums}>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p}
                    className={`${styles.pageNum} ${p === page ? styles.pageNumActive : ''}`}
                    onClick={() => goPage(p)}>{p}</button>
                ))}
              </div>
              <button className={styles.pageBtn} onClick={() => goPage(page + 1)} disabled={page === totalPages}>Siguiente →</button>
            </div>
          )}
        </div>
      </section>

      {/* ── Boletín ── */}
      <section className={styles.newsletter}>
        <div className={styles.newsletterInner}>
          <div className={styles.newsletterBox}>
            <div className={styles.newsletterIcon} aria-hidden>✉</div>
            <div className={styles.newsletterLeft}>
              <div className={styles.newsletterTag}>Boletín mensual</div>
              <div className={styles.newsletterTitle}>Lo importante del cuartel, una vez al mes.</div>
              <p className={styles.newsletterDesc}>Operativos destacados, transparencia financiera y oportunidades. Sin spam.</p>
            </div>
            {subscribed
              ? <div className={styles.newsletterOk}>✓ ¡Gracias por suscribirte!</div>
              : <form className={styles.newsletterForm} onSubmit={async e => {
                  e.preventDefault();
                  if (!email) return;
                  try { await suscriptoresApi.subscribe(email); } catch { /* se confirma igual al usuario */ }
                  setSubscribed(true);
                }}>
                  <input className={styles.newsletterInput} type="email" placeholder="tu@correo.bo"
                    value={email} onChange={e => setEmail(e.target.value)} required />
                  <button type="submit" className={styles.newsletterBtn}>Suscribirme</button>
                </form>}
          </div>
        </div>
      </section>
    </main>
  );
}
