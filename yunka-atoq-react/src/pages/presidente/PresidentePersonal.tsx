import { useState, useEffect, useCallback, useRef } from 'react';
import styles from './PresidentePersonal.module.css';
import {
  personalApi, API_BASE,
  type PersonalItem, type PersonalDetalle, type PersonalEditData, type VoluntarioLogItem,
} from '../../services/api';
import { RankBadgeSVG, GRADOS } from '../../utils/rankBadge';

type Filtro = 'todos' | 'voluntarios' | 'postulantes';
type Tab = 'resumen' | 'editar' | 'meritos' | 'asistencia' | 'file' | 'historial';

function fmt(n: number) { return new Intl.NumberFormat('es-BO').format(n); }
function fmtDate(s: string | null) {
  if (!s) return '—';
  return new Intl.DateTimeFormat('es-BO', { day:'numeric', month:'short', year:'numeric' }).format(new Date(s));
}
function calcEdad(f: string | null) {
  if (!f) return null;
  const d = new Date(f), h = new Date();
  let a = h.getFullYear() - d.getFullYear();
  if (h.getMonth() < d.getMonth() || (h.getMonth() === d.getMonth() && h.getDate() < d.getDate())) a--;
  return a;
}
function gradoLabel(g: string) { return GRADOS.find(x => x.value === g)?.label ?? (g || 'Sin grado'); }
function codePill(c: string) {
  return c === 'VF' ? styles.pillVF : c === 'VC' ? styles.pillVC : c === 'VR' ? styles.pillVR : styles.pillPost;
}
function today() { return new Date().toISOString().slice(0, 10); }
function fmtSize(b: number) {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b/1024).toFixed(0)} KB`;
  return `${(b/1048576).toFixed(1)} MB`;
}

const DOC_CATS = [
  { value: 'identidad',      label: 'Identidad',      icon: '🪪' },
  { value: 'certificado',    label: 'Certificado',    icon: '📜' },
  { value: 'medico',         label: 'Médico',         icon: '🩺' },
  { value: 'administrativo', label: 'Administrativo', icon: '🗂️' },
  { value: 'formacion',      label: 'Formación',      icon: '🎓' },
  { value: 'otro',           label: 'Otro',           icon: '📎' },
];
function catIcon(c: string) { return DOC_CATS.find(d => d.value === c)?.icon ?? '📎'; }
function catLabel(c: string) { return DOC_CATS.find(d => d.value === c)?.label ?? c; }

function fmtDateTime(s: string) {
  return new Intl.DateTimeFormat('es-BO', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }).format(new Date(s));
}

const LOG_META: Record<VoluntarioLogItem['accion'], { icon: string; label: string; color: string }> = {
  edicion:   { icon: '✏️', label: 'Edición',   color: '#60a5fa' },
  merito:    { icon: '🏅', label: 'Mérito',    color: '#4ade80' },
  demerito:  { icon: '⚠️', label: 'Demérito',  color: '#f87171' },
  asistencia:{ icon: '🗓️', label: 'Asistencia', color: '#fbbf24' },
  documento: { icon: '📁', label: 'Documento', color: '#c4b5fd' },
  grado:     { icon: '⭐', label: 'Grado',     color: '#f59e0b' },
};

const EST_LABEL: Record<string, string> = { presente:'Presente', falta:'Falta', permiso:'Permiso', comision:'Comisión' };
const EST_CLASS: Record<string, string> = {
  presente: styles.estPresente, falta: styles.estFalta, permiso: styles.estPermiso, comision: styles.estComision,
};

// ══════════════════════════════════════════════════════════════════
// MODAL DE DETALLE
// ══════════════════════════════════════════════════════════════════
function PersonaModal({ persona, onClose, onChanged }: {
  persona: PersonalItem; onClose: () => void; onChanged: () => void;
}) {
  const [tab, setTab]   = useState<Tab>('resumen');
  const [data, setData] = useState<PersonalDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    personalApi.detalle(persona.id).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [persona.id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2200); };
  const refresh = () => { load(); onChanged(); };

  const u = data?.usuario;
  const edad = calcEdad(persona.fecha_nacimiento);

  const meritos = data?.meritos ?? [];
  const asistencias = data?.asistencias ?? [];
  const documentos = data?.documentos ?? [];
  const puntosHist = data?.puntos_historial ?? [];
  const log = data?.log ?? [];
  const res = data?.resumen_asistencia ?? { presente:0, falta:0, permiso:0, comision:0 };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Hero */}
        <div className={styles.hero}>
          <div className={styles.heroBadge}>
            <RankBadgeSVG grado={persona.grado || ''} size={58} />
            <span className={styles.heroGradoName}>{gradoLabel(persona.grado)}</span>
          </div>
          <div className={styles.heroInfo}>
            <div className={styles.heroName}>
              {persona.nombre} {persona.apellido_paterno} {persona.apellido_materno}
            </div>
            <div className={styles.heroMeta}>
              {persona.codigo && <span className={`${styles.codePill} ${codePill(persona.codigo)}`}>{persona.codigo}</span>}
              <span className={styles.matTag}>{persona.matricula || 'Sin matrícula'}</span>
              <span className={styles.ptsTag}>⭐ {fmt(persona.total_puntos)} pts</span>
              <span className={styles.roleTag}>{persona.role === 'postulante' ? 'Postulante' : persona.cargo_directiva || 'Voluntario'}</span>
            </div>
          </div>
          <div className={styles.heroActions}>
            <button className={styles.editBtn} onClick={() => setTab('editar')}>✏️ Editar</button>
            <button className={styles.heroClose} onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab==='resumen'?styles.tabActive:''}`} onClick={() => setTab('resumen')}>
            📋 Resumen
          </button>
          <button className={`${styles.tab} ${tab==='editar'?styles.tabActive:''}`} onClick={() => setTab('editar')}>
            ✏️ Editar
          </button>
          <button className={`${styles.tab} ${tab==='meritos'?styles.tabActive:''}`} onClick={() => setTab('meritos')}>
            🏅 Méritos / Deméritos <span className={styles.tabCount}>{meritos.length}</span>
          </button>
          <button className={`${styles.tab} ${tab==='asistencia'?styles.tabActive:''}`} onClick={() => setTab('asistencia')}>
            🗓️ Asistencia <span className={styles.tabCount}>{asistencias.length}</span>
          </button>
          <button className={`${styles.tab} ${tab==='file'?styles.tabActive:''}`} onClick={() => setTab('file')}>
            📁 File <span className={styles.tabCount}>{documentos.length}</span>
          </button>
          <button className={`${styles.tab} ${tab==='historial'?styles.tabActive:''}`} onClick={() => setTab('historial')}>
            🕘 Historial <span className={styles.tabCount}>{log.length}</span>
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {loading && <p className={styles.emptyDark}>Cargando información…</p>}

          {!loading && u && tab === 'resumen' && (
            <ResumenTab u={u} edad={edad} persona={persona} res={res} ops={data?.operaciones ?? []}
              puntosHist={puntosHist} />
          )}
          {!loading && u && tab === 'editar' && (
            <EditarTab vid={persona.id} u={u} onSaved={() => { refresh(); flash('Información actualizada'); setTab('historial'); }} />
          )}
          {!loading && tab === 'historial' && (
            <HistorialTab log={log} />
          )}
          {!loading && tab === 'meritos' && (
            <MeritosTab vid={persona.id} meritos={meritos} onSaved={() => { refresh(); flash('Registro guardado'); }} />
          )}
          {!loading && tab === 'asistencia' && (
            <AsistenciaTab vid={persona.id} asistencias={asistencias} res={res}
              onSaved={() => { refresh(); flash('Asistencia registrada'); }}
              onDeleted={() => { refresh(); flash('Registro eliminado'); }} />
          )}
          {!loading && tab === 'file' && (
            <FileTab vid={persona.id} documentos={documentos}
              onSaved={() => { refresh(); flash('Documento subido'); }}
              onDeleted={() => { refresh(); flash('Documento eliminado'); }} />
          )}
        </div>
      </div>
      {toast && <div className={styles.toast}>✓ {toast}</div>}
    </div>
  );
}

