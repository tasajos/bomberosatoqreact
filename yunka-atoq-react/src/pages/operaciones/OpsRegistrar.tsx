import { useState, useEffect, useRef } from 'react';
import { adminUsersApi, type AdminUser, API_BASE_URL } from '../../services/api';
import styles from './Ops.module.css';

const OFICIALES_ROLES = ['jefe_operaciones','jefe_personal','coordinador','presidente','admin','fundador'];

// RO-001/25 Art. 9-12 — Tabla de calificación exacta
const CALIFICACION_RO = [
  { c:'Memorándum a favor',                                                  p:  5 },
  { c:'Memorándum en contra',                                                p: -6 },
  { c:'Reconocimientos',                                                     p:  4 },
  { c:'Certificaciones de la institución',                                   p: 10 },
  { c:'Certificaciones externos nacional',                                   p:  5 },
  { c:'Certificaciones Internacionales',                                     p:  8 },
  { c:'Por cada operación',                                                  p:  2 },
  { c:'Arresto coordinador Departamental',                                   p: -2 },
  { c:'Arresto coordinador Nacional',                                        p: -3 },
  { c:'Arresto por oficiales',                                               p: -1 },
  { c:'Por cada Apoyo (colectas, campañas)',                                 p:  1 },
  { c:'Por cada Participación de Emergencia Nacional',                       p: 10 },
  { c:'Por cada Participación de Emergencia Internacional',                  p: 15 },
  { c:'Por Representar a la Institución con instituciones internacionales',  p: 20 },
  { c:'Informe Negativo de Finanzas',                                        p:-25 },
];

// RO-001/25 Art. 5 — Clasificación de voluntarios
const CLASIFICACION_RO = [
  {
    value: 'voluntario_operativo',
    label: 'Voluntario Operativo',
    icon: '🚒',
    desc: 'Desempeñando cargo elegido/designado en órganos de dirección, operación o comisión de servicio. Computa antigüedad.',
    color: '#16a34a',
  },
  {
    value: 'voluntario_cooperador',
    label: 'Voluntario Cooperador',
    icon: '🤝',
    desc: 'Apoyo a actividades administrativas, económicas y sociales sin sujeción a normas del servicio activo.',
    color: '#0369a1',
  },
  {
    value: 'voluntario_asimilado',
    label: 'Voluntario Asimilado',
    icon: '🎓',
    desc: 'Profesionales que prestan apoyo aplicando su área de expertise. Ascenso limitado hasta Tte. 1ro (Art. 6).',
    color: '#d97706',
  },
  {
    value: 'voluntario_fundador',
    label: 'Voluntario Fundador',
    icon: '🦊',
    desc: 'Miembros fundadores de la institución. Voz y voto permanente en directiva. Ascenso hasta grado máximo (Art. 7).',
    color: '#7c3aed',
  },
];

