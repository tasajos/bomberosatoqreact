import { useState, useEffect } from 'react';
import styles from './SiteConfigPage.module.css';
import { configApi } from '../../services/api';

const FIELDS = [
  { key: 'cuartel_nombre',      label: 'Nombre del cuartel',       placeholder: 'Cuartel Yunka Atoq' },
  { key: 'cuartel_direccion',   label: 'Dirección',                placeholder: 'Av. Heroínas #1456' },
  { key: 'cuartel_barrio',      label: 'Barrio / Ciudad',          placeholder: 'Cercado · Cochabamba' },
  { key: 'cuartel_telefono',    label: 'Teléfono de atención',     placeholder: '+591 70776212' },
  { key: 'cuartel_horario',     label: 'Horario de atención',      placeholder: 'Lunes a viernes · 8:00 – 18:00' },
  { key: 'cuartel_emergencias', label: 'Número de emergencias',    placeholder: '68503758' },
  { key: 'cuartel_email',       label: 'Email de contacto',        placeholder: 'informaciones@bomberosatoq.org' },
  { key: 'cuartel_lat',         label: 'Latitud (Google Maps)',    placeholder: '-17.393500' },
  { key: 'cuartel_lng',         label: 'Longitud (Google Maps)',   placeholder: '-66.156800' },
];

export default function SiteConfigPage() {
  const [form,    setForm]    = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [err,     setErr]     = useState('');

  useEffect(() => {
    configApi.get()
      .then(setForm)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true); setSaved(false); setErr('');
    try {
      await configApi.update(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const lat = form.cuartel_lat || '-17.393500';
  const lng = form.cuartel_lng || '-66.156800';
  const mapUrl = `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.pageTitle}>Configuración del cuartel</div>
          <p className={styles.pageDesc}>
            Modifica la dirección, teléfonos y ubicación que aparecen en la página de contacto.
          </p>
        </div>
        <button className={styles.saveBtn} onClick={handleSave} disabled={saving || loading}>
          {saving ? 'Guardando…' : saved ? '✓ Guardado' : 'Guardar cambios'}
        </button>
      </div>

      {err   && <div className={styles.errMsg}>{err}</div>}

      <div className={styles.grid}>
        {/* Campos */}
        <div className={styles.fieldsCard}>
          <div className={styles.cardTitle}>Información del cuartel</div>
          {loading ? (
            <p style={{ padding:'2rem', color:'var(--color-gray)' }}>Cargando configuración…</p>
          ) : (
            <div className={styles.fields}>
              {FIELDS.map(f => (
                <div key={f.key} className={styles.field}>
                  <label className={styles.label}>{f.label}</label>
                  <input
                    className={styles.input}
                    placeholder={f.placeholder}
                    value={form[f.key] ?? ''}
                    onChange={e => set(f.key, e.target.value)}
                  />
                  {(f.key === 'cuartel_lat' || f.key === 'cuartel_lng') && (
                    <span className={styles.fieldHint}>
                      Usa <a href="https://maps.google.com" target="_blank" rel="noreferrer">Google Maps</a> →
                      clic derecho sobre el punto → "¿Qué hay aquí?" para obtener las coordenadas.
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preview mapa */}
        <div className={styles.mapCard}>
          <div className={styles.cardTitle}>Vista previa del mapa</div>
          <div className={styles.mapFrame}>
            <iframe
              key={`${lat},${lng}`}
              src={mapUrl}
              title="Vista previa"
              loading="lazy"
            />
          </div>
          <a href={mapsLink} target="_blank" rel="noreferrer" className={styles.mapLink}>
            Verificar ubicación en Google Maps →
          </a>
          <p className={styles.mapHint}>
            El mapa se actualiza al guardar. Las coordenadas deben corresponder exactamente a la ubicación del cuartel.
          </p>
        </div>
      </div>
    </div>
  );
}
