import { useState, useEffect, useCallback } from 'react';
import styles from './UsersAdminPage.module.css';
import { adminUsersApi, type AdminUser } from '../../services/api';

// Definición de roles con emoji e info
const ROLES = [
  { value: 'admin',             label: 'Administrador',      emoji: '👑', color: '#7c3aed' },
  { value: 'presidente',        label: 'Presidente',         emoji: '🏅', color: '#b91c1c' },
  { value: 'coordinador',       label: 'Coordinador',        emoji: '📋', color: '#0f766e' },
  { value: 'fundador',          label: 'Fundador',           emoji: '🦊', color: '#d97706' },
  { value: 'jefe_operaciones',  label: 'Jefe de Operaciones',emoji: '🚒', color: '#c41e1e' },
  { value: 'jefe_personal',     label: 'Jefe de Personal',   emoji: '👥', color: '#0369a1' },
  { value: 'jefe_logistica',    label: 'Jefe de Logística',  emoji: '📦', color: '#047857' },
  { value: 'jefe_marketing',    label: 'Jefe de Marketing',  emoji: '📢', color: '#b45309' },
  { value: 'jefe_enlaces',      label: 'Jefe de Enlaces',    emoji: '🤝', color: '#6d28d9' },
  { value: 'voluntario',        label: 'Voluntario',         emoji: '🧑‍🚒', color: '#374151' },
  { value: 'postulante',        label: 'Postulante',         emoji: '📝', color: '#6B7280' },
];

function getRoleInfo(value: string) {
  return ROLES.find(r => r.value === value) ?? { value, label: value, emoji: '👤', color: '#374151' };
}

function RoleBadge({ role }: { role: string }) {
  const r = getRoleInfo(role);
  return (
    <span className={styles.rolePill} style={{ color: r.color, borderColor: r.color, background: `${r.color}12` }}>
      {r.emoji} {r.label}
    </span>
  );
}

function initials(u: AdminUser) {
  return `${u.nombre[0] ?? ''}${u.apellido_paterno[0] ?? ''}`.toUpperCase();
}

function fmtDate(s: string | null) {
  if (!s) return '—';
  return new Intl.DateTimeFormat('es-BO', { day:'numeric', month:'short', year:'numeric' }).format(new Date(s));
}

function genPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ── Modal ──────────────────────────────────────────────────────────
interface ModalProps { user: AdminUser | null; onClose: () => void; onSaved: () => void; }

const SANGRE = ['','A+','A-','B+','B-','AB+','AB-','O+','O-'];
const CODIGOS = ['','VF','VC','VR'];

const EMPTY = {
  nombre: '', apellido_paterno: '', apellido_materno: '',
  fecha_nacimiento: '', carnet_identidad: '', domicilio: '',
  telefono: '', contacto_nombre: '', contacto_telefono: '',
  codigo: '', matricula: '', especialidad: '', tipo_sangre: '',
  email: '', role: 'voluntario', activo: 1,
};

function calcEdad(fechaNac: string): string {
  if (!fechaNac) return '';
  const hoy = new Date();
  const nac = new Date(fechaNac);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return `${edad} años`;
}

