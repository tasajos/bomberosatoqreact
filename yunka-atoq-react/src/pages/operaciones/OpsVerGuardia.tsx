import { useState, useEffect } from 'react';
import { opsDptoApi, type Guardia } from '../../services/api';
import styles from './Ops.module.css';

function toDateKey(s: string) { return s.slice(0, 10); }

function fmtDate(s: string) {
  const d = new Date(toDateKey(s) + 'T12:00:00');
  return isNaN(d.getTime()) ? s : new Intl.DateTimeFormat('es-BO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(d);
}

const TURNO_ORDER = ['diurno', 'nocturno', '24h'];
const TURNO_LABEL: Record<string, string> = {
  diurno:   'Turno Diurno',
  nocturno: 'Turno Nocturno',
  '24h':    'Turno 24 Horas',
};

const ROL_COLORS: Record<string, { color: string; bg: string }> = {
  'Jefe de guardia':        { color: '#991b1b', bg: '#fef2f2' },
  'Oficial de guardia':     { color: '#1e40af', bg: '#eff6ff' },
  'Maquinista':             { color: '#5b21b6', bg: '#f5f3ff' },
  'Voluntario de servicio': { color: '#166534', bg: '#f0fdf4' },
  'Apoyo logístico':        { color: '#92400e', bg: '#fffbeb' },
  'Comunicaciones':         { color: '#155e75', bg: '#ecfeff' },
  'Observador':             { color: '#374151', bg: '#f9fafb' },
};

type Grouped = Record<string, Record<string, Guardia[]>>;

export default function OpsVerGuardia() {
  const [guardias, setGuardias] = useState<Guardia[]>([]);
  const [loading, setLoading]   = useState(true);
  const [err, setErr]           = useState('');
  const [desde, setDesde]       = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10);
  });
  const [hasta, setHasta] = useState(() => new Date().toISOString().slice(0, 10));

  const load = () => {
    setLoading(true); setErr('');
    opsDptoApi.listGuardias({ fecha_desde: desde, fecha_hasta: hasta })
      .then(data => setGuardias(Array.isArray(data) ? data : []))
      .catch(e => setErr(e instanceof Error ? e.message : 'Error al cargar'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [desde, hasta]);

  // Agrupar por fecha → turno
  const grouped: Grouped = guardias.reduce((acc, g) => {
    const fecha = toDateKey(g.fecha);
    if (!acc[fecha]) acc[fecha] = {};
    if (!acc[fecha][g.turno]) acc[fecha][g.turno] = [];
    acc[fecha][g.turno].push(g);
    return acc;
  }, {} as Grouped);

  const fechas = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Ver Rol de Guardia</h1>
          <p className={styles.pageSub}>
            {loading ? 'Cargando…' : `${guardias.length} registro${guardias.length !== 1 ? 's' : ''} en el período`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className={styles.field} style={{ margin: 0 }}>
            <label className={styles.label}>Desde</label>
            <input className={styles.input} type="date" value={desde}
              onChange={e => setDesde(e.target.value)} style={{ width: '145px' }} />
          </div>
          <div className={styles.field} style={{ margin: 0 }}>
            <label className={styles.label}>Hasta</label>
            <input className={styles.input} type="date" value={hasta}
              onChange={e => setHasta(e.target.value)} style={{ width: '145px' }} />
          </div>
          <button className={styles.secondaryBtn} onClick={load}>Buscar</button>
        </div>
      </div>

      {err    && <div className={styles.errorMsg}>{err}</div>}
      {loading && <p className={styles.empty}>Cargando…</p>}
      {!loading && !err && !guardias.length && (
        <p className={styles.empty}>No hay registros de guardia en el período seleccionado.</p>
      )}

      {!loading && fechas.map(fecha => {
        const turnosPorFecha = grouped[fecha];
        const lugar = Object.values(turnosPorFecha).flat()[0]?.novedades;
        const totalVol = Object.values(turnosPorFecha).reduce((s, arr) => s + arr.length, 0);

        return (
          <div key={fecha} style={{ marginBottom: '2rem' }}>
            {/* Encabezado de fecha */}
            <div style={{
              display: 'flex', alignItems: 'baseline', gap: '1rem',
              marginBottom: '0.875rem', paddingBottom: '0.625rem',
              borderBottom: '2px solid #0F172A',
            }}>
              <h2 style={{
                fontFamily: 'var(--font-condensed)', fontSize: '1.05rem',
                fontWeight: 900, color: '#0F172A', margin: 0,
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                {fmtDate(fecha)}
              </h2>
              <span style={{
                fontFamily: 'var(--font-condensed)', fontSize: '0.7rem',
                fontWeight: 700, color: '#64748B', letterSpacing: '0.08em',
              }}>
                {totalVol} voluntario{totalVol !== 1 ? 's' : ''}
                {lugar ? ` · ${lugar}` : ''}
              </span>
            </div>

            {/* Una tabla por turno */}
            {TURNO_ORDER.filter(t => turnosPorFecha[t]).map(turno => {
              const items = turnosPorFecha[turno];
              return (
                <div key={turno} style={{ marginBottom: '1.25rem' }}>
                  {/* Subencabezado de turno */}
                  <div style={{
                    display: 'inline-block',
                    fontFamily: 'var(--font-condensed)', fontSize: '0.68rem',
                    fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: '#475569', background: '#F1F5F9',
                    padding: '0.25rem 0.75rem', borderRadius: '4px',
                    marginBottom: '0.5rem',
                  }}>
                    {TURNO_LABEL[turno]}
                  </div>

                  {/* Tabla */}
                  <div style={{
                    background: 'white', border: '1px solid #E2E8F0',
                    borderRadius: '10px', overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}>
                    {/* Cabecera de tabla */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: '2rem 1fr 9rem 11rem',
                      padding: '0.5rem 1.25rem',
                      background: '#F8FAFC', borderBottom: '1px solid #E2E8F0',
                    }}>
                      {['#', 'Voluntario', 'Matrícula', 'Rol en guardia'].map(h => (
                        <span key={h} style={{
                          fontFamily: 'var(--font-condensed)', fontSize: '0.62rem',
                          fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
                          color: '#94A3B8',
                        }}>{h}</span>
                      ))}
                    </div>

                    {/* Filas */}
                    {items.map((g, idx) => {
                      const rc = ROL_COLORS[g.rol_guardia];
                      return (
                        <div key={g.id} style={{
                          display: 'grid', gridTemplateColumns: '2rem 1fr 9rem 11rem',
                          padding: '0.75rem 1.25rem', alignItems: 'center',
                          borderBottom: idx < items.length - 1 ? '1px solid #F8FAFC' : 'none',
                          background: idx % 2 === 0 ? 'white' : '#FAFBFC',
                        }}>
                          <span style={{
                            fontFamily: 'var(--font-condensed)', fontSize: '0.78rem',
                            fontWeight: 700, color: '#CBD5E1',
                          }}>{idx + 1}</span>

                          <div style={{
                            fontFamily: 'var(--font-condensed)', fontSize: '0.88rem',
                            fontWeight: 700, color: '#1E293B',
                          }}>
                            {g.voluntario_nombre}
                          </div>

                          <div style={{ fontSize: '0.8rem', color: '#64748B', fontFamily: 'var(--font-condensed)', fontWeight: 600 }}>
                            {g.matricula || '—'}
                          </div>

                          <div>
                            {g.rol_guardia ? (
                              <span style={{
                                display: 'inline-block',
                                fontFamily: 'var(--font-condensed)', fontSize: '0.65rem',
                                fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
                                color: rc?.color ?? '#374151',
                                background: rc?.bg ?? '#f9fafb',
                                border: `1px solid ${rc?.color ?? '#374151'}25`,
                                padding: '0.2rem 0.6rem', borderRadius: '4px',
                              }}>
                                {g.rol_guardia}
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#CBD5E1' }}>—</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
