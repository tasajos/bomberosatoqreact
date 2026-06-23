import { useEffect, useState } from 'react';
import { voluntarioApi, type VoluntarioDashboardData } from '../../services/api';
import s from './VoluntarioDashboard.module.css';

function nivelDe(indice: number) {
  if (indice >= 80) return 'Nivel A — Destacado';
  if (indice >= 60) return 'Nivel B — Sólido';
  if (indice >= 40) return 'Nivel C — En progreso';
  return 'Nivel D — Inicial';
}

const META = 250;

export default function VoluntarioMeritos() {
  const [data, setData] = useState<VoluntarioDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    voluntarioApi.miPerfil()
      .then(setData)
      .catch(e => setError(e.message || 'Error al cargar datos'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className={s.loading}>Cargando méritos…</div>;
  if (error) return <div className={s.errorBox}>{error}</div>;
  if (!data) return null;

  const { stats, meritos_lista, llamadas_lista } = data;
  const indice = Math.max(0, Math.min(100, Math.round((stats.puntos || 0) / META * 100)));
  const R = 52;
  const C = +(2 * Math.PI * R).toFixed(1);
  const offset = +(C * (1 - indice / 100)).toFixed(1);

  const meritosPts = meritos_lista.reduce((a, m) => a + (m.puntos_extra || 0), 0);
  const demeritosPts = llamadas_lista.reduce((a, l) => a + Math.abs(l.puntos_extra || 0), 0);
  const maxM = Math.max(1, ...meritos_lista.map(m => m.puntos_extra || 0));
  const maxD = Math.max(1, ...llamadas_lista.map(l => Math.abs(l.puntos_extra || 0)));

  return (
    <div className={s.page}>
      <div className={s.meritGrid}>
        {/* Tarjeta de índice */}
        <section className={s.scoreCard}>
          <div className={s.scoreGauge}>
            <svg width="170" height="170" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="10" />
              <circle cx="60" cy="60" r={R} fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round"
                strokeDasharray={C} strokeDashoffset={offset} />
            </svg>
            <div className={s.scoreCenter}>
              <span className={s.scoreNum}>{indice}</span>
              <span className={s.scoreLabel}>ÍNDICE</span>
            </div>
          </div>
          <div className={s.scoreNivel}>{nivelDe(indice)}</div>
          <div className={s.scoreNeto}>Neto acumulado: {stats.puntos} pts</div>
          <div className={s.scoreTiles}>
            <div className={`${s.scoreTile} ${s.scoreTileM}`}>
              <div className={s.scoreTileNum}>{meritosPts || meritos_lista.length}</div>
              <div className={s.scoreTileLabel}>Méritos</div>
            </div>
            <div className={`${s.scoreTile} ${s.scoreTileD}`}>
              <div className={s.scoreTileNum}>{demeritosPts || llamadas_lista.length}</div>
              <div className={s.scoreTileLabelD}>Deméritos</div>
            </div>
          </div>
        </section>

        {/* Méritos + deméritos */}
        <div className={s.meritRight}>
          <section className={s.sectionCard}>
            <div className={s.barCardHead}>
              <span className={s.legendDot} style={{ background: '#2F6BFF' }} />
              <span className={s.cardKicker}>MÉRITOS POR CATEGORÍA</span>
            </div>
            {meritos_lista.length === 0 ? (
              <div className={s.empty}><div className={s.emptyIcon}>🏅</div><div className={s.emptyText}>Sin méritos registrados aún</div></div>
            ) : (
              <div className={s.barList}>
                {meritos_lista.map(m => (
                  <div key={m.id}>
                    <div className={s.barTop}>
                      <span className={s.barLabel}>{m.titulo}</span>
                      <span className={s.barValB}>+{m.puntos_extra}</span>
                    </div>
                    <div className={s.barTrack}>
                      <div className={s.barFill} style={{ width: `${Math.round((m.puntos_extra || 0) / maxM * 100)}%`, background: 'linear-gradient(90deg,#2F6BFF,#5B8BFF)' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={s.sectionCard}>
            <div className={s.barCardHead}>
              <span className={s.legendDot} style={{ background: '#B01E3C' }} />
              <span className={s.cardKicker}>DEMÉRITOS REGISTRADOS</span>
            </div>
            {llamadas_lista.length === 0 ? (
              <div className={s.empty}><div className={s.emptyIcon}>✅</div><div className={s.emptyText}>Sin deméritos ni llamadas de atención</div></div>
            ) : (
              <div className={s.barList}>
                {llamadas_lista.map(l => (
                  <div key={l.id}>
                    <div className={s.barTop}>
                      <span className={s.barLabel}>{l.titulo}</span>
                      <span className={s.barValR}>{l.puntos_extra ? `-${Math.abs(l.puntos_extra)}` : ''}</span>
                    </div>
                    <div className={s.barTrack}>
                      <div className={s.barFill} style={{ width: `${Math.round(Math.abs(l.puntos_extra || 0) / maxD * 100)}%`, background: 'linear-gradient(90deg,#7E1228,#B01E3C)' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
