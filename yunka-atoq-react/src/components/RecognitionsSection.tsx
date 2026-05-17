import { useState, useEffect } from 'react';
import styles from './RecognitionsSection.module.css';

interface Recognition {
  badge: string;
  date: string;
  institution: string;
  title: string;
  desc: string;
  firmante: string;
  icon: string;
  img?: string;
  fullText?: string;
}

const recognitions: Recognition[] = [
  {
    badge: 'Gubernamental',
    date: 'Octubre 2025',
    institution: 'Gobierno Autónomo Departamental de Cochabamba',
    title: 'Certificado de Reconocimiento',
    desc: 'Por las acciones de apoyo logístico, atención a emergencias y desastres ante eventos adversos de origen natural y antrópico, cuidando el medio ambiente al Departamento de Cochabamba.',
    firmante: 'Humberto Sánchez Sánchez · Gobernador',
    icon: '🏛️',
    img: '/reconocimientos/gobernacion.jpg',
    fullText: 'El Gobierno Autónomo Departamental de Cochabamba otorga el presente Certificado de Reconocimiento a la Fundación de Voluntarios de Salvamento, Rescate y Protección Ambiental "Yunka Atoq", por las acciones de apoyo logístico, atención a emergencias y desastres, ante eventos adversos de origen natural y antrópico, cuidando el medio ambiente al Departamento de Cochabamba. Cochabamba, octubre de 2025.',
  },
  {
    badge: 'Municipal',
    date: '27 Nov 2023',
    institution: 'Sub Alcaldía Distrito Tumupasa · Prov. Abel Iturralde, La Paz',
    title: 'Carta de Agradecimiento',
    desc: 'Por el apoyo social constante al pueblo e institución, coadyuvando en los días de emergencia por incendio que sufrió el Municipio y Distrito de Tumupasa.',
    firmante: 'Gary A. Terrazas Beyuma · Sub Alcalde · Romer R. Vargas Chuqui · Corregidor Territorial',
    icon: '🏘️',
    img: '/reconocimientos/tumupasa.jpg',
    fullText: 'La Sub Alcaldía del Distrito de Tumupasa, dependiente del Gobierno Autónomo Municipal de San Buenaventura, Departamento de La Paz, hace llegar sus más sinceros agradecimientos a la Brigada de Bomberos Voluntarios Yunka Atoq por el apoyo social constante a nuestro pueblo e institución, coadyuvando en los días de emergencia por incendio que sufrió nuestro Municipio y Distrito de Tumupasa, valoramos mucho su contribución, siempre pensando en el desarrollo y bienestar de nuestra población. Tumupasa, 27 de noviembre de 2023.',
  },
  {
    badge: 'Legislativo',
    date: 'Julio 2025',
    institution: 'Cámara de Diputados · Asamblea Legislativa Plurinacional de Bolivia',
    title: 'Reconocimiento Nº 48/2024-2025',
    desc: 'Por su trayectoria institucional, fortalecimiento y apoyo en Emergencias y Ayuda Humanitaria, promoviendo el voluntariado con proyectos sostenibles que benefician a diversas comunidades en Bolivia.',
    firmante: 'Dip. Sergio Maniguary Moura · Presidente Comisión Política Social · Cámara de Diputados',
    icon: '🎖️',
    img: '/reconocimientos/diputados-48.jpg',
    fullText: 'La Comisión de Política Social de la Cámara de Diputados rinde un justo y merecido Reconocimiento Camaral a la Fundación de Voluntarios de Salvamento, Rescate y Protección Ambiental "Yunka Atoq", por su trayectoria institucional, fortalecimiento y apoyo en Emergencias y Ayuda Humanitaria, organizaciones que han demostrado un impacto sobresaliente en la promoción del voluntariado, llevando a cabo proyectos sostenibles y acciones solidarias que beneficien a diversas comunidades en Bolivia. Es dado en la Cámara de Diputados de la Asamblea Legislativa Plurinacional de Bolivia, a los 07 días del mes de julio de dos mil veinticinco años.',
  },
  {
    badge: 'Presidencia ALP',
    date: 'Julio 2025',
    institution: 'Presidencia de la Cámara de Diputados · PRES.REC/DYS/N°2456/2024-2025',
    title: 'Reconocimiento de la Presidencia — Cámara de Diputados',
    desc: 'Por el valioso aporte a la promoción del voluntariado a nivel nacional, impulsando proyectos sostenibles y acciones solidarias en salvamento, rescate y protección ambiental, priorizando la defensa de la vida.',
    firmante: 'Omer Yucra Santas · Presidente Cámara de Diputados',
    icon: '🏅',
    img: '/reconocimientos/diputados-presidencia.jpg',
    fullText: 'En el marco de mis atribuciones como presidente de la Cámara de Diputados, tengo el agrado de otorgar el presente Reconocimiento a la Fundación de Voluntarios de Salvamento, Rescate y Protección Ambiental "Yunka Atoq", por su valioso aporte a la promoción del voluntariado a nivel nacional, impulsando proyectos sostenibles y acciones solidarias que benefician a diversas comunidades del país. Su trabajo principal abarca acciones de salvamento, rescate y protección ambiental, priorizando de manera fundamental la defensa de la vida. Su invaluable labor contribuye al desarrollo integral del Estado Plurinacional de Bolivia. La Paz, julio de 2025.',
  },
];

export default function RecognitionsSection() {
  const [active, setActive] = useState<Recognition | null>(null);

  // Cerrar con Escape
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setActive(null); };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [active]);

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
            <span className={styles.count}>{recognitions.length} reconocimientos oficiales</span>
          </div>

          <div className={styles.grid}>
            {recognitions.map((r) => (
              <div
                key={r.title}
                className={styles.card}
                onClick={() => setActive(r)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && setActive(r)}
              >
                <div className={styles.cardTop}>
                  <span className={styles.badge}>{r.badge}</span>
                  <span className={styles.cardDate}>{r.date}</span>
                </div>
                <div className={styles.institution}>{r.institution}</div>
                <div className={styles.cardTitle}>{r.title}</div>
                <p className={styles.cardDesc}>{r.desc}</p>
                <div className={styles.cardSeal}>
                  <span className={styles.sealIcon}>{r.icon}</span>
                  {r.firmante}
                </div>
                <div className={styles.cardCta}>Ver reconocimiento →</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modal */}
      {active && (
        <div className={styles.overlay} onClick={() => setActive(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            {/* Header modal */}
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderLeft}>
                <span className={styles.badge}>{active.badge}</span>
                <span className={styles.modalDate}>{active.date}</span>
              </div>
              <button className={styles.closeBtn} onClick={() => setActive(null)} aria-label="Cerrar">✕</button>
            </div>

            {/* Body */}
            <div className={styles.modalBody}>
              {/* Imagen placeholder */}
              {active.img
                ? <img src={active.img} alt={active.title} className={styles.modalImg} />
                : (
                  <div className={styles.modalImgPlaceholder}>
                    <span className={styles.modalImgIcon}>{active.icon}</span>
                    <span className={styles.modalImgLabel}>Documento oficial</span>
                  </div>
                )
              }

              {/* Contenido */}
              <div className={styles.modalContent}>
                <p className={styles.modalInstitution}>{active.institution}</p>
                <h2 className={styles.modalTitle}>{active.title}</h2>
                <p className={styles.modalText}>{active.fullText ?? active.desc}</p>

                <div className={styles.modalSeal}>
                  <span className={styles.sealIcon}>{active.icon}</span>
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
