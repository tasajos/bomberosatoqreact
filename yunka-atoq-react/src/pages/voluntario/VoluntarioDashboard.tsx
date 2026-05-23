import { useState, useEffect } from 'react';
import { voluntarioApi, capacitacionesApi, type VoluntarioDashboardData } from '../../services/api';
import { RankBadgeSVG } from '../../utils/rankBadge';

// ── helpers ───────────────────────────────────────────────────────

function fmtDate(s?: string) {
  if (!s) return '—';
  const d = new Date(s.slice(0, 10) + 'T12:00:00');
  return isNaN(d.getTime()) ? s
    : new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

function fmtDateShort(s?: string) {
  if (!s) return '—';
  const d = new Date(s.slice(0, 10) + 'T12:00:00');
  return isNaN(d.getTime()) ? s
    : new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'short' }).format(d);
}

function initials(nombre: string, apellido: string) {
  return `${nombre?.[0] ?? ''}${apellido?.[0] ?? ''}`.toUpperCase();
}


// ── Tipo capacitación ─────────────────────────────────────────────

const TIPO_CFG: Record<string, { label: string; color: string; bg: string }> = {
  interna:       { label: 'Interna',       color: '#1e40af', bg: '#eff6ff' },
  externa:       { label: 'Externa',       color: '#166534', bg: '#f0fdf4' },
  certificacion: { label: 'Certificación', color: '#7c3aed', bg: '#f5f3ff' },
};

const TURNO_LABEL: Record<string, string> = {
  diurno: 'Diurno', nocturno: 'Nocturno', '24h': '24h',
};
const TURNO_COLOR: Record<string, { color: string; bg: string }> = {
  diurno:   { color: '#92400e', bg: '#fef3c7' },
  nocturno: { color: '#1e3a5f', bg: '#dbeafe' },
  '24h':    { color: '#5b21b6', bg: '#ede9fe' },
};

const INS_COLOR: Record<string, { color: string; bg: string }> = {
  inscrito:   { color: '#065f46', bg: '#d1fae5' },
  completado: { color: '#1e40af', bg: '#dbeafe' },
  ausente:    { color: '#991b1b', bg: '#fee2e2' },
};

// ── Stat card ─────────────────────────────────────────────────────

type StatCardProps = {
  label: string; value: number | string; icon: string;
  color?: string; bg?: string; note?: string;
};

function StatCard({ label, value, icon, color = '#0F172A', bg = '#F8FAFC', note }: StatCardProps) {
  return (
    <div style={{
      background: bg, border: '1.5px solid #E2E8F0', borderRadius: '14px',
      padding: '1.1rem 1.25rem', minWidth: '120px', flex: '1 1 110px',
      display: 'flex', flexDirection: 'column', gap: '0.35rem',
    }}>
      <div style={{ fontSize: '1.35rem', lineHeight: 1 }}>{icon}</div>
      <div style={{
        fontFamily: 'var(--font-condensed)', fontSize: '1.65rem', fontWeight: 900,
        color, lineHeight: 1,
      }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-condensed)', fontSize: '0.65rem', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748B' }}>
        {label}
      </div>
      {note && (
        <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: '0.1rem' }}>{note}</div>
      )}
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────

