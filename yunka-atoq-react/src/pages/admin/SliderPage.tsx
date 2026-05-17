import { useState, useEffect, useRef, DragEvent } from 'react';
import { Link } from 'react-router-dom';
import styles from './SliderPage.module.css';
import FocalPointPicker from '../../components/admin/FocalPointPicker';
import SlideEditModal from '../../components/admin/SlideEditModal';
import { sliderApi, type SliderImage, API_BASE } from '../../services/api';

const TAGS = ['Operativo', 'Forestal', 'Rescate', 'Capacitación', 'Comunidad', 'Unidad', 'Cuartel', 'Otro'];

function resolveUrl(url: string) {
  return url.startsWith('/uploads/') ? `${API_BASE}${url}` : url;
}

export default function SliderPage() {
  const [slides, setSlides]     = useState<SliderImage[]>([]);
  const [loading, setLoading]   = useState(true);
  const [editSlide, setEditSlide] = useState<SliderImage | null>(null);

  // Upload state
  const [file, setFile]           = useState<File | null>(null);
  const [preview, setPreview]     = useState('');
  const [caption, setCaption]     = useState('');
  const [tag, setTag]             = useState('Operativo');
  const [position, setPosition]   = useState('50% 50%');
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [uploadErr, setUploadErr] = useState('');
  const [dragging, setDragging]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    sliderApi.list(true).then(setSlides).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleFile = (f: File) => {
    setFile(f);
    setPosition('50% 50%');
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
    setUploadMsg(''); setUploadErr('');
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const resetUpload = () => {
    setFile(null); setPreview(''); setCaption('');
    setTag('Operativo'); setPosition('50% 50%');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true); setUploadMsg(''); setUploadErr('');
    try {
      const fd = new FormData();
      fd.append('imagen', file);
      fd.append('caption', caption);
      fd.append('tag', tag);
      fd.append('position', position);
      await sliderApi.upload(fd);
      setUploadMsg('✅ Imagen subida. El slider se actualizó.');
      resetUpload();
      load();
    } catch (err: unknown) {
      setUploadErr(err instanceof Error ? err.message : 'Error al subir');
    } finally {
      setUploading(false);
    }
  };

  const handleToggle = async (s: SliderImage) => {
    await sliderApi.update(s.id, { ...s, activo: s.activo ? 0 : 1 });
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta imagen del slider?')) return;
    await sliderApi.delete(id);
    load();
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.pageTitle}>Gestión del Slider</div>
          <p className={styles.pageDesc}>Sube, posiciona y gestiona las imágenes del slider del inicio.</p>
        </div>
        <Link to="/" target="_blank" className="btn-primary" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
          Ver sitio →
        </Link>
      </div>

      {/* Upload */}
      <div className={styles.uploadCard}>
        <div className={styles.cardTitle}>Subir nueva imagen</div>
        <div className={styles.uploadBody}>

          {/* Drop zone — label evita doble apertura */}
          {!preview && (
            <label
              className={`${styles.dropZone} ${dragging ? styles.dropZoneActive : ''}`}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <span className={styles.dropZoneIcon}>🖼️</span>
              <span className={styles.dropZoneText}>Arrastra una imagen o haz clic aquí</span>
              <span className={styles.dropZoneSub}>JPG, PNG, WEBP · Máx. 8 MB</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className={styles.fileInput}
                onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
              />
            </label>
          )}

          {/* Focal point picker tras seleccionar imagen */}
          {preview && (
            <>
              <FocalPointPicker src={preview} value={position} onChange={setPosition} aspectRatio={16 / 9} />

              <div className={styles.formRow}>
                <div className={styles.field}>
                  <label className={styles.label}>Descripción / Caption</label>
                  <input className={styles.input} placeholder="Ej. Brigada forestal en el Tunari"
                    value={caption} onChange={e => setCaption(e.target.value)} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Categoría</label>
                  <select className={styles.select} value={tag} onChange={e => setTag(e.target.value)}>
                    {TAGS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {uploadMsg && <div className={styles.successMsg}>{uploadMsg}</div>}
              {uploadErr && <div className={styles.errorMsg}>{uploadErr}</div>}

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className={styles.uploadBtn} onClick={handleUpload} disabled={uploading}>
                  {uploading ? 'Subiendo…' : '↑ Subir al slider'}
                </button>
                <button className={`${styles.uploadBtn} ${styles.cancelBtn}`} onClick={resetUpload}>
                  Cancelar
                </button>
              </div>
            </>
          )}

          {!preview && uploadMsg && <div className={styles.successMsg}>{uploadMsg}</div>}
        </div>
      </div>

      {/* Grid de imágenes */}
      <div className={styles.currentCard}>
        <div className={styles.cardTitle}>
          Imágenes actuales — {slides.length} total · {slides.filter(s => s.activo).length} activas
        </div>

        {loading ? (
          <p className={styles.empty}>Cargando…</p>
        ) : slides.length === 0 ? (
          <p className={styles.empty}>No hay imágenes en el slider.</p>
        ) : (
          <div className={styles.slideGrid}>
            {slides.map(s => (
              <div key={s.id} className={styles.slideItem}>
                <div className={styles.slideThumb}>
                  <img
                    src={resolveUrl(s.url)}
                    alt={s.caption}
                    loading="lazy"
                    style={{ objectPosition: s.position || '50% 50%' }}
                  />
                  <span className={styles.ordenBadge}>#{s.orden}</span>
                  <span className={`${styles.activeBadge} ${!s.activo ? styles.inactiveBadge : ''}`} />
                </div>

                <div className={styles.slideInfo}>
                  <div className={styles.slideCaption}>{s.caption || '(sin descripción)'}</div>
                  <div className={styles.slideTag}>{s.tag} · {s.activo ? '✓ Activa' : '✗ Inactiva'}</div>

                  <div className={styles.slideActions}>
                    <button
                      className={`${styles.btnToggle} ${!s.activo ? styles.inactive : ''}`}
                      onClick={() => handleToggle(s)}
                    >
                      {s.activo ? 'Desactivar' : 'Activar'}
                    </button>
                    <button className={styles.btnEdit} onClick={() => setEditSlide(s)}>
                      Editar
                    </button>
                    <button className={styles.btnDelete} onClick={() => handleDelete(s.id)}>
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de edición */}
      {editSlide && (
        <SlideEditModal
          slide={editSlide}
          onClose={() => setEditSlide(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