export default function OpsRegistrar() {
  const [voluntarios, setVoluntarios] = useState<AdminUser[]>([]);
  const [form, setForm] = useState({
    tipo: 'local', clasificacion_ro: 'voluntario_operativo',
    calificacion_tipo: '', calificacion_puntos: '',
    titulo: '', descripcion: '', lugar: '',
    fecha: new Date().toISOString().slice(0, 16),
    duracion_horas: '', voluntario_id: '', oficial_responsable_id: '',
  });
  const [personal,   setPersonal]   = useState<number[]>([]);
  const [imgFile,    setImgFile]    = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState('');
  const [saving,     setSaving]     = useState(false);
  const [msg,        setMsg]        = useState('');
  const [err,        setErr]        = useState('');
  const [modal,      setModal]      = useState<'success'|'error'|null>(null);
  const [modalMsg,   setModalMsg]   = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    adminUsersApi.list().then(r => setVoluntarios(r.filter(u => u.activo))).catch(() => {});
  }, []);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const togglePersonal = (id: number) =>
    setPersonal(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleFile = (f: File) => {
    setImgFile(f);
    const r = new FileReader();
    r.onload = e => setImgPreview(e.target?.result as string);
    r.readAsDataURL(f);
  };

  const handleSave = async () => {
    if (!form.titulo || !form.fecha) { setErr('Título y fecha son obligatorios.'); return; }
    setSaving(true); setMsg(''); setErr('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      fd.append('personal_participante', JSON.stringify(personal));
      if (imgFile) fd.append('imagen_respaldo', imgFile);

      const token = localStorage.getItem('ya_token');
      const res = await fetch(`${API_BASE_URL}/operaciones-dpto`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) { const b = await res.json(); throw new Error(b.error || 'Error'); }

      setModalMsg(`La operación "${form.titulo}" fue registrada exitosamente con ${personal.length} participante${personal.length !== 1 ? 's' : ''}.`);
      setModal('success');
      setForm({ tipo:'local', clasificacion_ro:'voluntario_operativo', calificacion_tipo:'', calificacion_puntos:'',
        titulo:'', descripcion:'', lugar:'', fecha:new Date().toISOString().slice(0,16), duracion_horas:'', voluntario_id:'', oficial_responsable_id:'' });
      setPersonal([]); setImgFile(null); setImgPreview('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Error al registrar la operación';
      setModalMsg(errMsg);
      setModal('error');
    } finally { setSaving(false); }
  };

  const oficiales  = voluntarios.filter(v => OFICIALES_ROLES.includes(v.role));
  const todos      = voluntarios;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Registrar Operación</h1>
          <p className={styles.pageSub}>Registra operaciones con todo el personal involucrado e imagen de respaldo</p>
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>

        {/* Alertas */}
        {msg && <div className={styles.successMsg}>{msg}</div>}
        {err && <div className={styles.errorMsg}>{err}</div>}

        {/* ── Datos generales ── */}
        <div className={styles.formCard}>
          <div className={styles.sectionLabel}>📋 Datos de la operación</div>

          <div className={styles.formGrid3}>
            <div className={styles.field}>
              <label className={styles.label}>Tipo *</label>
              <select className={styles.select} value={form.tipo} onChange={e=>set('tipo',e.target.value)}>
                <option value="local">🟢 Local</option>
                <option value="nacional">🔵 Nacional</option>
                <option value="internacional">🟣 Internacional</option>
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Fecha y hora *</label>
              <input className={styles.input} type="datetime-local"
                value={form.fecha} onChange={e=>set('fecha',e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Duración (horas)</label>
              <input className={styles.input} type="number" min="0" step="0.5" placeholder="2.5"
                value={form.duracion_horas} onChange={e=>set('duracion_horas',e.target.value)} />
            </div>
          </div>

          {/* Clasificación RO-001/25 Art. 5 */}
          <div className={styles.formFull}>
            <div className={styles.field}>
              <label className={styles.label}>
                Clasificación del personal · RO-001/25 Art. 5
              </label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.625rem', marginTop:'0.25rem' }}>
                {CLASIFICACION_RO.map(cl => {
                  const sel = form.clasificacion_ro === cl.value;
                  return (
                    <button
                      key={cl.value}
                      type="button"
                      onClick={() => set('clasificacion_ro', cl.value)}
                      style={{
                        padding:'0.875rem 1rem',
                        borderRadius:'8px', border:`1.5px solid ${sel ? cl.color : '#E2E8F0'}`,
                        background: sel ? `${cl.color}0D` : '#FAFBFC',
                        cursor:'pointer', textAlign:'left', transition:'all 0.18s',
                      }}
                    >
                      <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.35rem' }}>
                        <span style={{ fontSize:'1.1rem' }}>{cl.icon}</span>
                        <span style={{ fontFamily:'var(--font-body)', fontSize:'0.9rem', fontWeight:700, color: sel ? cl.color : '#1E293B' }}>
                          {cl.label}
                        </span>
                        {sel && (
                          <span style={{ marginLeft:'auto', background:cl.color, color:'white', fontFamily:'var(--font-body)', fontSize:'0.62rem', fontWeight:700, letterSpacing:'0.05em', padding:'0.2rem 0.55rem', borderRadius:'4px' }}>
                            Seleccionado
                          </span>
                        )}
                      </div>
                      <p style={{ fontFamily:'var(--font-body)', fontSize:'0.8rem', color:'#64748B', lineHeight:1.5, margin:0 }}>{cl.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Calificación según RO-001/25 ── */}
          <div className={styles.formFull}>
            <div className={styles.field}>
              <label className={styles.label}>
                Calificación · RO-001/25 — selecciona el tipo de reconocimiento o sanción
              </label>
              {/* Tabla seleccionable */}
              <div style={{ border:'1px solid #E2E8F0', borderRadius:'8px', overflow:'hidden', marginTop:'0.25rem' }}>
                {/* Encabezado */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr auto', padding:'0.7rem 1.25rem', background:'#1E293B' }}>
                  <span style={{ fontFamily:'var(--font-body)', fontSize:'0.72rem', fontWeight:700, letterSpacing:'0.07em', color:'white', textTransform:'uppercase' }}>Calificación</span>
                  <span style={{ fontFamily:'var(--font-body)', fontSize:'0.72rem', fontWeight:700, letterSpacing:'0.07em', color:'white', textTransform:'uppercase' }}>Puntaje</span>
                </div>
                {/* Filas */}
                {CALIFICACION_RO.map((item, i) => {
                  const sel  = form.calificacion_tipo === item.c;
                  const isNeg = item.p < 0;
                  const ptColor = isNeg ? '#C41E1E' : '#16a34a';
                  return (
                    <div
                      key={item.c}
                      onClick={() => {
                        set('calificacion_tipo',   sel ? '' : item.c);
                        set('calificacion_puntos', sel ? '' : String(item.p));
                      }}
                      style={{
                        display:'grid', gridTemplateColumns:'1fr auto', gap:'1rem',
                        padding:'0.625rem 1rem', cursor:'pointer',
                        borderBottom: i < CALIFICACION_RO.length-1 ? '1px solid #F1F5F9' : 'none',
                        background: sel ? (isNeg ? 'rgba(196,30,30,0.06)' : 'rgba(22,163,74,0.06)') : (i%2===0?'white':'#FAFBFC'),
                        outline: sel ? `2px solid ${ptColor}` : 'none',
                        outlineOffset: '-1px',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ display:'flex', alignItems:'center', gap:'0.625rem' }}>
                        {sel && (
                          <span style={{ color: ptColor, fontSize:'0.9rem', flexShrink:0, fontWeight:700 }}>✓</span>
                        )}
                        <span style={{
                          fontFamily:'var(--font-body)', fontSize:'0.875rem',
                          fontWeight: sel ? 700 : 500,
                          color: sel ? ptColor : '#374151',
                          lineHeight: 1.35,
                        }}>{item.c}</span>
                      </div>
                      <span style={{
                        fontFamily:'var(--font-condensed)', fontSize:'0.95rem', fontWeight:900,
                        color: sel ? ptColor : (isNeg?'#C41E1E':'#16a34a'),
                        whiteSpace:'nowrap', textAlign:'right',
                      }}>
                        {item.p > 0 ? `+${item.p}` : item.p} pts
                      </span>
                    </div>
                  );
                })}
              </div>
              {form.calificacion_tipo && (
                <div style={{ marginTop:'0.625rem', display:'flex', alignItems:'center', justifyContent:'space-between',
                  background:'#F0FDF4', border:'1px solid #86EFAC', borderRadius:'8px', padding:'0.625rem 1rem' }}>
                  <span style={{ fontFamily:'var(--font-body)', fontSize:'0.82rem', fontWeight:600, color:'#166534' }}>
                    ✓ Seleccionado: {form.calificacion_tipo}
                  </span>
                  <button type="button" onClick={() => { set('calificacion_tipo',''); set('calificacion_puntos',''); }}
                    style={{ background:'none', border:'none', color:'#94A3B8', cursor:'pointer', fontSize:'0.875rem', fontFamily:'var(--font-body)' }}>
                    × Quitar
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className={styles.formFull}>
            <div className={styles.field}>
              <label className={styles.label}>Título *</label>
              <input className={styles.input} placeholder="Ej. Incendio estructural Cala Cala"
                value={form.titulo} onChange={e=>set('titulo',e.target.value)} />
            </div>
          </div>

          <div className={styles.formFull}>
            <div className={styles.field}>
              <label className={styles.label}>Lugar / Dirección</label>
              <input className={styles.input} placeholder="Ej. Av. América esq. Heroínas, Cochabamba"
                value={form.lugar} onChange={e=>set('lugar',e.target.value)} />
            </div>
          </div>

          <div className={styles.formFull}>
            <div className={styles.field}>
              <label className={styles.label}>Descripción y observaciones</label>
              <textarea className={styles.textarea}
                placeholder="Descripción detallada, condiciones, recursos utilizados…"
                value={form.descripcion} onChange={e=>set('descripcion',e.target.value)} />
            </div>
          </div>
        </div>

        {/* ── Responsables ── */}
        <div className={styles.formCard}>
          <div className={styles.sectionLabel}>👤 Responsables</div>

          <div className={styles.formGrid2}>
            <div className={styles.field}>
              <label className={styles.label}>🎖️ Oficial responsable</label>
              <select className={styles.select} value={form.oficial_responsable_id}
                onChange={e=>set('oficial_responsable_id',e.target.value)}>
                <option value="">— Seleccionar oficial —</option>
                {oficiales.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.nombre} {v.apellido_paterno} · {v.role.replace(/_/g,' ')}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>🧑‍🚒 Voluntario responsable</label>
              <select className={styles.select} value={form.voluntario_id}
                onChange={e=>set('voluntario_id',e.target.value)}>
                <option value="">— Seleccionar voluntario —</option>
                {todos.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.nombre} {v.apellido_paterno} ({v.matricula || '—'})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── Personal participante ── */}
        <div className={styles.formCard}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.25rem' }}>
            <div className={styles.sectionLabel} style={{margin:0}}>👥 Personal que participó</div>
            <span style={{ fontFamily:'var(--font-body)', fontSize:'0.82rem', fontWeight:600,
              color: personal.length > 0 ? '#C41E1E' : '#94A3B8' }}>
              {personal.length} seleccionado{personal.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:'0.625rem' }}>
            {todos.map(v => {
              const sel = personal.includes(v.id);
              return (
                <div
                  key={v.id}
                  onClick={() => togglePersonal(v.id)}
                  style={{
                    position:'relative',
                    padding:'0.875rem 1rem',
                    borderRadius:'10px', cursor:'pointer',
                    border: sel ? '2px solid #C41E1E' : '2px solid #E2E8F0',
                    background: sel ? '#C41E1E' : 'white',
                    transition:'all 0.18s',
                    boxShadow: sel ? '0 4px 12px rgba(196,30,30,0.25)' : '0 1px 3px rgba(0,0,0,0.06)',
                  }}>
                  {/* Check icon arriba derecha */}
                  <div style={{
                    position:'absolute', top:'0.5rem', right:'0.5rem',
                    width:'20px', height:'20px', borderRadius:'50%',
                    background: sel ? 'rgba(255,255,255,0.25)' : '#F1F5F9',
                    border: sel ? '2px solid rgba(255,255,255,0.6)' : '2px solid #CBD5E1',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'0.7rem', color: sel ? 'white' : '#CBD5E1',
                    fontWeight:900,
                  }}>
                    {sel ? '✓' : ''}
                  </div>

                  <div style={{ fontFamily:'var(--font-body)', fontSize:'0.875rem', fontWeight:700,
                    color: sel ? 'white' : '#1E293B',
                    paddingRight:'1.5rem', lineHeight:1.3, marginBottom:'0.35rem',
                  }}>
                    {v.nombre} {v.apellido_paterno}
                  </div>

                  <div style={{ display:'flex', gap:'0.35rem', flexWrap:'wrap' }}>
                    {v.matricula && (
                      <span style={{
                        fontFamily:'var(--font-body)', fontSize:'0.67rem', fontWeight:700,
                        letterSpacing:'0.04em',
                        background: sel ? 'rgba(255,255,255,0.22)' : '#F1F5F9',
                        color: sel ? 'white' : '#64748B',
                        padding:'0.2rem 0.5rem', borderRadius:'4px',
                      }}>{v.matricula}</span>
                    )}
                    {v.codigo && (
                      <span style={{
                        fontFamily:'var(--font-body)', fontSize:'0.67rem', fontWeight:700,
                        letterSpacing:'0.04em',
                        background: sel ? 'rgba(255,255,255,0.22)' : '#FEF3C7',
                        color: sel ? 'white' : '#92400E',
                        padding:'0.2rem 0.5rem', borderRadius:'4px',
                      }}>{v.codigo}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Imagen de respaldo ── */}
        <div className={styles.formCard}>
          <div className={styles.sectionLabel}>🖼️ Imagen de respaldo</div>

          {imgPreview && (
            <div style={{ position:'relative', marginBottom:'1rem' }}>
              <img src={imgPreview} alt="preview"
                style={{ width:'100%', maxHeight:'260px', objectFit:'cover', borderRadius:'8px', border:'1px solid #E2E8F0', display:'block' }} />
              <button onClick={() => { setImgFile(null); setImgPreview(''); if(fileRef.current) fileRef.current.value=''; }}
                style={{ position:'absolute', top:'0.625rem', right:'0.625rem',
                  background:'rgba(0,0,0,0.55)', border:'none', color:'white', borderRadius:'50%',
                  width:'28px', height:'28px', cursor:'pointer', fontSize:'0.9rem',
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                ✕
              </button>
            </div>
          )}

          {!imgFile && (
            <label style={{
              display:'flex', flexDirection:'column', alignItems:'center', gap:'0.625rem',
              padding:'2.25rem', border:'2px dashed #CBD5E1', borderRadius:'12px',
              background:'#F8FAFC', cursor:'pointer', transition:'border-color 0.18s',
            }}>
              <span style={{ fontSize:'2.5rem', lineHeight:1 }}>📷</span>
              <span style={{ fontFamily:'var(--font-body)', fontSize:'0.925rem', fontWeight:700, color:'#374151' }}>
                Subir foto o imagen de respaldo
              </span>
              <span style={{ fontFamily:'var(--font-body)', fontSize:'0.78rem', color:'#94A3B8' }}>JPG, PNG, WEBP, PDF · Máx. 15 MB</span>
              <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display:'none' }}
                onChange={e => { if(e.target.files?.[0]) handleFile(e.target.files[0]); }} />
            </label>
          )}
        </div>

        {/* ── Registrar ── */}
        <button className={styles.primaryBtn} onClick={handleSave} disabled={saving}
          style={{ width:'100%', justifyContent:'center', padding:'1rem', fontSize:'1rem' }}>
          {saving ? 'Registrando operación…' : '✅ Registrar operación'}
        </button>
      </div>

      {/* ── Modal resultado ── */}
      {modal && (
        <div onClick={() => setModal(null)} style={{
          position:'fixed', inset:0, zIndex:500,
          background:'rgba(0,0,0,0.55)', backdropFilter:'blur(4px)',
          display:'flex', alignItems:'center', justifyContent:'center', padding:'1.5rem',
          animation:'fadeIn .2s ease',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background:'white', borderRadius:'18px', padding:'2.5rem 2.5rem 2rem',
            width:'100%', maxWidth:'400px', textAlign:'center',
            boxShadow:'0 24px 80px rgba(0,0,0,0.25)',
            animation:'popIn .25s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            {/* Icono */}
            <div style={{
              width:'72px', height:'72px', borderRadius:'50%', margin:'0 auto 1.25rem',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2rem',
              background: modal === 'success'
                ? 'linear-gradient(135deg,#065f46,#10b981)'
                : 'linear-gradient(135deg,#7f1d1d,#C41E1E)',
              boxShadow: modal === 'success'
                ? '0 0 0 10px rgba(16,185,129,0.12)'
                : '0 0 0 10px rgba(196,30,30,0.12)',
            }}>
              {modal === 'success' ? '✓' : '✕'}
            </div>

            {/* Título */}
            <div style={{
              fontFamily:'var(--font-condensed)', fontSize:'1.4rem', fontWeight:900,
              color:'#0F172A', marginBottom:'0.625rem',
            }}>
              {modal === 'success' ? '¡Operación registrada!' : 'Error al registrar'}
            </div>

            {/* Mensaje */}
            <p style={{ fontSize:'0.875rem', color:'#64748B', lineHeight:1.65, marginBottom:'1.75rem' }}>
              {modalMsg}
            </p>

            {/* Botones */}
            <div style={{ display:'flex', gap:'0.75rem', justifyContent:'center' }}>
              <button onClick={() => setModal(null)} style={{
                fontFamily:'var(--font-condensed)', fontSize:'0.875rem', fontWeight:700,
                letterSpacing:'0.06em', textTransform:'uppercase',
                padding:'0.75rem 1.75rem', borderRadius:'8px', border:'none', cursor:'pointer',
                background: modal === 'success' ? '#10b981' : '#C41E1E',
                color:'white',
                boxShadow: modal === 'success'
                  ? '0 4px 12px rgba(16,185,129,0.35)'
                  : '0 4px 12px rgba(196,30,30,0.35)',
              }}>
                {modal === 'success' ? 'Aceptar' : 'Cerrar'}
              </button>
              {modal === 'success' && (
                <button onClick={() => { setModal(null); }} style={{
                  fontFamily:'var(--font-condensed)', fontSize:'0.875rem', fontWeight:700,
                  letterSpacing:'0.06em', textTransform:'uppercase',
                  padding:'0.75rem 1.75rem', borderRadius:'8px', cursor:'pointer',
                  background:'transparent', color:'#64748B',
                  border:'1.5px solid #E2E8F0',
                }}>
                  Nueva operación
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