function SectionTitle({ title, count }: { title: string; count?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1rem' }}>
      <h2 style={{
        fontFamily: 'var(--font-condensed)', fontSize: '1rem', fontWeight: 900,
        color: '#0F172A', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>{title}</h2>
      {count !== undefined && (
        <span style={{
          fontFamily: 'var(--font-condensed)', fontSize: '0.65rem', fontWeight: 800,
          background: '#E2E8F0', color: '#475569', borderRadius: '999px',
          padding: '0.15rem 0.5rem',
        }}>{count}</span>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────

export default function VoluntarioDashboard() {
  const [data, setData]       = useState<VoluntarioDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [busy, setBusy]       = useState<number | null>(null);
  const [msg, setMsg]         = useState('');

  const load = () => {
    setLoading(true);
    voluntarioApi.miPerfil()
      .then(setData)
      .catch(e => setError(e.message || 'Error al cargar datos'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const toggleInscripcion = async (cap: VoluntarioDashboardData['caps_abiertas'][0]) => {
    setBusy(cap.id);
    try {
      if (cap.ya_inscrito) {
        await capacitacionesApi.desinscribirse(cap.id);
        setMsg(`Cancelaste tu inscripción en "${cap.nombre}".`);
      } else {
        await capacitacionesApi.inscribirse(cap.id);
        setMsg(`Te inscribiste en "${cap.nombre}".`);
      }
      load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(null);
      setTimeout(() => setMsg(''), 4000);
    }
  };

  if (loading) return (
    <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.875rem' }}>
      Cargando tu panel…
    </div>
  );

  if (error) return (
    <div style={{ padding: '3rem 2rem', textAlign: 'center', color: '#991b1b', fontSize: '0.875rem' }}>
      {error}
    </div>
  );

  if (!data) return null;

  const { usuario, stats, guardias_recientes, llamadas_lista, meritos_lista, caps_abiertas, caps_mis } = data;
  const nombreCompleto = `${usuario.nombre} ${usuario.apellido_paterno} ${usuario.apellido_materno || ''}`.trim();
  const initls = initials(usuario.nombre, usuario.apellido_paterno);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.25rem 3rem' }}>

      {/* ── Hero profile card ─────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1e3a5f 50%, #1e1b4b 100%)',
        borderRadius: '20px', padding: '2rem 2.5rem', marginBottom: '1.5rem',
        display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* background decoration */}
        <div style={{
          position: 'absolute', top: '-40px', right: '-40px', width: '220px', height: '220px',
          background: 'rgba(196,30,30,0.08)', borderRadius: '50%', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-60px', right: '120px', width: '180px', height: '180px',
          background: 'rgba(124,58,237,0.06)', borderRadius: '50%', pointerEvents: 'none',
        }} />

        {/* Avatar */}
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #C41E1E 0%, #7c3aed 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-condensed)', fontSize: '2rem', fontWeight: 900, color: 'white',
          border: '3px solid rgba(255,255,255,0.15)', boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          position: 'relative', zIndex: 1,
        }}>{initls}</div>

        {/* Rank insignia */}
        <div style={{ position: 'relative', zIndex: 1, flexShrink: 0 }}>
          <RankBadgeSVG grado={usuario.grado} size={56} />
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
            {usuario.cargo_directiva && (
              <span style={{
                fontFamily: 'var(--font-condensed)', fontSize: '0.65rem', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.1em',
                color: '#fbbf24', background: 'rgba(251,191,36,0.15)',
                border: '1px solid rgba(251,191,36,0.3)',
                padding: '0.15rem 0.6rem', borderRadius: '4px',
              }}>{usuario.cargo_directiva}</span>
            )}
            <span style={{
              fontFamily: 'var(--font-condensed)', fontSize: '0.63rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.1em',
              color: usuario.activo ? '#4ade80' : '#f87171',
              background: usuario.activo ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
              border: `1px solid ${usuario.activo ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
              padding: '0.15rem 0.6rem', borderRadius: '4px',
            }}>{usuario.activo ? 'Activo' : 'Inactivo'}</span>
          </div>

          <h1 style={{
            fontFamily: 'var(--font-condensed)', fontSize: 'clamp(1.4rem,3vw,1.9rem)',
            fontWeight: 900, color: 'white', margin: '0 0 0.35rem', lineHeight: 1.1,
          }}>{nombreCompleto}</h1>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem 1.1rem', color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem' }}>
            {usuario.matricula    && <span>Matrícula <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{usuario.matricula}</strong></span>}
            {usuario.especialidad && <span>Especialidad <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{usuario.especialidad}</strong></span>}
          </div>
        </div>

        {/* Puntos highlight */}
        <div style={{
          flexShrink: 0, textAlign: 'center', position: 'relative', zIndex: 1,
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '16px', padding: '1rem 1.5rem',
        }}>
          <div style={{
            fontFamily: 'var(--font-condensed)', fontSize: '2.5rem', fontWeight: 900,
            color: '#fbbf24', lineHeight: 1,
          }}>{stats.puntos}</div>
          <div style={{
            fontFamily: 'var(--font-condensed)', fontSize: '0.63rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.5)', marginTop: '0.25rem',
          }}>Puntos</div>
        </div>
      </div>

      {/* ── Stats strip ───────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '2rem',
      }}>
        <StatCard label="Guardias"      value={stats.guardias}      icon="🛡️" color="#1e3a5f" bg="white" />
        <StatCard label="Operaciones"   value={stats.operaciones}   icon="🚒" color="#065f46" bg="white" />
        <StatCard label="Capacitaciones" value={stats.caps_inscritas} icon="📚" color="#5b21b6" bg="white" />
        <StatCard label="Llamadas atenc." value={stats.llamadas_atencion} icon="⚠️"
          color={stats.llamadas_atencion > 0 ? '#991b1b' : '#475569'} bg="white"
          note={stats.llamadas_atencion === 0 ? 'Sin registros' : undefined} />
        <StatCard label="Faltas"        value={stats.faltas}        icon="🚫"
          color={stats.faltas > 0 ? '#b45309' : '#475569'} bg="white"
          note={stats.faltas === 0 ? 'Sin registros' : undefined} />
        <StatCard label="Permisos"      value={stats.permisos}      icon="📋" color="#475569" bg="white" />
        <StatCard label="Finanzas"      value={stats.finanzas_balance > 0 ? `Bs. ${stats.finanzas_balance.toFixed(0)}` : 'Al día'} icon="💰"
          color={stats.finanzas_balance > 0 ? '#991b1b' : '#065f46'} bg="white"
          note={stats.finanzas_balance > 0 ? 'Pendiente' : 'Sin deuda'} />
      </div>

      {/* ── Mensaje feedback ──────────────────────────────────── */}
      {msg && (
        <div style={{
          background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px',
          padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#166534',
          marginBottom: '1.5rem',
        }}>{msg}</div>
      )}

      {/* ── Capacitaciones disponibles ────────────────────────── */}
      {caps_abiertas.length > 0 && (
        <section style={{ marginBottom: '2rem' }}>
          <SectionTitle title="Capacitaciones disponibles" count={caps_abiertas.length} />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1rem',
          }}>
            {caps_abiertas.map(cap => {
              const tc = TIPO_CFG[cap.tipo] ?? TIPO_CFG.interna;
              const inscrito = !!cap.ya_inscrito;
              return (
                <div key={cap.id} style={{
                  background: 'white',
                  border: `1.5px solid ${inscrito ? '#86efac' : '#E2E8F0'}`,
                  borderRadius: '16px', padding: '1.25rem',
                  boxShadow: inscrito ? '0 0 0 3px rgba(134,239,172,0.18)' : '0 2px 8px rgba(0,0,0,0.06)',
                  display: 'flex', flexDirection: 'column', gap: '0.625rem',
                  transition: 'box-shadow 0.2s, border-color 0.2s',
                }}>
                  {/* Badges */}
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span style={{
                      fontFamily: 'var(--font-condensed)', fontSize: '0.6rem', fontWeight: 800,
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: tc.color, background: tc.bg, padding: '0.15rem 0.55rem', borderRadius: '4px',
                    }}>{tc.label}</span>
                    {inscrito && (
                      <span style={{
                        fontFamily: 'var(--font-condensed)', fontSize: '0.6rem', fontWeight: 800,
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                        color: '#166534', background: '#dcfce7',
                        border: '1px solid #86efac', padding: '0.15rem 0.55rem', borderRadius: '4px',
                      }}>✓ Inscrito</span>
                    )}
                  </div>

                  {/* Nombre */}
                  <div style={{
                    fontFamily: 'var(--font-condensed)', fontSize: '1rem', fontWeight: 900,
                    color: '#0F172A', lineHeight: 1.2,
                  }}>{cap.nombre}</div>

                  {/* Detalles */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    {cap.institucion && <span style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 600 }}>🏛 {cap.institucion}</span>}
                    {cap.instructor  && <span style={{ fontSize: '0.73rem', color: '#475569' }}>👤 {cap.instructor}</span>}
                    {cap.fecha       && <span style={{ fontSize: '0.73rem', color: '#475569' }}>📅 {fmtDate(cap.fecha)}</span>}
                    {cap.lugar       && <span style={{ fontSize: '0.73rem', color: '#475569' }}>📍 {cap.lugar}</span>}
                    {cap.horas > 0   && <span style={{ fontSize: '0.73rem', color: '#475569' }}>⏱ {cap.horas} horas</span>}
                  </div>

                  {/* Footer */}
                  <div style={{ marginTop: 'auto', paddingTop: '0.625rem', borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
                      {cap.inscritos} inscrito{cap.inscritos !== 1 ? 's' : ''}
                      {cap.cupo > 0 && ` · cupo ${cap.cupo}`}
                    </span>
                    <button
                      disabled={busy === cap.id}
                      onClick={() => toggleInscripcion(cap)}
                      style={{
                        fontFamily: 'var(--font-condensed)', fontSize: '0.7rem', fontWeight: 800,
                        letterSpacing: '0.06em', textTransform: 'uppercase',
                        padding: '0.45rem 0.875rem', borderRadius: '6px', border: '1.5px solid',
                        cursor: busy === cap.id ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
                        opacity: busy === cap.id ? 0.6 : 1,
                        ...(inscrito
                          ? { background: '#fef2f2', color: '#991b1b', borderColor: '#fecaca' }
                          : { background: '#C41E1E', color: 'white', borderColor: '#C41E1E' }
                        ),
                      }}
                    >{busy === cap.id ? '…' : inscrito ? 'Cancelar' : 'Inscribirme'}</button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Grid mis guardias / mis capacitaciones ────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.5rem', marginBottom: '2rem',
      }}>

        {/* Mis guardias recientes */}
        <section style={{
          background: 'white', border: '1.5px solid #E2E8F0', borderRadius: '16px', padding: '1.5rem',
        }}>
          <SectionTitle title="Mis Guardias" count={stats.guardias} />
          {guardias_recientes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94A3B8', fontSize: '0.82rem' }}>
              Aún no tienes guardias registradas
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {guardias_recientes.map(g => {
                const tc = TURNO_COLOR[g.turno] ?? TURNO_COLOR.diurno;
                return (
                  <div key={g.id} style={{
                    display: 'flex', alignItems: 'center', gap: '0.875rem',
                    padding: '0.7rem 0.875rem', borderRadius: '10px',
                    background: '#F8FAFC', border: '1px solid #F1F5F9',
                  }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0,
                      background: tc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-condensed)', fontSize: '0.6rem', fontWeight: 800,
                      textTransform: 'uppercase', letterSpacing: '0.05em', color: tc.color,
                      lineHeight: 1.2, textAlign: 'center', padding: '0.2rem',
                    }}>{TURNO_LABEL[g.turno] ?? g.turno}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: 'var(--font-condensed)', fontSize: '0.82rem', fontWeight: 800,
                        color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{g.rol_guardia || '—'}</div>
                      <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '0.1rem' }}>
                        {fmtDateShort(g.fecha)}
                        {g.novedades && ` · ${g.novedades}`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Mis capacitaciones inscritas */}
        <section style={{
          background: 'white', border: '1.5px solid #E2E8F0', borderRadius: '16px', padding: '1.5rem',
        }}>
          <SectionTitle title="Mis Inscripciones" count={stats.caps_inscritas} />
          {caps_mis.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94A3B8', fontSize: '0.82rem' }}>
              No estás inscrito en ninguna capacitación
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {caps_mis.map(c => {
                const tc = TIPO_CFG[c.cap_tipo] ?? TIPO_CFG.interna;
                const sc = INS_COLOR[c.estado] ?? INS_COLOR.inscrito;
                return (
                  <div key={c.inscripcion_id} style={{
                    padding: '0.75rem 0.875rem', borderRadius: '10px',
                    background: '#F8FAFC', border: '1px solid #F1F5F9',
                  }}>
                    <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                      <span style={{
                        fontFamily: 'var(--font-condensed)', fontSize: '0.58rem', fontWeight: 800,
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                        color: tc.color, background: tc.bg, padding: '0.1rem 0.45rem', borderRadius: '3px',
                      }}>{tc.label}</span>
                      <span style={{
                        fontFamily: 'var(--font-condensed)', fontSize: '0.58rem', fontWeight: 800,
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                        color: sc.color, background: sc.bg, padding: '0.1rem 0.45rem', borderRadius: '3px',
                      }}>{c.estado}</span>
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-condensed)', fontSize: '0.85rem', fontWeight: 800,
                      color: '#0F172A', lineHeight: 1.2,
                    }}>{c.nombre}</div>
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '0.2rem' }}>
                      {c.fecha ? fmtDateShort(c.fecha) : ''}
                      {c.horas > 0 && ` · ${c.horas} hrs`}
                      {c.institucion && ` · ${c.institucion}`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* ── Méritos y Llamadas de atención ────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.5rem',
      }}>

        {/* Méritos */}
        <section style={{
          background: 'white', border: '1.5px solid #E2E8F0', borderRadius: '16px', padding: '1.5rem',
        }}>
          <SectionTitle title="Méritos" count={meritos_lista.length} />
          {meritos_lista.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94A3B8', fontSize: '0.82rem' }}>
              Sin méritos registrados aún
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {meritos_lista.map(m => (
                <div key={m.id} style={{
                  display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                  padding: '0.7rem 0.875rem', borderRadius: '10px',
                  background: '#f0fdf4', border: '1px solid #bbf7d0',
                }}>
                  <div style={{ fontSize: '1.1rem', marginTop: '0.1rem', flexShrink: 0 }}>🏅</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-condensed)', fontSize: '0.82rem', fontWeight: 800, color: '#065f46' }}>{m.titulo}</div>
                    {m.descripcion && <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.15rem' }}>{m.descripcion}</div>}
                    <div style={{ fontSize: '0.68rem', color: '#94A3B8', marginTop: '0.15rem' }}>
                      {fmtDateShort(m.fecha)}
                      {m.puntos_extra > 0 && ` · +${m.puntos_extra} pts`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Llamadas de atención */}
        <section style={{
          background: 'white', border: '1.5px solid #E2E8F0', borderRadius: '16px', padding: '1.5rem',
        }}>
          <SectionTitle title="Llamadas de atención" count={stats.llamadas_atencion} />
          {llamadas_lista.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>✅</div>
              <div style={{ fontFamily: 'var(--font-condensed)', fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>
                Sin llamadas de atención
              </div>
              <div style={{ fontSize: '0.73rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                Mantén el buen desempeño
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {llamadas_lista.map(l => (
                <div key={l.id} style={{
                  display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                  padding: '0.7rem 0.875rem', borderRadius: '10px',
                  background: '#fff7ed', border: '1px solid #fed7aa',
                }}>
                  <div style={{ fontSize: '1.1rem', marginTop: '0.1rem', flexShrink: 0 }}>⚠️</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-condensed)', fontSize: '0.82rem', fontWeight: 800, color: '#9a3412' }}>{l.titulo}</div>
                    {l.descripcion && <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.15rem' }}>{l.descripcion}</div>}
                    <div style={{ fontSize: '0.68rem', color: '#94A3B8', marginTop: '0.15rem' }}>
                      {fmtDateShort(l.fecha)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
