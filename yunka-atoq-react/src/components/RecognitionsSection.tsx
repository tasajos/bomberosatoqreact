import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './RecognitionsSection.module.css';
import { reconocimientosApi, type Reconocimiento, API_BASE } from '../services/api';

function resolveImg(url: string | null) {
  if (!url) return null;
  if (url.startsWith('/uploads/')) return `${API_BASE}${url}`;
  return url;
}

export default function RecognitionsSection() {
  const [list, setList]     = useState<Reconocimiento[]>([]);
  const [active, setActive] = useState<Reconocimiento | null>(null);

  useEffect(() => {
    reconocimientosApi.list().catch(() => null).then(data => {
      if (data && data.length > 0) setList(data);
    });
  }, []);

  // Cerrar modal con Escape
  useEffect(() => {
    if (!active) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setActive(null); };
    window.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [active]);

  if (list.length === 0) return null;

  return (
    <>
      <section className={styles.section}>
        <div className={styles.inner}>
          <div className={styles.header}>
            <div>
              <div className="section-tag">Reconocimientos</div>
              <h2 className={styles.title}>
                Reconocidos por<br />quienes servimos.
              </h2>
            </div>
            <span className={styles.count}>{list.length} reconocimientos oficiales</span>
          </div>

          <div className={styles.grid}>
            {list.map(r => {
              const img = resolveImg(r.img_url);
              return (
                <div key={r.id} className={styles.card}
                  onClick={() => setActive(r)} role="button" tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && setActive(r)}>

                  {img && (
                    <div className={styles.cardImgThumb}>
                      <img src={img} alt={r.titulo}
                        onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }} />
                    </div>
                  )}

                  <div className={styles.cardTop}>
                    <span className={styles.badge}>{r.badge}</span>
                    <span className={styles.cardDate}>{r.fecha}</span>
                  </div>
                  <div className={styles.institution}>{r.institucion}</div>
                  <div className={styles.cardTitle}>{r.titulo}</div>
                  <p className={styles.cardDesc}>{r.descripcion}</p>

                  <div className={styles.cardSeal}>
                    <span className={styles.sealIcon}>{r.icono}</span>
                    {r.firmante}
                  </div>
                  <div className={styles.cardCta}>Ver reconocimiento →</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Modal */}
      {active && (
        <div className={styles.overlay} onClick={() => setActive(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderLeft}>
                <span className={styles.badge}>{active.badge}</span>
                <span className={styles.modalDate}>{active.fecha}</span>
              </div>
              <button className={styles.closeBtn} onClick={() => setActive(null)}>✕</button>
            </div>

            <div className={styles.modalBody}>
              {resolveImg(active.img_url)
                ? <img src={resolveImg(active.img_url)!} alt={active.titulo} className={styles.modalImg} />
                : (
                  <div className={styles.modalImgPlaceholder}>
                    <span className={styles.modalImgIcon}>{active.icono}</span>
                    <span className={styles.modalImgLabel}>Documento oficial</span>
                  </div>
                )
              }
              <div className={styles.modalContent}>
                <p className={styles.modalInstitution}>{active.institucion}</p>
                <h2 className={styles.modalTitle}>{active.titulo}</h2>
                <p className={styles.modalText}>{active.texto_completo || active.descripcion}</p>
                <div className={styles.modalSeal}>
                  <span className={styles.sealIcon}>{active.icono}</span>
                  <div>
                    <div className={styles.modalSealLabel}>Emitido por</div>
                    <div className={styles.modalSealName}>{active.firmante}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
