import { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './DonationsPage.module.css';

const AMOUNTS = [50, 100, 250, 500, 1000, 2500];

function calcImpact(bs: number) {
  return [
    { num: Math.max(0, Math.floor(bs / 50)),   desc: 'Metros de manguera'   },
    { num: Math.max(0, Math.floor(bs / 20)),   desc: 'Guantes ignífugos'    },
    { num: Math.max(0, Math.floor(bs / 120)),  desc: 'Máscaras de carbón'   },
    { num: Math.max(0, Math.floor(bs / 350)),  desc: 'Linternas tácticas'   },
  ].filter(i => i.num > 0).slice(0, 4);
}

const methods = [
  { num: '01', name: 'Transferencia bancaria', desc: 'Banco Mercantil Santa Cruz · Cta. 4-0123-4567-8 (Bs)' },
  { num: '02', name: 'Código QR',              desc: 'Genera al confirmar el monto. Compatible con todos los bancos.' },
  { num: '03', name: 'Tigo Money',             desc: 'Envía a 76543210 — recibe confirmación inmediata.' },
  { num: '04', name: 'Tarjeta de crédito / débito', desc: 'VISA · Mastercard · American Express vía gateway seguro.' },
  { num: '05', name: 'En cuartel',             desc: 'Av. Heroínas 1456, de lunes a viernes 8-18h.' },
];

const campaigns = [
  { badge: 'Equipamiento', name: 'Equipos de respiración autónoma ERA-2026', raised: 186420, goal: 275000 },
  { badge: 'Flota',        name: 'Mantenimiento mayor · Unidad B-04',        raised:  31500, goal:  75000 },
  { badge: 'Formación',    name: 'Beca escuela bomberil · 200 escolares',     raised:  64800, goal:  80000 },
];

function fmt(n: number) { return new Intl.NumberFormat('es-BO').format(n); }

export default function DonationsPage() {
  const [freq, setFreq]     = useState<'once' | 'monthly'>('once');
  const [selected, setSelected] = useState<number>(100);
  const [custom, setCustom] = useState('100');

  const amount = Number(custom) > 0 ? Number(custom) : selected;
  const impact = calcImpact(amount);

  const handleAmount = (v: number) => {
    setSelected(v);
    setCustom(String(v));
  };

  const handleCustom = (v: string) => {
    setCustom(v);
    setSelected(0);
  };

  return (
    <main>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.breadcrumb}>
            <Link to="/">Inicio</Link><span>/</span>Donaciones
          </div>
          <h1 className={styles.heroTitle}>
            Tu donación,<br />en metros de<br />manguera.
          </h1>
          <p className={styles.heroDesc}>
            Cada peso boliviano se convierte en algo concreto. Te mostramos exactamente en qué.
          </p>
        </div>
      </section>

      {/* Calculadora + Métodos */}
      <section className={styles.mainSection}>
        <div className={styles.mainInner}>
          {/* Calculadora */}
          <div>
            <div className="section-tag">Calculadora de impacto</div>
            <h2 className={styles.calcTitle}>
              Convierte tu donación<br />en equipamiento real.
            </h2>

            <div className={styles.freqToggle}>
              <button
                className={`${styles.freqBtn} ${freq === 'once' ? styles.freqBtnActive : ''}`}
                onClick={() => setFreq('once')}
              >Una vez</button>
              <button
                className={`${styles.freqBtn} ${freq === 'monthly' ? styles.freqBtnActive : ''}`}
                onClick={() => setFreq('monthly')}
              >Mensual</button>
            </div>

            <div className={styles.amountGrid}>
              {AMOUNTS.map(a => (
                <button
                  key={a}
                  className={`${styles.amountBtn} ${selected === a && String(a) === custom ? styles.amountBtnActive : ''}`}
                  onClick={() => handleAmount(a)}
                >
                  Bs {fmt(a)}
                </button>
              ))}
            </div>

            <label className={styles.customLabel}>Otro monto (Bs)</label>
            <input
              className={styles.customInput}
              type="number"
              min="1"
              value={custom}
              onChange={e => handleCustom(e.target.value)}
              placeholder="Ej. 150"
            />

            <div className={styles.impactPanel}>
              <div className={styles.impactLabel}>
                Bs {fmt(amount)} · eso equivale a
              </div>
              <div className={styles.impactGrid}>
                {impact.length > 0
                  ? impact.map(({ num, desc }) => (
                    <div key={desc}>
                      <div className={styles.impactNum}>{num}</div>
                      <div className={styles.impactDesc}>{desc}</div>
                    </div>
                  ))
                  : <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', gridColumn: '1/-1' }}>
                      Ingresa un monto para ver el impacto.
                    </div>
                }
              </div>
            </div>
          </div>

          {/* Métodos de pago */}
          <div>
            <div className="section-tag">Métodos de pago</div>

            <div className={styles.methodList}>
              {methods.map(({ num, name, desc }) => (
                <div key={num} className={styles.methodItem}>
                  <div>
                    <div className={styles.methodName}>{name}</div>
                    <div className={styles.methodDesc}>{desc}</div>
                  </div>
                  <span className={styles.methodNum}>{num}</span>
                </div>
              ))}
            </div>

            <div className={styles.taxBox}>
              <strong>Empresas:</strong> emitimos factura electrónica para descargo tributario.
              NIT 680272021 · Personería 304/2025.
            </div>
          </div>
        </div>
      </section>

      {/* Campañas */}
      <section className={styles.campaigns}>
        <div className={styles.campaignsInner}>
          <div className="section-tag">Campañas activas</div>
          <h2 className={styles.campaignsTitle}>
            Donaciones con<br />destino específico.
          </h2>

          <div className={styles.campaignGrid}>
            {campaigns.map(({ badge, name, raised, goal }) => {
              const pct = Math.round((raised / goal) * 100);
              return (
                <div key={name} className={styles.campaignCard}>
                  <span className={styles.campaignBadge}>{badge}</span>
                  <div className={styles.campaignName}>{name}</div>
                  <div className={styles.campaignBar}>
                    <div className={styles.campaignFill} style={{ width: `${pct}%` }} />
                  </div>
                  <div>
                    <div className={styles.campaignMeta}>
                      <span className={styles.campaignRaised}>Bs {fmt(raised)} recaudado</span>
                      <span className={styles.campaignPct}>{pct}%</span>
                    </div>
                    <div className={styles.campaignGoal}>Meta: Bs {fmt(goal)}</div>
                  </div>
                  <button className={styles.campaignBtn}>Donar a esta campaña</button>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
