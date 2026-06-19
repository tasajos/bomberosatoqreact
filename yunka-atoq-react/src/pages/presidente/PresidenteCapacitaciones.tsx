import { useState, useEffect, useRef } from 'react';
import {
  capacitacionesApi, adminUsersApi, API_BASE,
  type Capacitacion, type Inscripcion, type VoluntarioPerfil,
  type AdminUser,
} from '../../services/api';
import pStyles from './PresidenteCapacitaciones.module.css';

// ── helpers ────────────────────────────────────────────────────────
function fmtDate(s?: string) {
  if (!s) return '—';
  const d = new Date(s.slice(0, 10) + 'T12:00:00');
  return isNaN(d.getTime()) ? s
    : new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
}
function extIcon(url: string) {
  const ext = url.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return '📄';
  if (['jpg','jpeg','png','webp'].includes(ext||'')) return '🖼️';
  return '📎';
}

const TIPO_CFG: Record<string, { label:string; color:string; bg:string }> = {
  interna:       { label:'Interna',       color:'#1e40af', bg:'#eff6ff' },
  externa:       { label:'Externa',       color:'#166534', bg:'#f0fdf4' },
  certificacion: { label:'Certificación', color:'#7c3aed', bg:'#f5f3ff' },
};
const TIPO_CURSO_CFG: Record<string, { label:string; color:string; bg:string }> = {
  curso:         { label:'Curso',         color:'#1e40af', bg:'#eff6ff' },
  certificacion: { label:'Certificación', color:'#7c3aed', bg:'#f5f3ff' },
  diplomado:     { label:'Diplomado',     color:'#166534', bg:'#f0fdf4' },
  taller:        { label:'Taller',        color:'#d97706', bg:'#fffbeb' },
  seminario:     { label:'Seminario',     color:'#0891b2', bg:'#ecfeff' },
};
const ESTADO_CAP: Record<string, { label:string; color:string }> = {
  planificada: { label:'Planificada', color:'#d97706' },
  activa:      { label:'Activa',      color:'#16a34a' },
  cerrada:     { label:'Cerrada',     color:'#64748b' },
};
const ESTADO_INS: Record<string, { label:string; color:string; bg:string }> = {
  inscrito:   { label:'Inscrito',   color:'#1e40af', bg:'#eff6ff' },
  completado: { label:'Completado', color:'#166534', bg:'#f0fdf4' },
  ausente:    { label:'Ausente',    color:'#991b1b', bg:'#fef2f2' },
};

const EMPTY_FORM: Partial<Capacitacion> = {
  nombre:'', descripcion:'', tipo:'interna', institucion:'',
  instructor:'', lugar:'', fecha:'', horas:0, cupo:0, estado:'planificada',
};

