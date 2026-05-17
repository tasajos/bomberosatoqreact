import { useState, useEffect, useRef } from 'react';
import styles from './RecognitionsAdminPage.module.css';
import { reconocimientosApi, type Reconocimiento, API_BASE } from '../../services/api';

const ICONOS = ['🏛️','🏘️','🎖️','🏅','📜','🌟','🤝','🦺','🚒'];

function resolveImg(url: string | null) {
  if (!url) return null;
  return url.startsWith('/uploads/') ? `${API_BASE}${url}` : url;
}

const EMPTY: Omit<Reconocimiento,'id'|'created_at'> = {
  badge:'', fecha:'', institucion:'', titulo:'',
  descripcion:'', texto_completo:'', firmante:'',
  icono:'🏅', img_url: null, activo: 1, orden: 99,
};

// ── Modal ──────────────────────────────────────────────────────────────
interface ModalProps { rec: Reconocimiento | null; onClose:()=>void; onSaved:()=>void; }

function RecModal({ rec, onClose, onSaved }: ModalProps) {
  const isNew = !rec;
  const [form, setForm] = useState<Omit<Reconocimiento,'id'|'created_at'>>(
    rec ? { badge:rec.badge, fecha:rec.fecha, institucion:rec.institucion,
            titulo:rec.titulo, descripcion:rec.descripcion, texto_completo:rec.texto_completo,
            firmante:rec.firmante, icono:rec.icono, img_url:rec.img_url,
            activo:rec.activo, orden:rec.orden }
        : { ...EMPTY }
  );
  const [imgFile, setImgFile]     = useState<File|null>(null);
  const [imgPreview, setImgPreview] = useState('');
  const [saving, setSaving]       = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr]             = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof typeof form, v: string|number|null) => setForm(f=>({...f,[k]:v}));

  const handleFile = (f: File) => {
    setImgFile(f);
    const r = new FileReader();
    r.onload = e => setImgPreview(e.target?.result as string);
    r.readAsDataURL(f);
    set('img_url', null);
  };

  const handleSave = async () => {
    if (!form.badge.trim() || !form.titulo.trim() || !form.institucion.trim()) {
      setErr('Badge, título e institución son requeridos.'); return;
    }
    setSaving(true); setErr('');
    let finalForm = { ...form };
    // Subir imagen si hay archivo pendiente
    if (imgFile) {
      setUploading(true);
      try {
        const { url } = await reconocimientosApi.uploadImage(imgFile);
        finalForm.img_url = url;
      } catch { setErr('Error al subir la imagen'); setSaving(false); setUploading(false); return; }
      setUploading(false);
    }
    try {
      if (isNew) await reconocimientosApi.create(finalForm);
      else       await reconocimientosApi.update(rec!.id, finalForm);
      onSaved(); onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error al guardar');
    } finally { setSaving(false); }
  };

  useEffect(() => {
    const h = (e:KeyboardEvent) => { if(e.key==='Escape') onClose(); };
    window.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [onClose]);

  const displayImg = imgPreview || resolveImg(form.img_url) || '';

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e=>e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>
            {isNew ? '+ Nuevo reconocimiento' : `Editar · ${rec!.titulo}`}
          </span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          {err && <div className={styles.errMsg}>{err}</div>}

          {/* Imagen */}
          <div className={styles.imgSection}>
            {displayImg && (
              <img src={displayImg} alt="preview" className={styles.imgPreview}
                onError={e=>(e.currentTarget.style.display='none')} />
            )}
            <label className={styles.uploadZone}>
              <span className={styles.uploadIcon}>📄</span>
              <span className={styles.uploadText}>
                {imgFile ? imgFile.name : 'Subir imagen o PDF del certificado'}
              </span>
              <span className={styles.uploadSub}>JPG, PNG, WEBP, PDF · Máx 10 MB</span>
              <input ref={fileRef} type="file" accept="image/*,.pdf" style={{display:'none'}}
                onChange={e=>{ if(e.target.files?.[0]) handleFile(e.target.files[0]); }} />
            </label>
            <div className={styles.orRow}>
              <span className={styles.orLine}/><span className={styles.orText}>o ingresa una URL</span><span className={styles.orLine}/>
            </div>
            <input className={styles.input} placeholder="https://… o /uploads/reconocimientos/…"
              value={!imgFile ? (form.img_url ?? '') : ''}
              onChange={e=>{ set('img_url', e.target.value||null); setImgFile(null); setImgPreview(''); }} />
          </div>

          {/* Campos principales */}
          <div className={styles.formGrid3}>
            <div className={styles.field}>
              <label className={styles.label}>Badge / Tipo *</label>
              <input className={styles.input} placeholder="Gubernamental"
                value={form.badge} onChange={e=>set('badge',e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Fecha</label>
              <input className={styles.input} placeholder="Octubre 2025"
                value={form.fecha} onChange={e=>set('fecha',e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Icono</label>
              <select className={styles.select} value={form.icono} onChange={e=>set('icono',e.target.value)}>
                {ICONOS.map(i=><option key={i} value={i}>{i}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Institución *</label>
            <input className={styles.input}
              placeholder="Gobierno Autónomo Departamental de Cochabamba"
              value={form.institucion} onChange={e=>set('institucion',e.target.value)} />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Título del reconocimiento *</label>
            <input className={styles.input}
              placeholder="Certificado de Reconocimiento"
              value={form.titulo} onChange={e=>set('titulo',e.target.value)} />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Descripción corta (para la card)</label>
            <textarea className={styles.textarea}
              placeholder="Breve descripción que aparece en la card del sitio…"
              value={form.descripcion} onChange={e=>set('descripcion',e.target.value)} />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Texto completo (aparece en el modal del sitio)</label>
            <textarea className={styles.textarea} style={{minHeight:'120px'}}
              placeholder="Texto completo del reconocimiento tal como aparece en el documento oficial…"
              value={form.texto_completo} onChange={e=>set('texto_completo',e.target.value)} />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Firmante</label>
            <input className={styles.input}
              placeholder="Nombre · Cargo"
              value={form.firmante} onChange={e=>set('firmante',e.target.value)} />
          </div>

          <div className={styles.formGrid2}>
            <div className={styles.field}>
              <label className={styles.label}>Orden de aparición</label>
              <input className={styles.input} type="number" min="1"
                value={form.orden} onChange={e=>set('orden',Number(e.target.value))} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Estado</label>
              <select className={styles.select} value={form.activo}
                onChange={e=>set('activo',Number(e.target.value))}>
                <option value={1}>Activo — visible en el sitio</option>
                <option value={0}>Inactivo — oculto</option>
              </select>
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.btnCancel} onClick={onClose}>Cancelar</button>
          <button className={styles.btnSave} onClick={handleSave} disabled={saving||uploading}>
            {uploading ? 'Subiendo imagen…' : saving ? 'Guardando…' : isNew ? 'Crear reconocimiento' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────
export default function RecognitionsAdminPage() {
  const [list, setList]     = useState<Reconocimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState<'new' | Reconocimiento | null>(null);

  const load = () => {
    setLoading(true);
    reconocimientosApi.list(true).then(setList).catch(()=>{}).finally(()=>setLoading(false));
  };
  useEffect(()=>{ load(); },[]);

  const handleToggle = async (r: Reconocimiento) => {
    await reconocimientosApi.update(r.id, {...r, activo: r.activo ? 0 : 1});
    load();
  };

  const handleDelete = async (r: Reconocimiento) => {
    if (!confirm(`¿Eliminar "${r.titulo}"? Esta acción no se puede deshacer.`)) return;
    await reconocimientosApi.delete(r.id);
    load();
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.pageTitle}>Reconocimientos</div>
          <p className={styles.pageDesc}>Gestiona los certificados y cartas de reconocimiento que se muestran en el sitio.</p>
        </div>
        <button className={styles.newBtn} onClick={()=>setModal('new')}>
          + Nuevo reconocimiento
        </button>
      </div>

      <div className={styles.grid}>
        {loading && <p className={styles.empty}>Cargando…</p>}
        {!loading && list.length === 0 && (
          <p className={styles.empty}>No hay reconocimientos. Agrega el primero.</p>
        )}
        {list.map(r => {
          const img = resolveImg(r.img_url);
          return (
            <div key={r.id} className={styles.card}>
              {img
                ? <img src={img} alt={r.titulo} className={styles.cardImg}
                    onError={e=>(e.currentTarget.style.display='none')} />
                : <div className={styles.cardImgPlaceholder}>{r.icono}</div>
              }
              <div className={styles.cardBody}>
                <div className={styles.cardTop}>
                  <span className={styles.badge}>{r.badge}</span>
                  <span className={`${styles.activeDot} ${!r.activo ? styles.inactiveDot : ''}`}
                    title={r.activo ? 'Activo' : 'Inactivo'} />
                </div>
                <div className={styles.cardDate}>{r.fecha}</div>
                <div className={styles.cardInstitution}>{r.institucion}</div>
                <div className={styles.cardTitle}>{r.titulo}</div>
                <p className={styles.cardDesc}>{r.descripcion?.slice(0,100)}{(r.descripcion?.length||0) > 100 ? '…' : ''}</p>
              </div>
              <div className={styles.cardActions}>
                <button className={styles.btnEdit} onClick={()=>setModal(r)}>✏️ Editar</button>
                <button
                  className={r.activo ? styles.btnToggle : `${styles.btnToggle} ${styles.btnToggleOff}`}
                  onClick={()=>handleToggle(r)}>
                  {r.activo ? '👁 Ocultar' : '👁 Mostrar'}
                </button>
                <button className={styles.btnDelete} onClick={()=>handleDelete(r)}>🗑 Eliminar</button>
              </div>
            </div>
          );
        })}
      </div>

      {modal !== null && (
        <RecModal
          rec={modal === 'new' ? null : modal}
          onClose={()=>setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
