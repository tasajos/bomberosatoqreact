import { useState, useEffect } from 'react';
import { voluntariosApi, type PostulacionItem as Postulacion } from '../../services/api';

function fmtDate(s: string) {
  const d = new Date(s);
  return isNaN(d.getTime()) ? s
    : new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);
}

export default function PostulacionesPage() {
  const [lista, setLista]     = useState<Postulacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [search, setSearch]   = useState('');
  const [soloNuevos, setSoloNuevos] = useState(false);
  const [detalle, setDetalle] = useState<Postulacion | null>(null);

  useEffect(() => {
    voluntariosApi.postulaciones()
      .then(setLista)
      .catch(e => setError(e.message || 'Error al cargar postulaciones'))
      .finally(() => setLoading(false));
  }, []);

  const marcarRevisado = async (id: number) => {
    try {
      await voluntariosApi.revisarPostulacion(id);
      setLista(prev => prev.map(p => p.id === id ? { ...p, revisado: 1 } : p));
      if (detalle?.id === id) setDetalle(prev => prev ? { ...prev, revisado: 1 } : null);
    } catch { /* silencioso */ }
  };

  const filtered = lista.filter(p => {
    if (soloNuevos && p.revisado) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.nombre.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      (p.telefono || '').includes(q)
    );
  });

  const nuevos = lista.filter(p => !p.revisado).length;

  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: '980px' }}>

      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
          <h1 style={{
            fontFamily: 'var(--font-condensed)', fontSize: '1.5rem', fontWeight: 900,
            color: '#0F172A', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>Postulaciones</h1>
          {nuevos > 0 && (
            <span style={{
              fontFamily: 'var(--font-condensed)', fontSize: '0.7rem', fontWeight: 800,
              background: '#C41E1E', color: 'white', borderRadius: '999px',
              padding: '0.2rem 0.6rem',
            }}>{nuevos} nueva{nuevos !== 1 ? 's' : ''}</span>
          )}
        </div>
        <p style={{ color: '#64748B', fontSize: '0.82rem', margin: 0 }}>
          Personas que llenaron el formulario de postulación al voluntariado.
        </p>
      </div>

      {/* Toolbar */}
      <div style={{
        display: 'flex', gap: '0.75rem', flexWrap: 'wrap',
        alignItems: 'center', marginBottom: '1.25rem',
      }}>
        <input
          type="text"
          placeholder="Buscar por nombre, correo o teléfono…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: '1 1 220px', padding: '0.55rem 0.875rem',
            border: '1.5px solid #E2E8F0', borderRadius: '8px',
            fontFamily: 'var(--font-condensed)', fontSize: '0.82rem',
            color: '#0F172A', background: '#F8FAFC', outline: 'none',
          }}
        />
        <label style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          fontFamily: 'var(--font-condensed)', fontSize: '0.75rem', fontWeight: 700,
          color: '#475569', cursor: 'pointer', userSelect: 'none',
          padding: '0.45rem 0.75rem', border: '1.5px solid #E2E8F0',
          borderRadius: '8px', background: soloNuevos ? '#fef2f2' : 'white',
        }}>
          <input
            type="checkbox"
            checked={soloNuevos}
            onChange={e => setSoloNuevos(e.target.checked)}
            style={{ accentColor: '#C41E1E' }}
          />
          Solo sin revisar
        </label>
        <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
          {filtered.length} de {lista.length}
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>
          Cargando postulaciones…
        </div>
      ) : error ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#991b1b', fontSize: '0.85rem' }}>
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📭</div>
          <div style={{ fontFamily: 'var(--font-condensed)', fontSize: '0.9rem', fontWeight: 700, color: '#475569' }}>
            {soloNuevos ? 'No hay postulaciones sin revisar' : 'No hay postulaciones'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filtered.map(p => (
            <div
              key={p.id}
              onClick={() => setDetalle(p)}
              style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '0.875rem 1.125rem', borderRadius: '12px',
                background: 'white', border: `1.5px solid ${p.revisado ? '#E2E8F0' : '#fca5a5'}`,
                cursor: 'pointer', transition: 'box-shadow 0.15s, border-color 0.15s',
                boxShadow: p.revisado ? 'none' : '0 0 0 3px rgba(196,30,30,0.06)',
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = p.revisado ? 'none' : '0 0 0 3px rgba(196,30,30,0.06)')}
            >
              {/* Avatar */}
              <div style={{
                width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0,
                background: p.revisado
                  ? 'linear-gradient(135deg,#94a3b8,#64748b)'
                  : 'linear-gradient(135deg,#C41E1E,#7c3aed)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-condensed)', fontSize: '1rem', fontWeight: 900, color: 'white',
              }}>
                {p.nombre[0]?.toUpperCase()}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{
                    fontFamily: 'var(--font-condensed)', fontSize: '0.9rem', fontWeight: 800,
                    color: '#0F172A',
                  }}>{p.nombre}</span>
                  {!p.revisado && (
                    <span style={{
                      fontFamily: 'var(--font-condensed)', fontSize: '0.58rem', fontWeight: 800,
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                      color: '#991b1b', background: '#fee2e2',
                      padding: '0.1rem 0.45rem', borderRadius: '3px',
                    }}>Nuevo</span>
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.1rem' }}>
                  {p.email}
                  {p.telefono && ` · ${p.telefono}`}
                  {p.edad && ` · ${p.edad} años`}
                </div>
              </div>

              {/* Fecha */}
              <div style={{
                flexShrink: 0, fontSize: '0.72rem', color: '#94A3B8', textAlign: 'right',
              }}>
                {fmtDate(p.created_at)}
              </div>

              {/* Flecha */}
              <div style={{ flexShrink: 0, color: '#CBD5E1', fontSize: '0.9rem' }}>›</div>
            </div>
          ))}
        </div>
      )}

      {/* Detalle modal */}
      {detalle && (
        <div
          onClick={() => setDetalle(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '2rem 1rem',
          }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '500px',
              background: 'white', borderRadius: '20px',
              boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
              overflow: 'hidden',
              animation: 'slideUp 0.2s ease',
            }}>

            {/* Modal header */}
            <div style={{
              background: detalle.revisado
                ? 'linear-gradient(135deg,#475569,#334155)'
                : 'linear-gradient(135deg,#C41E1E,#7c3aed)',
              padding: '1.5rem',
              display: 'flex', alignItems: 'center', gap: '1rem',
            }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0,
                background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-condensed)', fontSize: '1.2rem', fontWeight: 900, color: 'white',
              }}>
                {detalle.nombre[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: 'var(--font-condensed)', fontSize: '1.1rem', fontWeight: 900,
                  color: 'white', lineHeight: 1.1,
                }}>{detalle.nombre}</div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.2rem' }}>
                  {fmtDate(detalle.created_at)}
                </div>
              </div>
              <button onClick={() => setDetalle(null)} style={{
                width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
                color: 'white', fontSize: '0.9rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
            </div>

            {/* Modal body */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {/* Datos */}
              {[
                { label: 'Correo electrónico', value: detalle.email },
                { label: 'Teléfono', value: detalle.telefono || '—' },
                { label: 'Edad', value: detalle.edad ? `${detalle.edad} años` : '—' },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                  padding: '0.625rem 0', borderBottom: '1px solid #F1F5F9',
                }}>
                  <span style={{
                    fontFamily: 'var(--font-condensed)', fontSize: '0.7rem', fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8',
                  }}>{label}</span>
                  <span style={{ fontSize: '0.85rem', color: '#0F172A', fontWeight: 600 }}>{value}</span>
                </div>
              ))}

              {/* Mensaje */}
              {detalle.mensaje && (
                <div>
                  <div style={{
                    fontFamily: 'var(--font-condensed)', fontSize: '0.7rem', fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8',
                    marginBottom: '0.5rem',
                  }}>Mensaje</div>
                  <div style={{
                    background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px',
                    padding: '0.875rem 1rem', fontSize: '0.83rem', color: '#334155', lineHeight: 1.6,
                  }}>{detalle.mensaje}</div>
                </div>
              )}

              {/* Acciones */}
              <div style={{ display: 'flex', gap: '0.625rem', marginTop: '0.25rem' }}>
                {!detalle.revisado && (
                  <button
                    onClick={() => marcarRevisado(detalle.id)}
                    style={{
                      flex: 1,
                      fontFamily: 'var(--font-condensed)', fontSize: '0.75rem', fontWeight: 800,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      background: '#C41E1E', color: 'white', border: 'none',
                      borderRadius: '8px', padding: '0.65rem 1rem', cursor: 'pointer',
                    }}>
                    Marcar como revisado
                  </button>
                )}
                <a
                  href={`mailto:${detalle.email}`}
                  style={{
                    flex: 1, textAlign: 'center',
                    fontFamily: 'var(--font-condensed)', fontSize: '0.75rem', fontWeight: 800,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    background: '#F1F5F9', color: '#0F172A',
                    border: '1.5px solid #E2E8F0', borderRadius: '8px',
                    padding: '0.65rem 1rem', textDecoration: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                  }}>
                  ✉ Contactar
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
