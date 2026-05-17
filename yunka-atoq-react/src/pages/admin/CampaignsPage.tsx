import { useState, useEffect, useRef } from 'react';
import styles from './CampaignsPage.module.css';
import { campaniasApi, type Campania, API_BASE } from '../../services/api';

const ESTADOS = ['activa', 'pausada', 'cerrada'] as const;
type Estado = typeof ESTADOS[number];

function fmt(n: number | string) {
  return new Intl.NumberFormat('es-BO').format(Number(n));
}

function pct(recaudado: number, meta: number) {
  if (!meta) return 0;
  return Math.min(100, Math.round((recaudado / meta) * 100));
}

const EMPTY: Omit<Campania, 'id' | 'created_at'> = {
  nombre: '', descripcion: '', meta: 0, recaudado: 0, donantes: 0,
  estado: 'activa', imagen_url: null,
};

function resolveImg(url: string | null) {
  if (!url) return null;
  return url.startsWith('/uploads/') ? `${API_BASE}${url}` : url;
}

// ── Modal ─────────────────────────────────────────────────────────
interface ModalProps {
  camp: Campania | null;
  onClose: () => void;
  onSaved: () => void;
}

function CampaniaModal({ camp, onClose, onSaved }: ModalProps) {
  const isNew = !camp;
  const [form, setForm] = useState<Omit<Campania, 'id' | 'created_at'>>(
    camp
      ? { nombre: camp.nombre, descripcion: camp.descripcion, meta: camp.meta,
          recaudado: camp.recaudado, donantes: camp.donantes, estado: camp.estado,
          imagen_url: camp.imagen_url }
      : { ...EMPTY }
  );
  const [saving, setSaving]       = useState(false);
  const [err, setErr]             = useState('');
  const [imgFile, setImgFile]     = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof typeof form, v: string | number | null) =>
    setForm(f => ({ ...f, [k]: v }));

  const handleFileChange = (f: File) => {
    setImgFile(f);
    const reader = new FileReader();
    reader.onload = e => setImgPreview(e.target?.result as string);
    reader.readAsDataURL(f);
    // limpiamos URL manual si se sube archivo
    set('imagen_url', null);
  };

  const handleUploadImg = async () => {
    if (!imgFile) return;
    setUploading(true);
    try {
      const { url } = await campaniasApi.uploadImage(imgFile);
      set('imagen_url', url);
      setImgFile(null);
      setImgPreview('');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error al subir imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.nombre.trim()) { setErr('El nombre es obligatorio.'); return; }
    if (!form.meta || Number(form.meta) <= 0) { setErr('La meta debe ser mayor a 0.'); return; }
    // Si hay archivo pendiente de subir, subirlo primero
    if (imgFile) {
      setUploading(true);
      try {
        const { url } = await campaniasApi.uploadImage(imgFile);
        form.imagen_url = url;
        setImgFile(null); setImgPreview('');
      } catch { setErr('Error al subir la imagen'); setUploading(false); return; }
      setUploading(false);
    }
    setSaving(true); setErr('');
    try {
      if (isNew) { await campaniasApi.create(form); }
      else        { await campaniasApi.update(camp!.id, form); }
      onSaved(); onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error al guardar');
    } finally { setSaving(false); }
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [onClose]);

  const displayImg = imgPreview || resolveImg(form.imagen_url) || '';
  const p = pct(Number(form.recaudado), Number(form.meta));

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>
            {isNew ? '+ Nueva campaña' : `Editar · ${camp!.nombre}`}
          </span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          {err && <div className={styles.errorMsg}>{err}</div>}

          {/* Imagen */}
          <div className={styles.field}>
            <label className={styles.label}>Imagen de la campaña</label>

            {displayImg && (
              <img src={displayImg} alt="preview" className={styles.imgPreview}
                onError={e => (e.currentTarget.style.display = 'none')} />
            )}

            {/* Upload archivo */}
            <label className={styles.imgUploadZone}>
              <span className={styles.imgUploadIcon}>📁</span>
              <span className={styles.imgUploadText}>
                {imgFile ? imgFile.name : 'Haz clic para subir una imagen'}
              </span>
              <span className={styles.imgUploadSub}>JPG, PNG, WEBP · Máx 8 MB</span>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { if (e.target.files?.[0]) handleFileChange(e.target.files[0]); }} />
            </label>

            {/* O URL manual */}
            <div className={styles.imgOrRow}>
              <span className={styles.imgOrLine} />
              <span className={styles.imgOrText}>o ingresa una URL</span>
              <span className={styles.imgOrLine} />
            </div>
            <input className={styles.input}
              placeholder="https://… o /uploads/campanias/imagen.jpg"
              value={!imgFile ? (form.imagen_url ?? '') : ''}
              onChange={e => { set('imagen_url', e.target.value || null); setImgFile(null); setImgPreview(''); }} />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Nombre de la campaña *</label>
            <input className={styles.input}
              placeholder="Ej. Equipos de respiración autónoma ERA-2026"
              value={form.nombre} onChange={e => set('nombre', e.target.value)} />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Descripción</label>
            <textarea className={styles.textarea}
              placeholder="Describe para qué se usarán los fondos…"
              value={form.descripcion} onChange={e => set('descripcion', e.target.value)} />
          </div>

          <div className={styles.formGrid3}>
            <div className={styles.field}>
              <label className={styles.label}>Meta (Bs) *</label>
              <input className={styles.input} type="number" min="1" placeholder="275000"
                value={form.meta || ''} onChange={e => set('meta', Number(e.target.value))} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Recaudado (Bs)</label>
              <input className={styles.input} type="number" min="0" placeholder="0"
                value={form.recaudado || ''} onChange={e => set('recaudado', Number(e.target.value))} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Donantes</label>
              <input className={styles.input} type="number" min="0" placeholder="0"
                value={form.donantes || ''} onChange={e => set('donantes', Number(e.target.value))} />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Estado</label>
            <select className={styles.select} value={form.estado}
              onChange={e => set('estado', e.target.value)}>
              {ESTADOS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>

          {/* Preview progreso */}
          {Number(form.meta) > 0 && (
            <div style={{ background: '#F8F9FA', borderRadius: 8, padding: '1rem' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-gray)', marginBottom: '0.5rem' }}>
                Vista previa del progreso
              </div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${p}%` }} />
              </div>
              <div className={styles.progressMeta} style={{ marginTop: '0.4rem' }}>
                <span>Bs {fmt(form.recaudado)} recaudado</span>
                <span className={styles.progressPct}>{p}%</span>
                <span>Meta: Bs {fmt(form.meta)}</span>
              </div>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.btnCancel} onClick={onClose}>Cancelar</button>
          <button className={styles.btnSave} onClick={handleSave} disabled={saving || uploading}>
            {uploading ? 'Subiendo imagen…' : saving ? 'Guardando…' : isNew ? 'Crear campaña' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────
export default function CampaignsPage() {
  const [camps, setCamps]       = useState<Campania[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState<'new' | Campania | null>(null);

  const load = () => {
    setLoading(true);
    campaniasApi.list().then(setCamps).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (c: Campania) => {
    if (!confirm(`¿Eliminar la campaña "${c.nombre}"? Esta acción no se puede deshacer.`)) return;
    // El backend no tiene DELETE de campañas — la marcamos como cerrada
    await campaniasApi.update(c.id, { ...c, estado: 'cerrada' });
    load();
  };

  const handleCycleStatus = async (c: Campania) => {
    const next: Estado = c.estado === 'activa' ? 'pausada'
      : c.estado === 'pausada' ? 'cerrada'
      : 'activa';
    await campaniasApi.update(c.id, { ...c, estado: next });
    load();
  };

  // Stats
  const total      = camps.length;
  const activas    = camps.filter(c => c.estado === 'activa').length;
  const totalMeta  = camps.reduce((s, c) => s + Number(c.meta), 0);
  const totalRec   = camps.reduce((s, c) => s + Number(c.recaudado), 0);

  const statusClass = (e: string) =>
    e === 'activa' ? styles.statusActiva
    : e === 'cerrada' ? styles.statusCerrada
    : styles.statusPausada;

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.pageTitle}>Campañas de donación</div>
          <p className={styles.pageDesc}>Gestiona las campañas que se muestran en el sitio y en la sección de donaciones.</p>
        </div>
        <button className={styles.newBtn} onClick={() => setModal('new')}>
          + Nueva campaña
        </button>
      </div>

      {/* Summary */}
      <div className={styles.summary}>
        <div className={styles.sumCard}>
          <div className={styles.sumValue}>{total}</div>
          <div className={styles.sumLabel}>Total campañas</div>
        </div>
        <div className={styles.sumCard}>
          <div className={styles.sumValue} style={{ color: '#16a34a' }}>{activas}</div>
          <div className={styles.sumLabel}>Activas</div>
        </div>
        <div className={styles.sumCard}>
          <div className={styles.sumValue}>Bs {fmt(totalRec)}</div>
          <div className={styles.sumLabel}>Total recaudado</div>
        </div>
        <div className={styles.sumCard}>
          <div className={styles.sumValue}>Bs {fmt(totalMeta)}</div>
          <div className={styles.sumLabel}>Meta combinada</div>
        </div>
      </div>

      {/* Grid */}
      <div className={styles.grid}>
        {loading && <p className={styles.empty}>Cargando campañas…</p>}
        {!loading && camps.length === 0 && (
          <p className={styles.empty}>No hay campañas. Crea la primera con el botón de arriba.</p>
        )}

        {camps.map(c => {
          const p = pct(Number(c.recaudado), Number(c.meta));
          return (
            <div key={c.id} className={styles.card}>
              {c.imagen_url
                ? <img src={resolveImg(c.imagen_url)!} alt={c.nombre} className={styles.cardImg}
                    onError={e => { e.currentTarget.style.display = 'none'; }} />
                : <div className={styles.cardImgPlaceholder}>🔥</div>
              }

              <div className={styles.cardBody}>
                <div className={styles.cardTop}>
                  <div className={styles.cardName}>{c.nombre}</div>
                  <span className={`${styles.statusBadge} ${statusClass(c.estado)}`}>
                    {c.estado}
                  </span>
                </div>

                {c.descripcion && (
                  <p className={styles.cardDesc}>{c.descripcion.slice(0, 100)}{c.descripcion.length > 100 ? '…' : ''}</p>
                )}

                <div>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${p}%` }} />
                  </div>
                  <div className={styles.progressMeta} style={{ marginTop: '0.4rem' }}>
                    <span>Bs {fmt(c.recaudado)} recaudado</span>
                    <span className={styles.progressPct}>{p}%</span>
                    <span>Meta: Bs {fmt(c.meta)}</span>
                  </div>
                </div>

                <div className={styles.cardStats}>
                  <div className={styles.statItem}>
                    <span className={styles.statVal}>{fmt(c.recaudado)}</span>
                    <span className={styles.statLbl}>Recaudado Bs</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statVal}>{c.donantes}</span>
                    <span className={styles.statLbl}>Donantes</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statVal}>{fmt(c.meta)}</span>
                    <span className={styles.statLbl}>Meta Bs</span>
                  </div>
                </div>
              </div>

              <div className={styles.cardActions}>
                <button className={styles.btnEdit} onClick={() => setModal(c)}>
                  ✏️ Editar
                </button>
                <button
                  className={c.estado === 'activa' ? styles.btnStatus : styles.btnStatusActive}
                  onClick={() => handleCycleStatus(c)}
                  title={`Estado actual: ${c.estado}. Click para cambiar.`}
                >
                  {c.estado === 'activa' ? '⏸ Pausar' : c.estado === 'pausada' ? '⏹ Cerrar' : '▶ Activar'}
                </button>
                <button className={styles.btnDelete} onClick={() => handleDelete(c)}>
                  🗑 Cerrar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal crear / editar */}
      {modal !== null && (
        <CampaniaModal
          camp={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
