import { useState, useEffect, useCallback } from 'react';
import styles from './PresidenteVolunteers.module.css';
import { adminUsersApi, type AdminUser } from '../../services/api';
import { RankBadgeSVG, GRADOS, DIRECTIVA } from '../../utils/rankBadge';

type Filter = 'Todos' | 'VF' | 'VC' | 'VR';

function calcEdad(f: string | null) {
  if (!f) return null;
  const d = new Date(f); const h = new Date();
  let a = h.getFullYear() - d.getFullYear();
  if (h.getMonth() < d.getMonth() || (h.getMonth() === d.getMonth() && h.getDate() < d.getDate())) a--;
  return a;
}

function initials(u: AdminUser) {
  return `${u.nombre?.[0] ?? ''}${u.apellido_paterno?.[0] ?? ''}`.toUpperCase();
}

function fmtDate(s: string | null) {
  if (!s) return '—';
  return new Intl.DateTimeFormat('es-BO', { day:'numeric', month:'long', year:'numeric' }).format(new Date(s));
}

// ── Panel de detalle ──────────────────────────────────────────────
function DetailPanel({ user, onClose, onSaved }: { user: AdminUser; onClose: () => void; onSaved: (g: string, d: string) => void }) {
  const [grado,     setGrado]     = useState(user.grado     ?? '');
  const [directiva, setDirectiva] = useState(user.cargo_directiva ?? '');
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const edad = calcEdad(user.fecha_nacimiento);
  const gInfo = GRADOS.find(g => g.value === grado) ?? GRADOS[0];

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminUsersApi.updateGrado(user.id, grado, directiva);
      setShowSuccess(true);
      onSaved(grado, directiva);
    } catch(e) {
      console.error(e);
    } finally { setSaving(false); }
  };

  const codePill = user.codigo === 'VF' ? styles.pillVF : user.codigo === 'VC' ? styles.pillVC : styles.pillVR;

  return (
    <div className={styles.detailOverlay}>
      <div className={styles.detailBackdrop} onClick={onClose} />
      <div className={styles.detailPanel}>
        {/* Top */}
        <div className={styles.panelTop}>
          <span className={styles.panelTitle}>Ficha del voluntario</span>
          <button className={styles.closePanel} onClick={onClose}>✕</button>
        </div>

        {/* Hero */}
        <div className={styles.panelHero}>
          <div className={styles.panelAvatar}>{initials(user)}</div>
          <div>
            <div className={styles.panelName}>
              {user.nombre} {user.apellido_paterno} {user.apellido_materno}
            </div>
            <div className={styles.panelMatricula}>
              {user.codigo && <span className={`${styles.cardCodePill} ${codePill}`} style={{padding:'0.15rem 0.5rem',borderRadius:'3px',fontSize:'0.6rem',fontWeight:700,letterSpacing:'0.1em',marginRight:'0.5rem'}}>{user.codigo}</span>}
              {user.matricula || 'Sin matrícula'}
            </div>
          </div>
        </div>

        {/* Grado actual + badge */}
        <div className={styles.panelSection}>
          <div className={styles.panelBadgeLarge}>
            <RankBadgeSVG grado={grado} size={80} />
            <div className={styles.panelGradoName}>
              {gInfo.label || 'Sin grado asignado'}
            </div>
          </div>
        </div>

        {/* Datos personales */}
        <div className={styles.panelSection}>
          <div className={styles.panelSectionTitle}>Datos personales</div>
          <div className={styles.panelGrid2}>
            <div className={styles.panelItem}>
              <span className={styles.panelItemLabel}>Carnet</span>
              <span className={styles.panelItemValue}>{user.carnet_identidad || '—'}</span>
            </div>
            <div className={styles.panelItem}>
              <span className={styles.panelItemLabel}>Edad</span>
              <span className={styles.panelItemValue}>{edad !== null ? `${edad} años` : '—'}</span>
            </div>
            <div className={styles.panelItem}>
              <span className={styles.panelItemLabel}>Fecha de nacimiento</span>
              <span className={styles.panelItemValue}>{fmtDate(user.fecha_nacimiento)}</span>
            </div>
            <div className={styles.panelItem}>
              <span className={styles.panelItemLabel}>Tipo de sangre</span>
              <span className={styles.panelItemValue} style={{color: user.tipo_sangre ? '#f87171' : undefined}}>
                {user.tipo_sangre || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Contacto */}
        <div className={styles.panelSection}>
          <div className={styles.panelSectionTitle}>Contacto</div>
          <div className={styles.panelGrid2}>
            <div className={styles.panelItem}>
              <span className={styles.panelItemLabel}>Teléfono</span>
              <span className={styles.panelItemValue}>{user.telefono || '—'}</span>
            </div>
            <div className={styles.panelItem}>
              <span className={styles.panelItemLabel}>Correo</span>
              <span className={styles.panelItemValue} style={{fontSize:'0.78rem',wordBreak:'break-all'}}>{user.email}</span>
            </div>
            {user.domicilio && (
              <div className={styles.panelItem} style={{gridColumn:'span 2'}}>
                <span className={styles.panelItemLabel}>Domicilio</span>
                <span className={styles.panelItemValue}>{user.domicilio}</span>
              </div>
            )}
            {user.contacto_nombre && (
              <>
                <div className={styles.panelItem}>
                  <span className={styles.panelItemLabel}>Contacto de emergencia</span>
                  <span className={styles.panelItemValue}>{user.contacto_nombre}</span>
                </div>
                <div className={styles.panelItem}>
                  <span className={styles.panelItemLabel}>Tel. contacto</span>
                  <span className={styles.panelItemValue}>{user.contacto_telefono || '—'}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Institucional */}
        <div className={styles.panelSection}>
          <div className={styles.panelSectionTitle}>Información institucional</div>
          <div className={styles.panelGrid2}>
            <div className={styles.panelItem}>
              <span className={styles.panelItemLabel}>Especialidad</span>
              <span className={styles.panelItemValue}>{user.especialidad || '—'}</span>
            </div>
            <div className={styles.panelItem}>
              <span className={styles.panelItemLabel}>Rol en sistema</span>
              <span className={styles.panelItemValue}>{user.role}</span>
            </div>
          </div>
        </div>

        {/* ===== EDITOR: Grado + Directiva ===== */}
        <div className={styles.editSection}>
          <div className={styles.editTitle}>✏️ Asignar grado y cargo</div>

          {/* Selector de grado visual */}
          <div>
            <span className={styles.editLabel}>Grado / Charretera</span>
            <div className={styles.gradoGrid}>
              {GRADOS.filter(g => g.value).map(g => (
                <button
                  key={g.value}
                  className={`${styles.gradoBtn} ${grado === g.value ? styles.gradoBtnActive : ''}`}
                  onClick={() => setGrado(g.value)}
                  title={g.label}
                >
                  <svg className={styles.gradoBtnSvg} viewBox="0 0 48 72">
                    <path d="M8,72 L8,28 L24,14 L40,28 L40,72 Q40,72 8,72 Z"
                      fill={g.color === 'blue' ? '#2233CC' : '#FFE800'}
                      stroke="rgba(0,0,0,0.15)" strokeWidth="0.5"/>
                    {Array.from({length: Math.min(g.stripes,3)}).map((_,i) => (
                      <rect key={i} x="6" y={72-6-(i*6)} width="36" height="4"
                        fill={g.color === 'blue' ? '#FFE800' : '#2233CC'} opacity="0.9"/>
                    ))}
                    {(g.style==='tree'||g.style==='tree-ax'||g.style==='tree-red') && (
                      <path d="M24,20 C24,20 18,24 18,30 M24,20 C24,20 30,24 30,30 M20,30 C20,26 28,26 28,30 M24,20 L24,40"
                        fill="none" stroke="#1a4a1a" strokeWidth="2" strokeLinecap="round"/>
                    )}
                  </svg>
                  <span className={styles.gradoBtnLabel}>{g.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cargo directiva */}
          <div>
            <label className={styles.editLabel}>Cargo en la directiva</label>
            <select className={styles.editSelect} value={directiva} onChange={e=>setDirectiva(e.target.value)}>
              {DIRECTIVA.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>

          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {/* Modal de éxito */}
      {showSuccess && (
        <div className={styles.successOverlay} onClick={() => setShowSuccess(false)}>
          <div className={styles.successBox} onClick={e => e.stopPropagation()}>
            <div className={styles.successIcon}>✓</div>
            <div className={styles.successTitle}>¡Cambios guardados!</div>
            <p className={styles.successSub}>
              El grado y cargo de{' '}
              <strong style={{ color: 'white' }}>
                {user.nombre} {user.apellido_paterno}
              </strong>{' '}
              han sido actualizados correctamente.
            </p>
            <button className={styles.successClose} onClick={() => setShowSuccess(false)}>
              Aceptar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────
export default function PresidenteVolunteers() {
  const [users,    setUsers]    = useState<AdminUser[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<Filter>('Todos');
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState<AdminUser | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminUsersApi.list()
      .then(r => setUsers(r.filter(u => u.activo)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = users
    .filter(u => filter === 'Todos' || u.codigo === filter)
    .filter(u => {
      if (!search) return true;
      const s = search.toLowerCase();
      return `${u.nombre} ${u.apellido_paterno} ${u.apellido_materno}`.toLowerCase().includes(s)
        || u.matricula?.toLowerCase().includes(s)
        || u.carnet_identidad?.includes(s);
    });

  const codePillClass = (c: string) =>
    c === 'VF' ? styles.pillVF : c === 'VC' ? styles.pillVC : styles.pillVR;

  const directivaLabel = (v: string) =>
    DIRECTIVA.find(d => d.value === v)?.label ?? v;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <div className={styles.headerTitle}>Voluntarios</div>
          <div className={styles.headerSub}>
            {users.length} voluntarios activos — selecciona una tarjeta para ver el perfil completo
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className={styles.filtersBar}>
        {(['Todos','VF','VC','VR'] as Filter[]).map(f => (
          <button key={f}
            className={`${styles.filterBtn}
              ${f === 'VF' ? styles.codeVF : f === 'VC' ? styles.codeVC : f === 'VR' ? styles.codeVR : ''}
              ${filter === f ? styles.filterBtnActive : ''}`}
            onClick={() => setFilter(f)}>
            {f === 'Todos' ? 'Todos' : f === 'VF' ? '🦊 VF — Fundadores' : f === 'VC' ? '🤝 VC — Colaboradores' : '🧑‍🚒 VR — Rescatistas'}
          </button>
        ))}
        <input
          className={styles.search}
          placeholder="Buscar nombre, matrícula o CI…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <span className={styles.countLabel}>{visible.length} voluntarios</span>
      </div>

      {/* Grid de cards */}
      {loading && <p className={styles.empty}>Cargando voluntarios…</p>}

      <div className={styles.grid}>
        {visible.map(u => (
          <div
            key={u.id}
            className={`${styles.card} ${selected?.id === u.id ? styles.cardSelected : ''}`}
            onClick={() => setSelected(u)}
          >
            {/* Badge / charretera */}
            <div className={styles.cardBadgeWrap}>
              <RankBadgeSVG grado={u.grado ?? ''} size={72} />
              {u.codigo && (
                <span className={`${styles.cardCodePill} ${codePillClass(u.codigo)}`}>
                  {u.codigo}
                </span>
              )}
            </div>

            <div className={styles.cardBody}>
              <div className={styles.cardName}>
                {u.nombre} {u.apellido_paterno}
              </div>
              <div className={styles.cardMatricula}>{u.matricula || '—'}</div>
              {u.grado && (
                <div className={styles.cardGrado}>
                  <span>⭐</span>
                  {GRADOS.find(g => g.value === u.grado)?.label ?? u.grado}
                </div>
              )}
              {u.cargo_directiva && (
                <div className={styles.cardDirectiva}>📋 {directivaLabel(u.cargo_directiva)}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Panel detalle */}
      {selected && (
        <DetailPanel
          user={selected}
          onClose={() => setSelected(null)}
          onSaved={(grado, directiva) => {
            // Actualizar inmediatamente el selected con los nuevos valores
            setSelected(prev => prev ? { ...prev, grado, cargo_directiva: directiva } : null);
            // Refrescar la lista
            setUsers(prev => prev.map(u => u.id === selected.id
              ? { ...u, grado, cargo_directiva: directiva } : u
            ));
          }}
        />
      )}
    </div>
  );
}
