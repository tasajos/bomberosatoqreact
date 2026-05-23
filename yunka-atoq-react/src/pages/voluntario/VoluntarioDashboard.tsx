import { useState, useEffect } from 'react';
import { voluntarioApi, capacitacionesApi, type VoluntarioDashboardData, type DirectorioVoluntario, type PerfilPuntos, type PerfilOperacion, type PerfilCapacitacion } from '../../services/api';
import { RankBadgeSVG, GRADOS } from '../../utils/rankBadge';

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
  curso:         { label: 'Curso',         color: '#1e40af', bg: '#eff6ff' },
  diplomado:     { label: 'Diplomado',     color: '#065f46', bg: '#f0fdf4' },
  taller:        { label: 'Taller',        color: '#92400e', bg: '#fef3c7' },
  seminario:     { label: 'Seminario',     color: '#be185d', bg: '#fdf2f8' },
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

// ── Detalle de voluntario (puntos / ops / caps) ───────────────────

type DetalleTipo = 'puntos' | 'ops' | 'caps';

const DETALLE_CFG: Record<DetalleTipo, { label: string; icon: string; color: string; gradient: string }> = {
  puntos: { label: 'Historial de Puntos',   icon: '⭐', color: '#92400e', gradient: 'linear-gradient(135deg,#92400e,#d97706)' },
  ops:    { label: 'Operaciones Validadas',  icon: '🚒', color: '#065f46', gradient: 'linear-gradient(135deg,#065f46,#0d9488)' },
  caps:   { label: 'Capacitaciones',         icon: '📚', color: '#5b21b6', gradient: 'linear-gradient(135deg,#5b21b6,#7c3aed)' },
};

