import { useEffect, useState } from 'react';
import styles from './ConvocatoriaPanel.module.css';
import { voluntariosApi, type Convocatoria } from '../../services/api';
import {
  estadoConvocatoria, objetivoCuenta, cierreDate, partesRestantes, fmtFechaLarga, useNow,
  type EstadoConvocatoria,
} from '../../utils/convocatoria';

const ESTADO_LABEL: Record<EstadoConvocatoria, string> = {
  sin_fecha: 'Sin fecha de cierre',
  proxima:   'Próxima',
  abierta:   'Abierta',
  cerrada:   'Cerrada',
};

export default function ConvocatoriaPanel() {
  const [saved, setSaved]     = useState<Convocatoria | null>(null);
  const [inicio, setInicio]   = useState('');
  const [cierre, setCierre]   = useState('');
  const [plazas, setPlazas]   = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [ok, setOk]           = useState(false);
  const [err, setErr]         = useState('');
  const now = useNow(60000);

  useEffect(() => {
    voluntariosApi.convocatoria()
      .then(c => {
        setSaved(c);
        setInicio(c.inicio);
        setCierre(c.cierre);
        setPlazas(c.plazas != null ? String(c.plazas) : '');
      })
      .catch(e => setErr(e.message || 'No se pudo cargar la convocatoria'))
      .finally(() => setLoading(false));
  }, []);

  // Vista previa con los valores del formulario (aún sin guardar)
  const draft: Convocatoria = { inicio, cierre, plazas: plazas ? Number(plazas) : null, postulantes: saved?.postulantes ?? null };
  const estado = estadoConvocatoria(draft, now);
  const objetivo = objetivoCuenta(draft, now);
  const resta = objetivo ? partesRestantes(objetivo, now) : null;

  const dirty = !!saved && (inicio !== saved.inicio || cierre !== saved.cierre || plazas !== (saved.plazas != null ? String(saved.plazas) : ''));
  const rangoInvalido = !!inicio && !!cierre && inicio > cierre;

  const handleSave = async () => {
    if (!cierre) { setErr('La fecha de cierre es obligatoria.'); return; }
    if (rangoInvalido) { setErr('La fecha de apertura debe ser anterior o igual al cierre.'); return; }
    setSaving(true); setErr(''); setOk(false);
    try {
      await voluntariosApi.updateConvocatoria({ inicio, cierre, plazas });
      setSaved(s => ({ inicio, cierre, plazas: plazas ? Number(plazas) : null, postulantes: s?.postulantes ?? null }));
      setOk(true);
      setTimeout(() => setOk(false), 3000);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>Convocatoria</h2>
          <p className={styles.desc}>
            Estas fechas controlan la cuenta regresiva y el estado que se muestra en la página pública de voluntariado.
          </p>
        </div>
        <span className={`${styles.badge} ${styles[`badge_${estado}`]}`}>{ESTADO_LABEL[estado]}</span>
      </div>

      {loading ? (
        <p className={styles.loading}>Cargando…</p>
      ) : (
        <>
          <div className={styles.fields}>
            <label className={styles.field}>
              <span className={styles.label}>Apertura <em>(opcional)</em></span>
              <input type="date" className={styles.input} value={inicio} max={cierre || undefined}
                onChange={e => setInicio(e.target.value)} />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Cierre *</span>
              <input type="date" className={styles.input} value={cierre} min={inicio || undefined}
                onChange={e => setCierre(e.target.value)} required />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Plazas</span>
              <input type="number" min={0} max={9999} className={styles.input} value={plazas}
                placeholder="Ej. 42" onChange={e => setPlazas(e.target.value)} />
            </label>
            <button type="button" className={styles.saveBtn} onClick={handleSave}
              disabled={saving || !dirty || !cierre || rangoInvalido}>
              {saving ? 'Guardando…' : ok ? '✓ Guardado' : 'Guardar'}
            </button>
          </div>

          <div className={styles.preview}>
            {estado === 'abierta' && objetivo && resta && (
              <>Abierta hasta el <strong>{fmtFechaLarga(objetivo)}</strong> · faltan <strong>{resta.days} días y {resta.hours} h</strong></>
            )}
            {estado === 'proxima' && objetivo && resta && (
              <>Abre el <strong>{fmtFechaLarga(objetivo)}</strong> · faltan <strong>{resta.days} días y {resta.hours} h</strong>. Mientras tanto la página invita a registrar interés.</>
            )}
            {estado === 'cerrada' && <>Cerró el <strong>{fmtFechaLarga(cierreDate(draft)!)}</strong>. La página pública invita a registrar interés para la próxima.</>}
            {estado === 'sin_fecha' && <>Sin fecha de cierre la página muestra “Sin convocatoria abierta”.</>}
            {saved?.postulantes != null && (
              <span className={styles.count}> · {saved.postulantes} postulación{saved.postulantes !== 1 ? 'es' : ''} desde la apertura</span>
            )}
            {dirty && <span className={styles.unsaved}> · Cambios sin guardar</span>}
          </div>
        </>
      )}

      {err && <div className={styles.err}>{err}</div>}
    </section>
  );
}
