import { useState, useEffect } from 'react';
import { capacitacionesApi, type Capacitacion } from '../services/api';

type CapAbierta = Capacitacion & { ya_inscrito: number };

function fmtDate(s?: string) {
  if (!s) return '—';
  const d = new Date(s.slice(0, 10) + 'T12:00:00');
  return isNaN(d.getTime()) ? s
    : new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

const TIPO_CFG: Record<string, { label: string; color: string; bg: string }> = {
  interna:       { label: 'Interna',       color: '#1e40af', bg: '#eff6ff' },
  externa:       { label: 'Externa',       color: '#166534', bg: '#f0fdf4' },
  certificacion: { label: 'Certificación', color: '#7c3aed', bg: '#f5f3ff' },
};

export default function MisCapacitaciones() {
  const [lista, setLista]   = useState<CapAbierta[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]     = useState<number | null>(null);
  const [msg, setMsg]       = useState('');

  const load = () => {
    setLoading(true);
    capacitacionesApi.getAbiertas()
      .then(data => setLista(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const inscribirse = async (cap: CapAbierta) => {
    setBusy(cap.id);
    try {
      if (cap.ya_inscrito) {
        await capacitacionesApi.desinscribirse(cap.id);
        setMsg(`Te has desinscrito de "${cap.nombre}".`);
      } else {
        await capacitacionesApi.inscribirse(cap.id);
        setMsg(`✅ Te inscribiste en "${cap.nombre}". El responsable verá tu inscripción.`);
      }
      load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(null);
      setTimeout(() => setMsg(''), 4000);
    }
  };

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1.25rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-condensed)', fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 900, color: '#0F172A', margin: 0, lineHeight: 1 }}>
          Capacitaciones disponibles
        </h1>
        <p style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '0.35rem' }}>
          Capacitaciones con inscripción abierta. Presiona el botón para inscribirte o cancelar tu inscripción.
        </p>
      </div>

      {/* Mensaje */}
      {msg && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#166534', marginBottom: '1.25rem' }}>
          {msg}
        </div>
      )}

      {loading && (
        <p style={{ textAlign: 'center', color: '#94A3B8', padding: '3rem 0', fontSize: '0.875rem' }}>
          Cargando capacitaciones…
        </p>
      )}

      {!loading && !lista.length && (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📚</div>
          <div style={{ fontFamily: 'var(--font-condensed)', fontSize: '1rem', fontWeight: 700, color: '#475569' }}>
            No hay capacitaciones abiertas por el momento
          </div>
          <p style={{ fontSize: '0.82rem', color: '#94A3B8', marginTop: '0.35rem' }}>
            Cuando el presidente publique una invitación, aparecerá aquí.
          </p>
        </div>
      )}

      {/* Lista de capacitaciones */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {lista.map(cap => {
          const tc     = TIPO_CFG[cap.tipo] ?? TIPO_CFG.interna;
          const inscrito = !!cap.ya_inscrito;

          return (
            <div key={cap.id} style={{
              background: 'white',
              border: `1.5px solid ${inscrito ? '#86efac' : '#E2E8F0'}`,
              borderRadius: '14px',
              padding: '1.25rem 1.5rem',
              boxShadow: inscrito ? '0 0 0 3px rgba(134,239,172,0.2)' : '0 1px 4px rgba(0,0,0,0.05)',
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'flex-start', gap: '1.25rem',
            }}>
              {/* Contenido */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                  <span style={{
                    fontFamily: 'var(--font-condensed)', fontSize: '0.63rem', fontWeight: 800,
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: tc.color, background: tc.bg, padding: '0.15rem 0.6rem', borderRadius: '4px',
                  }}>{tc.label}</span>
                  {inscrito && (
                    <span style={{
                      fontFamily: 'var(--font-condensed)', fontSize: '0.63rem', fontWeight: 800,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      color: '#166534', background: '#f0fdf4', padding: '0.15rem 0.6rem', borderRadius: '4px',
                      border: '1px solid #86efac',
                    }}>✓ Inscrito</span>
                  )}
                </div>

                <div style={{ fontFamily: 'var(--font-condensed)', fontSize: '1.05rem', fontWeight: 900, color: '#0F172A', marginBottom: '0.5rem' }}>
                  {cap.nombre}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1.25rem' }}>
                  {cap.institucion && (
                    <span style={{ fontSize: '0.8rem', color: '#1e40af', fontWeight: 600 }}>
                      🏛 {cap.institucion}
                    </span>
                  )}
                  {cap.instructor && (
                    <span style={{ fontSize: '0.78rem', color: '#475569' }}>👤 {cap.instructor}</span>
                  )}
                  {cap.lugar && (
                    <span style={{ fontSize: '0.78rem', color: '#475569' }}>📍 {cap.lugar}</span>
                  )}
                  {cap.fecha && (
                    <span style={{ fontSize: '0.78rem', color: '#475569' }}>📅 {fmtDate(cap.fecha)}</span>
                  )}
                  {cap.horas > 0 && (
                    <span style={{ fontSize: '0.78rem', color: '#475569' }}>⏱ {cap.horas} horas</span>
                  )}
                </div>

                {cap.descripcion && (
                  <p style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.5rem', lineHeight: 1.5 }}>
                    {cap.descripcion}
                  </p>
                )}

                {/* Contador de inscritos */}
                <div style={{
                  marginTop: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                  fontFamily: 'var(--font-condensed)', fontSize: '0.72rem', fontWeight: 700,
                  color: '#64748B',
                }}>
                  <span style={{
                    background: '#F1F5F9', borderRadius: '999px',
                    padding: '0.15rem 0.6rem', fontWeight: 800, color: '#0F172A',
                  }}>{cap.inscritos}</span>
                  voluntario{cap.inscritos !== 1 ? 's' : ''} inscrito{cap.inscritos !== 1 ? 's' : ''}
                  {cap.cupo > 0 && <span style={{ color: '#94A3B8' }}> · cupo {cap.cupo}</span>}
                </div>
              </div>

              {/* Botón inscribirse */}
              <div style={{ flexShrink: 0, alignSelf: 'center' }}>
                <button
                  disabled={busy === cap.id}
                  onClick={() => inscribirse(cap)}
                  style={{
                    fontFamily: 'var(--font-condensed)', fontSize: '0.78rem', fontWeight: 800,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    padding: '0.7rem 1.25rem', borderRadius: '8px', border: '2px solid',
                    cursor: busy === cap.id ? 'not-allowed' : 'pointer',
                    transition: 'all 0.18s', whiteSpace: 'nowrap',
                    ...(inscrito
                      ? { background: '#fef2f2', color: '#991b1b', borderColor: '#fecaca' }
                      : { background: '#C41E1E', color: 'white', borderColor: '#C41E1E' }
                    ),
                    opacity: busy === cap.id ? 0.6 : 1,
                  }}
                >
                  {busy === cap.id ? '…' : inscrito ? 'Cancelar inscripción' : 'Inscribirme'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
