import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './HeroSection.module.css';
import { campaniasApi, type Campania } from '../services/api';

function formatBs(n: number) {
  return new Intl.NumberFormat('es-BO', { minimumFractionDigits: 0 }).format(n);
}

export default function HeroSection() {
  const [campania, setCampania] = useState<Campania | null>(null);

  useEffect(() => {
    campaniasApi.activa().catch(() => null).then(c => { if (c) setCampania(c); });
  }, []);

  const pct = campania ? Math.min(100, Math.round((campania.recaudado / campania.meta) * 100)) : 68;

  return (
    <section className={styles.hero}>
      <div className={styles.inner}>
        {/* Left */}
        <div>
          <div className={styles.meta}>
            <span>Cochabamba · Bolivia</span>
            <span className={styles.metaDot}>·</span>
            <span>EST. 2008 · Cía. 042</span>
            <span className={styles.metaDot}>·</span>
            <span>17 años de servicio</span>
          </div>

          <h1 className={styles.headline}>
            Cuando suena<br />
            la alarma,<br />
            respondemos.<br />
            <span className={styles.headlineAccent}>Cuando tú<br />
            donas,<br />
            existimos.</span>
          </h1>

          <p className={styles.description}>
            Somos una compañía de bomberos <strong>100% voluntaria y autofinanciada</strong>.
            Cada metro de manguera, cada equipo de rescate existe gracias a tu apoyo.
          </p>

          <div className={styles.ctas}>
            <Link to="/donaciones" className="btn-primary">Donar ahora</Link>
            <Link to="/voluntarios" className="btn-secondary">Ser voluntario</Link>
          </div>
        </div>

        {/* Campaign card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>Campaña activa</span>
            <span className={styles.cardBadge}>En curso</span>
          </div>

          <h2 className={styles.cardTitle}>
            {campania?.nombre ?? 'Equipos de respiración autónoma · ERA-2026'}
          </h2>

          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${pct}%` }} />
          </div>
          <div className={styles.progressMeta}>
            <span>Bs {formatBs(campania?.recaudado ?? 186420)}</span>
            <span>Meta: Bs {formatBs(campania?.meta ?? 275000)}</span>
          </div>

          <div className={styles.cardStats}>
            <div className={styles.stat}>
              <div className={styles.statValue}>{pct}%</div>
              <div className={styles.statLabel}>Recaudado</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statValue}>{campania?.donantes ?? 412}</div>
              <div className={styles.statLabel}>Donantes 2026</div>
            </div>
          </div>

          <Link to="/donaciones" className={styles.donateFullBtn}>
            Donar a esta campaña →
          </Link>
          <p className={styles.methods}>Transferencia · QR · Tigo Money · Tarjeta</p>
        </div>
      </div>
    </section>
  );
}
