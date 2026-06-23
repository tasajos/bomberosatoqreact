import { useState, useEffect, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { voluntarioApi, capacitacionesApi, ordenesApi, API_BASE, type VoluntarioDashboardData, type DirectorioVoluntario, type PerfilPuntos, type PerfilOperacion, type PerfilCapacitacion, type OrdenOperacion, type NivelDificultad, type EstadoOrden } from '../../services/api';
import EmergenciaMap, { type MapImage } from '../../components/EmergenciaMap';
import { RankBadgeSVG, GRADOS } from '../../utils/rankBadge';
import ord from './OrdenesVoluntario.module.css';
import s from './VoluntarioDashboard.module.css';

const NIVEL_ORDEN: Record<NivelDificultad, { label: string; icon: string; accent: string; tint: string; ink: string }> = {
  baja:    { label: 'Baja',    icon: '🟢', accent: 'linear-gradient(135deg,#34d399,#10b981)', tint: '#ecfdf5', ink: '#047857' },
  media:   { label: 'Media',   icon: '🟡', accent: 'linear-gradient(135deg,#fbbf24,#f59e0b)', tint: '#fffbeb', ink: '#b45309' },
  alta:    { label: 'Alta',    icon: '🟠', accent: 'linear-gradient(135deg,#fb923c,#f97316)', tint: '#fff7ed', ink: '#c2410c' },
  critica: { label: 'Crítica', icon: '🔴', accent: 'linear-gradient(135deg,#fb7185,#ef4444)', tint: '#fef2f2', ink: '#dc2626' },
};

const ESTADO_ORDEN: Record<EstadoOrden, string> = {
  activa: 'Activa', en_curso: 'En curso', finalizada: 'Finalizada', cancelada: 'Cancelada',
};

function nivelVars(nv: { accent: string; tint: string; ink: string }): CSSProperties {
  return { '--accent': nv.accent, '--tint': nv.tint, '--ink': nv.ink } as CSSProperties;
}

// ── Modal de detalle de orden de operación ────────────────────────

function OrdenModal({
  orden, busy, onToggle, onClose,
}: {
  orden: OrdenOperacion;
  busy: boolean;
  onToggle: (o: OrdenOperacion) => void;
  onClose: () => void;
}) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const nv = NIVEL_ORDEN[orden.nivel_dificultad];
  const puedeInscribirse = orden.estado === 'activa' || orden.estado === 'en_curso';
  const mapImages: MapImage[] = orden.imagenes
    .filter(im => im.lat != null && im.lng != null)
    .map(im => ({ id: im.id, url: im.url, lat: im.lat, lng: im.lng, descripcion: im.descripcion }));

  return (
    <div className={ord.overlay} onClick={onClose}>
      <div className={ord.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={ord.modalHead} style={nivelVars(nv)}>
          <button className={ord.modalClose} onClick={onClose}>✕</button>
          <div className={ord.modalBadges}>
            <span className={ord.modalBadge}>{nv.icon} Dificultad {nv.label}</span>
            <span className={ord.modalBadge}>{ESTADO_ORDEN[orden.estado]}</span>
          </div>
          <h2 className={ord.modalTitle}>{orden.titulo}</h2>
          <div className={ord.modalSub}>
            {orden.direccion || 'Sin dirección'}
            {orden.creado_nombre ? ` · Publicado por ${orden.creado_nombre}` : ''}
          </div>
        </div>

        {/* Body */}
        <div className={ord.modalBody}>
          <div className={ord.stats}>
            <div className={ord.stat}>
              <div className={ord.statNum}>{orden.inscritos}</div>
              <div className={ord.statLabel}>Inscritos</div>
            </div>
            <div className={ord.stat}>
              <div className={ord.statNum}>{orden.voluntarios_requeridos || '—'}</div>
              <div className={ord.statLabel}>Requeridos</div>
            </div>
          </div>

          {orden.descripcion && <p className={ord.desc}>{orden.descripcion}</p>}

          {orden.equipos_necesarios && (
            <div className={ord.block}>
              <div className={ord.blockLabel}>🧰 Equipos / recursos necesarios</div>
              <div className={ord.blockText}>{orden.equipos_necesarios}</div>
            </div>
          )}

          {orden.lat != null && orden.lng != null && (
            <div className={ord.mapWrap}>
              <div className={ord.mapLabel}>🗺️ Ubicación</div>
              <EmergenciaMap
                emergencia={{ lat: orden.lat, lng: orden.lng }}
                center={[orden.lat, orden.lng]}
                images={mapImages}
                height="280px"
              />
            </div>
          )}

          {orden.imagenes.length > 0 && (
            <div className={ord.gallery}>
              {orden.imagenes.map(im => (
                <img key={im.id} className={ord.galleryImg} src={`${API_BASE}${im.url}`} alt={im.descripcion || ''}
                  onClick={() => setLightbox(`${API_BASE}${im.url}`)} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={ord.modalFooter}>
          <span className={ord.modalFootInfo}>
            👥 {orden.inscritos} voluntario{orden.inscritos !== 1 ? 's' : ''} inscrito{orden.inscritos !== 1 ? 's' : ''}
          </span>
          <button
            disabled={!puedeInscribirse || busy}
            onClick={() => onToggle(orden)}
            className={`${ord.btn} ${ord.btnBig} ${!puedeInscribirse ? ord.btnDisabled : orden.ya_inscrito ? ord.btnLeave : ord.btnJoin}`}
          >{busy ? '…' : !puedeInscribirse ? 'Cerrada' : orden.ya_inscrito ? '✓ Inscrito — Cancelar' : '🙋 Inscribirme'}</button>
        </div>
      </div>

      {lightbox && (
        <div className={ord.lightbox} onClick={(e) => { e.stopPropagation(); setLightbox(null); }}>
          <img src={lightbox} alt="" />
        </div>
      )}
    </div>
  );
}

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

// ── Stat tile ─────────────────────────────────────────────────────

function StatCard({ label, value, accent = '#2F6BFF', note }: {
  label: string; value: number | string; accent?: string; note?: string;
}) {
  return (
    <div className={s.statTile} style={{ ['--accent' as string]: accent } as CSSProperties}>
      <div className={s.statTileNum}>{value}</div>
      <div className={s.statTileLabel}>{label}</div>
      {note && <div className={s.statTileNote}>{note}</div>}
    </div>
  );
}

// ── Gauge (índice / puntaje) ──────────────────────────────────────

function Gauge({ value, max, centerNum, centerLabel }: {
  value: number; max: number; centerNum: number | string; centerLabel: string;
}) {
  const R = 52;
  const C = +(2 * Math.PI * R).toFixed(1);
  const pct = Math.max(0, Math.min(1, max > 0 ? value / max : 0));
  const offset = +(C * (1 - pct)).toFixed(1);
  return (
    <div className={s.gaugeWrap}>
      <svg width="124" height="124" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(20,40,90,0.10)" strokeWidth="11" />
        <circle cx="60" cy="60" r={R} fill="none" stroke="url(#yagauge)" strokeWidth="11" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={offset} />
        <defs>
          <linearGradient id="yagauge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2F6BFF" /><stop offset="1" stopColor="#5B8BFF" />
          </linearGradient>
        </defs>
      </svg>
      <div className={s.gaugeCenter}>
        <span className={s.gaugeNum}>{centerNum}</span>
        <span className={s.gaugeLabel}>{centerLabel}</span>
      </div>
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────

function SectionHead({ title, icon, color, count, link, linkLabel }: {
  title: string; icon: string; color: string; count?: number; link?: string; linkLabel?: string;
}) {
  return (
    <div className={s.sectionHead}>
      <span className={s.sectionIcon} style={{ background: color }}>{icon}</span>
      <h2 className={s.sectionTitle}>{title}</h2>
      {count !== undefined && <span className={s.sectionCount} style={{ background: color }}>{count}</span>}
      {link && <Link to={link} className={s.sectionLink}>{linkLabel ?? 'Ver'} →</Link>}
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
            fontFamily: 'Poppins, sans-serif', fontSize: '1rem', fontWeight: 600, color: 'white',
          }}>{inits}</div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: '0.65rem', fontWeight: 500,
              textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.65)', marginBottom: '0.2rem' }}>
              {cfg.icon} {cfg.label}
            </div>
            <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: '1.1rem', fontWeight: 600,
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
                    <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: '0.75rem', fontWeight: 500,
                      textTransform: 'uppercase', letterSpacing: '0.08em', color: '#92400e' }}>
                      Total acumulado
                    </span>
                    <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: '2rem', fontWeight: 600,
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
                            fontFamily: 'Poppins, sans-serif', fontSize: '0.9rem', fontWeight: 600,
                            color: p.puntos >= 0 ? '#92400e' : '#991b1b',
                          }}>
                            {p.puntos >= 0 ? '+' : ''}{p.puntos}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: '0.82rem',
                              fontWeight: 600, color: '#0F172A', overflow: 'hidden',
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
                                fontFamily: 'Poppins, sans-serif', fontSize: '0.58rem', fontWeight: 600,
                                textTransform: 'uppercase', letterSpacing: '0.08em',
                                color: '#1e40af', background: '#eff6ff',
                                padding: '0.1rem 0.45rem', borderRadius: '3px',
                              }}>{op.tipo}</span>
                              <span style={{
                                fontFamily: 'Poppins, sans-serif', fontSize: '0.58rem', fontWeight: 600,
                                textTransform: 'uppercase', letterSpacing: '0.08em',
                                color: '#065f46', background: '#d1fae5',
                                padding: '0.1rem 0.45rem', borderRadius: '3px',
                              }}>validado</span>
                            </div>
                            <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: '0.87rem',
                              fontWeight: 600, color: '#0F172A', lineHeight: 1.2 }}>
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
                              <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: '1rem',
                                fontWeight: 600, color: '#92400e', lineHeight: 1 }}>
                                +{op.puntos_asignados}
                              </div>
                              <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: '0.55rem',
                                fontWeight: 500, textTransform: 'uppercase', color: '#b45309' }}>pts</div>
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
                              fontFamily: 'Poppins, sans-serif', fontSize: '0.58rem', fontWeight: 600,
                              textTransform: 'uppercase', letterSpacing: '0.08em',
                              color: tc.color, background: tc.bg,
                              padding: '0.1rem 0.45rem', borderRadius: '3px',
                            }}>{tc.label}</span>
                            <span style={{
                              fontFamily: 'Poppins, sans-serif', fontSize: '0.58rem', fontWeight: 600,
                              textTransform: 'uppercase', letterSpacing: '0.08em',
                              color: sc.color, background: sc.bg,
                              padding: '0.1rem 0.45rem', borderRadius: '3px',
                            }}>{c.estado}</span>
                          </div>
                          <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: '0.87rem',
                            fontWeight: 600, color: '#0F172A', lineHeight: 1.2 }}>
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
      <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: '0.85rem',
        fontWeight: 500, color: '#94A3B8' }}>{msg}</div>
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
              fontFamily: 'Poppins, sans-serif', fontSize: '1.5rem', fontWeight: 600,
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
              fontFamily: 'Poppins, sans-serif', fontSize: '0.85rem',
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
              {filtered.map((v) => {
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
                        fontFamily: 'Poppins, sans-serif', fontSize: '1.25rem', fontWeight: 600,
                        color: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                        position: 'relative', zIndex: 1,
                      }}>{inits}</div>

                      {/* Name + grade */}
                      <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
                        <div style={{
                          fontFamily: 'Poppins, sans-serif', fontSize: '1rem', fontWeight: 600,
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
                            fontFamily: 'Poppins, sans-serif', fontSize: '0.6rem', fontWeight: 600,
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
                            fontFamily: 'Poppins, sans-serif', fontSize: '0.7rem', fontWeight: 600,
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
                              fontFamily: 'Poppins, sans-serif', fontSize: '1.1rem', fontWeight: 600,
                              color: s.color, lineHeight: 1,
                            }}>{s.value}</div>
                            <div style={{
                              fontFamily: 'Poppins, sans-serif', fontSize: '0.55rem', fontWeight: 500,
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
            fontFamily: 'Poppins, sans-serif', fontSize: '1rem', fontWeight: 600,
            color: '#0F172A', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>File Personal</h2>
          <span style={{
            fontFamily: 'Poppins, sans-serif', fontSize: '0.65rem', fontWeight: 600,
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
          <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: '0.85rem', fontWeight: 500, color: '#475569' }}>
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
                fontFamily: 'Poppins, sans-serif', fontSize: '0.6rem', fontWeight: 600,
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
                        fontFamily: 'Poppins, sans-serif', fontSize: '0.58rem', fontWeight: 600,
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                        color: tipoCfg.color, background: tipoCfg.bg,
                        padding: '0.1rem 0.45rem', borderRadius: '3px',
                      }}>{tipoCfg.label}</span>
                      <span style={{
                        fontFamily: 'Poppins, sans-serif', fontSize: '0.58rem', fontWeight: 600,
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                        color: instCfg.color, background: instCfg.bg,
                        padding: '0.1rem 0.45rem', borderRadius: '3px',
                      }}>{estadoLabel}</span>
                    </div>
                    <div style={{
                      fontFamily: 'Poppins, sans-serif', fontSize: '0.82rem', fontWeight: 600,
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
                    fontFamily: 'Poppins, sans-serif', fontSize: '0.75rem', fontWeight: 500,
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
                          fontFamily: 'Poppins, sans-serif', fontSize: '0.63rem', fontWeight: 600,
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
                  fontFamily: 'Poppins, sans-serif', fontSize: '0.72rem', fontWeight: 500,
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
                      fontFamily: 'Poppins, sans-serif', fontSize: '0.72rem', fontWeight: 600,
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
                  fontFamily: 'Poppins, sans-serif', fontSize: '0.72rem', fontWeight: 500,
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
  const [ordenes, setOrdenes] = useState<OrdenOperacion[]>([]);
  const [busyOrden, setBusyOrden] = useState<number | null>(null);
  const [ordenSelId, setOrdenSelId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    voluntarioApi.miPerfil()
      .then(setData)
      .catch(e => setError(e.message || 'Error al cargar datos'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const loadOrdenes = () => { ordenesApi.list('activa').then(r => setOrdenes(r.data)).catch(() => {}); };
  useEffect(loadOrdenes, []);

  const toggleOrden = async (o: OrdenOperacion) => {
    setBusyOrden(o.id);
    try {
      if (o.ya_inscrito) { await ordenesApi.desinscribir(o.id); setMsg(`Cancelaste tu inscripción en "${o.titulo}".`); }
      else { await ordenesApi.inscribir(o.id); setMsg(`Te inscribiste en la orden "${o.titulo}".`); }
      loadOrdenes();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusyOrden(null);
      setTimeout(() => setMsg(''), 4000);
    }
  };

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

  if (loading) return <div className={s.loading}>Cargando tu panel…</div>;
  if (error) return <div className={s.errorBox}>{error}</div>;
  if (!data) return null;

  const { stats, guardias_recientes, llamadas_lista, meritos_lista, caps_abiertas, caps_mis,
          file_caps, cursos_externos } = data;
  const guardiaTop = guardias_recientes[0];
  const metaPuntos = Math.max(100, Math.ceil((stats.puntos || 0) / 100) * 100);

  return (
    <div className={s.page}>

      {/* ── Banner de estado ──────────────────────────────────── */}
      {ordenes.length > 0 ? (
        <div className={`${s.banner} ${s.bannerAlert}`}>
          <div className={s.bannerHead}>
            <span className={s.dotWrap}><span className={s.dot} /><span className={s.dotPing} /></span>
            <span className={s.bannerKicker}>
              {ordenes.length} ORDEN{ordenes.length !== 1 ? 'ES' : ''} DE EMERGENCIA ACTIVA{ordenes.length !== 1 ? 'S' : ''}
            </span>
            <span className={s.bannerCode}>{NIVEL_ORDEN[ordenes[0].nivel_dificultad].label.toUpperCase()}</span>
          </div>
          <div className={s.bannerBody}>
            <div>
              <div className={s.bannerTitle}>{ordenes[0].titulo}</div>
              <div className={s.bannerSub}>{ordenes[0].direccion || 'Sin dirección registrada'}</div>
            </div>
            <Link to="/voluntario/ordenes" className={s.bannerBtn}>Ver despacho →</Link>
          </div>
        </div>
      ) : (
        <div className={`${s.banner} ${s.bannerCalm}`}>
          <span className={s.dotGreen} />
          <div>
            <div className={s.bannerCalmTitle}>Sin emergencias activas</div>
            <div className={s.bannerCalmSub}>Cuerpo en estado de espera · monitoreo continuo</div>
          </div>
        </div>
      )}

      {/* ── Mensaje feedback ──────────────────────────────────── */}
      {msg && <div className={s.toast}>{msg}</div>}

      {/* ── Grid principal: puntaje + guardia + stats ─────────── */}
      <div className={s.mainGrid}>
        {/* Puntaje */}
        <section className={s.card}>
          <div className={s.cardHead}>
            <span className={s.cardKicker}>MI PUNTAJE</span>
            <button className={s.cardLink} onClick={() => setShowDir(true)}>Ver directorio →</button>
          </div>
          <div className={s.gaugeRow}>
            <Gauge value={stats.puntos} max={metaPuntos} centerNum={stats.puntos} centerLabel="PUNTOS" />
            <div className={s.gaugeLegend}>
              <div className={s.legendRow}>
                <span className={s.legendDot} style={{ background: '#2F6BFF' }} />
                <span className={s.legendText}>Méritos</span>
                <span className={s.legendVal}>{meritos_lista.length}</span>
              </div>
              <div className={s.legendRow}>
                <span className={s.legendDot} style={{ background: '#B01E3C' }} />
                <span className={s.legendText}>Llamadas de atención</span>
                <span className={s.legendVal}>{stats.llamadas_atencion}</span>
              </div>
              <div className={s.legendDivider} />
              <div className={s.legendRow}>
                <span className={s.legendText} style={{ color: '#14213D', fontWeight: 600 }}>Puntos netos</span>
                <span className={`${s.legendVal} ${s.legendNet}`}>{stats.puntos}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Guardia + stats */}
        <div className={s.rightCol}>
          <div className={s.guardiaCard}>
            <div className={s.guardiaKicker}>ÚLTIMA GUARDIA</div>
            <div className={s.guardiaTitle}>{guardiaTop?.rol_guardia || 'Sin guardias registradas'}</div>
            <div className={s.guardiaSub}>
              {guardiaTop
                ? `${fmtDate(guardiaTop.fecha)} · turno ${TURNO_LABEL[guardiaTop.turno] ?? guardiaTop.turno}`
                : 'Aún no tienes guardias asignadas'}
            </div>
          </div>
          <div className={s.statGrid}>
            <StatCard label="Guardias" value={stats.guardias} accent="#2F6BFF" />
            <StatCard label="Operaciones" value={stats.operaciones} accent="#1F9D6B" />
            <StatCard label="Capacitaciones" value={stats.caps_inscritas} accent="#7C5CFF" />
            <StatCard label="Permisos" value={stats.permisos} accent="#E08A00" />
            <StatCard label="Faltas" value={stats.faltas} accent="#B01E3C" note={stats.faltas === 0 ? 'Sin registros' : undefined} />
            <StatCard label="Finanzas" value={stats.finanzas_balance > 0 ? `Bs. ${stats.finanzas_balance.toFixed(0)}` : 'Al día'}
              accent={stats.finanzas_balance > 0 ? '#B01E3C' : '#1F9D6B'} note={stats.finanzas_balance > 0 ? 'Pendiente' : 'Sin deuda'} />
          </div>
        </div>
      </div>

      {/* ── Órdenes de operación / emergencia ─────────────────── */}
      {ordenes.length > 0 && (
        <section className={ord.section}>
          <div className={ord.head}>
            <div className={ord.headLeft}>
              <h2 className={ord.title}>🚨 Órdenes de Emergencia</h2>
              <span className={ord.count}>{ordenes.length}</span>
            </div>
            <Link to="/voluntario/ordenes" className={ord.verTodas}>Ver todas y mapa →</Link>
          </div>
          <div className={ord.grid}>
            {ordenes.map(o => {
              const nv = NIVEL_ORDEN[o.nivel_dificultad];
              const inscrito = o.ya_inscrito;
              return (
                <div key={o.id}
                  onClick={() => setOrdenSelId(o.id)}
                  title="Ver detalle"
                  className={`${ord.card} ${inscrito ? ord.cardInscrito : ''}`}
                  style={nivelVars(nv)}>
                  <span className={ord.cardGlow} />
                  <div className={ord.badges}>
                    <span className={`${ord.badge} ${ord.badgeNivel}`}>{nv.icon} Dificultad {nv.label}</span>
                    {inscrito && <span className={`${ord.badge} ${ord.badgeInscrito}`}>✓ Inscrito</span>}
                  </div>

                  <div className={ord.cardTitle}>{o.titulo}</div>

                  <div className={ord.details}>
                    {o.direccion && <span className={ord.detail}><span className={ord.detailIcon}>📍</span>{o.direccion}</span>}
                    {o.lat != null && <span className={`${ord.detail} ${ord.detailMap}`}><span className={ord.detailIcon}>🗺️</span>Ubicación en mapa</span>}
                    {o.equipos_necesarios && <span className={ord.detail}><span className={ord.detailIcon}>🧰</span>{o.equipos_necesarios}</span>}
                    {o.creado_nombre && <span className={`${ord.detail} ${ord.detailAuthor}`}>Publicado por {o.creado_nombre}</span>}
                  </div>

                  <div className={ord.footer}>
                    <span className={ord.inscritos}>
                      👥 <span className={ord.inscritosNum}>{o.inscritos}</span>
                      {o.voluntarios_requeridos > 0 ? ` / ${o.voluntarios_requeridos}` : ' inscritos'}
                    </span>
                    <button
                      disabled={busyOrden === o.id}
                      onClick={(e) => { e.stopPropagation(); toggleOrden(o); }}
                      className={`${ord.btn} ${inscrito ? ord.btnLeave : ord.btnJoin}`}>
                      {busyOrden === o.id ? '…' : inscrito ? 'Cancelar' : 'Inscribirme'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Capacitaciones disponibles ────────────────────────── */}
      {caps_abiertas.length > 0 && (
        <section className={s.capSection}>
          <SectionHead title="Capacitaciones disponibles" icon="📚" color="#6366f1" count={caps_abiertas.length} />
          <div className={s.capGrid}>
            {caps_abiertas.map(cap => {
              const tc = TIPO_CFG[cap.tipo] ?? TIPO_CFG.interna;
              const inscrito = !!cap.ya_inscrito;
              return (
                <div key={cap.id} className={`${s.capCard} ${inscrito ? s.capCardInscrito : ''}`}>
                  <div className={s.tagRow}>
                    <span className={s.badgeTipo} style={{ color: tc.color, background: tc.bg }}>{tc.label}</span>
                    {inscrito && <span className={s.badgeInscrito}>✓ Inscrito</span>}
                  </div>

                  <div className={s.capName}>{cap.nombre}</div>

                  <div className={s.capDetails}>
                    {cap.institucion && <span className={`${s.capDetail} ${s.capDetailInst}`}>🏛 {cap.institucion}</span>}
                    {cap.instructor  && <span className={s.capDetail}>👤 {cap.instructor}</span>}
                    {cap.fecha       && <span className={s.capDetail}>📅 {fmtDate(cap.fecha)}</span>}
                    {cap.lugar       && <span className={s.capDetail}>📍 {cap.lugar}</span>}
                    {cap.horas > 0   && <span className={s.capDetail}>⏱ {cap.horas} horas</span>}
                  </div>

                  <div className={s.capFooter}>
                    <span className={s.capInscritos}>
                      {cap.inscritos} inscrito{cap.inscritos !== 1 ? 's' : ''}
                      {cap.cupo > 0 && ` · cupo ${cap.cupo}`}
                    </span>
                    <button
                      disabled={busy === cap.id}
                      onClick={() => toggleInscripcion(cap)}
                      className={`${s.btn} ${inscrito ? s.btnLeave : s.btnJoin}`}>
                      {busy === cap.id ? '…' : inscrito ? 'Cancelar' : 'Inscribirme'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Grid mis guardias / mis capacitaciones ────────────── */}
      <div className={s.colsTwo}>

        {/* Mis guardias recientes */}
        <section className={s.sectionCard}>
          <SectionHead title="Mis Guardias" icon="🛡️" color="#3b82f6" count={stats.guardias} />
          {guardias_recientes.length === 0 ? (
            <div className={s.empty}><div className={s.emptyIcon}>🛡️</div><div className={s.emptyText}>Aún no tienes guardias registradas</div></div>
          ) : (
            <div className={s.list}>
              {guardias_recientes.map(g => {
                const tc = TURNO_COLOR[g.turno] ?? TURNO_COLOR.diurno;
                return (
                  <div key={g.id} className={s.listItem}>
                    <div className={s.listPill} style={{ background: tc.bg, color: tc.color }}>{TURNO_LABEL[g.turno] ?? g.turno}</div>
                    <div className={s.listMain}>
                      <div className={s.listName}>{g.rol_guardia || '—'}</div>
                      <div className={s.listSub}>
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
        <section className={s.sectionCard}>
          <SectionHead title="Mis Inscripciones" icon="📋" color="#8b5cf6" count={stats.caps_inscritas} />
          {caps_mis.length === 0 ? (
            <div className={s.empty}><div className={s.emptyIcon}>📋</div><div className={s.emptyText}>No estás inscrito en ninguna capacitación</div></div>
          ) : (
            <div className={s.list}>
              {caps_mis.map(c => {
                const tc = TIPO_CFG[c.cap_tipo] ?? TIPO_CFG.interna;
                const sc = INS_COLOR[c.estado] ?? INS_COLOR.inscrito;
                return (
                  <div key={c.inscripcion_id} className={s.listItem} style={{ display: 'block' }}>
                    <div className={s.tagRow}>
                      <span className={s.tag} style={{ color: tc.color, background: tc.bg }}>{tc.label}</span>
                      <span className={s.tag} style={{ color: sc.color, background: sc.bg }}>{c.estado}</span>
                    </div>
                    <div className={s.listName}>{c.nombre}</div>
                    <div className={s.listSub}>
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
      <div className={s.colsTwo}>

        {/* Méritos */}
        <section className={s.sectionCard}>
          <SectionHead title="Méritos" icon="🏅" color="#10b981" count={meritos_lista.length} />
          {meritos_lista.length === 0 ? (
            <div className={s.empty}><div className={s.emptyIcon}>🏅</div><div className={s.emptyText}>Sin méritos registrados aún</div></div>
          ) : (
            <div className={s.list}>
              {meritos_lista.map(m => (
                <div key={m.id} className={`${s.noteItem} ${s.noteMerito}`}>
                  <div className={s.noteIcon}>🏅</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className={s.noteTitleMerito}>{m.titulo}</div>
                    {m.descripcion && <div className={s.noteDesc}>{m.descripcion}</div>}
                    <div className={s.noteMeta}>
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
        <section className={s.sectionCard}>
          <SectionHead title="Llamadas de atención" icon="⚠️" color="#f59e0b" count={stats.llamadas_atencion} />
          {llamadas_lista.length === 0 ? (
            <div className={s.empty}>
              <div className={s.emptyIcon}>✅</div>
              <div className={s.emptyText}>Sin llamadas de atención</div>
              <div className={s.emptyHint}>Mantén el buen desempeño</div>
            </div>
          ) : (
            <div className={s.list}>
              {llamadas_lista.map(l => (
                <div key={l.id} className={`${s.noteItem} ${s.noteWarn}`}>
                  <div className={s.noteIcon}>⚠️</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className={s.noteTitleWarn}>{l.titulo}</div>
                    {l.descripcion && <div className={s.noteDesc}>{l.descripcion}</div>}
                    <div className={s.noteMeta}>{fmtDateShort(l.fecha)}</div>
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

      {/* ── Detalle de orden de operación ─────────────────────── */}
      {(() => {
        const sel = ordenes.find(o => o.id === ordenSelId);
        return sel ? (
          <OrdenModal
            orden={sel}
            busy={busyOrden === sel.id}
            onToggle={toggleOrden}
            onClose={() => setOrdenSelId(null)}
          />
        ) : null;
      })()}
    </div>
  );
}
