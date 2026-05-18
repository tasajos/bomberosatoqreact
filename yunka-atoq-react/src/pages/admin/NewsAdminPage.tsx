import { useState, useEffect, useRef } from 'react';
import styles from './NewsAdminPage.module.css';
import { noticiasApi, type Noticia, API_BASE } from '../../services/api';

const CATS = ['General','Operativo','Forestal','Comunidad','Institucional','Capacitación','Simulacro','Rescate'];

function resolveImg(url: string | null) {
  if (!url) return null;
  return url.startsWith('/uploads/') ? `${API_BASE}${url}` : url;
}

function fmtDate(s: string) {
  return new Intl.DateTimeFormat('es-BO', { day:'numeric', month:'short', year:'numeric' }).format(new Date(s));
}

const EMPTY: Omit<Noticia,'id'|'created_at'|'autor'> = {
  titulo:'', resumen:'', contenido:'', imagen_url: null,
  fecha: new Date().toISOString().slice(0,10),
  publicado: 0, tipo:'propia',
  fuente_nombre:'', fuente_url:'', categoria:'General',
};

// ── Modal ──────────────────────────────────────────────────────────
interface ModalProps { noticia: Noticia|null; onClose:()=>void; onSaved:()=>void; }

function NewsModal({ noticia, onClose, onSaved }: ModalProps) {
  const isNew = !noticia;
  const [form, setForm] = useState<Omit<Noticia,'id'|'created_at'|'autor'>>(
    noticia
      ? { titulo:noticia.titulo, resumen:noticia.resumen, contenido:noticia.contenido,
          imagen_url:noticia.imagen_url, fecha:noticia.fecha?.slice(0,10)||'',
          publicado:noticia.publicado, tipo:noticia.tipo,
          fuente_nombre:noticia.fuente_nombre||'', fuente_url:noticia.fuente_url||'',
          categoria:noticia.categoria||'General' }
      : { ...EMPTY }
  );
  const [imgFile, setImgFile]     = useState<File|null>(null);
  const [imgPreview, setImgPreview] = useState(noticia ? resolveImg(noticia.imagen_url)||'' : '');
  const [saving, setSaving]       = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr]             = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof typeof form, v: unknown) => setForm(f=>({...f,[k]:v}));

  const handleFile = (f: File) => {
    setImgFile(f);
    const r = new FileReader();
    r.onload = e => setImgPreview(e.target?.result as string);
    r.readAsDataURL(f);
    set('imagen_url', null);
  };

  const handleSave = async () => {
    if (!form.titulo.trim()) { setErr('El título es requerido.'); return; }
    if (form.tipo === 'externa' && !form.fuente_url.trim()) { setErr('La URL de la fuente es requerida.'); return; }
    setSaving(true); setErr('');
    let finalForm = { ...form };

    if (imgFile) {
      setUploading(true);
      try {
        const { url } = await noticiasApi.uploadImage(imgFile);
        finalForm.imagen_url = url;
      } catch { setErr('Error al subir imagen'); setSaving(false); setUploading(false); return; }
      setUploading(false);
    }

    try {
      if (isNew) await noticiasApi.create(finalForm);
      else       await noticiasApi.update(noticia!.id, finalForm);
      onSaved(); onClose();
    } catch (e:unknown) { setErr(e instanceof Error ? e.message : 'Error al guardar'); }
    finally { setSaving(false); }
  };

  useEffect(() => {
    const h = (e:KeyboardEvent) => { if(e.key==='Escape') onClose(); };
    window.addEventListener('keydown',h);
    document.body.style.overflow='hidden';
    return () => { window.removeEventListener('keydown',h); document.body.style.overflow=''; };
  }, [onClose]);

  const displayImg = imgPreview || resolveImg(form.imagen_url) || '';

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e=>e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>{isNew ? '+ Nueva noticia' : `Editar · ${noticia!.titulo.slice(0,40)}…`}</span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          {err && <div className={styles.errMsg}>{err}</div>}

          {/* Tipo */}
          <div className={styles.field}>
            <label className={styles.label}>Tipo de noticia</label>
            <div className={styles.tipoRow}>
              <button type="button"
                className={`${styles.tipoBtn} ${form.tipo==='propia'?styles.tipoBtnActive:''}`}
                onClick={()=>set('tipo','propia')}>
                ✏️ Noticia propia
              </button>
              <button type="button"
                className={`${styles.tipoBtn} ${form.tipo==='externa'?styles.tipoFbActive:''}`}
                onClick={()=>set('tipo','externa')}>
                🔗 Fuente externa
              </button>
            </div>
          </div>

          {/* Fuente externa */}
          {form.tipo === 'externa' && (
            <div className={styles.formGrid2}>
              <div className={styles.field}>
                <label className={styles.label}>Nombre de la fuente *</label>
                <input className={styles.input} placeholder="Ej. Los Tiempos, ABI, etc."
                  value={form.fuente_nombre} onChange={e=>set('fuente_nombre',e.target.value)} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>URL de la noticia original *</label>
                <input className={styles.input} placeholder="https://…"
                  value={form.fuente_url} onChange={e=>set('fuente_url',e.target.value)} />
              </div>
            </div>
          )}

          {/* Título y fecha */}
          <div className={styles.field}>
            <label className={styles.label}>Título *</label>
            <input className={styles.input} placeholder="Título de la noticia"
              value={form.titulo} onChange={e=>set('titulo',e.target.value)} />
          </div>

          <div className={styles.formGrid2}>
            <div className={styles.field}>
              <label className={styles.label}>Fecha</label>
              <input className={styles.input} type="date"
                value={form.fecha} onChange={e=>set('fecha',e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Categoría</label>
              <select className={styles.select} value={form.categoria} onChange={e=>set('categoria',e.target.value)}>
                {CATS.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Imagen */}
          <div className={styles.imgSection}>
            <label className={styles.label}>Imagen (opcional)</label>
            {displayImg && (
              <img src={displayImg} alt="preview" className={styles.imgPreview}
                onError={e=>(e.currentTarget.style.display='none')} />
            )}
            <label className={styles.uploadZone}>
              <span className={styles.uploadIcon}>🖼️</span>
              <span className={styles.uploadText}>{imgFile ? imgFile.name : 'Subir imagen desde el equipo'}</span>
              <span className={styles.uploadSub}>JPG, PNG, WEBP · Máx 10 MB</span>
              <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}}
                onChange={e=>{ if(e.target.files?.[0]) handleFile(e.target.files[0]); }} />
            </label>
            <div className={styles.orRow}>
              <span className={styles.orLine}/><span className={styles.orText}>o URL de imagen</span><span className={styles.orLine}/>
            </div>
            <input className={styles.input} placeholder="https://… o /uploads/noticias/…"
              value={!imgFile ? (form.imagen_url??'') : ''}
              onChange={e=>{ set('imagen_url', e.target.value||null); setImgFile(null); setImgPreview(''); }} />
          </div>

          {/* Resumen */}
          <div className={styles.field}>
            <label className={styles.label}>Resumen / Extracto</label>
            <textarea className={styles.textarea} placeholder="Breve descripción para la vista previa…"
              value={form.resumen} onChange={e=>set('resumen',e.target.value)} />
          </div>

          {/* Contenido (solo noticias propias) */}
          {form.tipo === 'propia' && (
            <div className={styles.field}>
              <label className={styles.label}>Contenido completo</label>
              <textarea className={styles.textarea} style={{minHeight:'160px'}}
                placeholder="Texto completo de la noticia…"
                value={form.contenido} onChange={e=>set('contenido',e.target.value)} />
            </div>
          )}

          {/* Publicar toggle */}
          <div className={styles.publishRow}>
            <div>
              <div className={styles.publishLabel}>Publicar noticia</div>
              <div className={styles.publishSub}>{form.publicado ? 'Visible para todos en el sitio.' : 'Borrador — solo visible en el admin.'}</div>
            </div>
            <button type="button"
              className={`${styles.toggle} ${form.publicado ? styles.on : ''}`}
              onClick={()=>set('publicado', form.publicado ? 0 : 1)}>
              <span className={styles.toggleKnob} />
            </button>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.btnCancel} onClick={onClose}>Cancelar</button>
          <button className={styles.btnSave} onClick={handleSave} disabled={saving||uploading}>
            {uploading?'Subiendo imagen…':saving?'Guardando…':isNew?'Publicar noticia':'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────
export default function NewsAdminPage() {
  const [news,    setNews]    = useState<Noticia[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState<'new'|Noticia|null>(null);
  const [tab,     setTab]     = useState<'todas'|'propias'|'externas'>('todas');

  const load = () => {
    setLoading(true);
    noticiasApi.list(1, 100, true).then(r => setNews(r.data)).catch(()=>{}).finally(()=>setLoading(false));
  };
  useEffect(()=>{ load(); },[]);

  const handleTogglePublish = async (n: Noticia) => {
    await noticiasApi.togglePublish(n.id, !n.publicado);
    load();
  };
  const handleDelete = async (n: Noticia) => {
    if(!confirm(`¿Eliminar "${n.titulo}"?`)) return;
    await noticiasApi.delete(n.id);
    load();
  };

  const visible = news.filter(n =>
    tab === 'todas' ? true :
    tab === 'propias' ? n.tipo === 'propia' :
    n.tipo === 'externa'
  );

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.pageTitle}>Noticias</div>
          <p className={styles.pageDesc}>Gestiona noticias propias y de fuentes externas. Comparte en Facebook directamente.</p>
        </div>
        <button className={styles.newBtn} onClick={()=>setModal('new')}>+ Nueva noticia</button>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {([['todas','Todas'], ['propias','Propias'], ['externas','Externas 🔗']] as const).map(([val, label]) => (
          <button key={val} className={`${styles.tabBtn} ${tab===val?styles.tabBtnActive:''}`}
            onClick={()=>setTab(val)}>{label}</button>
        ))}
        <span style={{ marginLeft:'auto', fontFamily:'var(--font-condensed)', fontSize:'.72rem', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'var(--color-gray)', alignSelf:'center' }}>
          {visible.length} noticias · {news.filter(n=>n.publicado).length} publicadas
        </span>
      </div>

      {/* Lista */}
      <div className={styles.list}>
        {loading && <p className={styles.empty}>Cargando…</p>}
        {!loading && visible.length === 0 && <p className={styles.empty}>No hay noticias en esta sección.</p>}

        {visible.map(n => {
          const img = resolveImg(n.imagen_url);
          const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(n.tipo==='externa' ? n.fuente_url : window.location.origin + '/noticias')}`;

          return (
            <div key={n.id} className={styles.row}>
              {img
                ? <img src={img} alt={n.titulo} className={styles.rowImg} onError={e=>(e.currentTarget.style.display='none')} />
                : <div className={styles.rowImgPlaceholder}>{n.tipo==='externa'?'🔗':'📰'}</div>
              }

              <div className={styles.rowBody}>
                <div className={styles.rowTop}>
                  <span className={`${styles.badge} ${n.tipo==='externa'?styles.badgeExterna:styles.badgePropia}`}>
                    {n.tipo==='externa'?'🔗 Externa':'✏️ Propia'}
                  </span>
                  <span className={`${styles.badge} ${n.publicado?styles.badgePublished:styles.badgeDraft}`}>
                    {n.publicado?'Publicada':'Borrador'}
                  </span>
                  {n.categoria && <span className={styles.badgeCat}>{n.categoria}</span>}
                  <span className={styles.rowDate}>{fmtDate(n.fecha)}</span>
                </div>
                <div className={styles.rowTitle}>{n.titulo}</div>
                {n.resumen && <p className={styles.rowResumen}>{n.resumen}</p>}
                {n.tipo==='externa' && n.fuente_nombre && (
                  <div className={styles.rowSource}>🔗 Fuente: {n.fuente_nombre}</div>
                )}
              </div>

              <div className={styles.rowActions}>
                <button className={styles.btnEdit} onClick={()=>setModal(n)}>✏️ Editar</button>
                <button
                  className={n.publicado ? styles.btnUnpublish : styles.btnPublish}
                  onClick={()=>handleTogglePublish(n)}>
                  {n.publicado ? '⏸ Ocultar' : '▶ Publicar'}
                </button>
                {n.tipo === 'externa' && (
                  <a href={n.fuente_url} target="_blank" rel="noreferrer" className={styles.btnSource}>
                    🔗 Ver fuente
                  </a>
                )}
                <a href={shareUrl} target="_blank" rel="noreferrer" className={styles.btnShare}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
                  </svg>
                  Compartir
                </a>
                <button className={styles.btnDelete} onClick={()=>handleDelete(n)}>🗑</button>
              </div>
            </div>
          );
        })}
      </div>

      {modal !== null && (
        <NewsModal
          noticia={modal==='new' ? null : modal}
          onClose={()=>setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
