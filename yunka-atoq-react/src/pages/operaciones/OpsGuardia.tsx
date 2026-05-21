import { useState, useEffect } from 'react';
import { opsDptoApi, adminUsersApi, type AdminUser } from '../../services/api';
import styles from './Ops.module.css';

const ROLES_GUARDIA = ['Jefe de guardia','Oficial de guardia','Conductor','Socorrista','Apoyo logístico','Comunicaciones','Observador'];

export default function OpsGuardia() {
  const [voluntarios, setVoluntarios] = useState<AdminUser[]>([]);
  const [form, setForm] = useState({
    fecha: new Date().toISOString().slice(0,10),
    turno: 'diurno', voluntario_id: '', rol_guardia: '', novedades: '', operativos_count: '0',
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    adminUsersApi.list().then(r=>setVoluntarios(r.filter(u=>u.activo))).catch(()=>{});
  }, []);

  const set = (k: string, v: string) => setForm(f=>({...f,[k]:v}));

  const handleSave = async () => {
    if (!form.fecha || !form.voluntario_id) { setErr('Fecha y voluntario son obligatorios.'); return; }
    setSaving(true); setMsg(''); setErr('');
    try {
      await opsDptoApi.createGuardia({
        ...form,
        voluntario_id: Number(form.voluntario_id),
        operativos_count: Number(form.operativos_count)||0,
      } as any);
      setMsg('✅ Rol de guardia registrado correctamente.');
      setForm({ fecha:new Date().toISOString().slice(0,10), turno:'diurno', voluntario_id:'', rol_guardia:'', novedades:'', operativos_count:'0' });
    } catch(e:unknown) { setErr(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Rol de Guardia</h1>
          <p className={styles.pageSub}>Asigna y registra los roles del personal de guardia</p>
        </div>
      </div>

      <div className={styles.formCard}>
        {msg && <div className={styles.successMsg} style={{marginBottom:'1rem'}}>{msg}</div>}
        {err && <div className={styles.errorMsg} style={{marginBottom:'1rem'}}>{err}</div>}

        <div className={styles.formGrid3}>
          <div className={styles.field}>
            <label className={styles.label}>Fecha de guardia *</label>
            <input className={styles.input} type="date"
              value={form.fecha} onChange={e=>set('fecha',e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Turno</label>
            <select className={styles.select} value={form.turno} onChange={e=>set('turno',e.target.value)}>
              <option value="diurno">🌞 Diurno</option>
              <option value="nocturno">🌙 Nocturno</option>
              <option value="24h">🕐 24 horas</option>
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Operativos en guardia</label>
            <input className={styles.input} type="number" min="0"
              value={form.operativos_count} onChange={e=>set('operativos_count',e.target.value)} />
          </div>
        </div>

        <div className={styles.formGrid2}>
          <div className={styles.field}>
            <label className={styles.label}>Voluntario *</label>
            <select className={styles.select} value={form.voluntario_id} onChange={e=>set('voluntario_id',e.target.value)}>
              <option value="">— Seleccionar —</option>
              {voluntarios.map(v=>(
                <option key={v.id} value={v.id}>{v.nombre} {v.apellido_paterno} ({v.matricula||'—'})</option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Rol en guardia</label>
            <select className={styles.select} value={form.rol_guardia} onChange={e=>set('rol_guardia',e.target.value)}>
              <option value="">— Seleccionar rol —</option>
              {ROLES_GUARDIA.map(r=><option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        <div className={styles.formFull}>
          <div className={styles.field}>
            <label className={styles.label}>Novedades de guardia</label>
            <textarea className={styles.textarea}
              placeholder="Describe novedades, incidentes o situaciones especiales durante la guardia…"
              value={form.novedades} onChange={e=>set('novedades',e.target.value)} />
          </div>
        </div>

        <button className={styles.primaryBtn} onClick={handleSave} disabled={saving}>
          {saving ? 'Registrando…' : '🛡️ Registrar guardia'}
        </button>
      </div>
    </div>
  );
}
