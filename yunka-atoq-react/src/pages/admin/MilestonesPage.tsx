import { useState, useEffect } from 'react';
import { milestonesApi, type Milestone } from '../../services/api';

const EMPTY = { orden: 0, fecha_label: '', titulo: '', descripcion: '' };

export default function MilestonesPage() {
  const [lista, setLista]     = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState<Partial<Milestone> | null>(null);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState('');

  const load = () => {
    setLoading(true);
    milestonesApi.list()
      .then(setLista)
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openNew  = () => setModal({ ...EMPTY, orden: lista.length + 1 });
  const openEdit = (m: Milestone) => setModal({ ...m });

  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(''), 3500); };

  const save = async () => {
    if (!modal) return;
    if (!modal.fecha_label?.trim() || !modal.titulo?.trim()) {
      flash('Fecha/etiqueta y título son requeridos.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        orden:       modal.orden ?? 0,
        fecha_label: modal.fecha_label.trim(),
        titulo:      modal.titulo.trim(),
        descripcion: modal.descripcion?.trim() || null,
      } as Omit<Milestone, 'id' | 'created_at'>;

      if (modal.id) {
        await milestonesApi.update(modal.id, payload);
      } else {
        await milestonesApi.create(payload);
      }
      setModal(null);
      load();
      flash(modal.id ? 'Hito actualizado.' : 'Hito creado.');
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (m: Milestone) => {
    if (!confirm(`¿Eliminar "${m.titulo}"?`)) return;
    try {
      await milestonesApi.remove(m.id);
      load();
      flash('Hito eliminado.');
    } catch { flash('Error al eliminar.'); }
  };

  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: '860px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-condensed)', fontSize: '1.5rem', fontWeight: 900,
            color: '#0F172A', margin: '0 0 0.25rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Hitos — Línea de tiempo
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.82rem', margin: 0 }}>
            Aparecen en la portada y en la página /nosotros. Se muestran ordenados por el campo "Orden".
          </p>
        </div>
        <button onClick={openNew} style={{
          fontFamily: 'var(--font-condensed)', fontSize: '0.78rem', fontWeight: 800,
          textTransform: 'uppercase', letterSpacing: '0.06em',
          background: '#C41E1E', color: 'white', border: 'none',
          borderRadius: '8px', padding: '0.65rem 1.25rem', cursor: 'pointer',
        }}>
          + Nuevo hito
        </button>
      </div>

      {msg && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px',
          padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#166534', marginBottom: '1.25rem' }}>
          {msg}
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>
          Cargando…
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {lista.map((m, i) => (
            <div key={m.id} style={{
              display: 'grid', gridTemplateColumns: '2.5rem 1fr auto',
              gap: '1rem', alignItems: 'start',
              padding: '1rem 1.25rem', borderRadius: '12px',
              background: 'white', border: '1.5px solid #E2E8F0',
            }}>
              {/* Número */}
              <div style={{ fontFamily: 'var(--font-condensed)', fontSize: '1.1rem', fontWeight: 900,
                color: '#f59e0b', paddingTop: '0.15rem' }}>
                {String(i + 1).padStart(2, '0')}
              </div>

              {/* Contenido */}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-condensed)', fontSize: '1rem', fontWeight: 800,
                  color: '#0F172A', marginBottom: '0.2rem' }}>
                  {m.fecha_label}
                </div>
                {m.descripcion && (
                  <div style={{ fontSize: '0.78rem', color: '#64748B', lineHeight: 1.5,
                    overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical' as any }}>
                    {m.descripcion}
                  </div>
                )}
              </div>

              {/* Acciones */}
              <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                <button onClick={() => openEdit(m)} style={{
                  fontFamily: 'var(--font-condensed)', fontSize: '0.68rem', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  padding: '0.4rem 0.75rem', borderRadius: '6px',
                  border: '1.5px solid #E2E8F0', background: 'white',
                  color: '#0F172A', cursor: 'pointer',
                }}>Editar</button>
                <button onClick={() => remove(m)} style={{
                  fontFamily: 'var(--font-condensed)', fontSize: '0.68rem', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  padding: '0.4rem 0.75rem', borderRadius: '6px',
                  border: '1.5px solid #fecaca', background: '#fef2f2',
                  color: '#991b1b', cursor: 'pointer',
                }}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div onClick={() => setModal(null)} style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '2rem 1rem',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: '540px',
            background: 'white', borderRadius: '20px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
            overflow: 'hidden',
          }}>
            {/* Modal header */}
            <div style={{
              background: 'linear-gradient(135deg,#0F172A,#1e3a5f)',
              padding: '1.25rem 1.5rem',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <h2 style={{ fontFamily: 'var(--font-condensed)', fontSize: '1rem', fontWeight: 900,
                color: 'white', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {modal.id ? 'Editar hito' : 'Nuevo hito'}
              </h2>
              <button onClick={() => setModal(null)} style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                color: 'white', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem',
              }}>✕</button>
            </div>

            {/* Modal body */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Orden */}
              <div>
                <label style={{ fontFamily: 'var(--font-condensed)', fontSize: '0.68rem', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748B',
                  display: 'block', marginBottom: '0.35rem' }}>Orden</label>
                <input type="number" value={modal.orden ?? 0}
                  onChange={e => setModal(p => ({ ...p!, orden: +e.target.value }))}
                  style={{ width: '80px', padding: '0.5rem 0.75rem',
                    border: '1.5px solid #E2E8F0', borderRadius: '8px',
                    fontFamily: 'var(--font-condensed)', fontSize: '0.9rem',
                    color: '#0F172A', outline: 'none' }} />
              </div>

              {/* Fecha / etiqueta */}
              <div>
                <label style={{ fontFamily: 'var(--font-condensed)', fontSize: '0.68rem', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748B',
                  display: 'block', marginBottom: '0.35rem' }}>Fecha / etiqueta *</label>
                <input type="text" placeholder="5 Ago 2023 · Laguna Corani"
                  value={modal.fecha_label ?? ''}
                  onChange={e => setModal(p => ({ ...p!, fecha_label: e.target.value }))}
                  style={{ width: '100%', padding: '0.55rem 0.875rem',
                    border: '1.5px solid #E2E8F0', borderRadius: '8px',
                    fontFamily: 'var(--font-condensed)', fontSize: '0.9rem',
                    color: '#0F172A', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              {/* Título */}
              <div>
                <label style={{ fontFamily: 'var(--font-condensed)', fontSize: '0.68rem', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748B',
                  display: 'block', marginBottom: '0.35rem' }}>Título *</label>
                <input type="text" placeholder="Personería Jurídica"
                  value={modal.titulo ?? ''}
                  onChange={e => setModal(p => ({ ...p!, titulo: e.target.value }))}
                  style={{ width: '100%', padding: '0.55rem 0.875rem',
                    border: '1.5px solid #E2E8F0', borderRadius: '8px',
                    fontFamily: 'var(--font-condensed)', fontSize: '0.9rem',
                    color: '#0F172A', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              {/* Descripción */}
              <div>
                <label style={{ fontFamily: 'var(--font-condensed)', fontSize: '0.68rem', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748B',
                  display: 'block', marginBottom: '0.35rem' }}>Descripción</label>
                <textarea rows={3} placeholder="Breve descripción del hito…"
                  value={modal.descripcion ?? ''}
                  onChange={e => setModal(p => ({ ...p!, descripcion: e.target.value }))}
                  style={{ width: '100%', padding: '0.55rem 0.875rem',
                    border: '1.5px solid #E2E8F0', borderRadius: '8px',
                    fontFamily: 'inherit', fontSize: '0.85rem',
                    color: '#0F172A', outline: 'none', resize: 'vertical',
                    boxSizing: 'border-box' }} />
              </div>

              {/* Guardar */}
              <button onClick={save} disabled={saving} style={{
                fontFamily: 'var(--font-condensed)', fontSize: '0.78rem', fontWeight: 800,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                background: '#C41E1E', color: 'white', border: 'none',
                borderRadius: '8px', padding: '0.75rem', cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.65 : 1,
              }}>
                {saving ? 'Guardando…' : modal.id ? 'Guardar cambios' : 'Crear hito'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
