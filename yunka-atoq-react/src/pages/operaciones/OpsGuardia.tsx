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

const TURNO_OPTIONS = [
  { value: 'diurno',   label: 'Diurno',    icon: '🌞', color: '#d97706' },
  { value: 'nocturno', label: 'Nocturno',  icon: '🌙', color: '#3b82f6' },
  { value: '24h',      label: '24 horas',  icon: '🕐', color: '#7c3aed' },
];

interface MiembroGuardia {
  voluntario_id: string;
  rol_guardia: string;
}

function initials(nombre: string, apellido: string) {
  return `${nombre[0] ?? ''}${apellido[0] ?? ''}`.toUpperCase();
}

export default function OpsGuardia() {
  const [voluntarios, setVoluntarios]   = useState<AdminUser[]>([]);
  const [fecha, setFecha]               = useState(new Date().toISOString().slice(0, 10));
  const [turno, setTurno]               = useState('diurno');
  const [lugar, setLugar]               = useState('');
  const [miembros, setMiembros]         = useState<MiembroGuardia[]>([{ voluntario_id: '', rol_guardia: '' }]);
  const [saving, setSaving]             = useState(false);
  const [msg, setMsg]                   = useState('');
  const [err, setErr]                   = useState('');

  useEffect(() => {
    adminUsersApi.list().then(r => setVoluntarios(r.filter(u => u.activo))).catch(() => {});
  }, []);

  const addMiembro    = () => setMiembros(m => [...m, { voluntario_id: '', rol_guardia: '' }]);
  const removeMiembro = (i: number) => setMiembros(m => m.filter((_, idx) => idx !== i));
  const setMiembro    = (i: number, key: keyof MiembroGuardia, val: string) =>
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
          novedades: lugar,
          operativos_count: 0,
        } as any)
      ));
      setMsg(`Rol de guardia registrado — ${validos.length} voluntario${validos.length > 1 ? 's' : ''} asignado${validos.length > 1 ? 's' : ''}.`);
      setMiembros([{ voluntario_id: '', rol_guardia: '' }]);
      setLugar('');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error al registrar');
    } finally {
      setSaving(false);
    }
  };

  const turnoActivo = TURNO_OPTIONS.find(t => t.value === turno)!;
  const asignados   = miembros.filter(m => m.voluntario_id).length;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Rol de Guardia</h1>
          <p className={styles.pageSub}>Registra el personal y sus roles para el turno de guardia</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {msg && (
          <div className={styles.successMsg} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <span style={{ fontSize: '1.25rem' }}>✅</span> {msg}
          </div>
        )}
        {err && (
          <div className={styles.errorMsg} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <span style={{ fontSize: '1.25rem' }}>⚠️</span> {err}
          </div>
        )}

        {/* ── Datos del turno ── */}
        <div className={styles.formCard}>
          <div className={styles.sectionLabel}>📋 Datos del turno</div>

          {/* Selector de turno tipo card */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
            {TURNO_OPTIONS.map(t => {
              const sel = turno === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTurno(t.value)}
                  style={{
                    padding: '1rem', borderRadius: '10px', cursor: 'pointer', textAlign: 'center',
                    border: `2px solid ${sel ? t.color : '#E2E8F0'}`,
                    background: sel ? `${t.color}12` : '#FAFBFC',
                    transition: 'all 0.18s', outline: 'none',
                  }}
                >
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.35rem' }}>{t.icon}</div>
                  <div style={{
                    fontFamily: 'var(--font-condensed)', fontSize: '0.82rem', fontWeight: 800,
                    color: sel ? t.color : '#475569',
                  }}>{t.label}</div>
                  {sel && (
                    <div style={{
                      marginTop: '0.3rem', fontFamily: 'var(--font-condensed)',
                      fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.08em',
                      color: 'white', background: t.color,
                      padding: '0.1rem 0.4rem', borderRadius: '3px', display: 'inline-block',
                    }}>SELECCIONADO</div>
                  )}
                </button>
              );
            })}
          </div>

          <div className={styles.formGrid2}>
            <div className={styles.field}>
              <label className={styles.label}>Fecha de guardia *</label>
              <input className={styles.input} type="date"
                value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Lugar</label>
              <input className={styles.input} type="text"
                placeholder="Ej. Cuartel Central, Zona Norte…"
                value={lugar} onChange={e => setLugar(e.target.value)} />
            </div>
          </div>
        </div>

        {/* ── Personal de guardia ── */}
        <div className={styles.formCard}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div className={styles.sectionLabel} style={{ margin: 0 }}>👥 Personal de guardia</div>
              {asignados > 0 && (
                <div style={{ marginTop: '0.25rem', fontFamily: 'var(--font-condensed)', fontSize: '0.72rem', fontWeight: 700, color: '#C41E1E' }}>
                  {asignados} voluntario{asignados !== 1 ? 's' : ''} asignado{asignados !== 1 ? 's' : ''}
                </div>
              )}
            </div>
            <button type="button" className={styles.secondaryBtn} onClick={addMiembro}>
              + Agregar voluntario
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {miembros.map((m, i) => {
              const vol = voluntarios.find(v => String(v.id) === m.voluntario_id);
              return (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '40px 1fr 1fr auto',
                    gap: '0.875rem',
                    alignItems: 'center',
                    padding: '0.875rem 1rem',
                    borderRadius: '10px',
                    border: `1.5px solid ${m.voluntario_id ? '#E2E8F0' : '#F1F5F9'}`,
                    background: m.voluntario_id ? 'white' : '#FAFBFC',
                    transition: 'all 0.18s',
                  }}
                >
                  {/* Avatar con iniciales */}
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                    background: vol
                      ? 'linear-gradient(135deg,#C41E1E,#7f1d1d)'
                      : '#E2E8F0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-condensed)', fontSize: '0.78rem', fontWeight: 900,
                    color: vol ? 'white' : '#94A3B8',
                    letterSpacing: '0.04em',
                  }}>
                    {vol ? initials(vol.nombre, vol.apellido_paterno) : (i + 1)}
                  </div>

                  {/* Select voluntario */}
                  <div className={styles.field} style={{ margin: 0 }}>
                    <label className={styles.label}>Voluntario</label>
                    <select className={styles.select} value={m.voluntario_id}
                      onChange={e => setMiembro(i, 'voluntario_id', e.target.value)}>
                      <option value="">— Seleccionar —</option>
                      {voluntarios.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.nombre} {v.apellido_paterno} ({v.matricula || '—'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select rol */}
                  <div className={styles.field} style={{ margin: 0 }}>
                    <label className={styles.label}>Rol en guardia</label>
                    <select className={styles.select} value={m.rol_guardia}
                      onChange={e => setMiembro(i, 'rol_guardia', e.target.value)}>
                      <option value="">— Seleccionar rol —</option>
                      {ROLES_GUARDIA.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>

                  {/* Botón quitar */}
                  {miembros.length > 1 ? (
                    <button type="button" onClick={() => removeMiembro(i)}
                      style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: 'rgba(196,30,30,0.08)', border: '1.5px solid rgba(196,30,30,0.2)',
                        color: '#C41E1E', cursor: 'pointer', fontSize: '0.9rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.18s', flexShrink: 0,
                      }}
                      title="Quitar voluntario">✕</button>
                  ) : (
                    <div style={{ width: '32px' }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Resumen visual del turno */}
          {asignados > 0 && (
            <div style={{
              marginTop: '1.25rem', padding: '0.875rem 1rem',
              borderRadius: '8px', background: `${turnoActivo.color}0D`,
              border: `1px solid ${turnoActivo.color}30`,
              display: 'flex', alignItems: 'center', gap: '0.75rem',
            }}>
              <span style={{ fontSize: '1.5rem' }}>{turnoActivo.icon}</span>
              <div>
                <div style={{ fontFamily: 'var(--font-condensed)', fontSize: '0.8rem', fontWeight: 800, color: turnoActivo.color }}>
                  Turno {turnoActivo.label} · {fecha}
                </div>
                <div style={{ fontFamily: 'var(--font-condensed)', fontSize: '0.72rem', color: '#64748B', marginTop: '0.15rem' }}>
                  {asignados} voluntario{asignados !== 1 ? 's' : ''} asignado{asignados !== 1 ? 's' : ''}
                  {lugar ? ` · ${lugar}` : ''}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Registrar ── */}
        <button
          className={styles.primaryBtn}
          onClick={handleSave}
          disabled={saving}
          style={{ width: '100%', justifyContent: 'center', padding: '1rem', fontSize: '1rem' }}
        >
          {saving ? 'Registrando…' : '🛡️ Registrar rol de guardia'}
        </button>

      </div>
    </div>
  );
}
