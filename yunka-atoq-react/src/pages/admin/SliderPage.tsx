import { useState, useEffect, useRef, DragEvent } from 'react';
import { Link } from 'react-router-dom';
import styles from './SliderPage.module.css';
import { sliderApi, type SliderImage, API_BASE } from '../../services/api';

const TAGS = ['Operativo', 'Forestal', 'Rescate', 'Capacitación', 'Comunidad', 'Unidad', 'Cuartel', 'Otro'];

// 9 posiciones focales
const POSITIONS = [
  { label: '↖', value: 'top left'     },
  { label: '↑', value: 'top center'   },
  { label: '↗', value: 'top right'    },
  { label: '←', value: 'center left'  },
  { label: '⊕', value: 'center center'},
  { label: '→', value: 'center right' },
  { label: '↙', value: 'bottom left'  },
  { label: '↓', value: 'bottom center'},
  { label: '↘', value: 'bottom right' },
];

function resolveUrl(url: string) {
  return url.startsWith('/uploads/') ? `${API_BASE}${url}` : url;
}

// Selector de posición 3x3
function PositionPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className={styles.posGrid}>
      {POSITIONS.map(p => (
        <button
          key={p.value}
          type="button"
          className={`${styles.posBtn} ${value === p.value ? styles.posBtnActive : ''}`}
          onClick={() => onChange(p.value)}
          title={p.value}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

export default function SliderPage() {
  const [slides, setSlides]   = useState<SliderImage[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload state
  const [file, setFile]         = useState<File | null>(null);
  const [preview, setPreview]   = useState('');
  const [caption, setCaption]   = useState('');
  const [tag, setTag]           = useState('Operativo');
  const [position, setPosition] = useState('center center');
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [uploadErr, setUploadErr] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Edit inline state
  const [editing, setEditing]       = useState<number | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [editTag, setEditTag]         = useState('');
  const [editPosition, setEditPosition] = useState('center center');
  const [editOrden, setEditOrden]     = useState(0);

  const load = () => {
    setLoading(true);
    sliderApi.list(true).then(setSlides).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleFile = (f: File) => {
    setFile(f);
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
      setFile(null); setPreview(''); setCaption('');
      setTag('Operativo'); setPosition('center center');
      if (fileRef.current) fileRef.current.value = '';
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

  const startEdit = (s: SliderImage) => {
    setEditing(s.id);
    setEditCaption(s.caption);
    setEditTag(s.tag);
    setEditPosition(s.position || 'center center');
    setEditOrden(s.orden);
  };

  const saveEdit = async (s: SliderImage) => {
    await sliderApi.update(s.id, {
      caption: editCaption, tag: editTag,
      position: editPosition, activo: s.activo, orden: editOrden,
    });
    setEditing(null);
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

          {/* Drop zone — el input cubre el área, el onClick está solo en el label visual */}
          {!preview ? (
            <label
              className={`${styles.dropZone} ${dragging ? styles.dropZoneActive : ''}`}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <span className={styles.dropZoneIcon}>🖼️</span>
              <span className={styles.dropZoneText}>Arrastra una imagen o haz clic para seleccionar</span>
              <span className={styles.dropZoneSub}>JPG, PNG, WEBP · Máx. 8 MB</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className={styles.fileInput}
                onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
              />
            </label>
          ) : (
            /* Preview con posición focal aplicada en tiempo real */
            <div className={styles.previewWrap}>
              <img
                src={preview}
                alt="Preview"
                className={styles.previewImg}
                style={{ objectPosition: position }}
              />
              <span className={styles.previewLabel}>Vista previa · {position}</span>
              <button
                className={styles.changeImgBtn}
                onClick={() => { setFile(null); setPreview(''); if (fileRef.current) fileRef.current.value = ''; }}
              >
                Cambiar imagen
              </button>
            </div>
          )}

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

          {/* Posición focal */}
          {preview && (
            <div className={styles.field}>
              <label className={styles.label}>Posición focal (punto de interés de la imagen)</label>
              <div className={styles.posRow}>
                <PositionPicker value={position} onChange={setPosition} />
                <div className={styles.posMiniPreview}>
                  <img src={preview} alt="" style={{ objectPosition: position }} />
                  <span className={styles.posMiniLabel}>Resultado en slider</span>
                </div>
              </div>
            </div>
          )}

          {uploadMsg && <div className={styles.successMsg}>{uploadMsg}</div>}
          {uploadErr && <div className={styles.errorMsg}>{uploadErr}</div>}

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className={styles.uploadBtn} onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? 'Subiendo…' : '↑ Subir al slider'}
            </button>
            {file && (
              <button className={`${styles.uploadBtn} ${styles.cancelBtn}`}
                onClick={() => { setFile(null); setPreview(''); if (fileRef.current) fileRef.current.value = ''; }}>
                Cancelar
              </button>
            )}
          </div>
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
                    style={{ objectPosition: s.position || 'center center' }}
                  />
                  <span className={styles.ordenBadge}>#{s.orden}</span>
                  <span className={`${styles.activeBadge} ${!s.activo ? styles.inactiveBadge : ''}`} />
                </div>

                <div className={styles.slideInfo}>
                  <div className={styles.slideCaption}>{s.caption || '(sin descripción)'}</div>
                  <div className={styles.slideTag}>{s.tag} · {s.position} · {s.activo ? '✓ Activa' : '✗ Inactiva'}</div>
                  <div className={styles.slideActions}>
                    <button className={`${styles.btnToggle} ${!s.activo ? styles.inactive : ''}`} onClick={() => handleToggle(s)}>
                      {s.activo ? 'Desactivar' : 'Activar'}
                    </button>
                    <button className={styles.btnEdit} onClick={() => editing === s.id ? setEditing(null) : startEdit(s)}>
                      {editing === s.id ? 'Cerrar' : 'Editar'}
                    </button>
                    <button className={styles.btnDelete} onClick={() => handleDelete(s.id)}>
                      Eliminar
                    </button>
                  </div>
                </div>

                {editing === s.id && (
                  <div className={styles.editInline}>
                    <input className={styles.input} placeholder="Descripción"
                      value={editCaption} onChange={e => setEditCaption(e.target.value)} />
                    <div className={styles.editRow}>
                      <select className={styles.select} value={editTag} onChange={e => setEditTag(e.target.value)}>
                        {TAGS.map(t => <option key={t}>{t}</option>)}
                      </select>
                      <input className={styles.input} type="number" placeholder="Orden" min="1"
                        value={editOrden} onChange={e => setEditOrden(Number(e.target.value))} />
                    </div>
                    <div>
                      <span className={styles.label} style={{ display: 'block', marginBottom: '0.4rem' }}>Posición focal</span>
                      <PositionPicker value={editPosition} onChange={setEditPosition} />
                    </div>
                    <button className={styles.saveBtn} onClick={() => saveEdit(s)}>Guardar cambios</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