function DetalleModal({
  vol, tipo, onClose,
}: {
  vol: DirectorioVoluntario;
  tipo: DetalleTipo;
  onClose: () => void;
}) {
  const [puntosData, setPuntosData] = useState<PerfilPuntos | null>(null);
  const [opsData,    setOpsData]    = useState<PerfilOperacion[] | null>(null);
  const [capsData,   setCapsData]   = useState<PerfilCapacitacion[] | null>(null);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetch = tipo === 'puntos'
      ? voluntarioApi.perfilPuntos(vol.id).then(d => { setPuntosData(d); })
      : tipo === 'ops'
      ? voluntarioApi.perfilOps(vol.id).then(d => { setOpsData(d); })
      : voluntarioApi.perfilCaps(vol.id).then(d => { setCapsData(d); });
    fetch.finally(() => setLoading(false));
  }, [vol.id, tipo]);

  const cfg   = DETALLE_CFG[tipo];
  const inits = `${vol.nombre[0] ?? ''}${vol.apellido_paterno[0] ?? ''}`.toUpperCase();
  const grad  = CARD_GRADIENTS[vol.id % CARD_GRADIENTS.length];

  const itemCount = tipo === 'puntos' ? (puntosData?.historial.length ?? 0)
    : tipo === 'ops' ? (opsData?.length ?? 0)
    : (capsData?.length ?? 0);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem 1rem',
      }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '560px', maxHeight: '85vh',
          background: 'white', borderRadius: '20px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideUp 0.2s ease',
        }}>

        {/* Header */}
        <div style={{
          background: cfg.gradient, padding: '1.5rem',
          display: 'flex', gap: '1rem', alignItems: 'center',
          flexShrink: 0,
        }}>
          {/* Mini avatar */}
          <div style={{
            width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
            background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-condensed)', fontSize: '1rem', fontWeight: 900, color: 'white',
          }}>{inits}</div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-condensed)', fontSize: '0.65rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.65)', marginBottom: '0.2rem' }}>
              {cfg.icon} {cfg.label}
            </div>
            <div style={{ fontFamily: 'var(--font-condensed)', fontSize: '1.1rem', fontWeight: 900,
              color: 'white', lineHeight: 1.1 }}>
              {vol.nombre} {vol.apellido_paterno}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)', marginTop: '0.2rem' }}>
              {loading ? 'Cargando…' : `${itemCount} registro${itemCount !== 1 ? 's' : ''}`}
              {tipo === 'puntos' && puntosData && ` · Total ${puntosData.total} pts`}
            </div>
          </div>

          <button onClick={onClose} style={{
            width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
            background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
            color: 'white', fontSize: '0.9rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '1.25rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8', fontSize: '0.85rem' }}>
              Cargando…
            </div>
          ) : (
            <>
              {/* ─ PUNTOS ─ */}
              {tipo === 'puntos' && (
                <>
                  {/* Total banner */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'linear-gradient(135deg,#fef3c7,#fff7ed)',
                    border: '1.5px solid #fde68a', borderRadius: '12px',
                    padding: '1rem 1.25rem', marginBottom: '1rem',
                  }}>
                    <span style={{ fontFamily: 'var(--font-condensed)', fontSize: '0.75rem', fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.08em', color: '#92400e' }}>
                      Total acumulado
                    </span>
                    <span style={{ fontFamily: 'var(--font-condensed)', fontSize: '2rem', fontWeight: 900,
                      color: '#92400e' }}>
                      {puntosData?.total ?? 0} pts
                    </span>
                  </div>

                  {!puntosData?.historial.length ? (
                    <EmptyList msg="Sin historial de puntos" />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {puntosData.historial.map((p, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: '0.875rem',
                          padding: '0.75rem 1rem', borderRadius: '10px',
                          background: '#FAFAFA', border: '1px solid #F1F5F9',
                        }}>
                          <div style={{
                            width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                            background: p.puntos >= 0 ? '#fef3c7' : '#fee2e2',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'var(--font-condensed)', fontSize: '0.9rem', fontWeight: 900,
                            color: p.puntos >= 0 ? '#92400e' : '#991b1b',
                          }}>
                            {p.puntos >= 0 ? '+' : ''}{p.puntos}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: 'var(--font-condensed)', fontSize: '0.82rem',
                              fontWeight: 800, color: '#0F172A', overflow: 'hidden',
                              textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {p.concepto}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: '0.1rem' }}>
                              {fmtDate(p.created_at)}
                              {p.asignado_nombre && ` · ${p.asignado_nombre}`}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ─ OPERACIONES ─ */}
              {tipo === 'ops' && (
                !opsData?.length ? (
                  <EmptyList msg="Sin operaciones validadas" />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {opsData.map(op => (
                      <div key={op.id} style={{
                        padding: '0.875rem 1rem', borderRadius: '10px',
                        background: '#FAFAFA', border: '1px solid #F1F5F9',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                              <span style={{
                                fontFamily: 'var(--font-condensed)', fontSize: '0.58rem', fontWeight: 800,
                                textTransform: 'uppercase', letterSpacing: '0.08em',
                                color: '#1e40af', background: '#eff6ff',
                                padding: '0.1rem 0.45rem', borderRadius: '3px',
                              }}>{op.tipo}</span>
                              <span style={{
                                fontFamily: 'var(--font-condensed)', fontSize: '0.58rem', fontWeight: 800,
                                textTransform: 'uppercase', letterSpacing: '0.08em',
                                color: '#065f46', background: '#d1fae5',
                                padding: '0.1rem 0.45rem', borderRadius: '3px',
                              }}>validado</span>
                            </div>
                            <div style={{ fontFamily: 'var(--font-condensed)', fontSize: '0.87rem',
                              fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
                              {op.titulo}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                              {fmtDateShort(op.fecha)}
                              {op.lugar && ` · ${op.lugar}`}
                              {op.duracion_horas > 0 && ` · ${op.duracion_horas}h`}
                            </div>
                          </div>
                          {op.puntos_asignados > 0 && (
                            <div style={{
                              flexShrink: 0, background: '#fef3c7', borderRadius: '8px',
                              padding: '0.35rem 0.625rem', textAlign: 'center',
                            }}>
                              <div style={{ fontFamily: 'var(--font-condensed)', fontSize: '1rem',
                                fontWeight: 900, color: '#92400e', lineHeight: 1 }}>
                                +{op.puntos_asignados}
                              </div>
                              <div style={{ fontFamily: 'var(--font-condensed)', fontSize: '0.55rem',
                                fontWeight: 700, textTransform: 'uppercase', color: '#b45309' }}>pts</div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* ─ CAPACITACIONES ─ */}
              {tipo === 'caps' && (
                !capsData?.length ? (
                  <EmptyList msg="Sin capacitaciones registradas" />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {capsData.map(c => {
                      const tc  = TIPO_CFG[c.cap_tipo] ?? TIPO_CFG.interna;
                      const sc  = INS_COLOR[c.estado]  ?? INS_COLOR.inscrito;
                      return (
                        <div key={c.id} style={{
                          padding: '0.875rem 1rem', borderRadius: '10px',
                          background: '#FAFAFA', border: '1px solid #F1F5F9',
                        }}>
                          <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                            <span style={{
                              fontFamily: 'var(--font-condensed)', fontSize: '0.58rem', fontWeight: 800,
                              textTransform: 'uppercase', letterSpacing: '0.08em',
                              color: tc.color, background: tc.bg,
                              padding: '0.1rem 0.45rem', borderRadius: '3px',
                            }}>{tc.label}</span>
                            <span style={{
                              fontFamily: 'var(--font-condensed)', fontSize: '0.58rem', fontWeight: 800,
                              textTransform: 'uppercase', letterSpacing: '0.08em',
                              color: sc.color, background: sc.bg,
                              padding: '0.1rem 0.45rem', borderRadius: '3px',
                            }}>{c.estado}</span>
                          </div>
                          <div style={{ fontFamily: 'var(--font-condensed)', fontSize: '0.87rem',
                            fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
                            {c.nombre}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                            {c.fecha ? fmtDateShort(c.fecha) : ''}
                            {c.horas > 0 && ` · ${c.horas} hrs`}
                            {c.institucion && ` · ${c.institucion}`}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyList({ msg }: { msg: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
      <div style={{ fontFamily: 'var(--font-condensed)', fontSize: '0.85rem',
        fontWeight: 700, color: '#94A3B8' }}>{msg}</div>
    </div>
  );
}

// ── Directorio de Voluntarios ─────────────────────────────────────

const CARD_GRADIENTS = [
  'linear-gradient(135deg,#C41E1E,#7c3aed)',
  'linear-gradient(135deg,#1e40af,#0891b2)',
  'linear-gradient(135deg,#065f46,#0d9488)',
  'linear-gradient(135deg,#92400e,#d97706)',
  'linear-gradient(135deg,#7c3aed,#be185d)',
  'linear-gradient(135deg,#1e3a5f,#2563eb)',
  'linear-gradient(135deg,#be185d,#9d174d)',
  'linear-gradient(135deg,#0f766e,#059669)',
];

const SANGRE_COLOR: Record<string, { color: string; bg: string }> = {
  'O+': { color: '#991b1b', bg: '#fee2e2' }, 'O-': { color: '#991b1b', bg: '#fee2e2' },
  'A+': { color: '#1e40af', bg: '#dbeafe' }, 'A-': { color: '#1e40af', bg: '#dbeafe' },
  'B+': { color: '#065f46', bg: '#d1fae5' }, 'B-': { color: '#065f46', bg: '#d1fae5' },
  'AB+':{ color: '#5b21b6', bg: '#ede9fe' }, 'AB-':{ color: '#5b21b6', bg: '#ede9fe' },
};

function gradoLabel(value: string) {
  return GRADOS.find(g => g.value === value)?.label ?? value;
}

function DirectorioModal({ onClose }: { onClose: () => void }) {
  const [lista, setLista]     = useState<DirectorioVoluntario[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [detalle, setDetalle] = useState<{ vol: DirectorioVoluntario; tipo: DetalleTipo } | null>(null);

  useEffect(() => {
    voluntarioApi.directorio()
      .then(setLista)
      .finally(() => setLoading(false));
  }, []);

  const filtered = lista.filter(v => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      v.nombre.toLowerCase().includes(q) ||
      v.apellido_paterno.toLowerCase().includes(q) ||
      v.matricula.toLowerCase().includes(q) ||
      (v.grado || '').toLowerCase().includes(q) ||
      (v.especialidad || '').toLowerCase().includes(q)
    );
  });

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '2rem 1rem', overflowY: 'auto',
      }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '1080px',
          background: '#F0F2F5', borderRadius: '20px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
          overflow: 'hidden',
          animation: 'slideUp 0.25s ease',
        }}>

        {/* Header */}
        <div className="ya-dir-hdr" style={{
          background: 'linear-gradient(135deg,#0F172A 0%,#1e3a5f 60%,#1e1b4b 100%)',
          padding: '1.75rem 2rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
        }}>
          <div>
            <h2 style={{
              fontFamily: 'var(--font-condensed)', fontSize: '1.5rem', fontWeight: 900,
              color: 'white', margin: 0, letterSpacing: '0.04em',
            }}>Directorio de Voluntarios</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', margin: '0.25rem 0 0' }}>
              {loading ? 'Cargando…' : `${filtered.length} de ${lista.length} voluntarios activos`}
            </p>
          </div>
          <button onClick={onClose} style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            color: 'white', fontSize: '1rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>✕</button>
        </div>

        {/* Search */}
        <div className="ya-dir-search" style={{ padding: '1.25rem 2rem', background: 'white', borderBottom: '1px solid #E2E8F0' }}>
          <input
            type="text"
            placeholder="Buscar por nombre, matrícula, grado o especialidad…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '0.65rem 1rem',
              border: '1.5px solid #E2E8F0', borderRadius: '10px',
              fontFamily: 'var(--font-condensed)', fontSize: '0.85rem',
              color: '#0F172A', background: '#F8FAFC', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Grid */}
        <div className="ya-dir-body" style={{ padding: '1.5rem 2rem 2rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8', fontSize: '0.875rem' }}>
              Cargando directorio…
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8', fontSize: '0.875rem' }}>
              No se encontraron voluntarios
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))',
              gap: '1rem',
            }}>
              {filtered.map((v, idx) => {
                const grad  = CARD_GRADIENTS[v.id % CARD_GRADIENTS.length];
                const inits = `${v.nombre[0] ?? ''}${v.apellido_paterno[0] ?? ''}`.toUpperCase();
                const sangre = v.tipo_sangre?.trim();
                const sc     = SANGRE_COLOR[sangre] ?? { color: '#475569', bg: '#F1F5F9' };
                const nombreFull = `${v.nombre} ${v.apellido_paterno}`;

                return (
                  <div key={v.id} style={{
                    background: 'white', borderRadius: '16px',
                    overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                    border: '1.5px solid #E2E8F0',
                    transition: 'transform 0.18s, box-shadow 0.18s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.14)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.transform = '';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)';
                  }}>

                    {/* Card header — gradient */}
                    <div style={{
                      background: grad, padding: '1.25rem 1.25rem 1rem',
                      display: 'flex', alignItems: 'center', gap: '0.875rem',
                      position: 'relative',
                    }}>
                      {/* Decoration circles */}
                      <div style={{
                        position: 'absolute', top: '-20px', right: '-20px',
                        width: '80px', height: '80px', borderRadius: '50%',
                        background: 'rgba(255,255,255,0.07)', pointerEvents: 'none',
                      }}/>

                      {/* Avatar */}
                      <div style={{
                        width: '52px', height: '52px', borderRadius: '50%', flexShrink: 0,
                        background: 'rgba(255,255,255,0.2)',
                        border: '2px solid rgba(255,255,255,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-condensed)', fontSize: '1.25rem', fontWeight: 900,
                        color: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                        position: 'relative', zIndex: 1,
                      }}>{inits}</div>

                      {/* Name + grade */}
                      <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
                        <div style={{
                          fontFamily: 'var(--font-condensed)', fontSize: '1rem', fontWeight: 900,
                          color: 'white', lineHeight: 1.2,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{nombreFull}</div>
                        {v.matricula && (
                          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.65)', marginTop: '0.15rem' }}>
                            {v.matricula}
                            {v.especialidad && ` · ${v.especialidad}`}
                          </div>
                        )}
                        {v.grado && (
                          <div style={{
                            display: 'inline-block', marginTop: '0.35rem',
                            fontFamily: 'var(--font-condensed)', fontSize: '0.6rem', fontWeight: 800,
                            textTransform: 'uppercase', letterSpacing: '0.1em',
                            color: 'rgba(255,255,255,0.9)',
                            background: 'rgba(255,255,255,0.18)',
                            border: '1px solid rgba(255,255,255,0.25)',
                            padding: '0.12rem 0.5rem', borderRadius: '4px',
                          }}>{gradoLabel(v.grado)}</div>
                        )}
                      </div>

                      {/* Rank badge */}
                      <div style={{ flexShrink: 0, position: 'relative', zIndex: 1, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
                        <RankBadgeSVG grado={v.grado} size={44} />
                      </div>
                    </div>

                    {/* Card body */}
                    <div style={{ padding: '1rem 1.25rem' }}>
                      {/* Info row */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.625rem',
                        flexWrap: 'wrap', marginBottom: '0.875rem',
                      }}>
                        {sangre && (
                          <span style={{
                            display: 'flex', alignItems: 'center', gap: '0.25rem',
                            fontFamily: 'var(--font-condensed)', fontSize: '0.7rem', fontWeight: 800,
                            color: sc.color, background: sc.bg,
                            padding: '0.2rem 0.6rem', borderRadius: '6px',
                          }}>
                            <span style={{ fontSize: '0.8rem' }}>🩸</span> {sangre}
                          </span>
                        )}
                        {v.telefono && (
                          <span style={{
                            display: 'flex', alignItems: 'center', gap: '0.25rem',
                            fontSize: '0.72rem', color: '#475569',
                          }}>
                            <span>📞</span> {v.telefono}
                          </span>
                        )}
                      </div>

                      {/* Stats */}
                      <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
                        gap: '0.5rem',
                      }}>
                        {([
                          { icon: '⭐', value: v.total_puntos,   label: 'Puntos',      color: '#92400e', tipo: 'puntos' as DetalleTipo },
                          { icon: '🚒', value: v.operaciones,    label: 'Operaciones', color: '#065f46', tipo: 'ops'    as DetalleTipo },
                          { icon: '📚', value: v.capacitaciones, label: 'Capacit.',    color: '#5b21b6', tipo: 'caps'   as DetalleTipo },
                        ]).map(s => (
                          <button
                            key={s.label}
                            onClick={() => setDetalle({ vol: v, tipo: s.tipo })}
                            style={{
                              background: '#F8FAFC', borderRadius: '10px',
                              padding: '0.5rem 0.375rem', textAlign: 'center',
                              border: '1px solid #F1F5F9', cursor: 'pointer',
                              transition: 'background 0.15s, border-color 0.15s',
                            }}
                            onMouseEnter={e => {
                              (e.currentTarget as HTMLButtonElement).style.background = '#F1F5F9';
                              (e.currentTarget as HTMLButtonElement).style.borderColor = '#CBD5E1';
                            }}
                            onMouseLeave={e => {
                              (e.currentTarget as HTMLButtonElement).style.background = '#F8FAFC';
                              (e.currentTarget as HTMLButtonElement).style.borderColor = '#F1F5F9';
                            }}
                          >
                            <div style={{ fontSize: '0.9rem', marginBottom: '0.15rem' }}>{s.icon}</div>
                            <div style={{
                              fontFamily: 'var(--font-condensed)', fontSize: '1.1rem', fontWeight: 900,
                              color: s.color, lineHeight: 1,
                            }}>{s.value}</div>
                            <div style={{
                              fontFamily: 'var(--font-condensed)', fontSize: '0.55rem', fontWeight: 700,
                              textTransform: 'uppercase', letterSpacing: '0.06em',
                              color: '#94A3B8', marginTop: '0.15rem',
                            }}>{s.label}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 640px) {
          .ya-dir-hdr    { padding: 1.25rem 1rem !important; }
          .ya-dir-search { padding: 0.875rem 1rem !important; }
          .ya-dir-body   { padding: 1rem !important; }
        }
      `}</style>

      {detalle && (
        <DetalleModal
          vol={detalle.vol}
          tipo={detalle.tipo}
          onClose={() => setDetalle(null)}
        />
      )}
    </div>
  );
}

// ── File Personal Card ────────────────────────────────────────────

type FileCap = VoluntarioDashboardData['file_caps'][0];
type FileExt = VoluntarioDashboardData['cursos_externos'][0];
type FileItem =
  | (FileCap & { _src: 'cap'; _sortDate: string })
  | (FileExt & { _src: 'ext'; _sortDate: string });

const PAGE_SIZE = 6;

function FilePersonalCard({
  file_caps, cursos_externos,
}: {
  file_caps: FileCap[];
  cursos_externos: FileExt[];
}) {
  const [page, setPage] = useState(0);

  const items: FileItem[] = [
    ...file_caps.map(c => ({ ...c, _src: 'cap' as const, _sortDate: c.fecha || c.fecha_inscripcion || '' })),
    ...cursos_externos.map(e => ({ ...e, _src: 'ext' as const, _sortDate: e.fecha || '' })),
  ].sort((a, b) => (b._sortDate || '').localeCompare(a._sortDate || ''));

  const total = items.length;
  const pages = Math.ceil(total / PAGE_SIZE);
  const slice = items.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';

  return (
    <section style={{
      background: 'white', border: '1.5px solid #E2E8F0', borderRadius: '16px',
      padding: '1.5rem', marginTop: '1.5rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <h2 style={{
            fontFamily: 'var(--font-condensed)', fontSize: '1rem', fontWeight: 900,
            color: '#0F172A', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>File Personal</h2>
          <span style={{
            fontFamily: 'var(--font-condensed)', fontSize: '0.65rem', fontWeight: 800,
            background: '#E2E8F0', color: '#475569', borderRadius: '999px', padding: '0.15rem 0.5rem',
          }}>{total}</span>
        </div>
        <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
          Capacitaciones institucionales + cursos externos
        </div>
      </div>

      {total === 0 ? (
        <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📂</div>
          <div style={{ fontFamily: 'var(--font-condensed)', fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
            Sin registros en el file personal
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.25rem' }}>
            Las capacitaciones y cursos completados aparecerán aquí
          </div>
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as any }}>
          <div style={{ minWidth: '460px' }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 7rem 7rem 5rem 4rem',
            gap: '0.5rem', padding: '0.4rem 0.75rem',
            borderBottom: '2px solid #F1F5F9', marginBottom: '0.5rem',
          }}>
            {['Capacitación / Curso', 'Institución', 'Fecha', 'Horas', ''].map((h, i) => (
              <div key={i} style={{
                fontFamily: 'var(--font-condensed)', fontSize: '0.6rem', fontWeight: 800,
                textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8',
              }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {slice.map((item, idx) => {
              const isExt = item._src === 'ext';
              const tipoCfg = TIPO_CFG[isExt ? (item as FileExt).tipo : (item as FileCap).cap_tipo]
                ?? TIPO_CFG.interna;
              const instCfg = isExt ? INS_COLOR.completado : (INS_COLOR[(item as FileCap).estado] ?? INS_COLOR.inscrito);
              const estadoLabel = isExt ? 'Externo' : (item as FileCap).estado;
              const hasFile = isExt && (item as FileExt).archivo_url;

              return (
                <div key={idx} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 7rem 7rem 5rem 4rem',
                  gap: '0.5rem', alignItems: 'center',
                  padding: '0.6rem 0.75rem', borderRadius: '8px',
                  background: idx % 2 === 0 ? '#F8FAFC' : 'white',
                  border: '1px solid transparent',
                  transition: 'border-color 0.15s',
                }}>
                  {/* Nombre + badges */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                      <span style={{
                        fontFamily: 'var(--font-condensed)', fontSize: '0.58rem', fontWeight: 800,
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                        color: tipoCfg.color, background: tipoCfg.bg,
                        padding: '0.1rem 0.45rem', borderRadius: '3px',
                      }}>{tipoCfg.label}</span>
                      <span style={{
                        fontFamily: 'var(--font-condensed)', fontSize: '0.58rem', fontWeight: 800,
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                        color: instCfg.color, background: instCfg.bg,
                        padding: '0.1rem 0.45rem', borderRadius: '3px',
                      }}>{estadoLabel}</span>
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-condensed)', fontSize: '0.82rem', fontWeight: 800,
                      color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{item.nombre}</div>
                  </div>

                  {/* Institución */}
                  <div style={{
                    fontSize: '0.73rem', color: '#475569',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {item.institucion || '—'}
                  </div>

                  {/* Fecha */}
                  <div style={{ fontSize: '0.73rem', color: '#64748B' }}>
                    {fmtDateShort(item.fecha)}
                  </div>

                  {/* Horas */}
                  <div style={{
                    fontFamily: 'var(--font-condensed)', fontSize: '0.75rem', fontWeight: 700,
                    color: item.horas > 0 ? '#1e40af' : '#94A3B8',
                  }}>
                    {item.horas > 0 ? `${item.horas} h` : '—'}
                  </div>

                  {/* Acción: ver certificado si hay */}
                  <div>
                    {hasFile ? (
                      <a
                        href={`${API_BASE}${(item as FileExt).archivo_url}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{
                          fontFamily: 'var(--font-condensed)', fontSize: '0.63rem', fontWeight: 800,
                          textTransform: 'uppercase', letterSpacing: '0.06em',
                          color: '#1e40af', background: '#eff6ff',
                          border: '1px solid #bfdbfe', borderRadius: '4px',
                          padding: '0.2rem 0.5rem', textDecoration: 'none',
                          whiteSpace: 'nowrap',
                        }}>
                        Ver
                      </a>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
          </div>{/* end minWidth */}
          </div>{/* end overflow */}

          {/* Pagination */}
          {pages > 1 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginTop: '1rem', paddingTop: '0.875rem', borderTop: '1px solid #F1F5F9',
            }}>
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                style={{
                  fontFamily: 'var(--font-condensed)', fontSize: '0.72rem', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  padding: '0.4rem 0.875rem', borderRadius: '6px',
                  border: '1.5px solid #E2E8F0', background: 'white',
                  color: page === 0 ? '#CBD5E1' : '#475569',
                  cursor: page === 0 ? 'not-allowed' : 'pointer',
                }}>
                ← Anterior
              </button>

              <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                {Array.from({ length: pages }, (_, i) => (
                  <button key={i} onClick={() => setPage(i)}
                    style={{
                      width: '28px', height: '28px', borderRadius: '6px',
                      border: '1.5px solid',
                      fontFamily: 'var(--font-condensed)', fontSize: '0.72rem', fontWeight: 800,
                      cursor: 'pointer',
                      borderColor: i === page ? '#C41E1E' : '#E2E8F0',
                      background: i === page ? '#C41E1E' : 'white',
                      color: i === page ? 'white' : '#475569',
                    }}>
                    {i + 1}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setPage(p => Math.min(pages - 1, p + 1))}
                disabled={page === pages - 1}
                style={{
                  fontFamily: 'var(--font-condensed)', fontSize: '0.72rem', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  padding: '0.4rem 0.875rem', borderRadius: '6px',
                  border: '1.5px solid #E2E8F0', background: 'white',
                  color: page === pages - 1 ? '#CBD5E1' : '#475569',
                  cursor: page === pages - 1 ? 'not-allowed' : 'pointer',
                }}>
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

// ── Main component ────────────────────────────────────────────────

export default function VoluntarioDashboard() {
  const [data, setData]       = useState<VoluntarioDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [busy, setBusy]       = useState<number | null>(null);
  const [msg, setMsg]         = useState('');
  const [showDir, setShowDir] = useState(false);

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

  const { usuario, stats, guardias_recientes, llamadas_lista, meritos_lista, caps_abiertas, caps_mis,
          file_caps, cursos_externos } = data;
  const nombreCompleto = `${usuario.nombre} ${usuario.apellido_paterno} ${usuario.apellido_materno || ''}`.trim();
  const initls = initials(usuario.nombre, usuario.apellido_paterno);

  return (
    <div className="ya-dash" style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.25rem 3rem' }}>
      <style>{`
        @media (max-width: 560px) {
          .ya-dash { padding: 1.25rem 1rem 2rem !important; }
          .ya-hero { padding: 1.25rem !important; gap: 1rem !important; }
        }
      `}</style>

      {/* ── Hero profile card ─────────────────────────────────── */}
      <div className="ya-hero" style={{
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

        {/* Voluntarios — trigger card */}
        <button
          onClick={() => setShowDir(true)}
          style={{
            background: 'linear-gradient(135deg,#0F172A 0%,#1e3a5f 60%,#1e1b4b 100%)',
            border: 'none', borderRadius: '14px',
            padding: '1.1rem 1.25rem', minWidth: '120px', flex: '1 1 110px',
            display: 'flex', flexDirection: 'column', gap: '0.35rem',
            cursor: 'pointer', textAlign: 'left',
            boxShadow: '0 4px 16px rgba(15,23,42,0.25)',
            transition: 'transform 0.18s, box-shadow 0.18s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 24px rgba(15,23,42,0.35)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = '';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(15,23,42,0.25)';
          }}>
          <div style={{ fontSize: '1.35rem', lineHeight: 1 }}>👥</div>
          <div style={{
            fontFamily: 'var(--font-condensed)', fontSize: '1.65rem', fontWeight: 900,
            color: '#fbbf24', lineHeight: 1,
          }}>Ver</div>
          <div style={{
            fontFamily: 'var(--font-condensed)', fontSize: '0.65rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.6)',
          }}>Voluntarios</div>
          <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.1rem' }}>
            Ver directorio →
          </div>
        </button>
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

      {/* ── File Personal ─────────────────────────────────────── */}
      <FilePersonalCard file_caps={file_caps} cursos_externos={cursos_externos} />

      {/* ── Directorio modal ──────────────────────────────────── */}
      {showDir && <DirectorioModal onClose={() => setShowDir(false)} />}
    </div>
  );
}
