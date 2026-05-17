import { useState, useEffect } from 'react';
import styles from './SlideEditModal.module.css';
import FocalPointPicker from './FocalPointPicker';
import { sliderApi, type SliderImage, API_BASE } from '../../services/api';

const TAGS = ['Operativo', 'Forestal', 'Rescate', 'Capacitación', 'Comunidad', 'Unidad', 'Cuartel', 'Otro'];

interface Props {
  slide: SliderImage;
  onClose: () => void;
  onSaved: () => void;
}

function resolveUrl(url: string) {
  return url.startsWith('/uploads/') ? `${API_BASE}${url}` : url;
}

export default function SlideEditModal({ slide, onClose, onSaved }: Props) {
  const [caption,  setCaption]  = useState(slide.caption);
  const [tag,      setTag]      = useState(slide.tag);
  const [position, setPosition] = useState(slide.position || '50% 50%');
  const [orden,    setOrden]    = useState(slide.orden);
  const [activo,   setActivo]   = useState(!!slide.activo);
  const [saving,   setSaving]   = useState(false);

  // Cerrar con Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [onClose]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await sliderApi.update(slide.id, { caption, tag, position, activo: activo ? 1 : 0, orden });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const imgSrc = resolveUrl(slide.url);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.headerTitle}>Editar imagen del slider</span>
            <span className={styles.headerSub}>{slide.filename} · #{slide.orden}</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {/* Focal point picker */}
          <FocalPointPicker
            src={imgSrc}
            value={position}
            onChange={setPosition}
            aspectRatio={16 / 9}
          />

          {/* Campos */}
          <div className={styles.fieldsRow}>
            <div className={styles.field}>
              <label className={styles.label}>Descripción / Caption</label>
              <input className={styles.input}
                placeholder="Ej. Operativo estructural en Cala Cala"
                value={caption}
                onChange={e => setCaption(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Categoría</label>
              <select className={styles.select} value={tag} onChange={e => setTag(e.target.value)}>
                {TAGS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Orden</label>
              <input className={styles.input} type="number" min="1"
                value={orden} onChange={e => setOrden(Number(e.target.value))} />
            </div>
          </div>

          {/* Toggle activo */}
          <div className={styles.toggleRow}>
            <div>
              <div className={styles.toggleLabel}>Imagen activa en el slider</div>
              <div className={styles.toggleSub}>
                {activo ? 'Se muestra en el sitio.' : 'Oculta — no se muestra al público.'}
              </div>
            </div>
            <button
              className={`${styles.toggle} ${activo ? styles.on : ''}`}
              onClick={() => setActivo(a => !a)}
              aria-label="Toggle activo"
            >
              <span className={styles.toggleKnob} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.btnCancel} onClick={onClose}>Cancelar</button>
          <button className={styles.btnSave} onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