// ── Tab: Resumen ──────────────────────────────────────────────────
function ResumenTab({ u, edad, persona, res, ops, puntosHist }: {
  u: PersonalDetalle['usuario']; edad: number | null; persona: PersonalItem;
  res: PersonalDetalle['resumen_asistencia']; ops: PersonalDetalle['operaciones'];
  puntosHist: PersonalDetalle['puntos_historial'];
}) {
  const ptsOps = puntosHist.filter(p => p.operacion_id).reduce((s,p)=>s+p.puntos,0);
  const ptsMer = puntosHist.filter(p => !p.operacion_id && p.puntos > 0).reduce((s,p)=>s+p.puntos,0);
  const ptsNeg = puntosHist.filter(p => p.puntos < 0).reduce((s,p)=>s+p.puntos,0);
  const info: [string, string][] = [
    ['Carnet de identidad', u.carnet_identidad || '—'],
    ['Fecha de nacimiento', `${fmtDate(u.fecha_nacimiento)}${edad !== null ? ` · ${edad} años` : ''}`],
    ['Tipo de sangre', u.tipo_sangre || '—'],
    ['Especialidad', u.especialidad || '—'],
    ['Teléfono', u.telefono || '—'],
    ['Correo', u.email || '—'],
    ['Domicilio', u.domicilio || '—'],
    ['Contacto de emergencia', u.contacto_nombre ? `${u.contacto_nombre} · ${u.contacto_telefono || ''}` : '—'],
    ['Antigüedad', u.antiguedad_anios ? `${u.antiguedad_anios} año(s)` : '—'],
    ['Ingreso al sistema', fmtDate(u.created_at)],
  ];
  return (
    <>
      <div className={styles.sectionTitle}>👤 Datos personales</div>
      <div className={styles.infoGrid}>
        {info.map(([l, v]) => (
          <div key={l} className={styles.infoItem}>
            <span className={styles.infoLabel}>{l}</span>
            <span className={styles.infoValue}>{v}</span>
          </div>
        ))}
      </div>

      <div className={styles.sectionTitle}>📊 Indicadores</div>
      <div className={styles.statRow}>
        <div className={styles.statBox}><div className={styles.statNum} style={{color:'#a78bfa'}}>{fmt(persona.total_puntos)}</div><div className={styles.statLbl}>Puntos</div></div>
        <div className={styles.statBox}><div className={styles.statNum} style={{color:'#60a5fa'}}>{persona.ops_validadas}</div><div className={styles.statLbl}>Operaciones</div></div>
        <div className={styles.statBox}><div className={styles.statNum} style={{color:'#4ade80'}}>{persona.meritos_count}</div><div className={styles.statLbl}>Méritos</div></div>
        <div className={styles.statBox}><div className={styles.statNum} style={{color:'#f87171'}}>{persona.demeritos_count}</div><div className={styles.statLbl}>Deméritos</div></div>
        <div className={styles.statBox}><div className={styles.statNum} style={{color:'#4ade80'}}>{res.presente}</div><div className={styles.statLbl}>Presentes</div></div>
        <div className={styles.statBox}><div className={styles.statNum} style={{color:'#f87171'}}>{res.falta}</div><div className={styles.statLbl}>Faltas</div></div>
      </div>

      {/* Desglose de puntos — de dónde sale el total */}
      <div className={styles.sectionTitle}>⭐ Desglose de puntos ({fmt(persona.total_puntos)} pts)</div>
      {(ptsOps !== 0 || ptsMer !== 0 || ptsNeg !== 0) && (
        <div className={styles.breakdown}>
          {ptsOps !== 0 && (
            <div className={styles.bdItem}><span className={styles.bdLabel}>🚒 Operaciones</span><span className={styles.bdPts} style={{color:'#4ade80'}}>+{ptsOps}</span></div>
          )}
          {ptsMer !== 0 && (
            <div className={styles.bdItem}><span className={styles.bdLabel}>🏅 Méritos</span><span className={styles.bdPts} style={{color:'#4ade80'}}>+{ptsMer}</span></div>
          )}
          {ptsNeg !== 0 && (
            <div className={styles.bdItem}><span className={styles.bdLabel}>⚠️ Deméritos / ajustes</span><span className={styles.bdPts} style={{color:'#f87171'}}>{ptsNeg}</span></div>
          )}
        </div>
      )}
      {puntosHist.length === 0 ? (
        <p className={styles.emptyDark}>Sin movimientos de puntos registrados.</p>
      ) : (
        <div className={styles.table}>
          {puntosHist.map(p => (
            <div key={p.id} className={styles.tRow} style={{gridTemplateColumns:'1fr 120px 130px 56px'}}>
              <div>
                <div className={styles.tTitle}>{p.concepto}</div>
                {p.operacion_id ? <div className={styles.tSub}>Operación #{p.operacion_id}</div> : null}
              </div>
              <span className={styles.tDate}>{p.asignado_nombre || '—'}</span>
              <span className={styles.tDate}>{fmtDate(p.created_at)}</span>
              <span className={styles.tPts} style={{color: p.puntos < 0 ? '#f87171' : '#4ade80'}}>
                {p.puntos > 0 ? `+${p.puntos}` : p.puntos}
              </span>
            </div>
          ))}
        </div>
      )}

      {ops.length > 0 && (
        <>
          <div className={styles.sectionTitle}>🚒 Operaciones recientes</div>
          <div className={styles.table}>
            {ops.slice(0, 6).map(o => (
              <div key={o.id} className={styles.tRow} style={{gridTemplateColumns:'1fr 110px 60px'}}>
                <div><div className={styles.tTitle}>{o.titulo}</div>{o.lugar && <div className={styles.tSub}>{o.lugar}</div>}</div>
                <span className={styles.tDate}>{fmtDate(o.fecha)}</span>
                <span className={styles.tPts} style={{color: o.estado==='validado'?'#4ade80':'#94a3b8'}}>
                  {o.puntos_asignados > 0 ? `+${o.puntos_asignados}` : '—'}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

// ── Tab: Editar información personal ──────────────────────────────
function EditarTab({ vid, u, onSaved }: {
  vid: number; u: PersonalDetalle['usuario']; onSaved: () => void;
}) {
  const [form, setForm] = useState<PersonalEditData>({
    nombre: u.nombre || '', apellido_paterno: u.apellido_paterno || '', apellido_materno: u.apellido_materno || '',
    fecha_nacimiento: u.fecha_nacimiento ? u.fecha_nacimiento.slice(0, 10) : '',
    carnet_identidad: u.carnet_identidad || '', tipo_sangre: u.tipo_sangre || '',
    telefono: u.telefono || '', email: u.email || '', domicilio: u.domicilio || '',
    contacto_nombre: u.contacto_nombre || '', contacto_telefono: u.contacto_telefono || '',
    especialidad: u.especialidad || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof PersonalEditData, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    setSaving(true);
    try {
      await personalApi.update(vid, { ...form, fecha_nacimiento: form.fecha_nacimiento || null });
      onSaved();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const field = (label: string, k: keyof PersonalEditData, type = 'text') => (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      <input className={styles.input} type={type} value={(form[k] as string) ?? ''} onChange={e => set(k, e.target.value)} />
    </div>
  );

  return (
    <div className={styles.formCard}>
      <div className={styles.formTitle}>✏️ Editar información personal</div>
      <div className={styles.row2}>
        {field('Nombre', 'nombre')}
        {field('Especialidad', 'especialidad')}
      </div>
      <div className={styles.row2}>
        {field('Apellido paterno', 'apellido_paterno')}
        {field('Apellido materno', 'apellido_materno')}
      </div>
      <div className={styles.row2}>
        {field('Carnet de identidad', 'carnet_identidad')}
        {field('Fecha de nacimiento', 'fecha_nacimiento', 'date')}
      </div>
      <div className={styles.row2}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Tipo de sangre</label>
          <select className={styles.select} value={form.tipo_sangre ?? ''} onChange={e => set('tipo_sangre', e.target.value)}>
            <option value="">—</option>
            {['O+','O-','A+','A-','B+','B-','AB+','AB-'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        {field('Teléfono', 'telefono')}
      </div>
      {field('Correo', 'email', 'email')}
      {field('Domicilio', 'domicilio')}
      <div className={styles.row2}>
        {field('Contacto de emergencia', 'contacto_nombre')}
        {field('Tel. de contacto', 'contacto_telefono')}
      </div>
      <button className={styles.primaryBtn} onClick={submit} disabled={saving}>
        {saving ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </div>
  );
}

// ── Tab: Historial / bitácora ─────────────────────────────────────
function HistorialTab({ log }: { log: VoluntarioLogItem[] }) {
  if (log.length === 0) return <p className={styles.emptyDark}>Sin movimientos registrados todavía.</p>;
  return (
    <>
      <div className={styles.sectionTitle}>🕘 Bitácora de cambios ({log.length})</div>
      <div className={styles.timeline}>
        {log.map(l => {
          const m = LOG_META[l.accion] ?? { icon: '•', label: l.accion, color: '#94a3b8' };
          return (
            <div key={l.id} className={styles.tlItem}>
              <div className={styles.tlDot} style={{ background: m.color }}>{m.icon}</div>
              <div className={styles.tlBody}>
                <div className={styles.tlHead}>
                  <span className={styles.tlTag} style={{ color: m.color, borderColor: m.color }}>{m.label}</span>
                  <span className={styles.tlDate}>{fmtDateTime(l.created_at)}</span>
                </div>
                <div className={styles.tlText}>{l.detalle}</div>
                {l.registrado_nombre && <div className={styles.tlBy}>por {l.registrado_nombre}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ── Tab: Méritos / Deméritos ──────────────────────────────────────
function MeritosTab({ vid, meritos, onSaved }: {
  vid: number; meritos: PersonalDetalle['meritos']; onSaved: () => void;
}) {
  const [tipo, setTipo] = useState<'merito'|'demerito'>('merito');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [puntos, setPuntos] = useState('');
  const [fecha, setFecha] = useState(today());
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!titulo.trim()) return;
    setSaving(true);
    try {
      await personalApi.addMerito(vid, {
        tipo, titulo: titulo.trim(), descripcion: descripcion.trim(),
        puntos_extra: Number(puntos) || 0, fecha,
      });
      setTitulo(''); setDescripcion(''); setPuntos('');
      onSaved();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  return (
    <>
      <div className={styles.formCard}>
        <div className={styles.formTitle}>➕ Registrar mérito o demérito</div>
        <div className={styles.segment}>
          <button className={`${styles.segBtn} ${styles.segMerito} ${tipo==='merito'?styles.segBtnActive:''}`} onClick={() => setTipo('merito')}>🏅 Mérito</button>
          <button className={`${styles.segBtn} ${styles.segDemerito} ${tipo==='demerito'?styles.segBtnActive:''}`} onClick={() => setTipo('demerito')}>⚠️ Demérito</button>
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Título</label>
          <input className={styles.input} value={titulo} onChange={e=>setTitulo(e.target.value)}
            placeholder={tipo==='merito' ? 'Ej. Destacado en operativo nocturno' : 'Ej. Inasistencia injustificada'} />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Descripción</label>
          <textarea className={styles.textarea} value={descripcion} onChange={e=>setDescripcion(e.target.value)}
            placeholder="Detalle del reconocimiento o sanción…" />
        </div>
        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Puntos {tipo==='demerito' && '(se restarán)'}</label>
            <input className={styles.input} type="number" min="0" value={puntos} onChange={e=>setPuntos(e.target.value)} placeholder="0" />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Fecha</label>
            <input className={styles.input} type="date" value={fecha} onChange={e=>setFecha(e.target.value)} />
          </div>
        </div>
        <button className={styles.primaryBtn} onClick={submit} disabled={saving || !titulo.trim()}>
          {saving ? 'Guardando…' : 'Registrar'}
        </button>
      </div>

      <div className={styles.sectionTitle}>📜 Historial ({meritos.length})</div>
      {meritos.length === 0 ? (
        <p className={styles.emptyDark}>Sin méritos ni deméritos registrados.</p>
      ) : (
        <div className={styles.table}>
          {meritos.map(m => {
            const isDem = m.tipo === 'demerito';
            const isAnt = m.tipo === 'antiguedad';
            return (
              <div key={m.id} className={styles.tRow} style={{gridTemplateColumns:'90px 1fr 100px 56px'}}>
                <span className={styles.estPill} style={{
                  background: isDem ? 'rgba(196,30,30,0.18)' : isAnt ? 'rgba(124,58,237,0.18)' : 'rgba(22,163,74,0.18)',
                  color: isDem ? '#f87171' : isAnt ? '#c4b5fd' : '#4ade80',
                }}>{isDem ? 'Demérito' : isAnt ? 'Antigüedad' : 'Mérito'}</span>
                <div><div className={styles.tTitle}>{m.titulo}</div>{m.descripcion && <div className={styles.tSub}>{m.descripcion}</div>}</div>
                <span className={styles.tDate}>{fmtDate(m.fecha)}</span>
                <span className={styles.tPts} style={{color: isDem ? '#f87171' : '#4ade80'}}>
                  {(m.puntos_extra||0) > 0 ? (isDem ? `−${m.puntos_extra}` : `+${m.puntos_extra}`) : '—'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ── Tab: Asistencia ───────────────────────────────────────────────
function AsistenciaTab({ vid, asistencias, res, onSaved, onDeleted }: {
  vid: number; asistencias: PersonalDetalle['asistencias'];
  res: PersonalDetalle['resumen_asistencia']; onSaved: () => void; onDeleted: () => void;
}) {
  const [fecha, setFecha] = useState(today());
  const [estado, setEstado] = useState<'presente'|'falta'|'permiso'|'comision'>('presente');
  const [obs, setObs] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await personalApi.addAsistencia(vid, { fecha, estado, observacion: obs.trim() });
      setObs('');
      onSaved();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };
  const del = async (aid: number) => {
    try { await personalApi.deleteAsistencia(aid); onDeleted(); } catch (e) { console.error(e); }
  };

  return (
    <>
      <div className={styles.statRow} style={{marginBottom:'1.25rem'}}>
        <div className={styles.statBox}><div className={styles.statNum} style={{color:'#4ade80'}}>{res.presente}</div><div className={styles.statLbl}>Presente</div></div>
        <div className={styles.statBox}><div className={styles.statNum} style={{color:'#f87171'}}>{res.falta}</div><div className={styles.statLbl}>Falta</div></div>
        <div className={styles.statBox}><div className={styles.statNum} style={{color:'#60a5fa'}}>{res.permiso}</div><div className={styles.statLbl}>Permiso</div></div>
        <div className={styles.statBox}><div className={styles.statNum} style={{color:'#fbbf24'}}>{res.comision}</div><div className={styles.statLbl}>Comisión</div></div>
      </div>

      <div className={styles.formCard}>
        <div className={styles.formTitle}>➕ Registrar asistencia a instrucción</div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Día de instrucción</label>
          <input className={styles.input} type="date" value={fecha} onChange={e=>setFecha(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Estado</label>
          <div className={`${styles.segment} ${styles.four}`}>
            <button className={`${styles.segBtn} ${styles.segPresente} ${estado==='presente'?styles.segBtnActive:''}`} onClick={()=>setEstado('presente')}>✅ Presente</button>
            <button className={`${styles.segBtn} ${styles.segFalta} ${estado==='falta'?styles.segBtnActive:''}`} onClick={()=>setEstado('falta')}>❌ Falta</button>
            <button className={`${styles.segBtn} ${styles.segPermiso} ${estado==='permiso'?styles.segBtnActive:''}`} onClick={()=>setEstado('permiso')}>📝 Permiso</button>
            <button className={`${styles.segBtn} ${styles.segComision} ${estado==='comision'?styles.segBtnActive:''}`} onClick={()=>setEstado('comision')}>🚩 Comisión</button>
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Observación (opcional)</label>
          <input className={styles.input} value={obs} onChange={e=>setObs(e.target.value)} placeholder="Motivo, novedad…" />
        </div>
        <button className={styles.primaryBtn} onClick={submit} disabled={saving}>
          {saving ? 'Guardando…' : 'Registrar asistencia'}
        </button>
      </div>

      <div className={styles.sectionTitle}>🗓️ Historial ({asistencias.length})</div>
      {asistencias.length === 0 ? (
        <p className={styles.emptyDark}>Sin registros de asistencia.</p>
      ) : (
        <div className={styles.table}>
          {asistencias.map(a => (
            <div key={a.id} className={styles.tRow} style={{gridTemplateColumns:'110px 96px 1fr 34px'}}>
              <span className={styles.tDate}>{fmtDate(a.fecha)}</span>
              <span className={`${styles.estPill} ${EST_CLASS[a.estado]}`}>{EST_LABEL[a.estado]}</span>
              <span className={styles.tSub} style={{margin:0}}>{a.observacion || '—'}</span>
              <button className={styles.docDel} onClick={() => del(a.id)} title="Eliminar">✕</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ── Tab: File (documentos) ────────────────────────────────────────
function FileTab({ vid, documentos, onSaved, onDeleted }: {
  vid: number; documentos: PersonalDetalle['documentos']; onSaved: () => void; onDeleted: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('certificado');
  const [descripcion, setDescripcion] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    if (!file) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('archivo', file);
      fd.append('nombre', nombre.trim() || file.name);
      fd.append('categoria', categoria);
      fd.append('descripcion', descripcion.trim());
      await personalApi.addDocumento(vid, fd);
      setNombre(''); setDescripcion(''); setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      onSaved();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };
  const del = async (did: number) => {
    if (!window.confirm('¿Eliminar este documento?')) return;
    try { await personalApi.deleteDocumento(did); onDeleted(); } catch (e) { console.error(e); }
  };

  return (
    <>
      <div className={styles.formCard}>
        <div className={styles.formTitle}>📤 Subir documento al file</div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Archivo (PDF, imagen, etc. — máx. 25 MB)</label>
          <div className={`${styles.dropzone} ${file ? styles.dropOk : ''}`} onClick={() => fileRef.current?.click()}>
            <span style={{fontSize:'1.25rem'}}>{file ? '📄' : '⬆️'}</span>
            <span>{file ? `${file.name} · ${fmtSize(file.size)}` : 'Haz clic para seleccionar un archivo'}</span>
          </div>
          <input ref={fileRef} type="file" hidden onChange={e => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Nombre del documento</label>
            <input className={styles.input} value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Ej. Carnet de identidad" />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Categoría</label>
            <select className={styles.select} value={categoria} onChange={e=>setCategoria(e.target.value)}>
              {DOC_CATS.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
            </select>
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Descripción (opcional)</label>
          <input className={styles.input} value={descripcion} onChange={e=>setDescripcion(e.target.value)} placeholder="Nota sobre el documento…" />
        </div>
        <button className={styles.primaryBtn} onClick={submit} disabled={saving || !file}>
          {saving ? 'Subiendo…' : 'Subir documento'}
        </button>
      </div>

      <div className={styles.sectionTitle}>📁 Documentos archivados ({documentos.length})</div>
      {documentos.length === 0 ? (
        <p className={styles.emptyDark}>Este voluntario aún no tiene documentos en su file.</p>
      ) : (
        <div className={styles.docGrid}>
          {documentos.map(d => (
            <div key={d.id} className={styles.docCard}>
              <span className={styles.docIcon}>{catIcon(d.categoria)}</span>
              <span className={styles.docCat}>{catLabel(d.categoria)}</span>
              <div className={styles.docName}>{d.nombre}</div>
              {d.descripcion && <div className={styles.docDesc}>{d.descripcion}</div>}
              <div className={styles.docDesc}>{fmtDate(d.created_at)}{d.tamano ? ` · ${fmtSize(d.tamano)}` : ''}</div>
              <div className={styles.docActions}>
                <a className={styles.docLink} href={`${API_BASE}${d.archivo_url}`} target="_blank" rel="noreferrer">Ver / Descargar</a>
                <button className={styles.docDel} onClick={() => del(d.id)} title="Eliminar">🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════════════════
export default function PresidentePersonal() {
  const [personal, setPersonal] = useState<PersonalItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filtro, setFiltro]     = useState<Filtro>('todos');
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState<PersonalItem | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    personalApi.list().then(setPersonal).catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const voluntarios = personal.filter(p => p.role !== 'postulante');
  const postulantes = personal.filter(p => p.role === 'postulante');

  const visible = personal
    .filter(p => filtro === 'todos' || (filtro === 'voluntarios' ? p.role !== 'postulante' : p.role === 'postulante'))
    .filter(p => {
      if (!search) return true;
      const s = search.toLowerCase();
      return `${p.nombre} ${p.apellido_paterno} ${p.apellido_materno}`.toLowerCase().includes(s)
        || (p.matricula || '').toLowerCase().includes(s)
        || (p.carnet_identidad || '').includes(s)
        || (p.especialidad || '').toLowerCase().includes(s);
    });

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <div className={styles.headerTitle}>Personal</div>
          <div className={styles.headerSub}>
            Gestión integral de voluntarios y postulantes — méritos, asistencia y file documental
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className={styles.kpiStrip}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiIcon}>🧑‍🚒</span>
          <div className={styles.kpiValue}>{loading ? '—' : fmt(personal.length)}</div>
          <div className={styles.kpiLabel}>Total personal</div>
        </div>
        <div className={`${styles.kpiCard} ${styles.red}`}>
          <span className={styles.kpiIcon}>🚒</span>
          <div className={styles.kpiValue}>{loading ? '—' : fmt(voluntarios.length)}</div>
          <div className={styles.kpiLabel}>Voluntarios</div>
        </div>
        <div className={`${styles.kpiCard} ${styles.amber}`}>
          <span className={styles.kpiIcon}>🌱</span>
          <div className={styles.kpiValue}>{loading ? '—' : fmt(postulantes.length)}</div>
          <div className={styles.kpiLabel}>Postulantes</div>
        </div>
        <div className={`${styles.kpiCard} ${styles.green}`}>
          <span className={styles.kpiIcon}>🏅</span>
          <div className={styles.kpiValue}>{loading ? '—' : fmt(personal.reduce((s,p)=>s+p.meritos_count,0))}</div>
          <div className={styles.kpiLabel}>Méritos otorgados</div>
        </div>
      </div>

      {/* Filtros */}
      <div className={styles.filtersBar}>
        {([
          ['todos','Todos'], ['voluntarios','🚒 Voluntarios'], ['postulantes','🌱 Postulantes'],
        ] as [Filtro,string][]).map(([f, label]) => (
          <button key={f}
            className={`${styles.filterBtn} ${filtro===f?styles.filterBtnActive:''}`}
            onClick={() => setFiltro(f)}>{label}</button>
        ))}
        <input className={styles.search} placeholder="Buscar nombre, matrícula, CI o especialidad…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <span className={styles.countLabel}>{visible.length} registros</span>
      </div>

      {/* Lista */}
      <div className={styles.list}>
        <div className={styles.listHead}>
          <span>Grado</span><span>Voluntario</span><span>Cargo / Esp.</span>
          <span style={{textAlign:'right'}}>Puntos</span>
          <span style={{textAlign:'center'}}>M / D</span>
          <span style={{textAlign:'center'}}>Asist.</span>
        </div>

        {loading && <div className={styles.empty}>Cargando personal…</div>}
        {!loading && visible.length === 0 && <div className={styles.empty}>Sin resultados.</div>}

        {visible.map(p => (
          <div key={p.id} className={styles.listRow} onClick={() => setSelected(p)}>
            <div className={styles.rowBadge}><RankBadgeSVG grado={p.grado || ''} size={30} /></div>
            <div className={styles.rowPerson}>
              <span className={styles.rowName}>{p.nombre} {p.apellido_paterno} {p.apellido_materno}</span>
              <span className={styles.rowSub}>
                {p.codigo && <span className={`${styles.codePill} ${codePill(p.codigo)}`} style={{marginRight:6}}>{p.codigo}</span>}
                {p.matricula || (p.role === 'postulante' ? 'Postulante' : 'Sin matrícula')}
              </span>
            </div>
            <span>
              {p.cargo_directiva
                ? <span className={styles.gradoTag}>{p.cargo_directiva}</span>
                : p.especialidad
                  ? <span className={styles.rowSub} style={{margin:0}}>{p.especialidad}</span>
                  : <span className={styles.dash}>—</span>}
            </span>
            <span className={styles.cellNum}>{fmt(p.total_puntos)}</span>
            <span className={styles.cellMd}>
              <span className={styles.mUp}>{p.meritos_count}</span>
              <span className={styles.dash} style={{margin:'0 4px'}}>/</span>
              <span className={styles.mDown}>{p.demeritos_count}</span>
            </span>
            <span className={styles.cellAsist}>
              <span style={{color:'#16a34a'}}>{p.asist_presente}</span>
              <span className={styles.dash} style={{margin:'0 3px'}}>·</span>
              <span style={{color:'#C41E1E'}}>{p.asist_falta}</span>
            </span>
          </div>
        ))}
      </div>

      {selected && (
        <PersonaModal persona={selected} onClose={() => setSelected(null)}
          onChanged={() => {
            // refrescar la lista en segundo plano y sincronizar la tarjeta seleccionada
            personalApi.list().then(list => {
              setPersonal(list);
              setSelected(prev => prev ? (list.find(x => x.id === prev.id) ?? prev) : null);
            }).catch(() => {});
          }} />
      )}
    </div>
  );
}