// ══════════════════════════════════════════════════════════════════
// Tab: Capacitaciones
// ══════════════════════════════════════════════════════════════════
function TabCapacitaciones({ onSelect }: { onSelect:(c:Capacitacion)=>void }) {
  const [list, setList]       = useState<Capacitacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]       = useState<Partial<Capacitacion>>(EMPTY_FORM);
  const [editing, setEditing] = useState<number|null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState('');
  const [err, setErr]         = useState('');

  const load = () => {
    setLoading(true);
    capacitacionesApi.list().then(setList).catch(()=>{}).finally(()=>setLoading(false));
  };
  useEffect(()=>{ load(); },[]);

  const set = (k: keyof Capacitacion, v: unknown) => setForm(f=>({...f,[k]:v}));
  const openNew  = () => { setForm(EMPTY_FORM); setEditing(null); setShowForm(true); setMsg(''); setErr(''); };
  const openEdit = (c: Capacitacion) => { setForm(c); setEditing(c.id); setShowForm(true); setMsg(''); setErr(''); };

  const save = async () => {
    if (!form.nombre) { setErr('El nombre es obligatorio.'); return; }
    setSaving(true); setErr('');
    try {
      if (editing) await capacitacionesApi.update(editing, form);
      else         await capacitacionesApi.create(form);
      setMsg(editing ? 'Capacitación actualizada.' : 'Capacitación creada.');
      setShowForm(false); load();
    } catch(e:unknown){ setErr(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    if (!confirm('¿Eliminar esta capacitación?')) return;
    await capacitacionesApi.remove(id).catch(()=>{});
    load();
  };

  return (
    <div>
      <div className={pStyles.secHeader}>
        <div>
          <div className={pStyles.secTitle}>Capacitaciones disponibles</div>
          <div className={pStyles.secSub}>{list.length} capacitacion{list.length!==1?'es':''} registrada{list.length!==1?'s':''}</div>
        </div>
        <button className={pStyles.btnPrimary} onClick={openNew}>+ Nueva capacitación</button>
      </div>

      {msg && <div className={pStyles.alert} style={{background:'#f0fdf4',borderColor:'#86efac',color:'#166534'}}>{msg}</div>}
      {err && <div className={pStyles.alert} style={{background:'#fef2f2',borderColor:'#fecaca',color:'#991b1b'}}>{err}</div>}

      {showForm && (
        <div className={pStyles.formCard}>
          <div className={pStyles.formCardTitle}>{editing ? 'Editar capacitación' : 'Nueva capacitación'}</div>
          <div className={pStyles.grid2}>
            <div className={pStyles.field}>
              <label className={pStyles.label}>Nombre *</label>
              <input className={pStyles.input} value={form.nombre||''} onChange={e=>set('nombre',e.target.value)} placeholder="Ej. Rescate en altura nivel 1"/>
            </div>
            <div className={pStyles.field}>
              <label className={pStyles.label}>Tipo</label>
              <select className={pStyles.select} value={form.tipo} onChange={e=>set('tipo',e.target.value)}>
                <option value="interna">Interna</option>
                <option value="externa">Externa</option>
                <option value="certificacion">Certificación</option>
              </select>
            </div>
          </div>
          <div className={pStyles.grid2}>
            <div className={pStyles.field}>
              <label className={pStyles.label}>Institución / Organización</label>
              <input className={pStyles.input} value={form.institucion||''} onChange={e=>set('institucion',e.target.value)} placeholder="Ej. Cruz Roja, Defensa Civil, INSAFORP…"/>
            </div>
            <div className={pStyles.field}>
              <label className={pStyles.label}>Instructor</label>
              <input className={pStyles.input} value={form.instructor||''} onChange={e=>set('instructor',e.target.value)} placeholder="Nombre del instructor"/>
            </div>
          </div>
          <div className={pStyles.grid3}>
            <div className={pStyles.field}>
              <label className={pStyles.label}>Lugar</label>
              <input className={pStyles.input} value={form.lugar||''} onChange={e=>set('lugar',e.target.value)} placeholder="Lugar de la capacitación"/>
            </div>
            <div className={pStyles.field}>
              <label className={pStyles.label}>Fecha</label>
              <input className={pStyles.input} type="date" value={form.fecha?.slice(0,10)||''} onChange={e=>set('fecha',e.target.value)}/>
            </div>
            <div className={pStyles.field}>
              <label className={pStyles.label}>Estado</label>
              <select className={pStyles.select} value={form.estado} onChange={e=>set('estado',e.target.value)}>
                <option value="planificada">Planificada</option>
                <option value="activa">Activa</option>
                <option value="cerrada">Cerrada</option>
              </select>
            </div>
          </div>
          <div className={pStyles.grid2}>
            <div className={pStyles.field}>
              <label className={pStyles.label}>Horas</label>
              <input className={pStyles.input} type="number" min="0" step="0.5" value={form.horas||0} onChange={e=>set('horas',Number(e.target.value))}/>
            </div>
            <div className={pStyles.field}>
              <label className={pStyles.label}>Cupo máximo (0 = sin límite)</label>
              <input className={pStyles.input} type="number" min="0" value={form.cupo||0} onChange={e=>set('cupo',Number(e.target.value))}/>
            </div>
          </div>
          <div className={pStyles.field}>
            <label className={pStyles.label}>Descripción</label>
            <textarea className={pStyles.textarea} value={form.descripcion||''} onChange={e=>set('descripcion',e.target.value)} placeholder="Descripción y objetivos…"/>
          </div>
          <div className={pStyles.formActions}>
            <button className={pStyles.btnSecondary} onClick={()=>setShowForm(false)}>Cancelar</button>
            <button className={pStyles.btnPrimary} onClick={save} disabled={saving}>{saving?'Guardando…':'Guardar'}</button>
          </div>
        </div>
      )}

      {loading && <p className={pStyles.empty}>Cargando…</p>}
      {!loading && !list.length && <p className={pStyles.empty}>No hay capacitaciones registradas. Crea la primera.</p>}

      <div className={pStyles.capGrid}>
        {list.map(c => {
          const tc = TIPO_CFG[c.tipo];
          const es = ESTADO_CAP[c.estado];
          return (
            <div key={c.id} className={pStyles.capCard}>
              <div className={pStyles.capCardTop}>
                <span style={{fontFamily:'var(--font-condensed)',fontSize:'0.63rem',fontWeight:800,letterSpacing:'0.1em',textTransform:'uppercase',color:tc.color,background:tc.bg,padding:'0.2rem 0.6rem',borderRadius:'4px'}}>{tc.label}</span>
                <span style={{fontFamily:'var(--font-condensed)',fontSize:'0.63rem',fontWeight:700,color:es.color}}>● {es.label}</span>
              </div>
              <div className={pStyles.capCardName}>{c.nombre}</div>
              <div className={pStyles.capCardMeta}>
                {c.institucion && <span>🏛 {c.institucion}</span>}
                {c.instructor  && <span>👤 {c.instructor}</span>}
                {c.lugar       && <span>📍 {c.lugar}</span>}
                {c.fecha       && <span>📅 {fmtDate(c.fecha)}</span>}
                {c.horas > 0   && <span>⏱ {c.horas}h</span>}
              </div>
              <div className={pStyles.capCardStats}>
                <div><span className={pStyles.statNum}>{c.inscritos}</span><span className={pStyles.statLabel}>Inscritos</span></div>
                <div><span className={pStyles.statNum}>{c.completados}</span><span className={pStyles.statLabel}>Completados</span></div>
                {c.cupo > 0 && <div><span className={pStyles.statNum}>{c.cupo}</span><span className={pStyles.statLabel}>Cupo</span></div>}
              </div>
              <div className={pStyles.capCardActions}>
                <button className={pStyles.btnLink} onClick={()=>onSelect(c)}>Gestionar inscripciones →</button>
                <div style={{display:'flex',gap:'0.5rem'}}>
                  <button className={pStyles.btnIconEdit} onClick={()=>openEdit(c)}>✏️</button>
                  <button className={pStyles.btnIconDel}  onClick={()=>remove(c.id)}>🗑</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Tab: Inscripciones de una capacitación
// ══════════════════════════════════════════════════════════════════
function TabInscripciones({ cap, onBack }: { cap:Capacitacion; onBack:()=>void }) {
  const [inscripciones, setIns] = useState<Inscripcion[]>([]);
  const [voluntarios, setVols]  = useState<AdminUser[]>([]);
  const [selVol, setSelVol]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState('');
  const [err, setErr]           = useState('');

  const loadIns = () => {
    setLoading(true);
    capacitacionesApi.getInscripciones(cap.id).then(setIns).catch(()=>{}).finally(()=>setLoading(false));
  };
  useEffect(()=>{
    loadIns();
    adminUsersApi.list().then(r=>setVols(r.filter(u=>u.activo))).catch(()=>{});
  },[cap.id]);

  const inscritos  = new Set(inscripciones.map(i=>i.voluntario_id));
  const disponibles = voluntarios.filter(v=>!inscritos.has(v.id));

  const addVol = async () => {
    if (!selVol) return;
    setSaving(true); setErr('');
    try {
      await capacitacionesApi.addInscripcion(cap.id, Number(selVol));
      setSelVol(''); setMsg('Voluntario inscrito.'); loadIns();
    } catch(e:unknown){ setErr(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  };

  const [invAbierta, setInvAbierta] = useState(!!cap.invitacion_abierta);

  const toggleInvitacion = async () => {
    setSaving(true); setErr('');
    try {
      if (invAbierta) {
        await capacitacionesApi.cerrarInvitacion(cap.id);
        setInvAbierta(false);
        setMsg('Invitación cerrada. Ya no aparece en el menú de los voluntarios.');
      } else {
        await capacitacionesApi.invitarTodos(cap.id);
        setInvAbierta(true);
        setMsg('✅ Invitación abierta publicada. Aparece en el menú de todos los voluntarios para que se inscriban.');
      }
    } catch(e:unknown){ setErr(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  };

  const changeEstado = async (ins: Inscripcion, estado: string) => {
    await capacitacionesApi.updateInscripcion(ins.id, estado, ins.notas).catch(()=>{});
    loadIns();
  };

  const removeIns = async (id: number) => {
    if (!confirm('¿Quitar a este voluntario?')) return;
    await capacitacionesApi.removeInscripcion(id).catch(()=>{});
    loadIns();
  };

  const tc = TIPO_CFG[cap.tipo];
  const byEstado = (e:string) => inscripciones.filter(i=>i.estado===e);

  return (
    <div>
      <button className={pStyles.backBtn} onClick={onBack}>← Volver a capacitaciones</button>

      <div className={pStyles.capDetailHeader}>
        <div>
          <span style={{fontFamily:'var(--font-condensed)',fontSize:'0.63rem',fontWeight:800,letterSpacing:'0.1em',textTransform:'uppercase',color:tc.color,background:tc.bg,padding:'0.2rem 0.6rem',borderRadius:'4px'}}>{tc.label}</span>
          <h2 className={pStyles.capDetailName}>{cap.nombre}</h2>
          <div className={pStyles.capCardMeta}>
            {cap.institucion && <span>🏛 {cap.institucion}</span>}
            {cap.instructor  && <span>👤 {cap.instructor}</span>}
            {cap.lugar       && <span>📍 {cap.lugar}</span>}
            {cap.fecha       && <span>📅 {fmtDate(cap.fecha)}</span>}
            {cap.horas > 0   && <span>⏱ {cap.horas}h</span>}
          </div>
        </div>
        <div className={pStyles.capDetailStats}>
          <div className={pStyles.statBox}><span className={pStyles.statBoxNum}>{inscripciones.length}</span><span className={pStyles.statBoxLabel}>Inscritos</span></div>
          <div className={pStyles.statBox}><span className={pStyles.statBoxNum}>{byEstado('completado').length}</span><span className={pStyles.statBoxLabel}>Completados</span></div>
          <div className={pStyles.statBox}><span className={pStyles.statBoxNum}>{byEstado('ausente').length}</span><span className={pStyles.statBoxLabel}>Ausentes</span></div>
          <div className={pStyles.statBox} style={{borderColor: invAbierta ? '#86efac' : '#E2E8F0', background: invAbierta ? '#f0fdf4' : '#F8FAFC'}}>
            <span className={pStyles.statBoxNum} style={{fontSize:'1.2rem'}}>{invAbierta ? '🟢' : '⚫'}</span>
            <span className={pStyles.statBoxLabel}>{invAbierta ? 'Publicada' : 'No publicada'}</span>
          </div>
        </div>
      </div>

      {msg && <div className={pStyles.alert} style={{background:'#f0fdf4',borderColor:'#86efac',color:'#166534'}}>{msg}</div>}
      {err && <div className={pStyles.alert} style={{background:'#fef2f2',borderColor:'#fecaca',color:'#991b1b'}}>{err}</div>}

      <div className={pStyles.addRow}>
        <select className={pStyles.select} value={selVol} onChange={e=>setSelVol(e.target.value)} style={{flex:1,minWidth:0}}>
          <option value="">— Seleccionar voluntario para inscribir —</option>
          {disponibles.map(v=>(
            <option key={v.id} value={v.id}>{v.nombre} {v.apellido_paterno} ({v.matricula||'—'})</option>
          ))}
        </select>
        <button className={pStyles.btnPrimary} onClick={addVol} disabled={!selVol||saving}>+ Inscribir</button>
        <button
          onClick={toggleInvitacion}
          disabled={saving}
          style={{
            fontFamily:'var(--font-condensed)',fontSize:'0.8rem',fontWeight:700,
            letterSpacing:'0.06em',textTransform:'uppercase',
            border:'1.5px solid',borderRadius:'8px',padding:'0.65rem 1.25rem',
            cursor:'pointer',transition:'all 0.18s',whiteSpace:'nowrap',
            ...(invAbierta
              ? {background:'#fef2f2',color:'#991b1b',borderColor:'#fecaca'}
              : {background:'transparent',color:'#0F172A',borderColor:'#CBD5E1'}
            ),
          }}
        >
          {invAbierta ? '🔴 Cerrar invitación' : '📢 Invitación abierta (publicar)'}
        </button>
      </div>

      {loading && <p className={pStyles.empty}>Cargando…</p>}
      {!loading && !inscripciones.length && <p className={pStyles.empty}>No hay voluntarios inscritos aún.</p>}
      {!loading && inscripciones.length > 0 && (
        <div className={pStyles.tableWrap}>
          <div className={pStyles.tableHead}>
            <span>#</span><span>Voluntario</span><span>Matrícula</span><span>Estado</span><span></span>
          </div>
          {inscripciones.map((ins, idx)=>{
            const ei = ESTADO_INS[ins.estado];
            return (
              <div key={ins.id} className={pStyles.tableRow}>
                <span className={pStyles.rowNum}>{idx+1}</span>
                <div>
                  <div className={pStyles.rowName}>{ins.nombre_voluntario}</div>
                  <div className={pStyles.rowSub}>{ins.especialidad||'—'}</div>
                </div>
                <div className={pStyles.rowSub}>{ins.matricula||'—'}</div>
                <select className={pStyles.estadoSelect} value={ins.estado}
                  onChange={e=>changeEstado(ins,e.target.value)}
                  style={{color:ei.color,background:ei.bg,borderColor:`${ei.color}40`}}>
                  <option value="inscrito">Inscrito</option>
                  <option value="completado">Completado</option>
                  <option value="ausente">Ausente</option>
                </select>
                <button className={pStyles.btnIconDel} onClick={()=>removeIns(ins.id)}>✕</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Formulario: subir curso externo
// ══════════════════════════════════════════════════════════════════
function FormCursoExterno({ volId, onSaved }: { volId:number; onSaved:()=>void }) {
  const [form, setForm] = useState({ nombre:'', institucion:'', tipo:'curso', fecha:'', horas:'', descripcion:'' });
  const [file, setFile] = useState<File|null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k:string, v:string) => setForm(f=>({...f,[k]:v}));

  const save = async () => {
    if (!form.nombre) { setErr('El nombre es obligatorio.'); return; }
    setSaving(true); setErr('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k,v])=>{ if(v) fd.append(k,v); });
      if (file) fd.append('archivo', file);
      await capacitacionesApi.addCursoExterno(volId, fd);
      setForm({ nombre:'', institucion:'', tipo:'curso', fecha:'', horas:'', descripcion:'' });
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      onSaved();
    } catch(e:unknown){ setErr(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  };

  return (
    <div className={pStyles.formCard} style={{marginBottom:'1.25rem'}}>
      <div className={pStyles.formCardTitle}>Agregar curso / certificación al file</div>
      {err && <div className={pStyles.alert} style={{background:'#fef2f2',borderColor:'#fecaca',color:'#991b1b',marginBottom:'1rem'}}>{err}</div>}

      <div className={pStyles.grid2}>
        <div className={pStyles.field}>
          <label className={pStyles.label}>Nombre del curso *</label>
          <input className={pStyles.input} value={form.nombre} onChange={e=>set('nombre',e.target.value)} placeholder="Ej. Primeros auxilios avanzados"/>
        </div>
        <div className={pStyles.field}>
          <label className={pStyles.label}>Institución que lo emite</label>
          <input className={pStyles.input} value={form.institucion} onChange={e=>set('institucion',e.target.value)} placeholder="Ej. Cruz Roja Boliviana, OPS, USAID…"/>
        </div>
      </div>
      <div className={pStyles.grid3}>
        <div className={pStyles.field}>
          <label className={pStyles.label}>Tipo</label>
          <select className={pStyles.select} value={form.tipo} onChange={e=>set('tipo',e.target.value)}>
            <option value="curso">Curso</option>
            <option value="certificacion">Certificación</option>
            <option value="diplomado">Diplomado</option>
            <option value="taller">Taller</option>
            <option value="seminario">Seminario</option>
          </select>
        </div>
        <div className={pStyles.field}>
          <label className={pStyles.label}>Fecha de obtención</label>
          <input className={pStyles.input} type="date" value={form.fecha} onChange={e=>set('fecha',e.target.value)}/>
        </div>
        <div className={pStyles.field}>
          <label className={pStyles.label}>Horas</label>
          <input className={pStyles.input} type="number" min="0" step="0.5" value={form.horas} onChange={e=>set('horas',e.target.value)} placeholder="0"/>
        </div>
      </div>
      <div className={pStyles.field}>
        <label className={pStyles.label}>Descripción (opcional)</label>
        <textarea className={pStyles.textarea} value={form.descripcion} onChange={e=>set('descripcion',e.target.value)} placeholder="Contenido del curso, observaciones…" style={{minHeight:'60px'}}/>
      </div>

      {/* Upload certificado */}
      <div className={pStyles.field}>
        <label className={pStyles.label}>Certificado / Diploma (PDF o imagen)</label>
        {file ? (
          <div style={{display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.75rem 1rem',border:'1.5px solid #86efac',borderRadius:'8px',background:'#f0fdf4'}}>
            <span style={{fontSize:'1.25rem'}}>{extIcon(file.name)}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:'var(--font-condensed)',fontSize:'0.8rem',fontWeight:700,color:'#166534',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{file.name}</div>
              <div style={{fontSize:'0.72rem',color:'#64748B'}}>{(file.size/1024).toFixed(0)} KB</div>
            </div>
            <button type="button" onClick={()=>{setFile(null);if(fileRef.current)fileRef.current.value='';}}
              style={{background:'none',border:'none',color:'#64748B',cursor:'pointer',fontSize:'1rem'}}>✕</button>
          </div>
        ) : (
          <label style={{display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.75rem 1rem',border:'1.5px dashed #CBD5E1',borderRadius:'8px',background:'#F8FAFC',cursor:'pointer'}}>
            <span style={{fontSize:'1.5rem'}}>📎</span>
            <span style={{fontFamily:'var(--font-condensed)',fontSize:'0.8rem',fontWeight:700,color:'#64748B'}}>Adjuntar certificado — PDF, JPG, PNG · Máx. 20 MB</span>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{display:'none'}}
              onChange={e=>{ if(e.target.files?.[0]) setFile(e.target.files[0]); }}/>
          </label>
        )}
      </div>

      <div className={pStyles.formActions}>
        <button className={pStyles.btnPrimary} onClick={save} disabled={saving}>{saving?'Guardando…':'Agregar al file'}</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Tab: File de voluntario
// ══════════════════════════════════════════════════════════════════
function TabFile() {
  const [voluntarios, setVols] = useState<AdminUser[]>([]);
  const [selId, setSelId]      = useState('');
  const [perfil, setPerfil]    = useState<VoluntarioPerfil|null>(null);
  const [loading, setLoading]  = useState(false);
  const [err, setErr]          = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(()=>{
    adminUsersApi.list().then(r=>setVols(r.filter(u=>u.activo))).catch(()=>{});
  },[]);

  const cargar = async (id: string) => {
    if (!id) return;
    setLoading(true); setErr(''); setPerfil(null); setShowForm(false);
    try {
      setPerfil(await capacitacionesApi.getPerfilVoluntario(Number(id)));
    } catch(e:unknown){ setErr(e instanceof Error ? e.message : 'Error al cargar el perfil'); }
    finally { setLoading(false); }
  };

  const handleVolChange = (id: string) => { setSelId(id); cargar(id); };

  const removeCurso = async (id: number) => {
    if (!confirm('¿Eliminar este curso del file?')) return;
    await capacitacionesApi.removeCursoExterno(id).catch(()=>{});
    cargar(selId);
  };

  return (
    <div>
      <div className={pStyles.secHeader}>
        <div>
          <div className={pStyles.secTitle}>File de voluntario</div>
          <div className={pStyles.secSub}>Historial completo: puntos, guardias, operaciones, sanciones, capacitaciones y cursos</div>
        </div>
      </div>

      <div style={{display:'flex',gap:'0.75rem',marginBottom:'1.5rem',flexWrap:'wrap'}}>
        <select className={pStyles.select} value={selId} onChange={e=>handleVolChange(e.target.value)} style={{flex:1,minWidth:'200px'}}>
          <option value="">— Seleccionar voluntario —</option>
          {voluntarios.map(v=>(
            <option key={v.id} value={v.id}>{v.nombre} {v.apellido_paterno} · {v.matricula||'—'}</option>
          ))}
        </select>
      </div>

      {err    && <div className={pStyles.alert} style={{background:'#fef2f2',borderColor:'#fecaca',color:'#991b1b'}}>{err}</div>}
      {loading && <p className={pStyles.empty}>Cargando perfil…</p>}

      {perfil && (
        <div className={pStyles.fileContent}>
          {/* Cabecera */}
          <div className={pStyles.fileHeader}>
            <div className={pStyles.fileAvatar}>
              {perfil.usuario.nombre[0]}{perfil.usuario.apellido_paterno[0]}
            </div>
            <div style={{flex:1}}>
              <h2 className={pStyles.fileName}>{perfil.usuario.nombre} {perfil.usuario.apellido_paterno}</h2>
              <div className={pStyles.fileMeta}>
                {perfil.usuario.matricula && <span>{perfil.usuario.matricula}</span>}
                {perfil.usuario.codigo    && <><span>·</span><span>{perfil.usuario.codigo}</span></>}
                {perfil.usuario.grado     && <><span>·</span><span>{perfil.usuario.grado}</span></>}
                {perfil.usuario.especialidad && <><span>·</span><span>{perfil.usuario.especialidad}</span></>}
              </div>
            </div>
            <button className={pStyles.btnSecondary} onClick={()=>setShowForm(f=>!f)}>
              {showForm ? 'Ocultar formulario' : '+ Agregar curso / certificación'}
            </button>
          </div>

          {/* Formulario subir curso */}
          {showForm && (
            <FormCursoExterno volId={perfil.usuario.id} onSaved={()=>{ cargar(selId); setShowForm(false); }}/>
          )}

          {/* KPIs */}
          <div className={pStyles.kpiRow}>
            {[
              { label:'Puntos',         value: perfil.stats.puntos,      color:'#7c3aed' },
              { label:'Guardias',       value: perfil.stats.guardias,    color:'#1e40af' },
              { label:'Operaciones',    value: perfil.stats.operaciones, color:'#c41e1e' },
              { label:'Apoyos',         value: perfil.stats.apoyos,      color:'#d97706' },
              { label:'Cap. completadas', value: perfil.capacitaciones.filter(c=>c.estado==='completado').length, color:'#166534' },
              { label:'Cursos propios', value: perfil.cursos_externos.length, color:'#0891b2' },
            ].map(k=>(
              <div key={k.label} className={pStyles.kpiBox}>
                <div className={pStyles.kpiNum} style={{color:k.color}}>{k.value}</div>
                <div className={pStyles.kpiLabel}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* Cursos externos */}
          <div className={pStyles.fileSection}>
            <div className={pStyles.fileSectionTitle}>Cursos y certificaciones propias</div>
            {!perfil.cursos_externos.length
              ? <p className={pStyles.empty} style={{textAlign:'left',padding:'1rem 0'}}>Sin cursos registrados. Usa el botón de arriba para agregar.</p>
              : (
                <div style={{display:'flex',flexDirection:'column',gap:'0.625rem'}}>
                  {perfil.cursos_externos.map(c=>{
                    const tc = TIPO_CURSO_CFG[c.tipo] ?? TIPO_CURSO_CFG.curso;
                    return (
                      <div key={c.id} style={{
                        background:'white',border:'1px solid #E2E8F0',borderRadius:'10px',
                        padding:'0.875rem 1.25rem',display:'flex',alignItems:'center',gap:'1rem',
                        boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
                      }}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:'flex',alignItems:'center',gap:'0.625rem',flexWrap:'wrap',marginBottom:'0.3rem'}}>
                            <span style={{fontFamily:'var(--font-condensed)',fontSize:'0.63rem',fontWeight:800,letterSpacing:'0.08em',textTransform:'uppercase',color:tc.color,background:tc.bg,padding:'0.15rem 0.5rem',borderRadius:'4px'}}>{tc.label}</span>
                            <span style={{fontFamily:'var(--font-condensed)',fontSize:'0.88rem',fontWeight:800,color:'#1E293B'}}>{c.nombre}</span>
                          </div>
                          <div style={{display:'flex',gap:'1rem',flexWrap:'wrap'}}>
                            {c.institucion && (
                              <span style={{fontSize:'0.78rem',color:'#475569',fontWeight:600}}>
                                🏛 <strong>{c.institucion}</strong>
                              </span>
                            )}
                            {c.fecha && <span style={{fontSize:'0.75rem',color:'#94A3B8'}}>📅 {fmtDate(c.fecha)}</span>}
                            {c.horas > 0 && <span style={{fontSize:'0.75rem',color:'#94A3B8'}}>⏱ {c.horas}h</span>}
                          </div>
                          {c.descripcion && <div style={{fontSize:'0.75rem',color:'#64748B',marginTop:'0.3rem'}}>{c.descripcion}</div>}
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:'0.5rem',flexShrink:0}}>
                          {c.archivo_url && (
                            <a href={`${API_BASE}${c.archivo_url}`} target="_blank" rel="noreferrer"
                              style={{fontFamily:'var(--font-condensed)',fontSize:'0.72rem',fontWeight:700,letterSpacing:'0.04em',textTransform:'uppercase',color:'#1e40af',textDecoration:'none',display:'flex',alignItems:'center',gap:'0.3rem',border:'1px solid #bfdbfe',borderRadius:'6px',padding:'0.3rem 0.6rem',background:'#eff6ff'}}>
                              {extIcon(c.archivo_url)} Ver
                            </a>
                          )}
                          <button className={pStyles.btnIconDel} onClick={()=>removeCurso(c.id)}>🗑</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            }
          </div>

          {/* Capacitaciones institucionales */}
          <div className={pStyles.fileSection}>
            <div className={pStyles.fileSectionTitle}>Capacitaciones institucionales</div>
            {!perfil.capacitaciones.length
              ? <p className={pStyles.empty} style={{textAlign:'left',padding:'0.5rem 0'}}>Sin capacitaciones institucionales registradas.</p>
              : (
                <div className={pStyles.tableWrap}>
                  <div className={pStyles.tableHead} style={{gridTemplateColumns:'1fr 9rem 7rem 6rem'}}>
                    <span>Capacitación / Institución</span><span>Instructor</span><span>Fecha</span><span>Estado</span>
                  </div>
                  {perfil.capacitaciones.map(c=>{
                    const ei = ESTADO_INS[c.estado] ?? ESTADO_INS.inscrito;
                    return (
                      <div key={c.id} className={pStyles.tableRow} style={{gridTemplateColumns:'1fr 9rem 7rem 6rem'}}>
                        <div>
                          <div className={pStyles.rowName}>{c.cap_nombre}</div>
                          <div className={pStyles.rowSub}>
                            {c.cap_institucion && <><strong>{c.cap_institucion}</strong> · </>}
                            {c.cap_tipo} · {c.horas}h
                          </div>
                        </div>
                        <div className={pStyles.rowSub}>{c.instructor||'—'}</div>
                        <div className={pStyles.rowSub}>{fmtDate(c.cap_fecha)}</div>
                        <span style={{fontFamily:'var(--font-condensed)',fontSize:'0.63rem',fontWeight:800,letterSpacing:'0.06em',textTransform:'uppercase',color:ei.color,background:ei.bg,padding:'0.2rem 0.5rem',borderRadius:'4px',display:'inline-block',whiteSpace:'nowrap'}}>{ei.label}</span>
                      </div>
                    );
                  })}
                </div>
              )
            }
          </div>

          {/* Méritos */}
          {perfil.meritos.length > 0 && (
            <div className={pStyles.fileSection}>
              <div className={pStyles.fileSectionTitle} style={{color:'#166534'}}>Méritos</div>
              <div className={pStyles.tableWrap}>
                <div className={pStyles.tableHead} style={{gridTemplateColumns:'1fr 5rem 5rem'}}><span>Mérito</span><span>Puntos</span><span>Fecha</span></div>
                {perfil.meritos.map(m=>(
                  <div key={m.id} className={pStyles.tableRow} style={{gridTemplateColumns:'1fr 5rem 5rem'}}>
                    <div><div className={pStyles.rowName}>{m.titulo}</div>{m.descripcion&&<div className={pStyles.rowSub}>{m.descripcion}</div>}</div>
                    <div style={{color:'#166534',fontFamily:'var(--font-condensed)',fontWeight:800}}>+{m.puntos_extra}</div>
                    <div className={pStyles.rowSub}>{fmtDate(m.fecha)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sanciones */}
          {perfil.sanciones.length > 0 && (
            <div className={pStyles.fileSection}>
              <div className={pStyles.fileSectionTitle} style={{color:'#991b1b'}}>Sanciones / Deméritos</div>
              <div className={pStyles.tableWrap}>
                <div className={pStyles.tableHead} style={{gridTemplateColumns:'1fr 5rem 5rem'}}><span>Sanción</span><span>Puntos</span><span>Fecha</span></div>
                {perfil.sanciones.map(s=>(
                  <div key={s.id} className={pStyles.tableRow} style={{gridTemplateColumns:'1fr 5rem 5rem'}}>
                    <div><div className={pStyles.rowName}>{s.titulo}</div>{s.descripcion&&<div className={pStyles.rowSub}>{s.descripcion}</div>}</div>
                    <div style={{color:'#991b1b',fontFamily:'var(--font-condensed)',fontWeight:800}}>{s.puntos_extra}</div>
                    <div className={pStyles.rowSub}>{fmtDate(s.fecha)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Página principal
// ══════════════════════════════════════════════════════════════════
type TabId = 'capacitaciones' | 'inscripciones' | 'file';

export default function PresidenteCapacitaciones() {
  const [tab, setTab]       = useState<TabId>('capacitaciones');
  const [selCap, setSelCap] = useState<Capacitacion|null>(null);

  const goInscripciones = (c: Capacitacion) => { setSelCap(c); setTab('inscripciones'); };
  const goBack          = () => { setSelCap(null); setTab('capacitaciones'); };

  return (
    <div className={pStyles.page}>
      <div className={pStyles.pageHeader}>
        <h1 className={pStyles.pageTitle}>Capacitaciones</h1>
        <p className={pStyles.pageSub}>Gestiona capacitaciones, inscripciones y el file personal de cada voluntario</p>
      </div>

      <div className={pStyles.tabs}>
        <button className={`${pStyles.tab} ${(tab==='capacitaciones'||tab==='inscripciones')?pStyles.tabActive:''}`}
          onClick={()=>{setTab('capacitaciones');setSelCap(null);}}>
          📚 Capacitaciones
        </button>
        <button className={`${pStyles.tab} ${tab==='file'?pStyles.tabActive:''}`}
          onClick={()=>setTab('file')}>
          👤 File de voluntario
        </button>
      </div>

      <div className={pStyles.tabContent}>
        {tab==='capacitaciones' && <TabCapacitaciones onSelect={goInscripciones}/>}
        {tab==='inscripciones'  && selCap && <TabInscripciones cap={selCap} onBack={goBack}/>}
        {tab==='file'           && <TabFile/>}
      </div>
    </div>
  );
}