function UserModal({ user, onClose, onSaved }: ModalProps) {
  const isNew = !user;
  const [form, setForm] = useState({ ...EMPTY, ...(user ? {
    nombre: user.nombre, apellido_paterno: user.apellido_paterno,
    apellido_materno: user.apellido_materno, fecha_nacimiento: user.fecha_nacimiento?.slice(0,10) ?? '',
    carnet_identidad: user.carnet_identidad, domicilio: user.domicilio,
    telefono: user.telefono, email: user.email,
    contacto_nombre: user.contacto_nombre || '', contacto_telefono: user.contacto_telefono || '',
    codigo: user.codigo || '', matricula: user.matricula || '',
    especialidad: user.especialidad || '', tipo_sangre: user.tipo_sangre || '',
    role: user.role, activo: user.activo,
  } : {}) });
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState('');

  const [loadingMatricula, setLoadingMatricula] = useState(false);

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  // Auto-generar matrícula al seleccionar código (solo en nuevo usuario)
  const handleCodigo = useCallback(async (codigo: string) => {
    set('codigo', codigo);
    if (!codigo || !isNew) return;
    setLoadingMatricula(true);
    try {
      const res = await adminUsersApi.nextMatricula(codigo);
      set('matricula', res.matricula);
    } catch { /* silencioso */ }
    finally { setLoadingMatricula(false); }
  }, [isNew]);

  const handleSave = async () => {
    if (!form.nombre.trim()) { setErr('El nombre es requerido.'); return; }
    if (!form.email.trim())  { setErr('El correo es requerido.'); return; }
    if (isNew && !password)  { setErr('La contraseña es requerida.'); return; }

    setSaving(true); setErr('');
    try {
      const payload: Record<string, unknown> = { ...form };
      if (password) payload.password = password;

      if (isNew) await adminUsersApi.create(payload as Parameters<typeof adminUsersApi.create>[0]);
      else       await adminUsersApi.update(user!.id, payload as Parameters<typeof adminUsersApi.update>[1]);
      onSaved(); onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error al guardar');
    } finally { setSaving(false); }
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [onClose]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>
            {isNew ? '+ Nuevo usuario' : `Editar · ${user!.nombre} ${user!.apellido_paterno}`}
          </span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          {err && <div className={styles.errMsg}>{err}</div>}

          {/* Rol */}
          <div className={styles.formSection}>
            <div className={styles.sectionTitle}><span className={styles.sectionIcon}>🎖️</span>Rol en la institución</div>
            <div className={styles.roleGrid}>
              {ROLES.map(r => (
                <button key={r.value} type="button"
                  className={`${styles.roleCard} ${form.role === r.value ? styles.roleCardActive : ''}`}
                  onClick={() => set('role', r.value)}>
                  <span className={styles.roleEmoji}>{r.emoji}</span>
                  <span className={styles.roleName}>{r.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Datos personales */}
          <div className={styles.formSection}>
            <div className={styles.sectionTitle}><span className={styles.sectionIcon}>👤</span>Datos personales</div>
            <div className={styles.formGrid3} style={{ marginBottom:'1rem' }}>
              <div className={styles.field}>
                <label className={styles.label}>Nombre(s) <span className={styles.required}>*</span></label>
                <input className={styles.input} placeholder="Ej. Rosa"
                  value={form.nombre} onChange={e => set('nombre', e.target.value)} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Apellido paterno <span className={styles.required}>*</span></label>
                <input className={styles.input} placeholder="Ej. Mendoza"
                  value={form.apellido_paterno} onChange={e => set('apellido_paterno', e.target.value)} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Apellido materno</label>
                <input className={styles.input} placeholder="Ej. Vargas"
                  value={form.apellido_materno} onChange={e => set('apellido_materno', e.target.value)} />
              </div>
            </div>
            <div className={styles.formGrid2}>
              <div className={styles.field}>
                <label className={styles.label}>
                  Fecha de nacimiento
                  {form.fecha_nacimiento && (
                    <span style={{ marginLeft:'0.5rem', color:'var(--color-red)', fontWeight:700 }}>
                      · {calcEdad(form.fecha_nacimiento)}
                    </span>
                  )}
                </label>
                <input className={styles.input} type="date"
                  value={form.fecha_nacimiento} onChange={e => set('fecha_nacimiento', e.target.value)} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Carnet de identidad</label>
                <input className={styles.input} placeholder="Ej. 6543210 CB"
                  value={form.carnet_identidad} onChange={e => set('carnet_identidad', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Contacto */}
          <div className={styles.formSection}>
            <div className={styles.sectionTitle}><span className={styles.sectionIcon}>📞</span>Información de contacto</div>
            <div className={styles.formGrid2} style={{ marginBottom:'1rem' }}>
              <div className={styles.field}>
                <label className={styles.label}>Teléfono</label>
                <input className={styles.input} placeholder="+591 7…"
                  value={form.telefono} onChange={e => set('telefono', e.target.value)} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Correo electrónico <span className={styles.required}>*</span></label>
                <input className={styles.input} type="email" placeholder="correo@ejemplo.bo"
                  value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Domicilio</label>
              <input className={styles.input} placeholder="Calle, barrio, ciudad"
                value={form.domicilio} onChange={e => set('domicilio', e.target.value)} />
            </div>
            <div className={styles.formGrid2} style={{ marginTop:'1rem' }}>
              <div className={styles.field}>
                <label className={styles.label}>Familiar / Persona de contacto</label>
                <input className={styles.input} placeholder="Nombre completo"
                  value={form.contacto_nombre} onChange={e => set('contacto_nombre', e.target.value)} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Teléfono del contacto</label>
                <input className={styles.input} placeholder="+591 7…"
                  value={form.contacto_telefono} onChange={e => set('contacto_telefono', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Datos institucionales */}
          <div className={styles.formSection}>
            <div className={styles.sectionTitle}><span className={styles.sectionIcon}>🏷️</span>Datos institucionales</div>
            <div className={styles.formGrid3} style={{ marginBottom:'1rem' }}>
              <div className={styles.field}>
                <label className={styles.label}>Código</label>
                <select className={styles.select} value={form.codigo}
                  onChange={e => handleCodigo(e.target.value)}>
                  {CODIGOS.map(c => (
                    <option key={c} value={c}>
                      {c === 'VF' ? 'VF — Voluntario Fundador'
                       : c === 'VC' ? 'VC — Voluntario Colaborador'
                       : c === 'VR' ? 'VR — Voluntario Regular'
                       : '— seleccionar —'}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>
                  Matrícula
                  {loadingMatricula && <span style={{ marginLeft:'.4rem', color:'var(--color-gray)', fontSize:'.7rem' }}>generando…</span>}
                  {!isNew && <span style={{ marginLeft:'.4rem', color:'var(--color-gray)', fontSize:'.7rem' }}>· editable manualmente</span>}
                </label>
                <input className={styles.input}
                  placeholder={form.codigo ? `${form.codigo}-001` : 'Selecciona un código primero'}
                  value={form.matricula} onChange={e => set('matricula', e.target.value)}
                  style={loadingMatricula ? { opacity:0.6 } : undefined}
                  disabled={loadingMatricula}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Tipo de sangre</label>
                <select className={styles.select} value={form.tipo_sangre} onChange={e => set('tipo_sangre', e.target.value)}>
                  {SANGRE.map(s => <option key={s} value={s}>{s || '— no definido —'}</option>)}
                </select>
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Especialidad</label>
              <input className={styles.input} placeholder="Ej. Incendios forestales, USAR, Primeros auxilios…"
                value={form.especialidad} onChange={e => set('especialidad', e.target.value)} />
            </div>
          </div>

          {/* Acceso */}
          <div className={styles.formSection}>
            <div className={styles.sectionTitle}><span className={styles.sectionIcon}>🔐</span>Acceso al sistema</div>
            <div className={styles.passRow}>
              <div className={styles.field}>
                <label className={styles.label}>
                  {isNew ? 'Contraseña *' : 'Nueva contraseña (dejar vacío para no cambiar)'}
                </label>
                <input className={styles.input}
                  type={showPass ? 'text' : 'password'}
                  placeholder={isNew ? 'Mínimo 8 caracteres' : '••••••••••••'}
                  value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <button type="button" className={styles.genBtn}
                onClick={() => { const p = genPassword(); setPassword(p); setShowPass(true); }}>
                Generar
              </button>
              <button type="button" className={styles.genBtn}
                onClick={() => setShowPass(s => !s)}>
                {showPass ? 'Ocultar' : 'Ver'}
              </button>
            </div>

            {!isNew && (
              <div className={styles.statusRow} style={{ marginTop: '1rem' }}>
                <div>
                  <div className={styles.statusLabel}>Usuario activo</div>
                  <div className={styles.statusSub}>{form.activo ? 'Puede iniciar sesión.' : 'Cuenta desactivada.'}</div>
                </div>
                <button type="button"
                  className={`${styles.toggle} ${form.activo ? styles.on : ''}`}
                  onClick={() => set('activo', form.activo ? 0 : 1)}>
                  <span className={styles.toggleKnob} />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.btnCancel} onClick={onClose}>Cancelar</button>
          <button className={styles.btnSave} onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : isNew ? 'Crear usuario' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────
export default function UsersAdminPage() {
  const [users,   setUsers]   = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState<'new' | AdminUser | null>(null);
  const [search,  setSearch]  = useState('');

  const load = () => {
    setLoading(true);
    adminUsersApi.list().then(setUsers).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleToggle = async (u: AdminUser) => {
    await adminUsersApi.update(u.id, { ...u, activo: u.activo ? 0 : 1 });
    load();
  };
  const handleDelete = async (u: AdminUser) => {
    if (!confirm(`¿Eliminar a ${u.nombre} ${u.apellido_paterno}? Esta acción no se puede deshacer.`)) return;
    await adminUsersApi.delete(u.id);
    load();
  };

  const visible = users.filter(u =>
    `${u.nombre} ${u.apellido_paterno} ${u.apellido_materno} ${u.email} ${u.carnet_identidad}`
      .toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.pageTitle}>Gestión de usuarios</div>
          <p className={styles.pageDesc}>{users.length} usuarios registrados · {users.filter(u=>u.activo).length} activos</p>
        </div>
        <button className={styles.newBtn} onClick={() => setModal('new')}>+ Nuevo usuario</button>
      </div>

      {/* Leyenda de roles */}
      <div className={styles.roleLegend}>
        {ROLES.map(r => (
          <span key={r.value} className={styles.rolePill}
            style={{ color: r.color, borderColor: `${r.color}40`, background: `${r.color}10` }}>
            {r.emoji} {r.label} · {users.filter(u => u.role === r.value).length}
          </span>
        ))}
      </div>

      {/* Buscador */}
      <div style={{ display:'flex', gap:'.75rem' }}>
        <input
          style={{ flex:1, padding:'.65rem 1rem', border:'1.5px solid #D1D5DB', borderRadius:'8px', fontSize:'.875rem', outline:'none', fontFamily:'var(--font-body)' }}
          placeholder="Buscar por nombre, correo o carnet…"
          value={search} onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Tabla */}
      <div className={styles.table}>
        <div className={styles.tableHeader}>
          <span>Usuario</span>
          <span>Rol</span>
          <span>Código · Matrícula</span>
          <span>Especialidad</span>
          <span>Acciones</span>
        </div>

        {loading && <p className={styles.empty}>Cargando usuarios…</p>}
        {!loading && visible.length === 0 && <p className={styles.empty}>No se encontraron usuarios.</p>}

        {visible.map(u => {
          const codClass = u.codigo === 'VF' ? styles.codVF : u.codigo === 'VC' ? styles.codVC : u.codigo === 'VR' ? styles.codVR : '';
          return (
          <div key={u.id} className={`${styles.row} ${!u.activo ? styles.rowInactive : ''}`}>
            <div className={styles.userInfo}>
              <div className={styles.avatar}>{initials(u)}</div>
              <div>
                <div className={styles.userName}>{u.nombre} {u.apellido_paterno} {u.apellido_materno}</div>
                <div className={styles.userEmail}>{u.email}</div>
                <div className={styles.userCi}>
                  {u.carnet_identidad && `CI: ${u.carnet_identidad}`}
                  {u.fecha_nacimiento && ` · ${calcEdad(u.fecha_nacimiento.slice(0,10))}`}
                </div>
              </div>
            </div>
            <RoleBadge role={u.role} />

            {/* Código + Matrícula */}
            <div className={styles.matriculaBadge}>
              {u.codigo && <span className={`${styles.codigoPill} ${codClass}`}>{u.codigo}</span>}
              {u.matricula && <span className={styles.matriculaNum}>{u.matricula}</span>}
              {!u.codigo && !u.matricula && <span style={{ color:'var(--color-gray)', fontSize:'0.78rem' }}>—</span>}
            </div>

            {/* Especialidad */}
            <div className={styles.especialidadCell}>
              {u.especialidad || <span style={{ color:'var(--color-gray)' }}>—</span>}
              {u.tipo_sangre && (
                <div>
                  <span style={{ background:'#FEF2F2', color:'var(--color-red)', fontFamily:'var(--font-condensed)', fontWeight:700, fontSize:'0.6rem', letterSpacing:'0.08em', padding:'0.15rem 0.4rem', borderRadius:'3px' }}>
                    {u.tipo_sangre}
                  </span>
                </div>
              )}
            </div>

            <div className={styles.rowActions}>
              <button className={styles.btnEdit} onClick={() => setModal(u)}>✏️ Editar</button>
              <button
                className={`${styles.btnToggle} ${!u.activo ? styles.btnToggleOff : ''}`}
                onClick={() => handleToggle(u)}>
                {u.activo ? 'Desactivar' : 'Activar'}
              </button>
              <button className={styles.btnDelete} onClick={() => handleDelete(u)}>🗑</button>
            </div>
          </div>
          );
        })}
      </div>

      {modal !== null && (
        <UserModal
          user={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
