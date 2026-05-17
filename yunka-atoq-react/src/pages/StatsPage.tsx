import { Link } from 'react-router-dom';
import styles from './StatsPage.module.css';

// ── datos del gráfico ──────────────────────────────────────────
const MONTHS = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];

const monthData = [
  { total: 102, forest: 9  },
  { total: 118, forest: 12 },
  { total: 126, forest: 11 },
  { total: 109, forest: 8  },
  { total: 132, forest: 15 },
  { total: 148, forest: 22 },
  { total: 154, forest: 24 },
  { total: 168, forest: 28 },
  { total: 159, forest: 19 },
  { total: 141, forest: 15 },
  { total: 0,   forest: 0  },
  { total: 0,   forest: 0  },
];

const TOTAL_OPS = monthData.reduce((s, m) => s + m.total, 0);

// SVG chart constants
const SVG_W = 900;
const SVG_H = 280;
const PAD = { top: 30, right: 20, bottom: 40, left: 10 };
const maxVal = Math.max(...monthData.map(m => m.total));
const BAR_AREA_H = SVG_H - PAD.top - PAD.bottom;
const colW = (SVG_W - PAD.left - PAD.right) / MONTHS.length;
const BAR_W = colW * 0.55;

function barHeight(v: number) { return maxVal > 0 ? (v / maxVal) * BAR_AREA_H : 0; }
function barX(i: number)      { return PAD.left + i * colW + (colW - BAR_W) / 2; }
function barY(h: number)      { return PAD.top + BAR_AREA_H - h; }

// ── distribución ───────────────────────────────────────────────
const distribution = [
  { name: 'Atención prehospitalaria', ops: 514, pct: 38 },
  { name: 'Incendios estructurales',  ops: 298, pct: 22 },
  { name: 'Incendios forestales',     ops: 244, pct: 18 },
  { name: 'Capacitación',             ops: 149, pct: 11 },
  { name: 'Cmd. de Incidentes',       ops:  81, pct:  6 },
  { name: 'Búsqueda y rescate',       ops:  68, pct:  5 },
];

// ── fecha en vivo ──────────────────────────────────────────────
function formatDate() {
  return new Intl.DateTimeFormat('es-BO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date()).replace(/^\w/, c => c.toUpperCase());
}

export default function StatsPage() {
  const today = formatDate();

  return (
    <main>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.breadcrumb}>
            <Link to="/">Inicio</Link><span>/</span>Estadísticas
          </div>
          <h1 className={styles.heroTitle}>
            Datos públicos.<br />Decisiones públicas.
          </h1>
          <p className={styles.heroDesc}>
            Cada operativo se registra, cada peso se reporta. Esta página se actualiza en tiempo real desde nuestro sistema operativo interno.
          </p>
        </div>
      </section>

      {/* Panel en vivo */}
      <section className={styles.liveWrap}>
        <div className={styles.liveInner}>
          <div className={styles.livePanel}>
            <div className={styles.livePanelTop}>
              <div>
                <div className={styles.liveLabel}>Estado operativo · En vivo</div>
                <div className={styles.liveDate}>Hoy · {today}</div>
              </div>
              <div className={styles.liveBadge}>
                <span className={styles.liveDot} />
                Sistema operativo
              </div>
            </div>

            <div className={styles.liveMetrics}>
              {[
                { value: '3',     label: 'Operativos en curso',    sub: '2 estructurales · 1 prehosp.' },
                { value: '28',    label: 'Atendidos hoy',          sub: '↑ +12% vs. promedio' },
                { value: '11 min',label: 'Tiempo respuesta · hoy', sub: '↓ -1 min vs. mes' },
                { value: '5',     label: 'Unidades disponibles',   sub: '2 en mantenimiento' },
              ].map(({ value, label, sub }) => (
                <div key={label} className={styles.liveMetric}>
                  <div className={styles.metricValue}>{value}</div>
                  <div className={styles.metricLabel}>{label}</div>
                  <div className={styles.metricSub}>{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Gráfico de barras */}
      <section className={styles.chartSection}>
        <div className={styles.chartInner}>
          <div className={styles.chartHeader}>
            <div className="section-tag">Operativos 2026 · Acumulado</div>
            <h2 className={styles.chartTitle}>
              {TOTAL_OPS.toLocaleString('es-BO')} operativos en<br />lo que va del año.
            </h2>
          </div>

          <div className={styles.chartLegend}>
            <div className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.legendDotNavy}`} />
              Operativos totales
            </div>
            <div className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.legendDotRed}`} />
              Incendios forestales
            </div>
          </div>

          <div className={styles.chartWrap}>
            <svg
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              className={styles.chartSvg}
              aria-label="Gráfico de operativos mensuales 2026"
            >
              {/* Línea base */}
              <line
                x1={PAD.left} y1={PAD.top + BAR_AREA_H}
                x2={SVG_W - PAD.right} y2={PAD.top + BAR_AREA_H}
                stroke="#E5E0D8" strokeWidth="1"
              />

              {monthData.map((m, i) => {
                const hTotal   = barHeight(m.total);
                const hForest  = barHeight(m.forest);
                const hBase    = barHeight(m.total - m.forest);
                const x        = barX(i);
                const hasData  = m.total > 0;

                return (
                  <g key={MONTHS[i]}>
                    {hasData && (
                      <>
                        {/* Navy bar (total minus forest) */}
                        <rect
                          x={x} y={barY(hTotal)}
                          width={BAR_W} height={hBase}
                          fill="#122040" rx="2"
                        />
                        {/* Red bar (forest) at bottom */}
                        <rect
                          x={x} y={barY(hForest)}
                          width={BAR_W} height={hForest}
                          fill="#C41E1E" rx="2"
                        />
                        {/* Value label */}
                        <text
                          x={x + BAR_W / 2}
                          y={barY(hTotal) - 6}
                          textAnchor="middle"
                          fontSize="11"
                          fill="#6B7280"
                          fontFamily="Barlow Condensed, sans-serif"
                          fontWeight="600"
                        >
                          {m.total}
                        </text>
                      </>
                    )}
                    {/* Month label */}
                    <text
                      x={x + BAR_W / 2}
                      y={SVG_H - 8}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#6B7280"
                      fontFamily="Barlow Condensed, sans-serif"
                      fontWeight="700"
                      letterSpacing="1"
                    >
                      {MONTHS[i]}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </section>

      {/* Distribución por tipo */}
      <section className={styles.distSection}>
        <div className={styles.distInner}>
          <div className="section-tag">Distribución por tipo de operativo</div>

          <div className={styles.distGrid}>
            {distribution.map(({ name, ops, pct }) => (
              <div key={name} className={styles.distCard}>
                <div className={styles.distTop}>
                  <span className={styles.distOps}>{ops} ops</span>
                  <span className={styles.distPct}>{pct}%</span>
                </div>
                <div className={styles.distName}>{name}</div>
                <div className={styles.distBar}>
                  <div className={styles.distFill} style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
