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
  publicado: 0, destacada: 0, tipo:'propia',
  fuente_nombre:'', fuente_url:'', categoria:'General',
};

// ── Modal ──────────────────────────────────────────────────────────
const MAX_DESTACADAS = 3;
const TITLE_REC   = 90;
const RESUMEN_REC = 220;

interface ModalProps {
  noticia: Noticia|null;
  destacadasOtras: number; // destacadas existentes sin contar esta noticia
  onClose:()=>void; onSaved:()=>void;
}

function Counter({ value, rec }: { value: string; rec: number }) {
  return <span className={`${styles.counter} ${value.length > rec ? styles.counterOver : ''}`}>{value.length}/{rec}</span>;
}

function NewsModal({ noticia, destacadasOtras, onClose, onSaved }: ModalProps) {
  const isNew = !noticia;
  const [form, setForm] = useState<Omit<Noticia,'id'|'created_at'|'autor'>>(
    noticia
      ? { titulo:noticia.titulo, resumen:noticia.resumen, contenido:noticia.contenido,
          imagen_url:noticia.imagen_url, fecha:noticia.fecha?.slice(0,10)||'',
          publicado:noticia.publicado, destacada:noticia.destacada, tipo:noticia.tipo,
          fuente_nombre:noticia.fuente_nombre||'', fuente_url:noticia.fuente_url||'',
          categoria:noticia.categoria||'General' }
      : { ...EMPTY }
  );
  const [imgFile, setImgFile]     = useState<File|null>(null);
  const [imgPreview, setImgPreview] = useState(noticia ? resolveImg(noticia.imagen_url)||'' : '');
  const [saving, setSaving]       = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver]   = useState(false);
  const [err, setErr]             = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof typeof form, v: unknown) => setForm(f=>({...f,[k]:v}));
  const destacadasLlenas = destacadasOtras >= MAX_DESTACADAS;

  const handleFile = (f: File) => {
    if (!f.type.startsWith('image/')) { setErr('El archivo debe ser una imagen.'); return; }
    setImgFile(f);
    const r = new FileReader();
    r.onload = e => setImgPreview(e.target?.result as string);
    r.readAsDataURL(f);
    set('imagen_url', null);
  };

  const clearImage = () => {
    setImgFile(null); setImgPreview(''); set('imagen_url', null);
    if (fileRef.current) fileRef.current.value = '';
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
          <div>
            <span className={styles.modalTitle}>{isNew ? 'Nueva noticia' : 'Editar noticia'}</span>
            {!isNew && <div className={styles.modalSub}>{noticia!.titulo}</div>}
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          {err && <div className={styles.errMsg}>{err}</div>}

          <div className={styles.modalGrid}>
            {/* ── Columna principal: contenido ── */}
            <div className={styles.mainCol}>
              <div className={styles.field}>
                <label className={styles.label}>Tipo de noticia</label>
                <div className={styles.tipoRow}>
                  <button type="button"
                    className={`${styles.tipoBtn} ${form.tipo==='propia'?styles.tipoBtnActive:''}`}
                    onClick={()=>set('tipo','propia')}>
                    ✏️ Noticia propia
                    <span className={styles.tipoHint}>Redactada por la compañía</span>
                  </button>
                  <button type="button"
                    className={`${styles.tipoBtn} ${form.tipo==='externa'?styles.tipoFbActive:''}`}
                    onClick={()=>set('tipo','externa')}>
                    🔗 Fuente externa
                    <span className={styles.tipoHint}>Enlace a un medio de prensa</span>
                  </button>
                </div>
              </div>

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

              <div className={styles.field}>
                <div className={styles.labelRow}>
                  <label className={styles.label}>Título *</label>
                  <Counter value={form.titulo} rec={TITLE_REC} />
                </div>
                <input className={`${styles.input} ${styles.inputTitle}`} placeholder="Título de la noticia"
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

              <div className={styles.field}>
                <div className={styles.labelRow}>
                  <label className={styles.label}>Resumen / Extracto</label>
                  <Counter value={form.resumen} rec={RESUMEN_REC} />
                </div>
                <textarea className={styles.textarea} placeholder="Breve descripción que se muestra en el slider y en el listado…"
                  value={form.resumen} onChange={e=>set('resumen',e.target.value)} />
              </div>

              {form.tipo === 'propia' && (
                <div className={styles.field}>
                  <label className={styles.label}>Contenido completo</label>
                  <textarea className={styles.textarea} style={{minHeight:'220px'}}
                    placeholder="Texto completo de la noticia. Usa saltos de línea para separar párrafos…"
                    value={form.contenido} onChange={e=>set('contenido',e.target.value)} />
                </div>
              )}
            </div>

            {/* ── Columna lateral: portada, visibilidad y vista previa ── */}
            <aside className={styles.sideCol}>
              <div className={styles.panel}>
                <div className={styles.panelTitle}>Imagen de portada</div>
                {displayImg ? (
                  <div className={styles.coverWrap}>
                    <img src={displayImg} alt="preview" className={styles.imgPreview}
                      onError={e=>(e.currentTarget.style.display='none')} />
                    <div className={styles.coverActions}>
                      <button type="button" className={styles.coverBtn} onClick={()=>fileRef.current?.click()}>Cambiar</button>
                      <button type="button" className={styles.coverBtn} onClick={clearImage}>Quitar</button>
                    </div>
                  </div>
                ) : (
                  <label
                    className={`${styles.uploadZone} ${dragOver ? styles.uploadZoneOver : ''}`}
                    onDragOver={e=>{ e.preventDefault(); setDragOver(true); }}
                    onDragLeave={()=>setDragOver(false)}
                    onDrop={e=>{ e.preventDefault(); setDragOver(false); const f=e.dataTransfer.files?.[0]; if(f) handleFile(f); }}
                    onClick={e=>{ e.preventDefault(); fileRef.current?.click(); }}
                  >
                    <span className={styles.uploadIcon}>🖼️</span>
                    <span className={styles.uploadText}>Arrastra una imagen o haz clic</span>
                    <span className={styles.uploadSub}>JPG, PNG, WEBP · Máx 10 MB · Horizontal recomendada</span>
                  </label>
                )}
                <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}}
                  onChange={e=>{ if(e.target.files?.[0]) handleFile(e.target.files[0]); }} />
                <div className={styles.orRow}>
                  <span className={styles.orLine}/><span className={styles.orText}>o pega una URL</span><span className={styles.orLine}/>
                </div>
                <input className={styles.input} placeholder="https://… o /uploads/noticias/…"
                  value={!imgFile ? (form.imagen_url??'') : ''}
                  onChange={e=>{ set('imagen_url', e.target.value||null); setImgFile(null); setImgPreview(''); }} />
              </div>

              <div className={styles.panel}>
                <div className={styles.panelTitle}>Visibilidad</div>
                <div className={styles.publishRow}>
                  <div>
                    <div className={styles.publishLabel}>Publicar</div>
                    <div className={styles.publishSub}>{form.publicado ? 'Visible para todos en el sitio.' : 'Borrador — solo en el admin.'}</div>
                  </div>
                  <button type="button"
                    className={`${styles.toggle} ${form.publicado ? styles.on : ''}`}
                    onClick={()=>set('publicado', form.publicado ? 0 : 1)}>
                    <span className={styles.toggleKnob} />
                  </button>
                </div>
                <div className={`${styles.publishRow} ${form.destacada ? styles.publishRowStar : ''}`}>
                  <div>
                    <div className={styles.publishLabel}>★ Destacar en inicio</div>
                    <div className={styles.publishSub}>
                      {form.destacada
                        ? 'Aparece en el slider de la página de inicio.'
                        : destacadasLlenas
                          ? `Ya hay ${MAX_DESTACADAS} destacadas. Quita una para destacar esta.`
                          : `${destacadasOtras}/${MAX_DESTACADAS} espacios ocupados.`}
                    </div>
                  </div>
                  <button type="button"
                    className={`${styles.toggle} ${styles.toggleStar} ${form.destacada ? styles.on : ''}`}
                    disabled={!form.destacada && destacadasLlenas}
                    onClick={()=>set('destacada', form.destacada ? 0 : 1)}>
                    <span className={styles.toggleKnob} />
                  </button>
                </div>
                {!!form.destacada && !form.publicado && (
                  <div className={styles.warnMsg}>No se mostrará en el inicio hasta que la publiques.</div>
                )}
                {!!form.destacada && !displayImg && (
                  <div className={styles.warnMsg}>Agrega una imagen: el slider se ve mucho mejor con portada.</div>
                )}
              </div>

              <div className={styles.panel}>
                <div className={styles.panelTitle}>Vista previa en inicio</div>
                <div className={styles.slidePreview}>
                  <div className={styles.slidePreviewMedia}>
                    {displayImg && <img src={displayImg} alt="" onError={e=>(e.currentTarget.style.display='none')} />}
                    {!!form.destacada && <span className={styles.slidePreviewBadge}>★ Destacada</span>}
                  </div>
                  <span className={styles.slidePreviewCat}>{form.categoria}</span>
                  <span className={styles.slidePreviewTitle}>{form.titulo || 'Título de la noticia'}</span>
                  {form.resumen && <span className={styles.slidePreviewText}>{form.resumen}</span>}
                </div>
              </div>
            </aside>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.btnCancel} onClick={onClose}>Cancelar</button>
          <button className={styles.btnSave} onClick={handleSave} disabled={saving||uploading}>
            {uploading?'Subiendo imagen…':saving?'Guardando…':isNew?(form.publicado?'Publicar noticia':'Guardar borrador'):'Guardar cambios'}
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
  const [tab,     setTab]     = useState<'todas'|'destacadas'|'propias'|'externas'>('todas');

  const load = () => {
    setLoading(true);
    noticiasApi.list(1, 100, true).then(r => setNews(r.data)).catch(()=>{}).finally(()=>setLoading(false));
  };
  useEffect(()=>{ load(); },[]);

  const destacadas = news.filter(n => n.destacada);

  const handleTogglePublish = async (n: Noticia) => {
    await noticiasApi.togglePublish(n.id, !n.publicado);
    load();
  };
  const handleToggleDestacada = async (n: Noticia) => {
    try {
      await noticiasApi.toggleDestacada(n.id, !n.destacada);
      load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'No se pudo actualizar'); }
  };
  const handleDelete = async (n: Noticia) => {
    if(!confirm(`¿Eliminar "${n.titulo}"?`)) return;
    await noticiasApi.delete(n.id);
    load();
  };

  const visible = news.filter(n =>
    tab === 'todas' ? true :
    tab === 'destacadas' ? !!n.destacada :
    tab === 'propias' ? n.tipo === 'propia' :
    n.tipo === 'externa'
  );

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.pageTitle}>Noticias</div>
          <p className={styles.pageDesc}>Gestiona noticias propias y de fuentes externas. Destaca hasta {MAX_DESTACADAS} para el slider de inicio.</p>
        </div>
        <button className={styles.newBtn} onClick={()=>setModal('new')}>+ Nueva noticia</button>
      </div>

      {/* Destacadas en inicio */}
      <div className={styles.featuredBox}>
        <div className={styles.featuredHead}>
          <div>
            <div className={styles.featuredTitle}>★ Destacadas en la página de inicio</div>
            <div className={styles.featuredSub}>
              {destacadas.length}/{MAX_DESTACADAS} espacios ocupados.
              {destacadas.length === 0 && ' Sin destacadas, el slider muestra las 3 noticias más recientes con imagen.'}
            </div>
          </div>
        </div>
        <div className={styles.featuredSlots}>
          {Array.from({ length: MAX_DESTACADAS }, (_, i) => {
            const n = destacadas[i];
            if (!n) return (
              <div key={`empty-${i}`} className={styles.slotEmpty}>
                <span className={styles.slotNum}>{String(i + 1).padStart(2, '0')}</span>
                <span>Espacio libre — usa ☆ en una noticia</span>
              </div>
            );
            const img = resolveImg(n.imagen_url);
            return (
              <div key={n.id} className={styles.slot} onClick={()=>setModal(n)}>
                {img && <img src={img} alt="" onError={e=>(e.currentTarget.style.display='none')} />}
                <div className={styles.slotOverlay} />
                <span className={styles.slotNum}>{String(i + 1).padStart(2, '0')}</span>
                <button className={styles.slotRemove} title="Quitar de destacadas"
                  onClick={e=>{ e.stopPropagation(); handleToggleDestacada(n); }}>✕</button>
                <div className={styles.slotBody}>
                  {!n.publicado && <span className={styles.slotWarn}>Borrador · no visible</span>}
                  <span className={styles.slotTitle}>{n.titulo}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {([['todas','Todas'], ['destacadas','★ Destacadas'], ['propias','Propias'], ['externas','Externas 🔗']] as const).map(([val, label]) => (
          <button key={val} className={`${styles.tabBtn} ${tab===val?styles.tabBtnActive:''}`}
            onClick={()=>setTab(val)}>{label}</button>
        ))}
        <span className={styles.tabsCount}>
          {visible.length} noticias · {news.filter(n=>n.publicado).length} publicadas
        </span>
      </div>

      {/* Lista */}
      <div className={styles.list}>
        {loading && <p className={styles.empty}>Cargando…</p>}
        {!loading && visible.length === 0 && <p className={styles.empty}>No hay noticias en esta sección.</p>}

        {visible.map(n => {
          const img = resolveImg(n.imagen_url);
          const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(n.tipo==='externa' ? n.fuente_url : `${window.location.origin}/notas/${n.id}`)}`;
          const starDisabled = !n.destacada && destacadas.length >= MAX_DESTACADAS;

          return (
            <div key={n.id} className={`${styles.row} ${n.destacada ? styles.rowFeatured : ''}`}>
              {img
                ? <img src={img} alt={n.titulo} className={styles.rowImg} onError={e=>(e.currentTarget.style.display='none')} />
                : <div className={styles.rowImgPlaceholder}>{n.tipo==='externa'?'🔗':'📰'}</div>
              }

              <div className={styles.rowBody}>
                <div className={styles.rowTop}>
                  {!!n.destacada && <span className={`${styles.badge} ${styles.badgeFeatured}`}>★ Destacada</span>}
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
                <button
                  className={`${styles.btnStar} ${n.destacada ? styles.btnStarOn : ''}`}
                  onClick={()=>handleToggleDestacada(n)}
                  disabled={starDisabled}
                  title={starDisabled ? `Ya hay ${MAX_DESTACADAS} destacadas` : n.destacada ? 'Quitar de destacadas' : 'Destacar en inicio'}>
                  {n.destacada ? '★' : '☆'}
                </button>
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
          destacadasOtras={destacadas.filter(d => modal==='new' || d.id !== modal.id).length}
          onClose={()=>setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
