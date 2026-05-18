import { useState, useEffect, useRef } from 'react';
import styles from './GalleryAdminPage.module.css';
import { galeriaApi, type GaleriaItem, API_BASE } from '../../services/api';

const CATS = ['General','Estructurales','Forestales','Rescate','Comunidad','Capacitacion','Simulacro','Rescate Animal','Entrenamiento'];

function resolveUrl(src: string) {
  return src.startsWith('/uploads/') ? `${API_BASE}${src}` : src;
}

// ── Modal añadir / editar ─────────────────────────────────────────
interface ModalProps { item: GaleriaItem|null; onClose:()=>void; onSaved:()=>void; }

function GalModal({ item, onClose, onSaved }: ModalProps) {
  const isNew = !item;
  const [tab, setTab]       = useState<'upload'|'url'>(item?.source_type === 'upload' ? 'upload' : 'url');
  const [url, setUrl]       = useState(isNew ? '' : (item?.source_type === 'url' ? item.src : ''));
  const [file, setFile]     = useState<File|null>(null);
  const [preview, setPreview] = useState(isNew ? '' : resolveUrl(item!.src));
  const [label, setLabel]   = useState(item?.label ?? '');
  const [cat, setCat]       = useState(item?.category ?? 'General');
  const [activo, setActivo] = useState(item?.activo ?? 1);
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    const r = new FileReader();
    r.onload = e => setPreview(e.target?.result as string);
    r.readAsDataURL(f);
    setErr('');
  };

  const handleUrlChange = (v: string) => {
    setUrl(v);
    setPreview(v);
  };

  useEffect(() => {
    const h = (e:KeyboardEvent) => { if(e.key==='Escape') onClose(); };
    window.addEventListener('keydown',h);
    document.body.style.overflow='hidden';
    return () => { window.removeEventListener('keydown',h); document.body.style.overflow=''; };
  }, [onClose]);

  const handleSave = async () => {
    if (isNew) {
      // Crear nueva
      if (tab === 'url') {
        if (!url.trim()) { setErr('Ingresa una URL válida.'); return; }
        setSaving(true);
        try {
          await galeriaApi.create({ src: url.trim(), label, category: cat });
          onSaved(); onClose();
        } catch (e:unknown) { setErr(e instanceof Error ? e.message : 'Error'); }
        finally { setSaving(false); }
      } else {
        if (!file) { setErr('Selecciona una imagen.'); return; }
        setSaving(true);
        try {
          await galeriaApi.upload(file, label, cat);
          onSaved(); onClose();
        } catch (e:unknown) { setErr(e instanceof Error ? e.message : 'Error al subir'); }
        finally { setSaving(false); }
      }
    } else {
      // Editar existente
      setSaving(true);
      try {
        await galeriaApi.update(item!.id, { label, category: cat, activo, orden: item!.orden });
        onSaved(); onClose();
      } catch (e:unknown) { setErr(e instanceof Error ? e.message : 'Error'); }
      finally { setSaving(false); }
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e=>e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>{isNew ? '+ Nueva imagen' : `Editar · ${item!.label || 'imagen'}`}</span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          {err && <div className={styles.errMsg}>{err}</div>}

          {/* Preview */}
          {preview && (
            <img src={preview} alt="preview" className={styles.imgPreview}
              onError={e=>(e.currentTarget.style.display='none')} />
          )}

          {/* Tabs solo en modo crear */}
          {isNew && (
            <>
              <div className={styles.tabs}>
                <button className={`${styles.tabBtn} ${tab==='upload'?styles.tabBtnActive:''}`}
                  onClick={()=>setTab('upload')}>📁 Subir archivo</button>
                <button className={`${styles.tabBtn} ${tab==='url'?styles.tabBtnActive:''}`}
                  onClick={()=>setTab('url')}>🔗 URL / Facebook</button>
              </div>

              {tab === 'upload' ? (
                <label className={styles.uploadZone}>
                  <span className={styles.uploadIcon}>🖼️</span>
                  <span className={styles.uploadText}>{file ? file.name : 'Haz clic para seleccionar imagen'}</span>
                  <span className={styles.uploadSub}>JPG, PNG, WEBP, GIF · Máx 12 MB</span>
                  <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}}
                    onChange={e=>{ if(e.target.files?.[0]) handleFile(e.target.files[0]); }} />
                </label>
              ) : (
                <div className={styles.field}>
                  <label className={styles.label}>URL de la imagen</label>
                  <input className={styles.input}
                    placeholder="https://facebook.com/… o https://instagram.com/… o URL directa"
                    value={url} onChange={e=>handleUrlChange(e.target.value)} />
                </div>
              )}
            </>
          )}

          <div className={styles.formGrid2}>
            <div className={styles.field}>
              <label className={styles.label}>Descripción</label>
              <input className={styles.input} placeholder="Ej. Incendio forestal Tunari"
                value={label} onChange={e=>setLabel(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Categoría</label>
              <select className={styles.select} value={cat} onChange={e=>setCat(e.target.value)}>
                {CATS.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {!isNew && (
            <div className={styles.field}>
              <label className={styles.label}>Estado</label>
              <select className={styles.select} value={activo}
                onChange={e=>setActivo(Number(e.target.value))}>
                <option value={1}>Activa — visible en el sitio</option>
                <option value={0}>Inactiva — oculta</option>
              </select>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.btnCancel} onClick={onClose}>Cancelar</button>
          <button className={styles.btnSave} onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : isNew ? 'Agregar imagen' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────
export default function GalleryAdminPage() {
  const [photos, setPhotos]   = useState<GaleriaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState<'new'|GaleriaItem|null>(null);
  const [filterCat, setFilterCat] = useState('Todos');

  const load = () => {
    setLoading(true);
    galeriaApi.list(true).then(setPhotos).catch(()=>{}).finally(()=>setLoading(false));
  };
  useEffect(()=>{ load(); },[]);

  const handleToggle = async (p: GaleriaItem) => {
    await galeriaApi.update(p.id, { activo: p.activo ? 0 : 1, label:p.label, category:p.category, orden:p.orden });
    load();
  };
  const handleDelete = async (p: GaleriaItem) => {
    if(!confirm(`¿Eliminar "${p.label || 'imagen'}"?`)) return;
    await galeriaApi.delete(p.id);
    load();
  };

  const cats = ['Todos', ...Array.from(new Set(photos.map(p=>p.category)))];
  const visible = filterCat === 'Todos' ? photos : photos.filter(p=>p.category===filterCat);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.pageTitle}>Galería</div>
          <p className={styles.pageDesc}>Sube imágenes o añade URLs (Facebook, Instagram, etc.) para la galería pública.</p>
        </div>
        <button className={styles.newBtn} onClick={()=>setModal('new')}>+ Nueva imagen</button>
      </div>

      <div className={styles.bar}>
        {cats.map(c=>(
          <button key={c} className={`${styles.filterBtn} ${filterCat===c?styles.filterBtnActive:''}`}
            onClick={()=>setFilterCat(c)}>{c}</button>
        ))}
        <span className={styles.barCount}>{visible.length} imágenes · {photos.filter(p=>p.activo).length} activas</span>
      </div>

      <div className={styles.grid}>
        {loading && <p className={styles.empty}>Cargando galería…</p>}
        {!loading && visible.length===0 && <p className={styles.empty}>No hay imágenes en esta categoría.</p>}

        {visible.map(p=>(
          <div key={p.id} className={styles.card}>
            <div className={styles.imgWrap}>
              <img src={resolveUrl(p.src)} alt={p.label} loading="lazy"
                onError={e=>{(e.target as HTMLImageElement).src='/yunka_atoq_log.png';}} />
              <span className={`${styles.srcBadge} ${p.source_type==='upload'?styles.badgeUpload:styles.badgeUrl}`}>
                {p.source_type==='upload'?'Subida':'URL'}
              </span>
              <span className={`${styles.activeDot} ${!p.activo?styles.inactiveDot:''}`} />
            </div>
            <div className={styles.cardBody}>
              <div className={styles.cardLabel}>{p.label || '(sin descripción)'}</div>
              <div className={styles.cardCat}>{p.category}</div>
            </div>
            <div className={styles.cardActions}>
              <button className={styles.btnEdit} onClick={()=>setModal(p)}>✏️ Editar</button>
              <button className={`${styles.btnToggle} ${!p.activo?styles.btnToggleOff:''}`}
                onClick={()=>handleToggle(p)}>
                {p.activo?'👁 Ocultar':'👁 Mostrar'}
              </button>
              <button className={styles.btnDelete} onClick={()=>handleDelete(p)}>🗑</button>
            </div>
          </div>
        ))}
      </div>

      {modal!==null && (
        <GalModal
          item={modal==='new' ? null : modal}
          onClose={()=>setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
