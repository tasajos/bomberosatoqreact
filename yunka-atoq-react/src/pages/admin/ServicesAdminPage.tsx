import { useState, useEffect } from 'react';
import styles from './ServicesAdminPage.module.css';
import { serviciosApi, type Servicio } from '../../services/api';
import { ServiceIcon, ICON_OPTIONS } from '../../utils/serviceIcons';

const EMPTY: Omit<Servicio,'id'|'created_at'> = {
  numero:'01', titulo:'', descripcion:'', icono:'default',
  capacidades:[], tags:['24/7','Voluntario','Sin costo'],
  activo:1, orden:99,
};

// ── Modal ──────────────────────────────────────────────────────────
interface ModalProps { svc: Servicio|null; onClose:()=>void; onSaved:()=>void; }

function SvcModal({ svc, onClose, onSaved }: ModalProps) {
  const isNew = !svc;
  const [form, setForm] = useState<Omit<Servicio,'id'|'created_at'>>(
    svc ? { numero:svc.numero, titulo:svc.titulo, descripcion:svc.descripcion,
            icono:svc.icono, capacidades:[...svc.capacidades], tags:[...svc.tags],
            activo:svc.activo, orden:svc.orden }
        : { ...EMPTY, capacidades:[], tags:['24/7','Voluntario','Sin costo'] }
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  const set = (k: keyof typeof form, v: unknown) => setForm(f => ({...f,[k]:v}));

  const updateCap = (i: number, v: string) =>
    set('capacidades', form.capacidades.map((c,idx) => idx===i ? v : c));
  const addCap    = () => set('capacidades', [...form.capacidades, '']);
  const removeCap = (i: number) => set('capacidades', form.capacidades.filter((_,idx)=>idx!==i));

  const updateTag = (i: number, v: string) =>
    set('tags', form.tags.map((t,idx) => idx===i ? v : t));
  const addTag    = () => set('tags', [...form.tags, '']);
  const removeTag = (i: number) => set('tags', form.tags.filter((_,idx)=>idx!==i));

  const handleSave = async () => {
    if (!form.titulo.trim()) { setErr('El título es requerido.'); return; }
    setSaving(true); setErr('');
    const payload = {
      ...form,
      capacidades: form.capacidades.filter(c => c.trim()),
      tags:        form.tags.filter(t => t.trim()),
    };
    try {
      if (isNew) await serviciosApi.create(payload);
      else       await serviciosApi.update(svc!.id, payload);
      onSaved(); onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error al guardar');
    } finally { setSaving(false); }
  };

  useEffect(() => {
    const h = (e:KeyboardEvent) => { if(e.key==='Escape') onClose(); };
    window.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow=''; };
  }, [onClose]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e=>e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>{isNew ? '+ Nuevo servicio' : `Editar · ${svc!.titulo}`}</span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          {err && <div className={styles.errMsg}>{err}</div>}

          <div className={styles.formGrid2}>
            <div className={styles.field}>
              <label className={styles.label}>Número *</label>
              <input className={styles.input} placeholder="01"
                value={form.numero} onChange={e=>set('numero',e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Orden de aparición</label>
              <input className={styles.input} type="number" min="1"
                value={form.orden} onChange={e=>set('orden',Number(e.target.value))} />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Título del servicio *</label>
            <input className={styles.input} placeholder="Ej. Incendios estructurales"
              value={form.titulo} onChange={e=>set('titulo',e.target.value)} />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Descripción</label>
            <textarea className={styles.textarea}
              placeholder="Describe brevemente este servicio…"
              value={form.descripcion} onChange={e=>set('descripcion',e.target.value)} />
          </div>

          {/* Icono */}
          <div className={styles.field}>
            <label className={styles.label}>Icono</label>
            <div className={styles.iconPreviewRow}>
              <div className={styles.iconPreview}>
                <ServiceIcon name={form.icono} size={28} />
              </div>
              <select className={styles.select} value={form.icono}
                onChange={e=>set('icono',e.target.value)}>
                {ICON_OPTIONS.map(o=>(
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Capacidades */}
          <div className={styles.field}>
            <label className={styles.label}>Capacidades / Equipamiento (lista)</label>
            <div className={styles.capList}>
              {form.capacidades.map((c,i) => (
                <div key={i} className={styles.tagItem}>
                  <input className={styles.input} placeholder="Ej. Aparatos de respiración SCBA"
                    value={c} onChange={e=>updateCap(i,e.target.value)} />
                  <button className={styles.removeBtn} onClick={()=>removeCap(i)}>×</button>
                </div>
              ))}
              <button className={styles.addBtn} onClick={addCap}>+ Agregar capacidad</button>
            </div>
          </div>

          {/* Tags */}
          <div className={styles.field}>
            <label className={styles.label}>Etiquetas (ej. 24/7, Voluntario, Sin costo)</label>
            <div className={styles.tagList}>
              {form.tags.map((t,i) => (
                <div key={i} className={styles.tagItem}>
                  <input className={styles.input} placeholder="Ej. 24/7"
                    value={t} onChange={e=>updateTag(i,e.target.value)} />
                  <button className={styles.removeBtn} onClick={()=>removeTag(i)}>×</button>
                </div>
              ))}
              <button className={styles.addBtn} onClick={addTag}>+ Agregar etiqueta</button>
            </div>
          </div>

          {/* Estado */}
          <div className={styles.field}>
            <label className={styles.label}>Estado</label>
            <select className={styles.select} value={form.activo}
              onChange={e=>set('activo',Number(e.target.value))}>
              <option value={1}>Activo — visible en el sitio</option>
              <option value={0}>Inactivo — oculto</option>
            </select>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.btnCancel} onClick={onClose}>Cancelar</button>
          <button className={styles.btnSave} onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : isNew ? 'Crear servicio' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────
export default function ServicesAdminPage() {
  const [services, setServices] = useState<Servicio[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState<'new'|Servicio|null>(null);

  const load = () => {
    setLoading(true);
    serviciosApi.list(true).then(setServices).catch(()=>{}).finally(()=>setLoading(false));
  };
  useEffect(()=>{ load(); },[]);

  const handleToggle = async (s: Servicio) => {
    await serviciosApi.update(s.id, {...s, activo: s.activo ? 0 : 1});
    load();
  };

  const handleDelete = async (s: Servicio) => {
    if(!confirm(`¿Eliminar "${s.titulo}"?`)) return;
    await serviciosApi.delete(s.id);
    load();
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.pageTitle}>Servicios</div>
          <p className={styles.pageDesc}>Gestiona los servicios que se muestran en el sitio y en la página de servicios.</p>
        </div>
        <button className={styles.newBtn} onClick={()=>setModal('new')}>+ Nuevo servicio</button>
      </div>

      <div className={styles.list}>
        {loading && <p className={styles.empty}>Cargando…</p>}
        {!loading && services.length === 0 && <p className={styles.empty}>No hay servicios registrados.</p>}

        {services.map(s => (
          <div key={s.id} className={styles.row}>
            <span className={styles.rowNum}>{s.numero}</span>

            <div className={styles.rowIcon}>
              <ServiceIcon name={s.icono} size={20} />
            </div>

            <div>
              <div className={styles.rowTitle}>{s.titulo}</div>
              <div style={{ display:'flex', gap:'0.4rem', marginTop:'0.25rem', flexWrap:'wrap' }}>
                {s.tags.map(t=>(
                  <span key={t} style={{ fontSize:'0.65rem', fontFamily:'var(--font-condensed)', fontWeight:700, letterSpacing:'0.05em', color:'var(--color-gray)', background:'#F0F2F5', borderRadius:'3px', padding:'0.15rem 0.4rem' }}>{t}</span>
                ))}
              </div>
            </div>

            <p className={styles.rowDesc}>{s.descripcion}</p>

            <div className={styles.rowActions}>
              <span className={`${styles.activeDot} ${!s.activo ? styles.inactiveDot : ''}`}
                title={s.activo ? 'Activo' : 'Inactivo'} />
              <button className={styles.btnEdit} onClick={()=>setModal(s)}>✏️ Editar</button>
              <button
                className={s.activo ? styles.btnToggle : `${styles.btnToggle} ${styles.btnToggleOff}`}
                onClick={()=>handleToggle(s)}>
                {s.activo ? 'Ocultar' : 'Mostrar'}
              </button>
              <button className={styles.btnDelete} onClick={()=>handleDelete(s)}>🗑</button>
            </div>
          </div>
        ))}
      </div>

      {modal !== null && (
        <SvcModal
          svc={modal === 'new' ? null : modal}
          onClose={()=>setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
