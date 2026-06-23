import { useEffect, useRef, useState } from 'react';
import { ordenesApi, type OrdenOperacion, type NivelDificultad, type EstadoOrden } from '../../services/api';
import EmergenciaMap, { type MapImage } from '../../components/EmergenciaMap';
import styles from './Ops.module.css';

const NIVELES: { value: NivelDificultad; label: string; color: string; icon: string }[] = [
  { value: 'baja',    label: 'Baja',     color: '#16a34a', icon: '🟢' },
  { value: 'media',   label: 'Media',    color: '#d97706', icon: '🟡' },
  { value: 'alta',    label: 'Alta',     color: '#ea580c', icon: '🟠' },
  { value: 'critica', label: 'Crítica',  color: '#C41E1E', icon: '🔴' },
];

const ESTADO_LABEL: Record<EstadoOrden, string> = {
  activa: 'Activa', en_curso: 'En curso', finalizada: 'Finalizada', cancelada: 'Cancelada',
};

interface LocalImg { file: File; preview: string; lat: number | null; lng: number | null; descripcion: string; }

const empty = {
  titulo: '', descripcion: '', nivel_dificultad: 'media' as NivelDificultad,
  equipos_necesarios: '', voluntarios_requeridos: '', direccion: '',
};

export default function OpsOrdenOperacion() {
  const [form, setForm] = useState({ ...empty });
  const [emergencia, setEmergencia] = useState<{ lat: number; lng: number } | null>(null);
  const [imgs, setImgs] = useState<LocalImg[]>([]);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<'success' | 'error' | null>(null);
  const [modalMsg, setModalMsg] = useState('');
  const [ordenes, setOrdenes] = useState<OrdenOperacion[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const load = () => { ordenesApi.list().then(r => setOrdenes(r.data)).catch(() => {}); };
  useEffect(() => { load(); }, []);

  const handleFiles = (files: FileList) => {
    Array.from(files).forEach(file => {
      const r = new FileReader();
      r.onload = e => {
        setImgs(prev => [...prev, {
          file, preview: e.target?.result as string,
          lat: emergencia?.lat ?? null, lng: emergencia?.lng ?? null, descripcion: '',
        }]);
      };
      r.readAsDataURL(file);
    });
  };

  // Cuando se mueve un marcador de imagen en el mapa
  const onImageMove = (index: number, pos: { lat: number; lng: number }) => {
    setImgs(prev => prev.map((im, i) => i === index ? { ...im, lat: pos.lat, lng: pos.lng } : im));
  };

  // Marcador de emergencia: al fijarlo, posiciona las imágenes que aún no tienen ubicación
  const onEmergenciaChange = (pos: { lat: number; lng: number }) => {
    setEmergencia(pos);
    setImgs(prev => prev.map(im => im.lat == null ? { ...im, lat: pos.lat, lng: pos.lng } : im));
  };

  const mapImages: MapImage[] = imgs.map(im => ({ url: im.preview, lat: im.lat, lng: im.lng, descripcion: im.descripcion }));

  const reset = () => {
    setForm({ ...empty }); setEmergencia(null); setImgs([]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSave = async () => {
    if (!form.titulo.trim()) { setModalMsg('El título es obligatorio.'); setModal('error'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('titulo', form.titulo);
      fd.append('descripcion', form.descripcion);
      fd.append('nivel_dificultad', form.nivel_dificultad);
      fd.append('equipos_necesarios', form.equipos_necesarios);
      fd.append('voluntarios_requeridos', form.voluntarios_requeridos || '0');
      fd.append('direccion', form.direccion);
      if (emergencia) { fd.append('lat', String(emergencia.lat)); fd.append('lng', String(emergencia.lng)); }
      fd.append('estado', 'activa');
      const meta = imgs.map(im => ({ lat: im.lat, lng: im.lng, descripcion: im.descripcion }));
      fd.append('imagenes_meta', JSON.stringify(meta));
      imgs.forEach(im => fd.append('imagenes', im.file));

      await ordenesApi.create(fd);
      setModalMsg(`La orden de operación "${form.titulo}" fue publicada y ya es visible para todos los voluntarios.`);
      setModal('success');
      reset();
      load();
    } catch (e: unknown) {
      setModalMsg(e instanceof Error ? e.message : 'Error al crear la orden');
      setModal('error');
    } finally { setSaving(false); }
  };

  const cambiarEstado = async (id: number, estado: EstadoOrden) => {
    try { await ordenesApi.updateEstado(id, estado); load(); } catch { /* noop */ }
  };
  const eliminar = async (id: number) => {
    if (!window.confirm('¿Eliminar esta orden de operación? Esta acción no se puede deshacer.')) return;
    try { await ordenesApi.remove(id); load(); } catch { /* noop */ }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Orden de Operación</h1>
          <p className={styles.pageSub}>
            Crea solicitudes de operación y emergencia con ubicación en mapa satelital. Una vez publicadas
            son visibles para todos los usuarios, que podrán inscribirse.
          </p>
        </div>
      </div>

      {/* ── Datos de la solicitud ── */}
      <div className={styles.formCard}>
        <div className={styles.sectionLabel}>🚨 Datos de la emergencia</div>

        <div className={styles.formFull}>
          <div className={styles.field}>
            <label className={styles.label}>Título *</label>
            <input className={styles.input} placeholder="Ej. Incendio estructural en Av. América"
              value={form.titulo} onChange={e => set('titulo', e.target.value)} />
          </div>
        </div>

        <div className={styles.formGrid2}>
          <div className={styles.field}>
            <label className={styles.label}>Voluntarios requeridos</label>
            <input className={styles.input} type="number" min="0" placeholder="Ej. 8"
              value={form.voluntarios_requeridos} onChange={e => set('voluntarios_requeridos', e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Dirección / referencia</label>
            <input className={styles.input} placeholder="Ej. Av. América esq. Heroínas"
              value={form.direccion} onChange={e => set('direccion', e.target.value)} />
          </div>
        </div>

        {/* Nivel de dificultad */}
        <div className={styles.formFull}>
          <div className={styles.field}>
            <label className={styles.label}>Nivel de dificultad</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.625rem', marginTop: '0.25rem' }}>
              {NIVELES.map(n => {
                const sel = form.nivel_dificultad === n.value;
                return (
                  <button key={n.value} type="button" onClick={() => set('nivel_dificultad', n.value)}
                    style={{
                      padding: '0.75rem', borderRadius: 8, cursor: 'pointer',
                      border: `1.5px solid ${sel ? n.color : '#E2E8F0'}`,
                      background: sel ? `${n.color}0D` : '#FAFBFC',
                      fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.85rem',
                      color: sel ? n.color : '#475569', transition: 'all .18s',
                    }}>
                    {n.icon} {n.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className={styles.formFull}>
          <div className={styles.field}>
            <label className={styles.label}>Equipos / recursos necesarios</label>
            <textarea className={styles.textarea}
              placeholder="Ej. 2 autobombas, equipo de respiración autónoma, escalera telescópica, kit de rescate…"
              value={form.equipos_necesarios} onChange={e => set('equipos_necesarios', e.target.value)} />
          </div>
        </div>

        <div className={styles.formFull}>
          <div className={styles.field}>
            <label className={styles.label}>Descripción de la operación</label>
            <textarea className={styles.textarea}
              placeholder="Detalle de la situación, riesgos, objetivos…"
              value={form.descripcion} onChange={e => set('descripcion', e.target.value)} />
          </div>
        </div>
      </div>

      {/* ── Mapa ── */}
      <div className={styles.formCard}>
        <div className={styles.sectionLabel}>🗺️ Ubicación en el mapa (satélite HD)</div>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: '#64748B', margin: '0 0 0.875rem' }}>
          Haz clic sobre el mapa para fijar la ubicación de la emergencia. Las imágenes subidas aparecen como
          marcadores que puedes arrastrar para colocarlas en el punto exacto.
        </p>
        <EmergenciaMap
          emergencia={emergencia}
          onEmergenciaChange={onEmergenciaChange}
          images={mapImages}
          onImageMove={onImageMove}
          height="440px"
        />
        {emergencia && (
          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: '#475569' }}>
              📍 Lat: <b>{emergencia.lat.toFixed(5)}</b> · Lng: <b>{emergencia.lng.toFixed(5)}</b>
            </span>
            <button className={styles.btnSm} onClick={() => setEmergencia(null)}>Quitar ubicación</button>
          </div>
        )}
      </div>

      {/* ── Imágenes ── */}
      <div className={styles.formCard}>
        <div className={styles.sectionLabel}>🖼️ Imágenes del lugar</div>
        <label style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
          padding: '1.75rem', border: '2px dashed #CBD5E1', borderRadius: 12,
          background: '#F8FAFC', cursor: 'pointer',
        }}>
          <span style={{ fontSize: '2rem', lineHeight: 1 }}>📷</span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 700, color: '#374151' }}>
            Subir imágenes (se colocan sobre el mapa)
          </span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.76rem', color: '#94A3B8' }}>JPG, PNG, WEBP · Máx. 15 MB c/u</span>
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
            onChange={e => { if (e.target.files?.length) handleFiles(e.target.files); }} />
        </label>

        {imgs.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: '0.75rem', marginTop: '1rem' }}>
            {imgs.map((im, i) => (
              <div key={i} style={{ border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden', background: 'white' }}>
                <div style={{ position: 'relative' }}>
                  <img src={im.preview} alt="" style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }} />
                  <button onClick={() => setImgs(prev => prev.filter((_, idx) => idx !== i))}
                    style={{
                      position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: '50%',
                      background: 'rgba(0,0,0,0.55)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.8rem',
                    }}>✕</button>
                  <span style={{
                    position: 'absolute', bottom: 6, left: 6, fontSize: '0.62rem', fontWeight: 700,
                    padding: '0.15rem 0.45rem', borderRadius: 4, color: 'white',
                    background: im.lat != null ? 'rgba(22,163,74,0.9)' : 'rgba(100,116,139,0.9)',
                  }}>{im.lat != null ? '📍 En mapa' : 'Sin ubicar'}</span>
                </div>
                <input className={styles.input} placeholder="Descripción…" value={im.descripcion}
                  onChange={e => setImgs(prev => prev.map((x, idx) => idx === i ? { ...x, descripcion: e.target.value } : x))}
                  style={{ border: 'none', borderRadius: 0, fontSize: '0.78rem', padding: '0.5rem 0.625rem' }} />
              </div>
            ))}
          </div>
        )}
      </div>

      <button className={styles.primaryBtn} onClick={handleSave} disabled={saving}
        style={{ width: '100%', justifyContent: 'center', padding: '1rem', fontSize: '1rem' }}>
        {saving ? 'Publicando…' : '🚨 Publicar orden de operación'}
      </button>

      {/* ── Órdenes publicadas ── */}
      <div className={styles.card} style={{ marginTop: '0.5rem' }}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>Órdenes publicadas</span>
          <span className={styles.cardHint}>{ordenes.length} en total</span>
        </div>
        {ordenes.length === 0 ? (
          <div className={styles.empty}>Aún no hay órdenes de operación registradas.</div>
        ) : (
          <div className={styles.opsList}>
            {ordenes.map(o => {
              const nivel = NIVELES.find(n => n.value === o.nivel_dificultad)!;
              return (
                <div key={o.id} className={styles.opsItem}>
                  <div style={{ minWidth: 0 }}>
                    <span className={styles.opsTipo} style={{ background: `${nivel.color}1A`, color: nivel.color }}>
                      {nivel.icon} {nivel.label}
                    </span>
                    <div className={styles.opsTitulo}>{o.titulo}</div>
                    <div className={styles.opsVol}>
                      {o.direccion || 'Sin dirección'} · 👥 {o.inscritos}
                      {o.voluntarios_requeridos ? `/${o.voluntarios_requeridos}` : ''} inscritos
                      {o.lat != null ? ' · 🗺️ ubicación en mapa' : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <select className={styles.input} value={o.estado}
                      onChange={e => cambiarEstado(o.id, e.target.value as EstadoOrden)}
                      style={{ padding: '0.35rem 0.5rem', fontSize: '0.78rem' }}>
                      {(Object.keys(ESTADO_LABEL) as EstadoOrden[]).map(es => (
                        <option key={es} value={es}>{ESTADO_LABEL[es]}</option>
                      ))}
                    </select>
                    <button className={`${styles.btnSm} ${styles.btnSmRed}`} onClick={() => eliminar(o.id)}>Eliminar</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal resultado ── */}
      {modal && (
        <div onClick={() => setModal(null)} className={styles.modalOverlay}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 18, padding: '2.5rem', maxWidth: 420, width: '100%', textAlign: 'center' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', margin: '0 auto 1.25rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: 'white',
              background: modal === 'success' ? 'linear-gradient(135deg,#065f46,#10b981)' : 'linear-gradient(135deg,#7f1d1d,#C41E1E)',
            }}>{modal === 'success' ? '✓' : '✕'}</div>
            <div style={{ fontFamily: 'var(--font-condensed)', fontSize: '1.4rem', fontWeight: 900, color: '#0F172A', marginBottom: '0.625rem' }}>
              {modal === 'success' ? '¡Orden publicada!' : 'No se pudo guardar'}
            </div>
            <p style={{ fontSize: '0.875rem', color: '#64748B', lineHeight: 1.6, marginBottom: '1.75rem' }}>{modalMsg}</p>
            <button onClick={() => setModal(null)} className={styles.primaryBtn} style={{ padding: '0.75rem 2rem' }}>Aceptar</button>
          </div>
        </div>
      )}
    </div>
  );
}
