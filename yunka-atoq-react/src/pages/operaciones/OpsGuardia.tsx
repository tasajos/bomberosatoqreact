import { useState, useEffect } from 'react';
import { opsDptoApi, adminUsersApi, type AdminUser } from '../../services/api';
import styles from './Ops.module.css';

const ROLES_GUARDIA = [
  'Jefe de guardia',
  'Oficial de guardia',
  'Maquinista',
  'Voluntario de servicio',
  'Apoyo logístico',
  'Comunicaciones',
  'Observador',
];

interface MiembroGuardia {
  voluntario_id: string;
  rol_guardia: string;
}

export default function OpsGuardia() {
  const [voluntarios, setVoluntarios] = useState<AdminUser[]>([]);
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [turno, setTurno] = useState('diurno');
  const [novedades, setNovedades] = useState('');
  const [miembros, setMiembros] = useState<MiembroGuardia[]>([{ voluntario_id: '', rol_guardia: '' }]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    adminUsersApi.list().then(r => setVoluntarios(r.filter(u => u.activo))).catch(() => {});
  }, []);

  const addMiembro = () => setMiembros(m => [...m, { voluntario_id: '', rol_guardia: '' }]);

  const removeMiembro = (i: number) => setMiembros(m => m.filter((_, idx) => idx !== i));

  const setMiembro = (i: number, key: keyof MiembroGuardia, val: string) =>
    setMiembros(m => m.map((item, idx) => idx === i ? { ...item, [key]: val } : item));

  const handleSave = async () => {
    if (!fecha) { setErr('La fecha es obligatoria.'); return; }
    const validos = miembros.filter(m => m.voluntario_id);
    if (validos.length === 0) { setErr('Debe agregar al menos un voluntario.'); return; }
    setSaving(true); setMsg(''); setErr('');
    try {
      await Promise.all(validos.map(m =>
        opsDptoApi.createGuardia({
          fecha,
          turno: turno as 'diurno' | 'nocturno' | '24h',
          voluntario_id: Number(m.voluntario_id),
          rol_guardia: m.rol_guardia,
          novedades,
          operativos_count: 0,
        } as any)
      ));
      setMsg(`✅ Rol de guardia registrado — ${validos.length} voluntario${validos.length > 1 ? 's' : ''} asignado${validos.length > 1 ? 's' : ''}.`);
      setMiembros([{ voluntario_id: '', rol_guardia: '' }]);
      setNovedades('');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error al registrar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Rol de Guardia</h1>
          <p className={styles.pageSub}>Registra el personal de guardia y sus roles para el turno</p>
        </div>
      </div>

      <div className={styles.formCard}>
        {msg && <div className={styles.successMsg} style={{ marginBottom: '1rem' }}>{msg}</div>}
        {err && <div className={styles.errorMsg} style={{ marginBottom: '1rem' }}>{err}</div>}

        {/* Cabecera del turno */}
        <div className={styles.formGrid2}>
          <div className={styles.field}>
            <label className={styles.label}>Fecha de guardia *</label>
            <input className={styles.input} type="date"
              value={fecha} onChange={e => setFecha(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Turno</label>
            <select className={styles.select} value={turno} onChange={e => setTurno(e.target.value)}>
              <option value="diurno">🌞 Diurno</option>
              <option value="nocturno">🌙 Nocturno</option>
              <option value="24h">🕐 24 horas</option>
            </select>
          </div>
        </div>

        {/* Personal de guardia */}
        <div style={{ marginTop: '1.5rem', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <label className={styles.label} style={{ margin: 0 }}>Personal de guardia *</label>
            <button type="button" className={styles.secondaryBtn} onClick={addMiembro}>
              + Agregar voluntario
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {miembros.map((m, i) => (
              <div key={i} className={styles.miembroRow}>
                <select className={styles.select} value={m.voluntario_id}
                  onChange={e => setMiembro(i, 'voluntario_id', e.target.value)}>
                  <option value="">— Voluntario —</option>
                  {voluntarios.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.nombre} {v.apellido_paterno} ({v.matricula || '—'})
                    </option>
                  ))}
                </select>
                <select className={styles.select} value={m.rol_guardia}
                  onChange={e => setMiembro(i, 'rol_guardia', e.target.value)}>
                  <option value="">— Rol en guardia —</option>
                  {ROLES_GUARDIA.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                {miembros.length > 1 && (
                  <button type="button" onClick={() => removeMiembro(i)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.25rem', padding: '0 0.25rem' }}
                    title="Quitar">✕</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Novedades */}
        <div className={styles.formFull} style={{ marginTop: '1rem' }}>
          <div className={styles.field}>
            <label className={styles.label}>Lugar</label>
            <textarea className={styles.textarea}
              placeholder="Indica el lugar de la guardia…"
              value={novedades} onChange={e => setNovedades(e.target.value)} />
          </div>
        </div>

        <button className={styles.primaryBtn} onClick={handleSave} disabled={saving}>
          {saving ? 'Registrando…' : '🛡️ Registrar guardia'}
        </button>
      </div>
    </div>
  );
}
